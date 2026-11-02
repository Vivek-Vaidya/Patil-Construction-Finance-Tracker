import { auth } from "@/auth";
import { getReceivablesData } from "./actions";
import ReceivablesClient from "./ReceivablesClient";

export default async function ReceivablesPage() {
  const session = await auth();
  const data = await getReceivablesData();

  return (
    <ReceivablesClient
      initialData={data}
      userRole={session?.user?.role || "VIEWER"}
    />
  );
}
