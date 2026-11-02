import { auth } from "@/auth";
import { getPartiesList } from "./actions";
import PartiesClient from "./PartiesClient";

export default async function PartiesPage() {
  const session = await auth();
  const data = await getPartiesList();

  return (
    <PartiesClient
      initialData={data}
      userRole={session?.user?.role || "VIEWER"}
    />
  );
}
