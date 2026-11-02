"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function globalSearch(query: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const q = query.trim();
  if (!q) return { parties: [], sites: [], transactions: [] };

  const [parties, sites, transactions] = await Promise.all([
    prisma.party.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { gstNumber: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.site.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { location: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: {
        isDeleted: false,
        OR: [
          { description: { contains: q } },
          { billNumber: { contains: q } },
        ],
      },
      include: {
        site: { select: { name: true } },
        party: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  return {
    parties,
    sites,
    transactions: transactions.map((t) => ({
      ...t,
      totalAmount: Number(t.totalAmount),
    })),
  };
}
