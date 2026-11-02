"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getPartiesList(typeFilter?: string, search?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const where: any = { isActive: true };
  if (typeFilter && typeFilter !== "ALL") {
    where.type = typeFilter;
  }

  if (search && search.trim()) {
    where.OR = [
      { name: { contains: search.trim() } },
      { phone: { contains: search.trim() } },
      { gstNumber: { contains: search.trim() } },
    ];
  }

  const parties = await prisma.party.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const partiesWithBalances = await Promise.all(
    parties.map(async (p) => {
      // All transactions for this party
      const agg = await prisma.transaction.groupBy({
        by: ["direction"],
        where: {
          partyId: p.id,
          isDeleted: false,
        },
        _sum: {
          totalAmount: true,
          amountPaid: true,
        },
      });

      let totalBilled = 0;
      let totalPaid = 0;
      let totalReceived = 0;

      for (const item of agg) {
        const total = Number(item._sum.totalAmount || 0);
        const paid = Number(item._sum.amountPaid || 0);

        if (item.direction === "DEBIT") {
          totalBilled += total;
          totalPaid += paid;
        } else if (item.direction === "CREDIT") {
          totalReceived += total;
        }
      }

      // If VENDOR/CONTRACTOR/LABOUR: Outstanding balance we owe them = totalBilled - totalPaid
      // If CLIENT: Outstanding balance they owe us = totalBilled - totalReceived
      const outstandingWeOwe = Math.max(0, totalBilled - totalPaid);
      const outstandingTheyOwe = p.type === "CLIENT" ? Math.max(0, totalBilled - totalReceived) : 0;

      return {
        ...p,
        totalBilled,
        totalPaid,
        totalReceived,
        outstandingWeOwe,
        outstandingTheyOwe,
      };
    })
  );

  const totalVendors = partiesWithBalances.filter((p) => ["VENDOR", "SUPPLIER"].includes(p.type)).length;
  const totalContractors = partiesWithBalances.filter((p) => ["CONTRACTOR", "LABOUR"].includes(p.type)).length;
  const totalClients = partiesWithBalances.filter((p) => p.type === "CLIENT").length;
  const totalOutstandingWeOwe = partiesWithBalances.reduce((sum, p) => sum + p.outstandingWeOwe, 0);

  return {
    parties: partiesWithBalances,
    counts: {
      total: partiesWithBalances.length,
      vendors: totalVendors,
      contractors: totalContractors,
      clients: totalClients,
      totalOutstandingWeOwe,
    },
  };
}

export async function getPartyLedger(partyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const [party, transactions] = await Promise.all([
    prisma.party.findUnique({ where: { id: partyId } }),
    prisma.transaction.findMany({
      where: {
        partyId,
        isDeleted: false,
      },
      include: {
        site: { select: { name: true } },
        category: { select: { name: true } },
        payments: {
          select: { id: true, amount: true, date: true, mode: true, reference: true },
        },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!party) throw new Error("Party not found");

  // Calculate chronological running balance
  let runningBalance = 0;
  const ledgerEntries = transactions.map((t) => {
    const total = Number(t.totalAmount);
    const paid = Number(t.amountPaid);
    const balanceDue = Math.max(0, total - paid);

    if (t.direction === "DEBIT") {
      runningBalance += balanceDue;
    } else {
      runningBalance -= total;
    }

    return {
      ...t,
      totalAmount: total,
      amountPaid: paid,
      balanceDue,
      runningBalance,
    };
  });

  return {
    party,
    entries: ledgerEntries,
  };
}

export async function createParty(data: {
  name: string;
  type: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  if (!data.name.trim()) {
    return { error: "Party name is required." };
  }

  try {
    const party = await prisma.party.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        phone: data.phone?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
        address: data.address?.trim() || null,
      },
    });

    await logAudit({
      entityType: "PARTY",
      entityId: party.id,
      action: "CREATE",
      userId: session.user.id,
      newValue: { name: party.name, type: party.type },
    });

    revalidatePath("/parties");
    return { success: true, party };
  } catch (err: any) {
    return { error: err.message || "Failed to create party." };
  }
}
