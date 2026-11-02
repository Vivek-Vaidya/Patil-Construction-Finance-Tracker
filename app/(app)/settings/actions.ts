"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getSettingsData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [auditLogs, monthLocks, deletedTxs, sites, parties, partners] = await Promise.all([
    prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.monthLock.findMany({
      include: {
        lockedBy: { select: { name: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.transaction.findMany({
      where: { isDeleted: true },
      include: {
        site: { select: { name: true } },
        party: { select: { name: true } },
      },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.site.findMany({ select: { id: true, name: true } }),
    prisma.party.findMany({ select: { id: true, name: true, type: true } }),
    prisma.partner.findMany({ select: { id: true, name: true } }),
  ]);

  return {
    auditLogs: auditLogs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    monthLocks,
    deletedTxs: deletedTxs.map((t) => ({
      ...t,
      totalAmount: Number(t.totalAmount),
      amountPaid: Number(t.amountPaid),
    })),
    sites,
    parties,
    partners,
    userRole: session.user.role,
  };
}

export async function restoreDeletedTransaction(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only administrators can restore deleted entries." };
  }

  try {
    const tx = await prisma.transaction.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedById: null,
      },
    });

    await logAudit({
      entityType: "TRANSACTION",
      entityId: id,
      action: "RESTORE",
      userId: session.user.id,
      newValue: { description: tx.description, totalAmount: Number(tx.totalAmount) },
    });

    revalidatePath("/settings");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to restore transaction." };
  }
}

export async function toggleMonthLock(year: number, month: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only administrators can lock or unlock months." };
  }

  try {
    const existing = await prisma.monthLock.findUnique({
      where: { year_month: { year, month } },
    });

    if (existing) {
      await prisma.monthLock.delete({
        where: { id: existing.id },
      });
      await logAudit({
        entityType: "MONTH_LOCK",
        entityId: `${year}-${month}`,
        action: "UPDATE",
        userId: session.user.id,
        newValue: { status: "UNLOCKED", year, month },
      });
    } else {
      await prisma.monthLock.create({
        data: {
          year,
          month,
          lockedById: session.user.id,
        },
      });
      await logAudit({
        entityType: "MONTH_LOCK",
        entityId: `${year}-${month}`,
        action: "LOCK",
        userId: session.user.id,
        newValue: { status: "LOCKED", year, month },
      });
    }

    revalidatePath("/settings");
    return { success: true, isLocked: !existing };
  } catch (err: any) {
    return { error: err.message || "Failed to toggle month lock." };
  }
}

