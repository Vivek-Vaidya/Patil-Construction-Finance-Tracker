"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate } from "@/lib/money";
import { recordBillPayment } from "./actions";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Search,
  X,
  Check,
  Receipt,
  ArrowRight,
  Filter,
} from "lucide-react";

interface Props {
  initialData: any;
  userRole: string;
}

export default function PayablesClient({ initialData, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { bills, summary } = initialData;
  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Payment Modal
  const [paymentModalBill, setPaymentModalBill] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMode, setPayMode] = useState("BANK_TRANSFER");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const filteredBills = bills.filter((b: any) => {
    if (selectedBucket !== "ALL" && b.bucket !== selectedBucket) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const p = b.party?.name?.toLowerCase() || "";
      const s = b.site?.name?.toLowerCase() || "";
      const bill = b.billNumber?.toLowerCase() || "";
      const desc = b.description?.toLowerCase() || "";
      if (!p.includes(q) && !s.includes(q) && !bill.includes(q) && !desc.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const openPaymentModal = (bill: any) => {
    setPaymentModalBill(bill);
    setPayAmount(String(bill.balanceDue));
    setPayRef("");
    setPayNotes("");
  };

  const handleRecordPayment = () => {
    if (!paymentModalBill) return;
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (amountNum > paymentModalBill.balanceDue) {
      alert(`Amount cannot exceed the remaining balance of ${formatINR(paymentModalBill.balanceDue)}.`);
      return;
    }

    startTransition(async () => {
      const res = await recordBillPayment({
        transactionId: paymentModalBill.id,
        amount: amountNum,
        paymentMode: payMode,
        date: payDate,
        reference: payRef || undefined,
        notes: payNotes || undefined,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setPaymentModalBill(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outstanding Payables (Bills We Owe)</h1>
        <p className="text-sm text-gray-500">
          Unpaid and partially-paid vendor, contractor, and material bills with aging analysis
        </p>
      </div>

      {/* Aging Bucket Cards (Interactive Click-to-filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Overall */}
        <div
          onClick={() => setSelectedBucket("ALL")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "ALL"
              ? "bg-amber-500 text-white border-amber-600 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${selectedBucket === "ALL" ? "text-amber-100" : "text-gray-400"}`}>
            Total Payables
          </span>
          <p className="text-xl font-bold mt-1">{formatINR(summary.totalPayables)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "ALL" ? "text-amber-100" : "text-gray-400"}`}>
            {summary.totalBillsCount} pending bills
          </span>
        </div>

        {/* 0-30 Days */}
        <div
          onClick={() => setSelectedBucket("0-30")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "0-30"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === "0-30" ? "text-emerald-100" : "text-emerald-600"}`}>
              0-30 Days
            </span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${selectedBucket === "0-30" ? "text-emerald-200" : "text-emerald-500"}`} />
          </div>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket0_30)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "0-30" ? "text-emerald-100" : "text-gray-400"}`}>
            Current billing
          </span>
        </div>

        {/* 31-60 Days */}
        <div
          onClick={() => setSelectedBucket("31-60")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "31-60"
              ? "bg-blue-600 text-white border-blue-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === "31-60" ? "text-blue-100" : "text-blue-600"}`}>
              31-60 Days
            </span>
            <Clock className={`w-3.5 h-3.5 ${selectedBucket === "31-60" ? "text-blue-200" : "text-blue-500"}`} />
          </div>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket31_60)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "31-60" ? "text-blue-100" : "text-gray-400"}`}>
            Aging bills
          </span>
        </div>

        {/* 61-90 Days */}
        <div
          onClick={() => setSelectedBucket("61-90")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "61-90"
              ? "bg-amber-600 text-white border-amber-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === "61-90" ? "text-amber-100" : "text-amber-600"}`}>
              61-90 Days
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 ${selectedBucket === "61-90" ? "text-amber-200" : "text-amber-500"}`} />
          </div>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket61_90)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "61-90" ? "text-amber-100" : "text-gray-400"}`}>
            Follow up needed
          </span>
        </div>

        {/* 90+ Days (Critical) */}
        <div
          onClick={() => setSelectedBucket("90+")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "90+"
              ? "bg-rose-600 text-white border-rose-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === "90+" ? "text-rose-100" : "text-rose-600"}`}>
              90+ Days
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 ${selectedBucket === "90+" ? "text-rose-200" : "text-rose-500"}`} />
          </div>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket90Plus)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "90+" ? "text-rose-100" : "text-gray-400"}`}>
            Critical Overdue
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor, bill #, site, description..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="text-xs text-gray-500">
          Showing <strong>{filteredBills.length}</strong> bills{" "}
          {selectedBucket !== "ALL" && `in ${selectedBucket} days bucket`}
        </div>
      </div>

      {/* Payables Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Bill Date</th>
                <th className="py-3 px-4">Party / Vendor</th>
                <th className="py-3 px-4">Site</th>
                <th className="py-3 px-4 text-center">Aging</th>
                <th className="py-3 px-4 text-right">Total Bill</th>
                <th className="py-3 px-4 text-right">Paid So Far</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    No outstanding payables in this category. All clear!
                  </td>
                </tr>
              ) : (
                filteredBills.map((b: any) => (
                  <tr key={b.id} className="hover:bg-amber-50/30">
                    {/* Date */}
                    <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                      {formatDate(b.date)}
                      {b.billNumber && (
                        <span className="block text-[10px] text-gray-400 font-mono">
                          #{b.billNumber}
                        </span>
                      )}
                    </td>

                    {/* Party */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-gray-900">{b.party?.name || "-"}</div>
                      <div className="text-gray-500 text-[11px] truncate">{b.description}</div>
                    </td>

                    {/* Site */}
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {b.site ? (
                        <span className="font-medium text-gray-800">{b.site.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Company Level</span>
                      )}
                    </td>

                    {/* Aging */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.bucket === "0-30"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.bucket === "31-60"
                            ? "bg-blue-100 text-blue-800"
                            : b.bucket === "61-90"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800 animate-pulse"
                        }`}
                      >
                        {b.daysAgo} days ({b.bucket})
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                      {formatINR(b.totalAmount)}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium whitespace-nowrap">
                      {formatINR(b.amountPaid)}
                      {b.payments && b.payments.length > 0 && (
                        <span className="block text-[10px] text-gray-400">
                          ({b.payments.length} payments)
                        </span>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap text-sm">
                      {formatINR(b.balanceDue)}
                    </td>

                    {/* Action: Record Payment */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {userRole !== "VIEWER" && (
                        <button
                          onClick={() => openPaymentModal(b)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center space-x-1 mx-auto"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Record Payment</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── RECORD PAYMENT / SETTLEMENT MODAL ─── */}
      {paymentModalBill && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Record Bill Settlement</h3>
                <p className="text-xs text-gray-500">
                  {paymentModalBill.party?.name} • Bill #{paymentModalBill.billNumber || paymentModalBill.id.slice(-6)}
                </p>
              </div>
              <button onClick={() => setPaymentModalBill(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary Box */}
            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Bill Amount:</span>
                <span className="font-semibold text-gray-900">{formatINR(paymentModalBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid:</span>
                <span className="font-semibold text-emerald-600">{formatINR(paymentModalBill.amountPaid)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="font-bold text-gray-700">Remaining Balance Due:</span>
                <span className="font-bold text-rose-600">{formatINR(paymentModalBill.balanceDue)}</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border rounded-xl text-sm font-semibold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(paymentModalBill.balanceDue))}
                    className="absolute right-2 top-2 text-[11px] font-bold text-amber-600 hover:text-amber-700"
                  >
                    FULL
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Supports partial payments (e.g. pay ₹50,000 now, rest later).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Reference # / Cheque # / UTR
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UTR-98217340"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. 1st installment for 500 bags cement"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setPaymentModalBill(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleRecordPayment}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                {isPending ? "Recording Payment..." : "Confirm & Settle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
