"use client";

import { useState } from "react";
import { formatINR, formatDate } from "@/lib/money";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  Receipt,
  Download,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Package,
} from "lucide-react";

const COLORS = ["#d97706", "#2563eb", "#16a34a", "#dc2626", "#9333ea", "#0891b2", "#ea580c", "#475569"];

interface Props {
  data: any;
  userRole: string;
}

export default function SiteDetailClient({ data, userRole }: Props) {
  const { site, metrics, categoryChartData, materialList, transactions } = data;
  const [tab, setTab] = useState<"TRANSACTIONS" | "MATERIALS" | "CATEGORIES">("TRANSACTIONS");

  const isProfitable = metrics.profitLoss >= 0;

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/sites"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-gray-500 hover:text-amber-600 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Sites</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                {site.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
              {site.location}
              {site.client && ` • Client: ${site.client.name}`}
            </p>
          </div>

          <Link
            href="/transactions/new"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Site Expense</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Contract Value
          </span>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatINR(site.contractValue)}</p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Total agreed billing</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Total Spent
          </span>
          <p className="text-xl font-bold text-rose-600 mt-1">{formatINR(metrics.totalExpense)}</p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">
            {metrics.utilization}% of contract budget
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Client Collections
          </span>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatINR(metrics.totalReceived)}</p>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
            Receivable: {formatINR(metrics.clientReceivable)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Current Profit / Loss
          </span>
          <p className={`text-xl font-bold mt-1 ${isProfitable ? "text-emerald-700" : "text-rose-700"}`}>
            {formatINR(metrics.profitLoss)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">
            Vendor Payables: {formatINR(metrics.vendorPayables)}
          </span>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
            Expenses by Category
          </h2>
          {categoryChartData.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-xs">No expense categories yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((_: any, idx: number) => (
                      <Cell key={`cat-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [formatINR(val), "Spend"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Financial Health Summary */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Site Financial Breakdown
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Contract Value</span>
              <strong className="text-gray-900 font-semibold">{formatINR(site.contractValue)}</strong>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Total Incurred Expenses</span>
              <strong className="text-rose-600 font-semibold">-{formatINR(metrics.totalExpense)}</strong>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Expenses Settled / Paid</span>
              <span className="text-gray-700">{formatINR(metrics.totalExpensePaid)}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Unpaid Vendor Bills (Payables)</span>
              <strong className="text-amber-600 font-semibold">{formatINR(metrics.vendorPayables)}</strong>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Collected from Client</span>
              <strong className="text-emerald-600 font-semibold">+{formatINR(metrics.totalReceived)}</strong>
            </div>

            <div className="flex justify-between items-center py-2.5 bg-amber-50/60 px-3 rounded-xl">
              <span className="font-bold text-amber-950">Net Cash Margin (Realized)</span>
              <strong className={`font-bold text-sm ${isProfitable ? "text-emerald-700" : "text-rose-700"}`}>
                {formatINR(metrics.profitLoss)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Transactions Timeline vs Material Consumption */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/60 px-4 pt-2">
          <button
            onClick={() => setTab("TRANSACTIONS")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              tab === "TRANSACTIONS"
                ? "border-amber-600 text-amber-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Site Ledger Timeline ({transactions.length})
          </button>
          <button
            onClick={() => setTab("MATERIALS")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
              tab === "MATERIALS"
                ? "border-amber-600 text-amber-900 bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Material Consumption ({materialList.length})
          </button>
        </div>

        <div className="p-4">
          {tab === "TRANSACTIONS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Party / Narration</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t: any) => {
                    const isCredit = t.direction === "CREDIT";
                    return (
                      <tr key={t.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCredit ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-sm">
                          <div className="font-semibold text-gray-900">{t.party?.name || "-"}</div>
                          <div className="text-gray-500 truncate">{t.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                          {t.category?.name || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                          <span className={isCredit ? "text-emerald-600" : "text-gray-900"}>
                            {isCredit ? "+" : "-"}
                            {formatINR(t.totalAmount)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.paymentStatus === "PARTIAL"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {t.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "MATERIALS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Material Name</th>
                    <th className="py-2.5 px-3 text-right">Total Quantity</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {materialList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        No rate-based material purchases recorded for this site.
                      </td>
                    </tr>
                  ) : (
                    materialList.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{m.name}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{m.quantity}</td>
                        <td className="py-2.5 px-3 text-gray-500">{m.unit || "-"}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatINR(m.totalAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
