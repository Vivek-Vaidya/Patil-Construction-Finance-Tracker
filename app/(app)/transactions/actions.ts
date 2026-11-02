"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { canDeleteEntries, canAddExpenses } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getTransactionFormData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = session.user.role;

  let siteWhere: any = {};
  if (userRole === "SUPERVISOR") {
    siteWhere = {
      users: {
        some: { userId },
      },
    };
  }

  const [sites, parties, categories, materials, partners] = await Promise.all([
    prisma.site.findMany({
      where: siteWhere,
      select: { id: true, name: true, location: true, status: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, phone: true, gstNumber: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({
      where: { isActive: true },
      select: { id: true, name: true, defaultUnit: true },
      orderBy: { name: "asc" },
    }),
    prisma.partner.findMany({
      where: { isActive: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { sites, parties, categories, materials, partners, userRole };
}

export async function checkDuplicateTransaction(data: {
  date: string;
  partyId?: string;
  totalAmount: number;
  billNumber?: string;
}) {
  if (!data.totalAmount || data.totalAmount <= 0) return null;

  const targetDate = new Date(data.date);
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

  const orConditions: any[] = [];

  if (data.billNumber && data.billNumber.trim().length > 0) {
    orConditions.push({
      billNumber: { equals: data.billNumber.trim() },
    });
  }

  if (data.partyId && data.totalAmount > 0) {
    orConditions.push({
      partyId: data.partyId,
      totalAmount: data.totalAmount,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    });
  }

  if (orConditions.length === 0) return null;

  const existing = await prisma.transaction.findFirst({
    where: {
      isDeleted: false,
      OR: orConditions,
    },
    include: {
      party: { select: { name: true } },
      site: { select: { name: true } },
    },
  });

  if (existing) {
    return {
      id: existing.id,
      date: existing.date,
      description: existing.description,
      totalAmount: Number(existing.totalAmount),
      billNumber: existing.billNumber,
      partyName: existing.party?.name,
      siteName: existing.site?.name,
    };
  }

  return null;
}

export async function createTransaction(data: {
  date: string;
  direction: "CREDIT" | "DEBIT";
  type: string;
  categoryId?: string | null;
  siteId?: string | null;
  description: string;
  paidByType: "COMPANY" | "PARTNER" | "EMPLOYEE";
  partnerId?: string | null;
  partyId?: string | null;
  materialId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  pricingMode: "RATE" | "LUMPSUM";
  rate?: number | null;
  gstPercent?: number | null;
  gstAmount?: number | null;
  totalAmount: number;
  amountPaid: number;
  paymentMode?: string | null;
  billNumber?: string | null;
  notes?: string | null;
  attachment?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
  } | null;
}) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const userId = session.user.id;
  const role = session.user.role;

  if (!canAddExpenses(role)) {
    return { error: "You do not have permission to add transactions." };
  }

  const txDate = new Date(data.date);
  const txYear = txDate.getFullYear();
  const txMonth = txDate.getMonth() + 1;

  // Check month lock
  const locked = await prisma.monthLock.findUnique({
    where: {
      year_month: {
        year: txYear,
        month: txMonth,
      },
    },
  });

  if (locked) {
    return { error: `The period ${txMonth}/${txYear} has been locked by an administrator. Entries cannot be added.` };
  }

  if (!data.description || data.description.trim().length === 0) {
    return { error: "Description is required." };
  }

  if (data.totalAmount < 0) {
    return { error: "Total amount cannot be negative." };
  }

  if (data.amountPaid < 0) {
    return { error: "Amount paid cannot be negative." };
  }

  if (data.amountPaid > data.totalAmount) {
    return { error: "Amount paid cannot exceed total amount." };
  }

  // Derive payment status
  let paymentStatus = "UNPAID";
  if (data.amountPaid >= data.totalAmount && data.totalAmount > 0) {
    paymentStatus = "PAID";
  } else if (data.amountPaid > 0) {
    paymentStatus = "PARTIAL";
  }

  try {
    const tx = await prisma.$transaction(async (prismaClient) => {
      const created = await prismaClient.transaction.create({
        data: {
          date: txDate,
          direction: data.direction,
          type: data.type,
          categoryId: data.categoryId || null,
          siteId: data.siteId || null,
          description: data.description.trim(),
          paidByType: data.paidByType,
          partnerId: data.paidByType === "PARTNER" ? data.partnerId : null,
          partyId: data.partyId || null,
          materialId: data.materialId || null,
          quantity: data.quantity != null ? data.quantity : null,
          unit: data.unit || null,
          pricingMode: data.pricingMode,
          rate: data.rate != null ? data.rate : null,
          gstPercent: data.gstPercent != null ? data.gstPercent : null,
          gstAmount: data.gstAmount != null ? data.gstAmount : null,
          totalAmount: data.totalAmount,
          amountPaid: data.amountPaid,
          paymentStatus,
          paymentMode: data.paymentMode || null,
          billNumber: data.billNumber ? data.billNumber.trim() : null,
          notes: data.notes ? data.notes.trim() : null,
          createdById: userId,
        },
      });

      // If initial payment was made, log a Payment record
      if (data.amountPaid > 0) {
        await prismaClient.payment.create({
          data: {
            transactionId: created.id,
            date: txDate,
            amount: data.amountPaid,
            mode: data.paymentMode || "CASH",
            reference: data.billNumber || "Initial payment on entry",
            notes: data.notes || null,
          },
        });
      }

      // If attachment exists
      if (data.attachment?.fileUrl) {
        await prismaClient.attachment.create({
          data: {
            transactionId: created.id,
            fileUrl: data.attachment.fileUrl,
            fileName: data.attachment.fileName,
            fileType: data.attachment.fileType,
          },
        });
      }

      return created;
    });

    await logAudit({
      entityType: "TRANSACTION",
      entityId: tx.id,
      action: "CREATE",
      userId,
      newValue: {
        description: tx.description,
        totalAmount: Number(tx.totalAmount),
        direction: tx.direction,
        type: tx.type,
        siteId: tx.siteId,
        partyId: tx.partyId,
      },
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/payables");
    revalidatePath("/receivables");

    return { success: true, transactionId: tx.id };
  } catch (error: any) {
    console.error("Error creating transaction:", error);
    return { error: error.message || "Failed to create transaction." };
  }
}

export async function softDeleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (!canDeleteEntries(session.user.role)) {
    return { error: "Only administrators can delete transactions." };
  }

  try {
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return { error: "Transaction not found." };

    // Check month lock
    const txDate = new Date(existing.date);
    const locked = await prisma.monthLock.findUnique({
      where: {
        year_month: {
          year: txDate.getFullYear(),
          month: txDate.getMonth() + 1,
        },
      },
    });

    if (locked) {
      return { error: "Cannot delete an entry from a locked month." };
    }

    await prisma.transaction.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: session.user.id,
      },
    });

    await logAudit({
      entityType: "TRANSACTION",
      entityId: id,
      action: "DELETE",
      userId: session.user.id,
      oldValue: {
        description: existing.description,
        totalAmount: Number(existing.totalAmount),
      },
    });

    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/payables");
    revalidatePath("/receivables");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete transaction." };
  }
}

// Quick inline creators
export async function createQuickParty(data: { name: string; type: string; phone?: string; gstNumber?: string }) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const party = await prisma.party.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        phone: data.phone?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
      },
    });
    return { success: true, party };
  } catch (err: any) {
    return { error: err.message || "Failed to create party." };
  }
}

