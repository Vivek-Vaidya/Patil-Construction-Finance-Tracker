import { auth } from "@/auth";
import { getPartnersSummary } from "./actions";
import PartnersClient from "./PartnersClient";

export default async function PartnersPage() {
  const session = await auth();
  const data = await getPartnersSummary();

  return (
    <PartnersClient
      initialData={data}
      userRole={session?.user?.role || "VIEWER"}
    />
  );
}
