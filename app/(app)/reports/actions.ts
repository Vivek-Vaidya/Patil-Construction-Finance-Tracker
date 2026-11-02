"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getFYRange } from "@/lib/money";

export async function getReportsData(params: {
  reportType: "PL" | "CASH_FLOW" | "PARTNER_CAPITAL" | "SITE_EXPENSE" | "CATEGORY_MATERIAL" | "GST_SUMMARY" | "DAY_BOOK";
  siteId?: string;
  fy?: string;
  date?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const { reportType, siteId, fy, date } = params;

  // Date range from FY
  let dateFilter: any = {};
  if (fy && fy !== "ALL") {
    const match = fy.match(/(\d{4})/);
    if (match) {
      const year = parseInt(match[1]);
      const range = getFYRange(new Date(year, 4, 1));
      dateFilter = { gte: range.start, lte: range.end };
    }
  }

  // 1. Profit & Loss Report
  if (reportType === "PL") {
    const where: any = { isDeleted: false };
    if (siteId && siteId !== "ALL") where.siteId = siteId;
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    const txs = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true } },
        site: { select: { name: true } },
      },
    });

    let clientBillingIncome = 0;
    let otherIncome = 0;
    const expenseByCategory: { [cat: string]: number } = {};
    let totalExpenses = 0;

    for (const t of txs) {
      const amt = Number(t.totalAmount);
      if (t.direction === "CREDIT") {
        if (t.type === "CLIENT_RECEIPT") clientBillingIncome += amt;
        else if (t.type === "OTHER_INCOME") otherIncome += amt;
      } else if (t.direction === "DEBIT" && t.type === "EXPENSE") {
        const c = t.category?.name || "General Expenses";
        expenseByCategory[c] = (expenseByCategory[c] || 0) + amt;
        totalExpenses += amt;
      }
    }

    const totalRevenue = clientBillingIncome + otherIncome;
    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      type: "PL",
      revenue: {
        clientBilling: clientBillingIncome,
        otherIncome,
        total: totalRevenue,
      },
      expenses: Object.entries(expenseByCategory).map(([category, amount]) => ({
        category,
        amount,
      })),
      totalExpenses,
      netProfit,
      margin: Math.round(margin * 10) / 10,
    };
  }

  // 2. Cash Flow Statement (Monthly)
  if (reportType === "CASH_FLOW") {
    const where: any = { isDeleted: false };
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    const txs = await prisma.transaction.findMany({
      where,
      orderBy: { date: "asc" },
    });

    const monthBuckets: {
      [m: string]: {
        month: string;
        inflows: { capital: number; clientReceipts: number; loans: number; other: number; total: number };
        outflows: { material: number; labour: number; contractors: number; overheads: number; total: number };
        netCashFlow: number;
      };
    } = {};

    for (const t of txs) {
      const d = new Date(t.date);
      const mKey = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
      if (!monthBuckets[mKey]) {
        monthBuckets[mKey] = {
          month: mKey,
          inflows: { capital: 0, clientReceipts: 0, loans: 0, other: 0, total: 0 },
          outflows: { material: 0, labour: 0, contractors: 0, overheads: 0, total: 0 },
          netCashFlow: 0,
        };
      }

      const amt = Number(t.amountPaid || t.totalAmount);
      if (t.direction === "CREDIT") {
        if (t.type === "PARTNER_INVESTMENT") monthBuckets[mKey].inflows.capital += amt;
        else if (t.type === "CLIENT_RECEIPT") monthBuckets[mKey].inflows.clientReceipts += amt;
        else if (t.type === "LOAN_RECEIVED") monthBuckets[mKey].inflows.loans += amt;
        else monthBuckets[mKey].inflows.other += amt;
        monthBuckets[mKey].inflows.total += amt;
      } else {
        monthBuckets[mKey].outflows.total += amt;
      }
      monthBuckets[mKey].netCashFlow = monthBuckets[mKey].inflows.total - monthBuckets[mKey].outflows.total;
    }

    return {
      type: "CASH_FLOW",
      months: Object.values(monthBuckets),
    };
  }

  // 3. Partner Capital Statement
  if (reportType === "PARTNER_CAPITAL") {
    const partners = await prisma.partner.findMany({ where: { isActive: true } });
    const partnerData = await Promise.all(
      partners.map(async (p) => {
        const [investments, withdrawals, outOfPocket] = await Promise.all([
          prisma.transaction.aggregate({
            where: { isDeleted: false, partnerId: p.id, direction: "CREDIT", type: "PARTNER_INVESTMENT" },
            _sum: { totalAmount: true },
          }),
          prisma.transaction.aggregate({
            where: { isDeleted: false, partnerId: p.id, direction: "DEBIT", type: "PARTNER_WITHDRAWAL" },
            _sum: { totalAmount: true },
          }),
          prisma.transaction.aggregate({
            where: { isDeleted: false, partnerId: p.id, paidByType: "PARTNER", direction: "DEBIT", type: "EXPENSE" },
            _sum: { totalAmount: true },
          }),
        ]);

        const invested = Number(investments._sum.totalAmount || 0);
        const withdrawn = Number(withdrawals._sum.totalAmount || 0);
        const personalPaid = Number(outOfPocket._sum.totalAmount || 0);
        const netOwed = invested + personalPaid - withdrawn;

        return {
          id: p.id,
          name: p.name,
          sharePercent: p.sharePercent ? Number(p.sharePercent) : 0,
          invested,
          personalPaid,
          withdrawn,
          netOwed,
        };
      })
    );

    return {
      type: "PARTNER_CAPITAL",
      partners: partnerData,
    };
  }

  // 4. Site-wise Expense Report
  if (reportType === "SITE_EXPENSE") {
    const sites = await prisma.site.findMany({
      include: {
        transactions: {
          where: { isDeleted: false, direction: "DEBIT" },
          include: { category: { select: { name: true } } },
        },
      },
    });

    const report = sites.map((s) => {
      const catSpend: { [cat: string]: number } = {};
      let totalSpent = 0;
      for (const t of s.transactions) {
        const amt = Number(t.totalAmount);
        const c = t.category?.name || "General";
        catSpend[c] = (catSpend[c] || 0) + amt;
        totalSpent += amt;
      }
      return {
        siteName: s.name,
        location: s.location,
        contractValue: s.contractValue ? Number(s.contractValue) : 0,
        totalSpent,
        categories: catSpend,
      };
    });

    return {
      type: "SITE_EXPENSE",
      sites: report,
    };
  }

  // 5. Category & Material Breakdown
  if (reportType === "CATEGORY_MATERIAL") {
    const where: any = { isDeleted: false, direction: "DEBIT" };
    if (siteId && siteId !== "ALL") where.siteId = siteId;

    const [categoryAgg, materials] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where,
        _sum: { totalAmount: true },
      }),
      prisma.transaction.findMany({
        where: { ...where, materialId: { not: null } },
        include: { material: { select: { name: true } } },
      }),
    ]);

    const catList = await prisma.category.findMany();
    const categories = categoryAgg.map((c) => ({
      name: catList.find((x) => x.id === c.categoryId)?.name || "Uncategorized",
      amount: Number(c._sum.totalAmount || 0),
    }));

    const matMap: { [name: string]: { quantity: number; unit: string; totalAmount: number } } = {};
    for (const m of materials) {
      const name = m.material?.name || "Material";
      if (!matMap[name]) {
        matMap[name] = { quantity: 0, unit: m.unit || "", totalAmount: 0 };
      }
      matMap[name].quantity += Number(m.quantity || 0);
      matMap[name].totalAmount += Number(m.totalAmount);
    }

    return {
      type: "CATEGORY_MATERIAL",
      categories,
      materials: Object.entries(matMap).map(([name, data]) => ({ name, ...data })),
    };
  }

  // 6. GST Summary Report
  if (reportType === "GST_SUMMARY") {
    const where: any = { isDeleted: false, gstPercent: { gt: 0 } };
    if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

    const txs = await prisma.transaction.findMany({
      where,
      include: {
        party: { select: { name: true, gstNumber: true } },
        site: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    let totalBaseAmount = 0;
    let totalGSTPaid = 0;
    const gstRateBreakdown: { [rate: string]: { base: number; gst: number } } = {};

    const items = txs.map((t) => {
      const total = Number(t.totalAmount);
      const gst = Number(t.gstAmount || 0);
      const base = total - gst;
      const rate = `${t.gstPercent}%`;

      totalBaseAmount += base;
      totalGSTPaid += gst;

      if (!gstRateBreakdown[rate]) {
        gstRateBreakdown[rate] = { base: 0, gst: 0 };
      }
      gstRateBreakdown[rate].base += base;
      gstRateBreakdown[rate].gst += gst;

      return {
        id: t.id,
        date: t.date,
        billNumber: t.billNumber || "-",
        partyName: t.party?.name || "-",
        gstNumber: t.party?.gstNumber || "-",
        description: t.description,
        rate,
        baseAmount: base,
        gstAmount: gst,
        totalAmount: total,
      };
    });

    return {
      type: "GST_SUMMARY",
      totalBaseAmount,
      totalGSTPaid,
      rates: Object.entries(gstRateBreakdown).map(([rate, vals]) => ({ rate, ...vals })),
      items,
    };
  }

  // 7. Day Book
  if (reportType === "DAY_BOOK") {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    const txs = await prisma.transaction.findMany({
      where: {
        isDeleted: false,
        date: { gte: start, lte: end },
      },
      include: {
        site: { select: { name: true } },
        party: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    let dayCredit = 0;
    let dayDebit = 0;

    const entries = txs.map((t) => {
      const total = Number(t.totalAmount);
      if (t.direction === "CREDIT") dayCredit += total;
      else dayDebit += total;

      return {
        id: t.id,
        direction: t.direction,
        type: t.type,
        siteName: t.site?.name || "Company",
        partyName: t.party?.name || "-",
        description: t.description,
        paymentMode: t.paymentMode || "-",
        amount: total,
      };
    });

    return {
      type: "DAY_BOOK",
      date: start,
      dayCredit,
      dayDebit,
      netDayCash: dayCredit - dayDebit,
      entries,
    };
  }

  throw new Error("Invalid report type");
}
