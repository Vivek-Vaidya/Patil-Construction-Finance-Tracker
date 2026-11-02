"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { canEditEntries } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getPayablesData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const where: any = {
    isDeleted: false,
    direction: "DEBIT",
    paymentStatus: { in: ["UNPAID", "PARTIAL"] },
  };

  // Supervisor isolation
  if (session.user.role === "SUPERVISOR") {
    where.site = {
      users: {
        some: { userId: session.user.id },
      },
    };
  }

  const bills = await prisma.transaction.findMany({
    where,
    include: {
      party: { select: { id: true, name: true, type: true, phone: true } },
      site: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      payments: {
        select: { id: true, amount: true, date: true, mode: true, reference: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { date: "asc" },
  });

  const now = new Date();

  // Aging calculation
  let bucket0_30 = 0;
  let bucket31_60 = 0;
  let bucket61_90 = 0;
  let bucket90Plus = 0;
  let totalPayables = 0;

  const enrichedBills = bills.map((b) => {
    const total = Number(b.totalAmount);
    const paid = Number(b.amountPaid);
    const balanceDue = Math.max(0, total - paid);
    totalPayables += balanceDue;

    const bDate = new Date(b.date);
    const diffTime = Math.abs(now.getTime() - bDate.getTime());
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
      ...b,
      totalAmount: total,
      amountPaid: paid,
      balanceDue,
      daysAgo,
      bucket,
      payments: b.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  });

  return {
    bills: enrichedBills,
    summary: {
      totalPayables,
      bucket0_30,
      bucket31_60,
      bucket61_90,
      bucket90Plus,
      totalBillsCount: enrichedBills.length,
    },
  };
}

export async function recordBillPayment(data: {
  transactionId: string;
  amount: number;
  paymentMode: string;
  date: string;
  reference?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (!canEditEntries(session.user.role)) {
    return { error: "Permission denied to record payments." };
  }

  if (data.amount <= 0) {
    return { error: "Payment amount must be greater than zero." };
  }

  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: data.transactionId },
      include: { party: true },
    });

    if (!tx || tx.isDeleted) {
      return { error: "Bill not found." };
    }

    const currentTotal = Number(tx.totalAmount);
    const currentPaid = Number(tx.amountPaid);
    const currentBalance = currentTotal - currentPaid;

    if (data.amount > currentBalance) {
      return {
        error: `Payment amount (₹${data.amount}) cannot exceed outstanding balance (₹${currentBalance}).`,
      };
    }

    const newAmountPaid = currentPaid + data.amount;
    const newStatus = newAmountPaid >= currentTotal ? "PAID" : "PARTIAL";
    const paymentDate = new Date(data.date);

    await prisma.$transaction(async (prismaClient) => {
      // 1. Record settlement Payment
      await prismaClient.payment.create({
        data: {
          transactionId: tx.id,
          date: paymentDate,
          amount: data.amount,
          mode: data.paymentMode,
          reference: data.reference || null,
          notes: data.notes || null,
        },
      });

      // 2. Update transaction amountPaid & status
      await prismaClient.transaction.update({
        where: { id: tx.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: newStatus,
        },
      });
    });

    await logAudit({
      entityType: "BILL_PAYMENT",
      entityId: tx.id,
      action: "UPDATE",
      userId: session.user.id,
      newValue: {
        paymentAmount: data.amount,
        newAmountPaid,
        newStatus,
        partyName: tx.party?.name,
      },
    });

    revalidatePath("/payables");
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    revalidatePath("/parties");

    return { success: true, newStatus, remaining: currentTotal - newAmountPaid };
  } catch (err: any) {
    console.error("Error recording bill payment:", err);
    return { error: err.message || "Failed to record payment." };
  }
}
