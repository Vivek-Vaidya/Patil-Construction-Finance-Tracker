"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { canViewPartnerData } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getPartnersSummary() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (!canViewPartnerData(session.user.role)) {
    throw new Error("Access denied: You do not have permission to view partner accounts.");
  }

  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const partnerSummaries = await Promise.all(
    partners.map(async (p) => {
      // 1. Total invested (Credit, PARTNER_INVESTMENT)
      const investmentAgg = await prisma.transaction.aggregate({
        where: {
          isDeleted: false,
          partnerId: p.id,
          direction: "CREDIT",
          type: "PARTNER_INVESTMENT",
        },
        _sum: { totalAmount: true },
      });

      // 2. Total withdrawn (Debit, PARTNER_WITHDRAWAL)
      const withdrawalAgg = await prisma.transaction.aggregate({
        where: {
          isDeleted: false,
          partnerId: p.id,
          direction: "DEBIT",
          type: "PARTNER_WITHDRAWAL",
        },
        _sum: { totalAmount: true },
      });

      // 3. Paid personally on behalf of company (Debit, paidByType=PARTNER)
      const personalPaidAgg = await prisma.transaction.aggregate({
        where: {
          isDeleted: false,
          partnerId: p.id,
          paidByType: "PARTNER",
          direction: "DEBIT",
          type: "EXPENSE",
        },
        _sum: { totalAmount: true },
      });

      const totalInvested = Number(investmentAgg._sum.totalAmount || 0);
      const totalWithdrawn = Number(withdrawalAgg._sum.totalAmount || 0);
      const totalPersonalPaid = Number(personalPaidAgg._sum.totalAmount || 0);

      // Net balance company owes partner:
      // (Total Invested + Personal Expenses Paid) - Total Withdrawn
      const netCompanyOwes = totalInvested + totalPersonalPaid - totalWithdrawn;

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        sharePercent: p.sharePercent ? Number(p.sharePercent) : null,
        totalInvested,
        totalWithdrawn,
        totalPersonalPaid,
        netCompanyOwes,
      };
    })
  );

  const totalCapital = partnerSummaries.reduce((sum, p) => sum + p.totalInvested, 0);
  const totalPersonalPaid = partnerSummaries.reduce((sum, p) => sum + p.totalPersonalPaid, 0);
  const totalWithdrawn = partnerSummaries.reduce((sum, p) => sum + p.totalWithdrawn, 0);
  const totalNetEquity = totalCapital + totalPersonalPaid - totalWithdrawn;

  return {
    partners: partnerSummaries,
    summary: {
      totalCapital,
      totalPersonalPaid,
      totalWithdrawn,
      totalNetEquity,
    },
  };
}

export async function getPartnerLedger(partnerId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  if (!canViewPartnerData(session.user.role)) {
    throw new Error("Access denied.");
  }

  const [partner, transactions] = await Promise.all([
    prisma.partner.findUnique({ where: { id: partnerId } }),
    prisma.transaction.findMany({
      where: {
        isDeleted: false,
        partnerId,
      },
      include: {
        site: { select: { name: true } },
        party: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return {
    partner,
    transactions: transactions.map((t) => ({
      ...t,
      totalAmount: Number(t.totalAmount),
      amountPaid: Number(t.amountPaid),
    })),
  };
}

export async function recordPartnerTransaction(data: {
  partnerId: string;
  type: "INVESTMENT" | "WITHDRAWAL";
  date: string;
  amount: number;
  paymentMode: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (session.user.role !== "ADMIN") {
    return { error: "Only administrators can record partner investments/withdrawals." };
  }

  if (data.amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  const partner = await prisma.partner.findUnique({ where: { id: data.partnerId } });
  if (!partner) return { error: "Partner not found." };

  const isInvestment = data.type === "INVESTMENT";
  const txDate = new Date(data.date);

  try {
    const tx = await prisma.transaction.create({
      data: {
        date: txDate,
        direction: isInvestment ? "CREDIT" : "DEBIT",
        type: isInvestment ? "PARTNER_INVESTMENT" : "PARTNER_WITHDRAWAL",
        description: isInvestment
          ? `Capital Investment by ${partner.name}`
          : `Capital Withdrawal by ${partner.name}`,
        paidByType: "PARTNER",
        partnerId: partner.id,
        totalAmount: data.amount,
        amountPaid: data.amount,
        paymentStatus: "PAID",
        paymentMode: data.paymentMode,
        notes: data.notes || null,
        createdById: session.user.id,
      },
    });

    await logAudit({
      entityType: "PARTNER_TRANSACTION",
      entityId: tx.id,
      action: "CREATE",
      userId: session.user.id,
      newValue: {
        partnerId: partner.id,
        partnerName: partner.name,
        type: data.type,
        amount: data.amount,
      },
    });

    revalidatePath("/partners");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");

    return { success: true, transactionId: tx.id };
  } catch (err: any) {
    return { error: err.message || "Failed to record partner transaction." };
  }
}

export async function createPartner(data: {
  name: string;
  phone?: string;
  sharePercent?: number;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (session.user.role !== "ADMIN") {
    return { error: "Only administrators can add partners." };
  }

  try {
    const partner = await prisma.partner.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        sharePercent: data.sharePercent != null ? data.sharePercent : null,
      },
    });

    await logAudit({
      entityType: "PARTNER",
      entityId: partner.id,
      action: "CREATE",
      userId: session.user.id,
      newValue: { name: partner.name, sharePercent: data.sharePercent },
    });

    revalidatePath("/partners");
    return { success: true, partner };
  } catch (err: any) {
    return { error: err.message || "Failed to create partner." };
  }
}
