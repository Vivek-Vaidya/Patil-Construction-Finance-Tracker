import { auth } from "@/auth";
import { getSitesList } from "./actions";
import SitesClient from "./SitesClient";

export default async function SitesPage() {
  const session = await auth();
  const data = await getSitesList();

  return (
    <SitesClient
      initialData={data}
      userRole={session?.user?.role || "VIEWER"}
    />
  );
}