export async function createQuickSite(data: { name: string; location: string }) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const site = await prisma.site.create({
      data: {
        name: data.name.trim(),
        location: data.location.trim(),
        status: "ACTIVE",
      },
    });
    return { success: true, site };
  } catch (err: any) {
    return { error: err.message || "Failed to create site." };
  }
}

export async function createQuickCategory(name: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const category = await prisma.category.create({
      data: { name: name.trim() },
    });
    return { success: true, category };
  } catch (err: any) {
    return { error: err.message || "Failed to create category." };
  }
}

export async function createQuickMaterial(data: { name: string; defaultUnit?: string }) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const material = await prisma.material.create({
      data: {
        name: data.name.trim(),
        defaultUnit: data.defaultUnit?.trim() || null,
      },
    });
    return { success: true, material };
  } catch (err: any) {
    return { error: err.message || "Failed to create material." };
  }
}

export async function getTransactionsList(params: {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: string;
  categoryId?: string;
  partyId?: string;
  partnerId?: string;
  paidByType?: string;
  direction?: string;
  paymentStatus?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };

  // Site Supervisor isolation
  if (session.user.role === "SUPERVISOR") {
    where.site = {
      users: {
        some: { userId: session.user.id },
      },
    };
  }

  if (params.siteId && params.siteId !== "ALL") {
    where.siteId = params.siteId;
  }

  if (params.categoryId && params.categoryId !== "ALL") {
    where.categoryId = params.categoryId;
  }

  if (params.partyId && params.partyId !== "ALL") {
    where.partyId = params.partyId;
  }

  if (params.paidByType && params.paidByType !== "ALL") {
    where.paidByType = params.paidByType;
  }

  if (params.partnerId && params.partnerId !== "ALL") {
    where.partnerId = params.partnerId;
  }

  if (params.direction && params.direction !== "ALL") {
    where.direction = params.direction;
  }

  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    where.paymentStatus = params.paymentStatus;
  }

  if (params.type && params.type !== "ALL") {
    where.type = params.type;
  }

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim();
    where.OR = [
      { description: { contains: s } },
      { billNumber: { contains: s } },
      { party: { name: { contains: s } } },
      { site: { name: { contains: s } } },
    ];
  }

  const orderBy: any = {};
  const sortField = params.sortBy || "date";
  const order = params.sortOrder || "desc";
  orderBy[sortField] = order;

  const [transactions, totalCount, aggregations] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        site: { select: { id: true, name: true } },
        party: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, defaultUnit: true } },
        paidByPartner: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        attachments: { select: { id: true, fileUrl: true, fileName: true, fileType: true } },
        payments: { select: { id: true, amount: true, date: true, mode: true, reference: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ["direction"],
      where,
      _sum: {
        totalAmount: true,
        amountPaid: true,
      },
    }),
  ]);

  let totalCredit = 0;
  let totalDebit = 0;
  let totalDebitPaid = 0;
  let totalDebitPending = 0;

  for (const group of aggregations) {
    const total = Number(group._sum.totalAmount || 0);
    const paid = Number(group._sum.amountPaid || 0);
    if (group.direction === "CREDIT") {
      totalCredit += total;
    } else if (group.direction === "DEBIT") {
      totalDebit += total;
      totalDebitPaid += paid;
      totalDebitPending += total - paid;
    }
  }

  return {
    transactions: transactions.map((t) => ({
      ...t,
      totalAmount: Number(t.totalAmount),
      amountPaid: Number(t.amountPaid),
      rate: t.rate ? Number(t.rate) : null,
      quantity: t.quantity ? Number(t.quantity) : null,
      gstPercent: t.gstPercent ? Number(t.gstPercent) : null,
      gstAmount: t.gstAmount ? Number(t.gstAmount) : null,
    })),
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    summary: {
      totalCredit,
      totalDebit,
      netCash: totalCredit - totalDebitPaid,
      totalDebitPending,
    },
  };
}

