"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatINR, formatDate } from "@/lib/money";
import { createSite } from "./actions";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  X,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";

interface Props {
  initialData: any;
  userRole: string;
}

export default function SitesClient({ initialData, userRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { sites, clients, counts } = initialData;
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Site Modal
  const [createModal, setCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const filteredSites = sites.filter((s: any) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    return true;
  });

  const handleCreate = () => {
    if (!name.trim() || !location.trim()) {
      alert("Name and location are required.");
      return;
    }

    startTransition(async () => {
      const res = await createSite({
        name,
        location,
        clientId: clientId || undefined,
        contractValue: contractValue ? parseFloat(contractValue) : undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setCreateModal(false);
        setName("");
        setLocation("");
        setContractValue("");
        setNotes("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Construction Sites</h1>
          <p className="text-sm text-gray-500">
            Track site budgets, material expenses, vendor payables, and client billing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View toggle */}
          <div className="inline-flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === "GRID" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === "TABLE" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
              title="Comparison Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {userRole !== "VIEWER" && (
            <button
              onClick={() => setCreateModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Site</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Sites
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{counts.total}</span>
            <span className="text-xs text-emerald-600 font-semibold">{counts.active} Active</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">{counts.completed} Completed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Contract Value
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatINR(counts.totalContractValue)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Across all active contracts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Site Expenses
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatINR(counts.totalSpentAcrossSites)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Material, labour, contractors</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Client Collections
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatINR(counts.totalReceivedAcrossSites)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Received to company account</span>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center space-x-2">
        {["ALL", "ACTIVE", "COMPLETED", "PLANNED", "ON_HOLD"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === st
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {st === "ALL" ? "All Sites" : st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* VIEW 1: GRID VIEW */}
      {viewMode === "GRID" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSites.map((site: any) => {
            const isProfitable = site.profitLoss >= 0;

            return (
              <div
                key={site.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition p-6 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-gray-900">{site.name}</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            site.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-800"
                              : site.status === "COMPLETED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {site.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {site.location}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wider block">
                        Contract Value
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {formatINR(site.contractValue)}
                      </span>
                    </div>
                  </div>

                  {/* Budget Progress Bar */}
                  {site.contractValue > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Budget Spent: {site.utilization}%</span>
                        <span>{formatINR(site.totalExpense)} spent</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            site.utilization > 90
                              ? "bg-rose-500"
                              : site.utilization > 70
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, site.utilization)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-xs">
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-0.5">Total Expense</span>
                      <span className="font-semibold text-rose-600 text-sm">
                        {formatINR(site.totalExpense)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-0.5">Received</span>
                      <span className="font-semibold text-emerald-600 text-sm">
                        {formatINR(site.totalReceived)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-0.5">Receivable</span>
                      <span className="font-semibold text-amber-600 text-sm">
                        {formatINR(site.clientReceivable)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block mb-0.5">Payables (Owed)</span>
                      <span className="font-semibold text-rose-600 text-sm">
                        {formatINR(site.vendorPayables)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-gray-400 mr-1.5">Current Site P&L:</span>
                    <strong className={isProfitable ? "text-emerald-700" : "text-rose-700"}>
                      {formatINR(site.profitLoss)}
                    </strong>
                  </div>

                  <Link
                    href={`/sites/${site.id}`}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
                  >
                    <span>Site Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: SIDE-BY-SIDE COMPARISON TABLE */}
      {viewMode === "TABLE" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Site Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Contract Value</th>
                  <th className="py-3 px-4 text-right">Total Expense</th>
                  <th className="py-3 px-4 text-right">Client Received</th>
                  <th className="py-3 px-4 text-right">Receivable</th>
                  <th className="py-3 px-4 text-right">Vendor Payables</th>
                  <th className="py-3 px-4 text-right">Site P&L</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSites.map((site: any) => (
                  <tr key={site.id} className="hover:bg-amber-50/40">
                    <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                      <div>{site.name}</div>
                      <div className="text-[11px] font-normal text-gray-400">{site.location}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                        {site.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium whitespace-nowrap">
                      {formatINR(site.contractValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-bold whitespace-nowrap">
                      {formatINR(site.totalExpense)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-bold whitespace-nowrap">
                      {formatINR(site.totalReceived)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-600 font-medium whitespace-nowrap">
                      {formatINR(site.clientReceivable)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-medium whitespace-nowrap">
                      {formatINR(site.vendorPayables)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      <span className={site.profitLoss >= 0 ? "text-emerald-700" : "text-rose-700"}>
                        {formatINR(site.profitLoss)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Link
                        href={`/sites/${site.id}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── CREATE SITE MODAL ─── */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Create New Construction Site</h3>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Site Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vashi Commercial Towers"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Location / Address *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Sector 17, Vashi, Navi Mumbai"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client (Optional)</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="">Select client...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PLANNED">Planned</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contract Value (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="e.g. 15000000"
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Phase 1 RCC slab, Phase 2 brickwork..."
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
                {isPending ? "Creating..." : "Save Site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
