"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { canEditEntries } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getReceivablesData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // 1. Part-paid or unpaid client receipt transactions
  const unpaidReceipts = await prisma.transaction.findMany({
    where: {
      isDeleted: false,
      direction: "CREDIT",
      type: "CLIENT_RECEIPT",
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    include: {
      party: { select: { id: true, name: true, phone: true } },
      site: { select: { id: true, name: true, contractValue: true } },
      payments: {
        select: { id: true, amount: true, date: true, mode: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { date: "asc" },
  });

  // 2. Also check sites with contract balances not yet fully collected
  const sites = await prisma.site.findMany({
    where: {
      contractValue: { gt: 0 },
      status: { in: ["ACTIVE", "PLANNED", "ON_HOLD", "COMPLETED"] },
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      transactions: {
        where: { isDeleted: false, direction: "CREDIT", type: "CLIENT_RECEIPT" },
        select: { totalAmount: true, amountPaid: true },
      },
    },
  });

  const now = new Date();
  let totalReceivables = 0;
  let bucket0_30 = 0;
  let bucket31_60 = 0;
  let bucket61_90 = 0;
  let bucket90Plus = 0;

  const siteReceivables = sites
    .map((s) => {
      const contract = Number(s.contractValue || 0);
      const totalCollected = s.transactions.reduce((acc, t) => acc + Number(t.amountPaid || t.totalAmount || 0), 0);
      const balanceDue = Math.max(0, contract - totalCollected);

      if (balanceDue <= 0) return null;
      totalReceivables += balanceDue;

      const startDate = s.startDate ? new Date(s.startDate) : new Date(s.createdAt);
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let bucket: "0-30" | "31-60" | "61-90" | "90+";
      if (daysAgo <= 30) {
        bucket = "0-30";
        bucket0_30 += balanceDue;
      } else if (daysAgo <= 60) {
        bucket = "31-60";
        bucket31_60 += balanceDue;
      } else if (daysAgo <= 90) {
        bucket = "61-90";
        bucket61_90 += balanceDue;
      } else {
        bucket = "90+";
        bucket90Plus += balanceDue;
      }

      return {
        id: s.id,
        siteName: s.name,
        clientName: s.client?.name || "Client",
        clientPhone: s.client?.phone || null,
        contractValue: contract,
        totalCollected,
        balanceDue,
        daysAgo,
        bucket,
      };
    })
    .filter(Boolean);

  const activeClients = await prisma.party.findMany({
    where: { type: "CLIENT", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const activeSites = await prisma.site.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return {
    siteReceivables,
    unpaidReceipts: unpaidReceipts.map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      amountPaid: Number(r.amountPaid),
      balanceDue: Number(r.totalAmount) - Number(r.amountPaid),
    })),
    clients: activeClients,
    sites: activeSites,
    summary: {
      totalReceivables,
      bucket0_30,
      bucket31_60,
      bucket61_90,
      bucket90Plus,
      totalCount: siteReceivables.length,
    },
  };
}

export async function recordClientReceipt(data: {
  siteId: string;
  partyId?: string;
  amount: number;
  paymentMode: string;
  date: string;
  reference?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (!canEditEntries(session.user.role)) {
    return { error: "Permission denied." };
  }

  if (data.amount <= 0) {
    return { error: "Amount must be greater than zero." };
  }

  try {
    const site = await prisma.site.findUnique({
      where: { id: data.siteId },
      include: { client: true },
    });

    if (!site) return { error: "Site not found." };

    const effectivePartyId = data.partyId || site.clientId || null;
    const txDate = new Date(data.date);

    const tx = await prisma.transaction.create({
      data: {
        date: txDate,
        direction: "CREDIT",
        type: "CLIENT_RECEIPT",
        siteId: site.id,
        partyId: effectivePartyId,
        description: `Client payment received for ${site.name}`,
        totalAmount: data.amount,
        amountPaid: data.amount,
        paymentStatus: "PAID",
        paymentMode: data.paymentMode,
        billNumber: data.reference || null,
        notes: data.notes || null,
        createdById: session.user.id,
      },
    });

    await logAudit({
      entityType: "CLIENT_RECEIPT",
      entityId: tx.id,
      action: "CREATE",
      userId: session.user.id,
      newValue: {
        amount: data.amount,
        siteName: site.name,
      },
    });

    revalidatePath("/receivables");
    revalidatePath("/transactions");
    revalidatePath("/sites");
    revalidatePath("/dashboard");

    return { success: true, transactionId: tx.id };
  } catch (err: any) {
    return { error: err.message || "Failed to record client receipt." };
  }
}
