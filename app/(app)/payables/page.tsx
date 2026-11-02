import { auth } from "@/auth";
import { getPayablesData } from "./actions";
import PayablesClient from "./PayablesClient";

export default async function PayablesPage() {
  const session = await auth();
  const data = await getPayablesData();

  return (
    <PayablesClient
      initialData={data}
      userRole={session?.user?.role || "VIEWER"}
    />
  );
}
