"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatINR, formatDate } from "@/lib/money";
import { softDeleteTransaction } from "./actions";
import * as XLSX from "xlsx";
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  X,
  Building2,
  Receipt,
  Layers,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface Props {
  initialData: any;
  sites: any[];
  parties: any[];
  categories: any[];
  partners: any[];
  userRole: string;
}

export default function TransactionListClient({
  initialData,
  sites,
  parties,
  categories,
  partners,
  userRole,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [search, setSearch] = useState("");
  const [siteId, setSiteId] = useState("ALL");
  const [partyId, setPartyId] = useState("ALL");
  const [categoryId, setCategoryId] = useState("ALL");
  const [direction, setDirection] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Selected Transaction for View modal
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const txList = initialData?.transactions || [];
  const summary = initialData?.summary || { totalCredit: 0, totalDebit: 0, netCash: 0, totalDebitPending: 0 };

  // Filter client-side if loaded, or trigger query
  const filteredList = txList.filter((tx: any) => {
    if (direction !== "ALL" && tx.direction !== direction) return false;
    if (paymentStatus !== "ALL" && tx.paymentStatus !== paymentStatus) return false;
    if (siteId !== "ALL" && tx.siteId !== siteId) return false;
    if (partyId !== "ALL" && tx.partyId !== partyId) return false;
    if (categoryId !== "ALL" && tx.categoryId !== categoryId) return false;
    if (startDate && new Date(tx.date) < new Date(startDate)) return false;
    if (endDate && new Date(tx.date) > new Date(endDate + "T23:59:59")) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const desc = tx.description?.toLowerCase() || "";
      const party = tx.party?.name?.toLowerCase() || "";
      const bill = tx.billNumber?.toLowerCase() || "";
      const site = tx.site?.name?.toLowerCase() || "";
      if (!desc.includes(q) && !party.includes(q) && !bill.includes(q) && !site.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Export to CSV
  const exportToCSV = () => {
    const rows = filteredList.map((t: any) => ({
      Date: formatDate(t.date),
      Type: t.type,
      Direction: t.direction,
      Site: t.site?.name || "Company-wide",
      Party: t.party?.name || "-",
      Category: t.category?.name || "-",
      Description: t.description,
      "Bill Number": t.billNumber || "-",
      "Pricing Mode": t.pricingMode,
      Quantity: t.quantity || "-",
      Unit: t.unit || "-",
      Rate: t.rate || "-",
      "GST %": t.gstPercent || "0",
      "GST Amount": t.gstAmount || "0",
      "Total Amount (INR)": t.totalAmount,
      "Amount Paid (INR)": t.amountPaid,
      Status: t.paymentStatus,
      "Payment Mode": t.paymentMode || "-",
      "Paid By": t.paidByType === "PARTNER" ? `Partner: ${t.paidByPartner?.name}` : t.paidByType,
      Notes: t.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `patil_construction_transactions_${new Date().toISOString().split("T")[0]}.csv`);
  };

  // Export to Excel
  const exportToExcel = () => {
    const rows = filteredList.map((t: any) => ({
      Date: formatDate(t.date),
      Type: t.type,
      Direction: t.direction,
      Site: t.site?.name || "Company-wide",
      Party: t.party?.name || "-",
      Category: t.category?.name || "-",
      Description: t.description,
      "Bill Number": t.billNumber || "-",
      "Pricing Mode": t.pricingMode,
      Quantity: t.quantity || "-",
      Unit: t.unit || "-",
      Rate: t.rate || "-",
      "GST %": t.gstPercent || "0",
      "GST Amount": t.gstAmount || "0",
      "Total Amount (INR)": t.totalAmount,
      "Amount Paid (INR)": t.amountPaid,
      Status: t.paymentStatus,
      "Payment Mode": t.paymentMode || "-",
      "Paid By": t.paidByType === "PARTNER" ? `Partner: ${t.paidByPartner?.name}` : t.paidByType,
      Notes: t.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `patil_construction_transactions_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await softDeleteTransaction(id);
      if (res.error) {
        alert(res.error);
      } else {
        setDeleteConfirmId(null);
        setSelectedTx(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central Ledger</h1>
          <p className="text-sm text-gray-500">
            Single source of truth for every rupee — {filteredList.length} transaction entries shown
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportToExcel}
            className="px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => router.push("/transactions/new")}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Credit (Inflow)</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatINR(summary.totalCredit)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Capital, receipts & loans</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Debit (Expense)</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{formatINR(summary.totalDebit)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Material, labour, contractor</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Cash Position</p>
          <p className={`text-xl font-bold mt-1 ${summary.netCash >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatINR(summary.netCash)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Inflow minus Cash Paid Out</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Payables</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{formatINR(summary.totalDebitPending)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Unpaid / partial bills owed</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, bill #, vendor, site..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Direction */}
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
          >
            <option value="ALL">All Directions (Credit & Debit)</option>
            <option value="DEBIT">Debit (Outflow)</option>
            <option value="CREDIT">Credit (Inflow)</option>
          </select>

          {/* Site Filter */}
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
          >
            <option value="ALL">All Construction Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="UNPAID">Unpaid / Due</option>
          </select>
        </div>

        {/* Secondary Filters: Category, Party, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 text-xs">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
          >
            <option value="ALL">All Parties / Vendors</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400 text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-gray-400 text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Site</th>
                <th className="py-3.5 px-4">Party / Narration</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Paid / Balance</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No transactions found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx: any) => {
                  const isCredit = tx.direction === "CREDIT";
                  const pending = Math.max(0, tx.totalAmount - tx.amountPaid);

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-amber-50/40 cursor-pointer transition"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {formatDate(tx.date)}
                        {tx.billNumber && (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            #{tx.billNumber}
                          </span>
                        )}
                      </td>

                      {/* Site */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {tx.site ? (
                          <span className="inline-flex items-center text-gray-800 font-medium">
                            <Building2 className="w-3 h-3 mr-1 text-gray-400" />
                            {tx.site.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Company Level</span>
                        )}
                      </td>

                      {/* Party & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        {tx.party && (
                          <div className="font-semibold text-gray-900 truncate">
                            {tx.party.name}
                          </div>
                        )}
                        <div className="text-gray-600 truncate">{tx.description}</div>
                        {tx.pricingMode === "RATE" && tx.quantity && tx.rate && (
                          <div className="text-[10px] text-gray-400">
                            {tx.quantity} {tx.unit} @ ₹{tx.rate}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {tx.category ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px]">
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isCredit ? "text-emerald-600" : "text-gray-900"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {formatINR(tx.totalAmount)}
                        </span>
                        {tx.gstPercent && tx.gstPercent > 0 && (
                          <span className="block text-[10px] text-gray-400">
                            incl. {tx.gstPercent}% GST
                          </span>
                        )}
                      </td>

                      {/* Paid / Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="text-gray-700 font-medium">
                          {formatINR(tx.amountPaid)}
                        </div>
                        {pending > 0 && (
                          <span className="block text-[10px] text-rose-600 font-medium">
                            Due: {formatINR(pending)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {tx.paymentStatus === "PAID" && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-[10px]">
                            PAID
                          </span>
                        )}
                        {tx.paymentStatus === "PARTIAL" && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-semibold text-[10px]">
                            PARTIAL
                          </span>
                        )}
                        {tx.paymentStatus === "UNPAID" && (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-semibold text-[10px]">
                            UNPAID
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            title="View Details"
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {userRole === "ADMIN" && (
                            <button
                              onClick={() => setDeleteConfirmId(tx.id)}
                              title="Delete Transaction"
                              className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── TRANSACTION DETAILS MODAL (Drill-down traceability) ─── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    selectedTx.direction === "CREDIT"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {selectedTx.direction === "CREDIT" ? "Credit Entry" : "Debit Entry"} • {selectedTx.type}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  {formatINR(selectedTx.totalAmount)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of properties */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 block mb-0.5">Date</span>
                <span className="font-semibold text-gray-900">{formatDate(selectedTx.date)}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 block mb-0.5">Site</span>
                <span className="font-semibold text-gray-900">
                  {selectedTx.site?.name || "Company-wide"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 block mb-0.5">Party / Vendor</span>
                <span className="font-semibold text-gray-900">
                  {selectedTx.party?.name || "-"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 block mb-0.5">Category</span>
                <span className="font-semibold text-gray-900">
                  {selectedTx.category?.name || "-"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 block mb-0.5">Bill Number</span>
                <span className="font-semibold text-gray-900">
                  {selectedTx.billNumber || "-"}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 block mb-0.5">Payment Mode</span>
                <span className="font-semibold text-gray-900">
                  {selectedTx.paymentMode || "-"}
                </span>
              </div>
            </div>

            {/* Paid By info */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-semibold">Paid Out Of: </span>
              {selectedTx.paidByType === "PARTNER" ? (
                <span>
                  Partner personally: <strong>{selectedTx.paidByPartner?.name}</strong> (Company owes partner this amount)
                </span>
              ) : (
                <span>Company Account</span>
              )}
            </div>

            {/* Rate-based details if applicable */}
            {selectedTx.pricingMode === "RATE" && (
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
                <span className="font-semibold text-gray-700 block mb-1">
                  Rate Calculation Breakdown:
                </span>
                <p className="text-gray-600">
                  Material: <strong>{selectedTx.material?.name || "-"}</strong>
                </p>
                <p className="text-gray-600">
                  Quantity: {selectedTx.quantity} {selectedTx.unit} × Rate: ₹{selectedTx.rate} ={" "}
                  <strong>{formatINR((selectedTx.quantity || 0) * (selectedTx.rate || 0))}</strong>
                </p>
                {selectedTx.gstPercent && (
                  <p className="text-gray-600">
                    GST ({selectedTx.gstPercent}%): {formatINR(selectedTx.gstAmount)}
                  </p>
                )}
              </div>
            )}

            {/* Narration */}
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Description / Narration
              </span>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl">
                {selectedTx.description}
              </p>
            </div>

            {/* Notes if any */}
            {selectedTx.notes && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  Notes
                </span>
                <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl">
                  {selectedTx.notes}
                </p>
              </div>
            )}

            {/* Settlement & Payments History */}
            {selectedTx.payments && selectedTx.payments.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Payment History ({selectedTx.payments.length} settlements)
                </span>
                <div className="space-y-1.5">
                  {selectedTx.payments.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-gray-900">{formatINR(p.amount)}</span>
                        <span className="text-gray-400 ml-2">via {p.mode}</span>
                      </div>
                      <span className="text-gray-500">{formatDate(p.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments if any */}
            {selectedTx.attachments && selectedTx.attachments.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Bill Attachment
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedTx.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-medium flex items-center space-x-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>{att.fileName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h4 className="font-bold text-gray-900">Confirm Deletion</h4>
            </div>
            <p className="text-xs text-gray-600">
              Are you sure you want to soft-delete this transaction? It can be restored by an administrator from the audit log.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                {isPending ? "Deleting..." : "Delete Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

