import { auth } from "@/auth";
import { getSiteDetail } from "../actions";
import SiteDetailClient from "./SiteDetailClient";
import { notFound } from "next/navigation";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  try {
    const data = await getSiteDetail(id);
    return (
      <SiteDetailClient
        data={data}
        userRole={session?.user?.role || "VIEWER"}
      />
    );
  } catch (err) {
    notFound();
  }
}
