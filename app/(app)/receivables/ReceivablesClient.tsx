"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate } from "@/lib/money";
import { recordClientReceipt } from "./actions";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  Calendar,
  Building2,
  Users,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  CreditCard,
  Phone,
} from "lucide-react";

interface Props {
  initialData: any;
  userRole: string;
}

export default function ReceivablesClient({ initialData, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { siteReceivables, unpaidReceipts, clients, sites, summary } = initialData;
  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Record Receipt Modal
  const [receiptModal, setReceiptModal] = useState(false);
  const [targetSiteId, setTargetSiteId] = useState("");
  const [targetPartyId, setTargetPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const filteredSites = siteReceivables.filter((s: any) => {
    if (selectedBucket !== "ALL" && s.bucket !== selectedBucket) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const site = s.siteName.toLowerCase();
      const client = s.clientName.toLowerCase();
      if (!site.includes(q) && !client.includes(q)) return false;
    }
    return true;
  });

  const handleRecordReceipt = () => {
    if (!targetSiteId) {
      alert("Please select a construction site.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    startTransition(async () => {
      const res = await recordClientReceipt({
        siteId: targetSiteId,
        partyId: targetPartyId || undefined,
        amount: amountNum,
        paymentMode,
        date,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setReceiptModal(false);
        setAmount("");
        setReference("");
        setNotes("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Receivables (Money Clients Owe Us)</h1>
          <p className="text-sm text-gray-500">
            Contract balances, pending billing receipts, and client payment aging
          </p>
        </div>

        {userRole !== "VIEWER" && (
          <button
            onClick={() => {
              if (sites.length > 0) setTargetSiteId(sites[0].id);
              setReceiptModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record Client Receipt</span>
          </button>
        )}
      </div>

      {/* Aging Bucket Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setSelectedBucket("ALL")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "ALL"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-emerald-300"
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${selectedBucket === "ALL" ? "text-emerald-100" : "text-gray-400"}`}>
            Total Receivables
          </span>
          <p className="text-xl font-bold mt-1">{formatINR(summary.totalReceivables)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "ALL" ? "text-emerald-100" : "text-gray-400"}`}>
            {summary.totalCount} active projects
          </span>
        </div>

        <div
          onClick={() => setSelectedBucket("0-30")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "0-30"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-emerald-300"
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${selectedBucket === "0-30" ? "text-emerald-100" : "text-emerald-600"}`}>
            0-30 Days
          </span>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket0_30)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "0-30" ? "text-emerald-100" : "text-gray-400"}`}>
            Current billing
          </span>
        </div>

        <div
          onClick={() => setSelectedBucket("31-60")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "31-60"
              ? "bg-blue-600 text-white border-blue-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-blue-300"
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${selectedBucket === "31-60" ? "text-blue-100" : "text-blue-600"}`}>
            31-60 Days
          </span>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket31_60)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "31-60" ? "text-blue-100" : "text-gray-400"}`}>
            Regular follow up
          </span>
        </div>

        <div
          onClick={() => setSelectedBucket("61-90")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "61-90"
              ? "bg-amber-600 text-white border-amber-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-amber-300"
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${selectedBucket === "61-90" ? "text-amber-100" : "text-amber-600"}`}>
            61-90 Days
          </span>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket61_90)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "61-90" ? "text-amber-100" : "text-gray-400"}`}>
            Payment overdue
          </span>
        </div>

        <div
          onClick={() => setSelectedBucket("90+")}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            selectedBucket === "90+"
              ? "bg-rose-600 text-white border-rose-700 shadow-md"
              : "bg-white text-gray-800 border-gray-200 hover:border-rose-300"
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider block ${selectedBucket === "90+" ? "text-rose-100" : "text-rose-600"}`}>
            90+ Days
          </span>
          <p className="text-xl font-bold mt-1">{formatINR(summary.bucket90Plus)}</p>
          <span className={`text-[11px] block mt-0.5 ${selectedBucket === "90+" ? "text-rose-100" : "text-gray-400"}`}>
            Critical Overdue
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search site, client name..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Construction Site</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-center">Aging</th>
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-right">Collected So Far</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    No pending receivables found.
                  </td>
                </tr>
              ) : (
                filteredSites.map((s: any) => (
                  <tr key={s.id} className="hover:bg-amber-50/30">
                    <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                      {s.siteName}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-800">{s.clientName}</div>
                      {s.clientPhone && (
                        <div className="text-[11px] text-gray-400">{s.clientPhone}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.bucket === "0-30"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.bucket === "31-60"
                            ? "bg-blue-100 text-blue-800"
                            : s.bucket === "61-90"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {s.daysAgo} days ({s.bucket})
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                      {formatINR(s.contractValue)}
                    </td>

                    <td className="py-3 px-4 text-right text-emerald-600 font-medium whitespace-nowrap">
                      {formatINR(s.totalCollected)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-amber-600 whitespace-nowrap text-sm">
                      {formatINR(s.balanceDue)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {userRole !== "VIEWER" && (
                        <button
                          onClick={() => {
                            setTargetSiteId(s.id);
                            setAmount(String(s.balanceDue));
                            setReceiptModal(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center space-x-1 mx-auto"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Receive Payment</span>
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

      {/* ─── RECORD CLIENT RECEIPT MODAL ─── */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Record Client Payment Receipt</h3>
              <button onClick={() => setReceiptModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Construction Site *
                </label>
                <select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                >
                  <option value="">Select site...</option>
                  {sites.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Client (Optional)</label>
                <select
                  value={targetPartyId}
                  onChange={(e) => setTargetPartyId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Default site client...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Received Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Date Received *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Cheque # / UTR / Reference
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. UTR-202410294"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Running account bill payment #3"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setReceiptModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleRecordReceipt}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                {isPending ? "Recording..." : "Save Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
