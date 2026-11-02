"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate, getFinancialYear } from "@/lib/money";
import { getDashboardData } from "./actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Receipt,
  Plus,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

const COLORS = ["#d97706", "#2563eb", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#64748b"];

interface Props {
  initialData: any;
}

export default function DashboardClient({ initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [siteId, setSiteId] = useState("ALL");
  const [fy, setFy] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { kpis, charts, recentTransactions, overdueBills, filterOptions } = data;
  const isSupervisor = filterOptions.userRole === "SUPERVISOR";
  const canSeePartners = ["ADMIN", "ACCOUNTANT"].includes(filterOptions.userRole);

  const applyFilters = (newSiteId = siteId, newFy = fy, newDateFrom = dateFrom, newDateTo = dateTo) => {
    startTransition(async () => {
      const res = await getDashboardData({
        siteId: newSiteId,
        fy: newFy,
        dateFrom: newDateFrom || undefined,
        dateTo: newDateTo || undefined,
      });
      setData(res);
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Global Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Patil Construction — Financial Overview
            </h1>
            <p className="text-xs text-gray-500">
              Live figures derived strictly from central ledger • Current {getFinancialYear()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/transactions/new"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </Link>
          </div>
        </div>

        {/* Global Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 text-xs">
          {/* Site Filter */}
          {!isSupervisor && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Filter by Construction Site
              </label>
              <select
                value={siteId}
                onChange={(e) => {
                  setSiteId(e.target.value);
                  applyFilters(e.target.value, fy, dateFrom, dateTo);
                }}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
              >
                <option value="ALL">All Sites (Company Total)</option>
                {filterOptions.sites.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* FY Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Financial Year</label>
            <select
              value={fy}
              onChange={(e) => {
                setFy(e.target.value);
                applyFilters(siteId, e.target.value, dateFrom, dateTo);
              }}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800"
            >
              <option value="ALL">All Time</option>
              <option value="FY 2024-25">FY 2024-25</option>
              <option value="FY 2023-24">FY 2023-24</option>
            </select>
          </div>

          {/* Date Range From */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                applyFilters(siteId, fy, e.target.value, dateTo);
              }}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800"
            />
          </div>

          {/* Date Range To */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                applyFilters(siteId, fy, dateFrom, e.target.value);
              }}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards (Clicking any KPI drills down into underlying transactions) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credit */}
        <Link
          href="/transactions?direction=CREDIT"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Credit (Inflows)
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatINR(kpis.totalCredit)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Capital, billing & loans</span>
        </Link>

        {/* Total Expense */}
        <Link
          href="/transactions?direction=DEBIT"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-rose-300 hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Expense (Debits)
            </span>
            <ArrowDownRight className="w-4 h-4 text-rose-500 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatINR(kpis.totalExpense)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Material, labour, contractors</span>
        </Link>

        {/* Net Cash Position */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block">
            Net Cash Position
          </span>
          <p className={`text-2xl font-bold mt-1 ${kpis.netCash >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatINR(kpis.netCash)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Inflows minus settled outflows</span>
        </div>

        {/* Total Payables */}
        <Link
          href="/payables"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-amber-300 hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Payables (We Owe)
            </span>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {formatINR(kpis.totalPayables)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Pending vendor & labour bills</span>
        </Link>

        {/* Total Receivables */}
        <Link
          href="/receivables"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Receivables
            </span>
            <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {formatINR(kpis.totalReceivables)}
          </p>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Clients owe to company</span>
        </Link>

        {/* Partner Capital (hidden for site supervisor) */}
        {canSeePartners && (
          <Link
            href="/partners"
            className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-amber-300 hover:shadow-md transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Partner Investment
              </span>
              <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatINR(kpis.totalPartnerInvestment)}
            </p>
            <span className="text-[11px] text-gray-400 mt-0.5 block">Total equity capital invested</span>
          </Link>
        )}

        {/* Sites Count */}
        <Link
          href="/sites"
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-gray-400 hover:shadow-md transition block group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Construction Sites
            </span>
            <Building2 className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-gray-900">{kpis.totalSitesCount}</span>
            <span className="text-xs text-emerald-600 font-semibold">{kpis.activeSitesCount} Active</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Track individual site P&L</span>
        </Link>
      </div>

      {/* Visual Analytics Grid (5 Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Cash Flow (Credit vs Debit) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Monthly Inflows vs Expenses
            </h2>
            <span className="text-[11px] text-gray-400">Cash Flow Trend</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip formatter={(v: any) => [formatINR(v), ""]} />
                <Legend />
                <Bar dataKey="credit" name="Credit (Inflow)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit" name="Debit (Expense)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Expense by Category */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Expenses by Category
            </h2>
            <span className="text-[11px] text-gray-400">Cost Breakdown</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.categories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {charts.categories.map((_: any, idx: number) => (
                    <Cell key={`cat-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [formatINR(v), "Expense"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Expense by Site */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Expenditure by Site
            </h2>
            <span className="text-[11px] text-gray-400">Site Cost Distribution</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.sites} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => `₹${v / 100000}L`} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [formatINR(v), "Total Spent"]} />
                <Bar dataKey="spend" name="Total Spend" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4 / Chart 5: Partner Capital Split OR Top Vendors */}
        {canSeePartners && charts.partners.length > 0 ? (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Partner Capital Share Split
              </h2>
              <Link href="/partners" className="text-[11px] text-amber-600 hover:text-amber-700">
                View Accounts →
              </Link>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.partners}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {charts.partners.map((_: any, idx: number) => (
                      <Cell key={`part-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [formatINR(v), "Invested"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Top Vendors by Spend
              </h2>
              <span className="text-[11px] text-gray-400">Largest Suppliers</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topVendors} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => `₹${v / 1000}K`} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [formatINR(v), "Spent"]} />
                  <Bar dataKey="spend" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Recent Ledger Entries & Overdue Payables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Recent Ledger Entries
            </h2>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Party / Narration</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((tx: any) => {
                  const isCredit = tx.direction === "CREDIT";
                  return (
                    <tr key={tx.id} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="py-2.5 px-3 max-w-xs truncate">
                        <span className="font-semibold text-gray-900 mr-1">
                          {tx.party?.name || "-"}
                        </span>
                        <span className="text-gray-500">{tx.description}</span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                        {tx.site?.name || "Company-wide"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                        <span className={isCredit ? "text-emerald-600" : "text-gray-900"}>
                          {isCredit ? "+" : "-"}
                          {formatINR(tx.totalAmount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.paymentStatus === "PARTIAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {tx.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overdue Payables Alert List (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center">
              <ShieldAlert className="w-4 h-4 text-rose-600 mr-1.5" />
              Overdue Payables
            </h2>
            <Link href="/payables" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              Payables →
            </Link>
          </div>

          <div className="space-y-2.5">
            {overdueBills.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">
                No overdue bills pending!
              </p>
            ) : (
              overdueBills.map((b: any) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 space-y-1 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{b.party?.name || "Vendor"}</p>
                      <p className="text-[11px] text-gray-500">{b.site?.name || "Company"}</p>
                    </div>
                    <span className="font-bold text-rose-600 text-sm">
                      {formatINR(b.balanceDue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                    <span>Due since: {formatDate(b.date)}</span>
                    <span className="text-rose-700 font-semibold">{b.daysAgo}d ago</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
