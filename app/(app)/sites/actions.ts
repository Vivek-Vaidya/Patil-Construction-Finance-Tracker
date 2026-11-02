"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getSitesList() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = session.user.role;

  const where: any = {};
  if (userRole === "SUPERVISOR") {
    where.users = {
      some: { userId },
    };
  }

  const [sites, parties] = await Promise.all([
    prisma.site.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.party.findMany({
      where: { type: "CLIENT", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const sitesWithMetrics = await Promise.all(
    sites.map(async (s) => {
      // 1. Total expenses (Debits)
      const expenseAgg = await prisma.transaction.aggregate({
        where: {
          siteId: s.id,
          isDeleted: false,
          direction: "DEBIT",
        },
        _sum: {
          totalAmount: true,
          amountPaid: true,
        },
      });

      // 2. Money received from client (Credits)
      const receiptAgg = await prisma.transaction.aggregate({
        where: {
          siteId: s.id,
          isDeleted: false,
          direction: "CREDIT",
          type: "CLIENT_RECEIPT",
        },
        _sum: {
          totalAmount: true,
          amountPaid: true,
        },
      });

      const totalExpense = Number(expenseAgg._sum.totalAmount || 0);
      const totalExpensePaid = Number(expenseAgg._sum.amountPaid || 0);
      const vendorPayables = Math.max(0, totalExpense - totalExpensePaid);

      const contractValue = s.contractValue ? Number(s.contractValue) : 0;
      const totalReceived = Number(receiptAgg._sum.amountPaid || receiptAgg._sum.totalAmount || 0);
      const clientReceivable = Math.max(0, contractValue - totalReceived);

      // Site Profit/Loss: Cash Received minus Total Expenses
      const profitLoss = totalReceived - totalExpense;

      // Budget utilization %
      const utilization = contractValue > 0 ? Math.round((totalExpense / contractValue) * 100) : 0;

      return {
        ...s,
        contractValue,
        totalExpense,
        vendorPayables,
        totalReceived,
        clientReceivable,
        profitLoss,
        utilization,
      };
    })
  );

  const totalSites = sitesWithMetrics.length;
  const activeSites = sitesWithMetrics.filter((s) => s.status === "ACTIVE").length;
  const completedSites = sitesWithMetrics.filter((s) => s.status === "COMPLETED").length;
  const plannedSites = sitesWithMetrics.filter((s) => s.status === "PLANNED").length;

  const totalContractValue = sitesWithMetrics.reduce((sum, s) => sum + s.contractValue, 0);
  const totalSpentAcrossSites = sitesWithMetrics.reduce((sum, s) => sum + s.totalExpense, 0);
  const totalReceivedAcrossSites = sitesWithMetrics.reduce((sum, s) => sum + s.totalReceived, 0);

  return {
    sites: sitesWithMetrics,
    clients: parties,
    counts: {
      total: totalSites,
      active: activeSites,
      completed: completedSites,
      planned: plannedSites,
      totalContractValue,
      totalSpentAcrossSites,
      totalReceivedAcrossSites,
    },
  };
}

export async function getSiteDetail(siteId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [site, transactions] = await Promise.all([
    prisma.site.findUnique({
      where: { id: siteId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        users: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: { siteId, isDeleted: false },
      include: {
        party: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true } },
        material: { select: { id: true, name: true } },
        paidByPartner: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  if (!site) throw new Error("Site not found");

  // Category Breakdown
  const categoryMap: { [cat: string]: number } = {};
  const materialMap: { [mat: string]: { qty: number; unit: string; total: number } } = {};
  let totalExpense = 0;
  let totalExpensePaid = 0;
  let totalReceived = 0;

  for (const t of transactions) {
    const total = Number(t.totalAmount);
    const paid = Number(t.amountPaid);

    if (t.direction === "DEBIT") {
      totalExpense += total;
      totalExpensePaid += paid;
      const catName = t.category?.name || "Uncategorized";
      categoryMap[catName] = (categoryMap[catName] || 0) + total;

      if (t.material) {
        const mName = t.material.name;
        if (!materialMap[mName]) {
          materialMap[mName] = { qty: 0, unit: t.unit || "", total: 0 };
        }
        materialMap[mName].qty += Number(t.quantity || 0);
        materialMap[mName].total += total;
      }
    } else if (t.direction === "CREDIT" && t.type === "CLIENT_RECEIPT") {
      totalReceived += paid || total;
    }
  }

  const contractVal = site.contractValue ? Number(site.contractValue) : 0;
  const vendorPayables = Math.max(0, totalExpense - totalExpensePaid);
  const clientReceivable = Math.max(0, contractVal - totalReceived);
  const profitLoss = totalReceived - totalExpense;

  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  const materialList = Object.entries(materialMap).map(([name, data]) => ({
    name,
    quantity: data.qty,
    unit: data.unit,
    totalAmount: data.total,
  }));

  return {
    site: {
      ...site,
      contractValue: contractVal,
    },
    metrics: {
      totalExpense,
      totalExpensePaid,
      vendorPayables,
      totalReceived,
      clientReceivable,
      profitLoss,
      utilization: contractVal > 0 ? Math.round((totalExpense / contractVal) * 100) : 0,
    },
    categoryChartData,
    materialList,
    transactions: transactions.map((t) => ({
      ...t,
      totalAmount: Number(t.totalAmount),
      amountPaid: Number(t.amountPaid),
      rate: t.rate ? Number(t.rate) : null,
      quantity: t.quantity ? Number(t.quantity) : null,
    })),
  };
}

export async function createSite(data: {
  name: string;
  location: string;
  clientId?: string;
  contractValue?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (session.user.role === "VIEWER") {
    return { error: "Permission denied." };
  }

  if (!data.name.trim() || !data.location.trim()) {
    return { error: "Site name and location are required." };
  }

  try {
    const site = await prisma.site.create({
      data: {
        name: data.name.trim(),
        location: data.location.trim(),
        clientId: data.clientId || null,
        contractValue: data.contractValue != null ? data.contractValue : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status || "ACTIVE",
        notes: data.notes?.trim() || null,
      },
    });

    await logAudit({
      entityType: "SITE",
      entityId: site.id,
      action: "CREATE",
      userId: session.user.id,
      newValue: { name: site.name, location: site.location },
    });

    revalidatePath("/sites");
    return { success: true, site };
  } catch (err: any) {
    return { error: err.message || "Failed to create site." };
  }
}

export async function updateSiteStatus(siteId: string, status: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const site = await prisma.site.update({
      where: { id: siteId },
      data: { status },
    });

    await logAudit({
      entityType: "SITE",
      entityId: siteId,
      action: "UPDATE",
      userId: session.user.id,
      newValue: { status },
    });

    revalidatePath("/sites");
    revalidatePath(`/sites/${siteId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update site status." };
  }
}
