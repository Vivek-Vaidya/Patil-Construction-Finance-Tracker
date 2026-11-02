import { getDashboardData } from "./actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardClient initialData={data} />;
}
