import { getTransactionsList, getTransactionFormData } from "./actions";
import TransactionListClient from "./TransactionListClient";

export default async function TransactionsPage() {
  const [data, formData] = await Promise.all([
    getTransactionsList({ limit: 100 }),
    getTransactionFormData(),
  ]);

  return (
    <TransactionListClient
      initialData={data}
      sites={formData.sites}
      parties={formData.parties}
      categories={formData.categories}
      partners={formData.partners}
      userRole={formData.userRole}
    />
  );
}