export async function getReconciliationReport() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // 1. Total ledger amount
  const totalLedgerAgg = await prisma.transaction.groupBy({
    by: ["direction"],
    where: { isDeleted: false },
    _sum: { totalAmount: true, amountPaid: true },
  });

  let totalCredit = 0;
  let totalDebit = 0;
  let totalDebitPaid = 0;
  for (const g of totalLedgerAgg) {
    const total = Number(g._sum.totalAmount || 0);
    const paid = Number(g._sum.amountPaid || 0);
    if (g.direction === "CREDIT") totalCredit += total;
    else {
      totalDebit += total;
      totalDebitPaid += paid;
    }
  }

  // 2. Sum of site ledgers + company-level ledger
  const siteLedgersAgg = await prisma.transaction.groupBy({
    by: ["siteId", "direction"],
    where: { isDeleted: false },
    _sum: { totalAmount: true },
  });

  let siteSumDebit = 0;
  let siteSumCredit = 0;
  let companyDebit = 0;
  let companyCredit = 0;

  for (const s of siteLedgersAgg) {
    const amt = Number(s._sum.totalAmount || 0);
    if (s.siteId === null) {
      if (s.direction === "CREDIT") companyCredit += amt;
      else companyDebit += amt;
    } else {
      if (s.direction === "CREDIT") siteSumCredit += amt;
      else siteSumDebit += amt;
    }
  }

  const combinedDebit = siteSumDebit + companyDebit;
  const combinedCredit = siteSumCredit + companyCredit;

  const debitDifference = Math.abs(totalDebit - combinedDebit);
  const creditDifference = Math.abs(totalCredit - combinedCredit);

  // 3. Payables check: total billed minus total paid
  const calculatedPayables = totalDebit - totalDebitPaid;

  const unpaidPayablesAgg = await prisma.transaction.aggregate({
    where: {
      isDeleted: false,
      direction: "DEBIT",
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    _sum: { totalAmount: true, amountPaid: true },
  });

  const recordedPendingPayables =
    Number(unpaidPayablesAgg._sum.totalAmount || 0) - Number(unpaidPayablesAgg._sum.amountPaid || 0);
  const payablesDiff = Math.abs(calculatedPayables - recordedPendingPayables);

  // 4. Partner balance reconciliation
  const partners = await prisma.partner.findMany({ where: { isActive: true } });
  const partnerReconciliations = await Promise.all(
    partners.map(async (p) => {
      const [inv, withdr, outOfPocket] = await Promise.all([
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

      const invested = Number(inv._sum.totalAmount || 0);
      const withdrawn = Number(withdr._sum.totalAmount || 0);
      const personalPaid = Number(outOfPocket._sum.totalAmount || 0);
      const netOwed = invested + personalPaid - withdrawn;

      return {
        name: p.name,
        invested,
        withdrawn,
        personalPaid,
        netOwed,
        reconciled: true,
      };
    })
  );

  return {
    ledgerReconciliation: {
      totalDebit,
      siteSumDebit,
      companyDebit,
      combinedDebit,
      debitDifference,
      isDebitReconciled: debitDifference === 0,
      totalCredit,
      siteSumCredit,
      companyCredit,
      combinedCredit,
      creditDifference,
      isCreditReconciled: creditDifference === 0,
    },
    payablesReconciliation: {
      calculatedPayables,
      recordedPendingPayables,
      payablesDiff,
      isPayablesReconciled: payablesDiff === 0,
    },
    partners: partnerReconciliations,
    overallReconciled: debitDifference === 0 && creditDifference === 0 && payablesDiff === 0,
  };
}

export async function getFullBackupData() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Only administrators can generate full database backups.");
  }

  const [transactions, sites, parties, partners, payments, auditLogs] = await Promise.all([
    prisma.transaction.findMany({
      include: {
        site: { select: { name: true } },
        party: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.site.findMany(),
    prisma.party.findMany(),
    prisma.partner.findMany(),
    prisma.payment.findMany(),
    prisma.auditLog.findMany({ take: 200 }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      ID: t.id,
      Date: t.date.toISOString().split("T")[0],
      Direction: t.direction,
      Type: t.type,
      Site: t.site?.name || "Company",
      Party: t.party?.name || "-",
      Category: t.category?.name || "-",
      Description: t.description,
      "Total Amount": Number(t.totalAmount),
      "Amount Paid": Number(t.amountPaid),
      Status: t.paymentStatus,
      "Bill Number": t.billNumber || "-",
      "Payment Mode": t.paymentMode || "-",
      "Paid By": t.paidByType,
      Deleted: t.isDeleted,
    })),
    sites: sites.map((s) => ({
      ID: s.id,
      Name: s.name,
      Location: s.location,
      Status: s.status,
      "Contract Value": s.contractValue ? Number(s.contractValue) : 0,
      Notes: s.notes || "-",
    })),
    parties: parties.map((p) => ({
      ID: p.id,
      Name: p.name,
      Type: p.type,
      Phone: p.phone || "-",
      GSTIN: p.gstNumber || "-",
      Address: p.address || "-",
    })),
    partners: partners.map((p) => ({
      ID: p.id,
      Name: p.name,
      Phone: p.phone || "-",
      "Share %": p.sharePercent ? Number(p.sharePercent) : 0,
      Active: p.isActive,
    })),
    payments: payments.map((p) => ({
      ID: p.id,
      "Transaction ID": p.transactionId,
      Date: p.date.toISOString().split("T")[0],
      Amount: Number(p.amount),
      Mode: p.mode,
      Reference: p.reference || "-",
    })),
  };
}

export async function bulkImportTransactions(
  rows: Array<{
    date: string;
    direction: "CREDIT" | "DEBIT";
    type: string;
    description: string;
    totalAmount: number;
    amountPaid?: number;
    billNumber?: string;
    siteName?: string;
    partyName?: string;
  }>
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only administrators can run bulk CSV data import." };
  }

  let importedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.description || !row.totalAmount || row.totalAmount <= 0) {
        errors.push(`Row ${i + 1}: Invalid description or amount`);
        continue;
      }

      // Find site if named
      let siteId: string | null = null;
      if (row.siteName) {
        const s = await prisma.site.findFirst({
          where: { name: { contains: row.siteName.trim() } },
        });
        if (s) siteId = s.id;
      }

      // Find party if named
      let partyId: string | null = null;
      if (row.partyName) {
        const p = await prisma.party.findFirst({
          where: { name: { contains: row.partyName.trim() } },
        });
        if (p) partyId = p.id;
      }

      const total = Number(row.totalAmount);
      const paid = Number(row.amountPaid || total);
      const paymentStatus = paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";

      await prisma.transaction.create({
        data: {
          date: new Date(row.date || new Date()),
          direction: row.direction || "DEBIT",
          type: row.type || "EXPENSE",
          description: row.description.trim(),
          siteId,
          partyId,
          totalAmount: total,
          amountPaid: paid,
          paymentStatus,
          billNumber: row.billNumber || null,
          createdById: session.user.id,
        },
      });

      importedCount++;
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  await logAudit({
    entityType: "BULK_IMPORT",
    entityId: "CSV_IMPORT",
    action: "CREATE",
    userId: session.user.id,
    newValue: { importedCount, errorsCount: errors.length },
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true, importedCount, errors };
}
