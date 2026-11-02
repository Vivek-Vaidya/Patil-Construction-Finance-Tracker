import { getTransactionFormData } from "../actions";
import TransactionForm from "./TransactionForm";

export default async function NewTransactionPage() {
  const formData = await getTransactionFormData();

  return (
    <div className="py-2">
      <TransactionForm initialData={formData} />
    </div>
  );
}
