"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewCompanyTotals, canViewPartnerData } from "@/lib/auth-utils";
import { getFYRange } from "@/lib/money";

export async function getDashboardData(filters?: {
  siteId?: string;
  fy?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const userId = session.user.id;
  const userRole = session.user.role;

  // Supervisors only see their assigned sites
  let siteCondition: any = {};
  if (userRole === "SUPERVISOR") {
    siteCondition = {
      users: {
        some: { userId },
      },
    };
  } else if (filters?.siteId && filters.siteId !== "ALL") {
    siteCondition = { id: filters.siteId };
  }

  // Determine date boundaries
  let dateFilter: any = {};
  if (filters?.dateFrom || filters?.dateTo) {
    if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }
  } else if (filters?.fy && filters.fy !== "ALL") {
    // e.g. "FY 2024-25"
    const match = filters.fy.match(/(\d{4})/);
    if (match) {
      const year = parseInt(match[1]);
      const range = getFYRange(new Date(year, 4, 1));
      dateFilter = { gte: range.start, lte: range.end };
    }
  }

  const txWhere: any = { isDeleted: false };
  if (Object.keys(dateFilter).length > 0) txWhere.date = dateFilter;
  if (filters?.siteId && filters.siteId !== "ALL") {
    txWhere.siteId = filters.siteId;
  } else if (userRole === "SUPERVISOR") {
    txWhere.site = {
      users: { some: { userId } },
    };
  }

  // 1. Core Ledger Aggregations
  const [aggregations, partnerInvAgg, recentTransactions, sites, allParties, overdueBills] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ["direction", "paymentStatus"],
        where: txWhere,
        _sum: {
          totalAmount: true,
          amountPaid: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          isDeleted: false,
          direction: "CREDIT",
          type: "PARTNER_INVESTMENT",
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
      }),
      prisma.transaction.findMany({
        where: txWhere,
        include: {
          site: { select: { name: true } },
          party: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 8,
      }),
      prisma.site.findMany({
        where: siteCondition,
        include: {
          transactions: {
            where: { isDeleted: false },
            select: { direction: true, totalAmount: true, amountPaid: true, type: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.party.findMany({
        where: { isActive: true },
        select: { id: true, name: true, type: true },
      }),
      prisma.transaction.findMany({
        where: {
          isDeleted: false,
          direction: "DEBIT",
          paymentStatus: { in: ["UNPAID", "PARTIAL"] },
          ...(userRole === "SUPERVISOR" ? { site: { users: { some: { userId } } } } : {}),
        },
        include: {
          party: { select: { name: true } },
          site: { select: { name: true } },
        },
        orderBy: { date: "asc" },
        take: 6,
      }),
    ]);

  let totalCredit = 0;
  let totalDebit = 0;
  let totalDebitPaid = 0;
  let totalPayables = 0;

  for (const group of aggregations) {
    const total = Number(group._sum.totalAmount || 0);
    const paid = Number(group._sum.amountPaid || 0);

    if (group.direction === "CREDIT") {
      totalCredit += total;
    } else if (group.direction === "DEBIT") {
      totalDebit += total;
      totalDebitPaid += paid;
      totalPayables += total - paid;
    }
  }

  const netCash = totalCredit - totalDebitPaid;
  const totalPartnerInvestment = Number(partnerInvAgg._sum.totalAmount || 0);

  // Total receivables calculated from sites contract balances
  let totalReceivables = 0;
  for (const s of sites) {
    const cVal = s.contractValue ? Number(s.contractValue) : 0;
    const collected = s.transactions
      .filter((t) => t.direction === "CREDIT" && t.type === "CLIENT_RECEIPT")
      .reduce((acc, t) => acc + Number(t.amountPaid || t.totalAmount || 0), 0);
    totalReceivables += Math.max(0, cVal - collected);
  }

  const totalSitesCount = sites.length;
  const activeSitesCount = sites.filter((s) => s.status === "ACTIVE").length;

  // 2. Chart 1: Monthly Inflow vs Outflow
  const allTxs = await prisma.transaction.findMany({
    where: txWhere,
    select: {
      date: true,
      direction: true,
      totalAmount: true,
      amountPaid: true,
    },
    orderBy: { date: "asc" },
  });

  const monthMap: { [month: string]: { month: string; credit: number; debit: number } } = {};
  for (const tx of allTxs) {
    const d = new Date(tx.date);
    const mKey = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (!monthMap[mKey]) {
      monthMap[mKey] = { month: mKey, credit: 0, debit: 0 };
    }
    const amt = Number(tx.totalAmount);
    if (tx.direction === "CREDIT") {
      monthMap[mKey].credit += amt;
    } else {
      monthMap[mKey].debit += amt;
    }
  }
  const monthlyChartData = Object.values(monthMap);

  // 3. Chart 2: Expense by Category
  const categoryAgg = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      ...txWhere,
      direction: "DEBIT",
      categoryId: { not: null },
    },
    _sum: { totalAmount: true },
  });

  const categories = await prisma.category.findMany();
  const categoryChartData = categoryAgg.map((c) => {
    const cat = categories.find((x) => x.id === c.categoryId);
    return {
      name: cat?.name || "Other",
      value: Number(c._sum.totalAmount || 0),
    };
  }).sort((a, b) => b.value - a.value);

  // 4. Chart 3: Expense by Site
  const siteExpenseChartData = sites.map((s) => {
    const spent = s.transactions
      .filter((t) => t.direction === "DEBIT")
      .reduce((acc, t) => acc + Number(t.totalAmount || 0), 0);
    return {
      name: s.name,
      spend: spent,
    };
  }).filter((s) => s.spend > 0);

  // 5. Chart 4: Partner Capital Split
  let partnerChartData: any[] = [];
  if (canViewPartnerData(userRole)) {
    const partners = await prisma.partner.findMany({ where: { isActive: true } });
    const pSums = await Promise.all(
      partners.map(async (p) => {
        const inv = await prisma.transaction.aggregate({
          where: { isDeleted: false, partnerId: p.id, direction: "CREDIT", type: "PARTNER_INVESTMENT" },
          _sum: { totalAmount: true },
        });
        return {
          name: p.name,
          value: Number(inv._sum.totalAmount || 0),
        };
      })
    );
    partnerChartData = pSums.filter((p) => p.value > 0);
  }

  // 6. Chart 5: Top 10 Vendors by Spend
  const vendorAgg = await prisma.transaction.groupBy({
    by: ["partyId"],
    where: {
      ...txWhere,
      direction: "DEBIT",
      partyId: { not: null },
    },
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 10,
  });

  const topVendorsChartData = vendorAgg.map((v) => {
    const party = allParties.find((p) => p.id === v.partyId);
    return {
      name: party?.name || "Unknown",
      spend: Number(v._sum.totalAmount || 0),
    };
  });

  // Overdue bills enriched with days
  const now = new Date();
  const enrichedOverdue = overdueBills.map((b) => {
    const bDate = new Date(b.date);
    const daysAgo = Math.floor(Math.abs(now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...b,
      totalAmount: Number(b.totalAmount),
      amountPaid: Number(b.amountPaid),
      balanceDue: Number(b.totalAmount) - Number(b.amountPaid),
      daysAgo,
    };
  });

  return {
    kpis: {
      totalCredit,
      totalExpense: totalDebit,
      netCash,
      totalPartnerInvestment,
      totalPayables,
      totalReceivables,
      totalSitesCount,
      activeSitesCount,
    },
    charts: {
      monthly: monthlyChartData,
      categories: categoryChartData,
      sites: siteExpenseChartData,
      partners: partnerChartData,
      topVendors: topVendorsChartData,
    },
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      totalAmount: Number(t.totalAmount),
      amountPaid: Number(t.amountPaid),
    })),
    overdueBills: enrichedOverdue,
    filterOptions: {
      sites: sites.map((s) => ({ id: s.id, name: s.name })),
      userRole,
    },
  };
}
