"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate } from "@/lib/money";
import { recordPartnerTransaction, createPartner, getPartnerLedger } from "./actions";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building,
  Check,
  X,
  Receipt,
  FileText,
} from "lucide-react";

const COLORS = ["#d97706", "#0284c7", "#10b981", "#8b5cf6", "#f43f5e", "#64748b"];

interface Props {
  initialData: any;
  userRole: string;
}

export default function PartnersClient({ initialData, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { partners, summary } = initialData;

  // Modals
  const [actionModal, setActionModal] = useState<{
    partner: any;
    type: "INVESTMENT" | "WITHDRAWAL";
  } | null>(null);

  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [txMode, setTxMode] = useState("BANK_TRANSFER");
  const [txNotes, setTxNotes] = useState("");

  const [addPartnerModal, setAddPartnerModal] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerPhone, setNewPartnerPhone] = useState("");
  const [newPartnerShare, setNewPartnerShare] = useState("");

  // Ledger drill-down modal
  const [selectedLedger, setSelectedLedger] = useState<{
    partner: any;
    transactions: any[];
  } | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Chart data
  const chartData = partners
    .filter((p: any) => p.totalInvested > 0)
    .map((p: any) => ({
      name: p.name,
      value: p.totalInvested,
      share: p.sharePercent || Math.round((p.totalInvested / (summary.totalCapital || 1)) * 100),
    }));

  const handleRecordTransaction = () => {
    if (!actionModal) return;
    const amountNum = parseFloat(txAmount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    startTransition(async () => {
      const res = await recordPartnerTransaction({
        partnerId: actionModal.partner.id,
        type: actionModal.type,
        date: txDate,
        amount: amountNum,
        paymentMode: txMode,
        notes: txNotes,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setActionModal(null);
        setTxAmount("");
        setTxNotes("");
        router.refresh();
      }
    });
  };

  const handleAddPartner = () => {
    if (!newPartnerName.trim()) {
      alert("Partner name is required.");
      return;
    }

    startTransition(async () => {
      const res = await createPartner({
        name: newPartnerName,
        phone: newPartnerPhone || undefined,
        sharePercent: newPartnerShare ? parseFloat(newPartnerShare) : undefined,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setAddPartnerModal(false);
        setNewPartnerName("");
        setNewPartnerPhone("");
        setNewPartnerShare("");
        router.refresh();
      }
    });
  };

  const openPartnerLedger = async (partner: any) => {
    setLoadingLedger(true);
    try {
      const ledger = await getPartnerLedger(partner.id);
      setSelectedLedger(ledger);
    } catch (err: any) {
      alert(err.message || "Failed to load partner ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Accounts & Capital</h1>
          <p className="text-sm text-gray-500">
            Real-time partner capital, investments, withdrawals, and personal expense reimbursements
          </p>
        </div>
        {userRole === "ADMIN" && (
          <button
            onClick={() => setAddPartnerModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Partner</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Partner Capital
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatINR(summary.totalCapital)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Total capital invested across all partners</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Out-of-Pocket Expenses
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {formatINR(summary.totalPersonalPaid)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Site expenses paid directly by partners</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Withdrawn
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatINR(summary.totalWithdrawn)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Drawings taken out by partners</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Net Partner Equity
          </span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatINR(summary.totalNetEquity)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Invested + Expenses minus Withdrawn</p>
        </div>
      </div>

      {/* Visual Chart & Partner Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capital Split Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
          <h2 className="text-sm font-bold text-gray-900 mb-2 self-start">
            Capital Share Distribution
          </h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {chartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatINR(value), "Capital Invested"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Partners Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {partners.map((p: any, idx: number) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <h3 className="font-bold text-base text-gray-900">{p.name}</h3>
                  </div>
                  {p.sharePercent && (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
                      {p.sharePercent}% Share
                    </span>
                  )}
                </div>
                {p.phone && <p className="text-xs text-gray-400 mt-1">{p.phone}</p>}

                {/* Balance breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Invested</span>
                    <span className="font-semibold text-emerald-600 text-sm">
                      {formatINR(p.totalInvested)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Out of Pocket</span>
                    <span className="font-semibold text-amber-600 text-sm">
                      {formatINR(p.totalPersonalPaid)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-0.5">Withdrawn</span>
                    <span className="font-semibold text-rose-600 text-sm">
                      {formatINR(p.totalWithdrawn)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <span className="text-amber-800 font-medium block mb-0.5">Company Owes</span>
                    <span className="font-bold text-amber-900 text-sm">
                      {formatINR(p.netCompanyOwes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => openPartnerLedger(p)}
                  className="text-amber-700 hover:text-amber-800 font-semibold flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Ledger</span>
                </button>

                {userRole === "ADMIN" && (
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() =>
                        setActionModal({ partner: p, type: "INVESTMENT" })
                      }
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg"
                    >
                      + Invest
                    </button>
                    <button
                      onClick={() =>
                        setActionModal({ partner: p, type: "WITHDRAWAL" })
                      }
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg"
                    >
                      - Withdraw
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── RECORD INVESTMENT / WITHDRAWAL MODAL ─── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {actionModal.type === "INVESTMENT" ? "Record Capital Investment" : "Record Capital Withdrawal"}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Partner: <strong className="text-gray-800">{actionModal.partner.name}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={txMode}
                  onChange={(e) => setTxMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Narration</label>
                <textarea
                  rows={2}
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Added capital for Thane Commercial Plaza foundation work"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setActionModal(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleRecordTransaction}
                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold ${
                  actionModal.type === "INVESTMENT"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isPending ? "Recording..." : "Save Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD NEW PARTNER MODAL ─── */}
      {addPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Add New Partner</h3>
              <button onClick={() => setAddPartnerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Partner Full Name *</label>
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newPartnerPhone}
                  onChange={(e) => setNewPartnerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ownership Share Percentage (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={newPartnerShare}
                  onChange={(e) => setNewPartnerShare(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setAddPartnerModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleAddPartner}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
              >
                {isPending ? "Creating..." : "Add Partner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PARTNER LEDGER DRILL-DOWN MODAL ─── */}
      {selectedLedger && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  Partner Account Ledger: {selectedLedger.partner.name}
                </h3>
                <p className="text-xs text-gray-500">
                  All transactions associated with this partner ({selectedLedger.transactions.length} entries)
                </p>
              </div>
              <button
                onClick={() => setSelectedLedger(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedLedger.transactions.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-xs">
                No transactions recorded for this partner yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Site / Party</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedLedger.transactions.map((tx: any) => {
                      const isCredit = tx.direction === "CREDIT";
                      return (
                        <tr key={tx.id} className="hover:bg-amber-50/40">
                          <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(tx.date)}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                tx.type === "PARTNER_INVESTMENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : tx.type === "PARTNER_WITHDRAWAL"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate">{tx.description}</td>
                          <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                            {tx.site?.name || tx.party?.name || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                            <span className={isCredit ? "text-emerald-600" : "text-gray-900"}>
                              {isCredit ? "+" : "-"}
                              {formatINR(tx.totalAmount)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLedger(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
