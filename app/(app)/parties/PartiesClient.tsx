"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate } from "@/lib/money";
import { createParty, getPartyLedger } from "./actions";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Phone,
  FileText,
  Building,
  Check,
  X,
  CreditCard,
  Briefcase,
  AlertCircle,
  Truck,
  HardHat,
} from "lucide-react";

interface Props {
  initialData: any;
  userRole: string;
}

export default function PartiesClient({ initialData, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { parties, counts } = initialData;
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("VENDOR");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");

  // Ledger Drilldown Modal
  const [selectedLedger, setSelectedLedger] = useState<{
    party: any;
    entries: any[];
  } | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const filteredParties = parties.filter((p: any) => {
    if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const n = p.name.toLowerCase();
      const ph = p.phone?.toLowerCase() || "";
      const gst = p.gstNumber?.toLowerCase() || "";
      if (!n.includes(q) && !ph.includes(q) && !gst.includes(q)) return false;
    }
    return true;
  });

  const handleCreate = () => {
    if (!name.trim()) {
      alert("Party name is required.");
      return;
    }

    startTransition(async () => {
      const res = await createParty({
        name,
        type,
        phone: phone || undefined,
        gstNumber: gstNumber || undefined,
        address: address || undefined,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setCreateModal(false);
        setName("");
        setPhone("");
        setGstNumber("");
        setAddress("");
        router.refresh();
      }
    });
  };

  const openLedger = async (partyId: string) => {
    setLoadingLedger(true);
    try {
      const data = await getPartyLedger(partyId);
      setSelectedLedger(data);
    } catch (err: any) {
      alert(err.message || "Failed to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors, Contractors & Clients</h1>
          <p className="text-sm text-gray-500">
            Track business parties, transaction ledgers, and outstanding balances
          </p>
        </div>

        {userRole !== "VIEWER" && (
          <button
            onClick={() => setCreateModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Party</span>
          </button>
        )}
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Parties
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{counts.total}</p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Active registered parties</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Vendors & Suppliers
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.vendors}</p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Material & equipment suppliers</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Contractors & Labour
          </span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{counts.contractors}</p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Subcontractors & labour teams</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total We Owe (Payables)
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatINR(counts.totalOutstandingWeOwe)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Unsettled vendor & contractor bills</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["ALL", "VENDOR", "CONTRACTOR", "LABOUR", "SUPPLIER", "CLIENT"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                typeFilter === t
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t === "ALL" ? "All Parties" : t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party name, phone, GST..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Parties Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParties.map((p: any) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-amber-300 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{p.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                    {p.type}
                  </span>
                </div>
                {p.outstandingWeOwe > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                      We Owe
                    </span>
                    <span className="font-bold text-rose-600 text-sm">
                      {formatINR(p.outstandingWeOwe)}
                    </span>
                  </div>
                )}
              </div>

              {p.phone && (
                <p className="text-xs text-gray-500 flex items-center mt-2">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  {p.phone}
                </p>
              )}

              {p.gstNumber && (
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  GST: {p.gstNumber}
                </p>
              )}

              {/* Financial summary */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Total Billed</span>
                  <span className="font-semibold text-gray-900">{formatINR(p.totalBilled)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Total Settled</span>
                  <span className="font-semibold text-emerald-600">{formatINR(p.totalPaid)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => openLedger(p.id)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Party Ledger</span>
              </button>

              <button
                onClick={() => router.push(`/transactions/new`)}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
              >
                + Record Entry
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── PARTY LEDGER MODAL ─── */}
      {selectedLedger && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  Party Ledger: {selectedLedger.party.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedLedger.party.type} {selectedLedger.party.gstNumber ? `• GST: ${selectedLedger.party.gstNumber}` : ""}
                </p>
              </div>
              <button onClick={() => setSelectedLedger(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedLedger.entries.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-xs">No transactions found for this party.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Bill # / Narration</th>
                      <th className="py-2.5 px-3">Site</th>
                      <th className="py-2.5 px-3 text-right">Bill Total</th>
                      <th className="py-2.5 px-3 text-right">Settled</th>
                      <th className="py-2.5 px-3 text-right">Due Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedLedger.entries.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate">
                          {tx.billNumber && <strong className="text-gray-900 mr-1.5">#{tx.billNumber}</strong>}
                          {tx.description}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                          {tx.site?.name || "Company-wide"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          {formatINR(tx.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                          {formatINR(tx.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                          {formatINR(tx.balanceDue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLedger(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD PARTY MODAL ─── */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Add New Party</h3>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Party Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mahadev Hardwares"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Party Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="VENDOR">Vendor / Supplier</option>
                  <option value="CONTRACTOR">Contractor / Sub-contractor</option>
                  <option value="LABOUR">Labour Contractor</option>
                  <option value="CLIENT">Client</option>
                  <option value="SUPPLIER">Raw Material Supplier</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="27AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address / Location</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 42, MIDC Industrial Area, Dombivli"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isPending}
                onClick={() => setCreateModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={handleCreate}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                {isPending ? "Saving..." : "Save Party"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
