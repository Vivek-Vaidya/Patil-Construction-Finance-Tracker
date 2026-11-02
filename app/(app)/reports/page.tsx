import { auth } from "@/auth";
import { getReportsData } from "./actions";
import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const [initialReport, sites] = await Promise.all([
    getReportsData({ reportType: "PL" }),
    prisma.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <ReportsClient initialReport={initialReport} sites={sites} />;
}
