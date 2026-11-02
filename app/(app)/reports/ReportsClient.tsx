"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate, getFinancialYear } from "@/lib/money";
import { getReportsData } from "./actions";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  PieChart as PieIcon,
  Layers,
  Receipt,
  BookOpen,
} from "lucide-react";

interface Props {
  initialReport: any;
  sites: { id: string; name: string }[];
}

export default function ReportsClient({ initialReport, sites }: Props) {
  const [reportType, setReportType] = useState<
    "PL" | "CASH_FLOW" | "PARTNER_CAPITAL" | "SITE_EXPENSE" | "CATEGORY_MATERIAL" | "GST_SUMMARY" | "DAY_BOOK"
  >("PL");

  const [siteId, setSiteId] = useState("ALL");
  const [fy, setFy] = useState("ALL");
  const [dayBookDate, setDayBookDate] = useState(new Date().toISOString().split("T")[0]);

  const [reportData, setReportData] = useState<any>(initialReport);
  const [isPending, startTransition] = useTransition();

  const fetchReport = (
    type = reportType,
    newSiteId = siteId,
    newFy = fy,
    date = dayBookDate
  ) => {
    setReportType(type);
    startTransition(async () => {
      const data = await getReportsData({
        reportType: type,
        siteId: newSiteId,
        fy: newFy,
        date: type === "DAY_BOOK" ? date : undefined,
      });
      setReportData(data);
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    let rows: any[] = [];
    let fileName = `patil_construction_${reportType.toLowerCase()}_report.xlsx`;

    if (reportType === "PL") {
      rows.push({ Section: "REVENUE", Category: "Client Billing", Amount: reportData.revenue.clientBilling });
      rows.push({ Section: "REVENUE", Category: "Other Income", Amount: reportData.revenue.otherIncome });
      rows.push({ Section: "REVENUE", Category: "TOTAL REVENUE", Amount: reportData.revenue.total });
      reportData.expenses.forEach((e: any) => {
        rows.push({ Section: "EXPENSES", Category: e.category, Amount: e.amount });
      });
      rows.push({ Section: "EXPENSES", Category: "TOTAL EXPENSES", Amount: reportData.totalExpenses });
      rows.push({ Section: "NET", Category: "NET PROFIT / (LOSS)", Amount: reportData.netProfit });
    } else if (reportType === "CASH_FLOW") {
      rows = reportData.months.map((m: any) => ({
        Month: m.month,
        "Total Inflow": m.inflows.total,
        "Total Outflow": m.outflows.total,
        "Net Cash Flow": m.netCashFlow,
      }));
    } else if (reportType === "GST_SUMMARY") {
      rows = reportData.items.map((i: any) => ({
        Date: formatDate(i.date),
        "Bill #": i.billNumber,
        Vendor: i.partyName,
        "GST Number": i.gstNumber,
        Rate: i.rate,
        "Base Amount": i.baseAmount,
        "GST Amount": i.gstAmount,
        "Total Amount": i.totalAmount,
      }));
    } else if (reportType === "DAY_BOOK") {
      rows = reportData.entries.map((e: any) => ({
        Direction: e.direction,
        Type: e.type,
        Site: e.siteName,
        Party: e.partyName,
        Description: e.description,
        Mode: e.paymentMode,
        Amount: e.amount,
      }));
    } else {
      rows = [{ Message: "Report Exported", Type: reportType }];
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Patil Construction Finance Tracker", 14, 20);
    doc.setFontSize(11);
    doc.text(`Report: ${reportType.replace("_", " ")} — ${new Date().toLocaleDateString("en-IN")}`, 14, 28);

    if (reportType === "PL") {
      const body = [
        ["REVENUE", "", ""],
        ["", "Client Billing Income", formatINR(reportData.revenue.clientBilling)],
        ["", "Other Income", formatINR(reportData.revenue.otherIncome)],
        ["", "Total Revenue", formatINR(reportData.revenue.total)],
        ["EXPENSES", "", ""],
        ...reportData.expenses.map((e: any) => ["", e.category, formatINR(e.amount)]),
        ["", "Total Expenses", formatINR(reportData.totalExpenses)],
        ["NET RESULT", "Net Profit / (Loss)", formatINR(reportData.netProfit)],
      ];
      autoTable(doc, { startY: 34, head: [["Section", "Item", "Amount (INR)"]], body });
    } else if (reportType === "GST_SUMMARY") {
      const body = reportData.items.map((i: any) => [
        formatDate(i.date),
        i.partyName,
        i.rate,
        formatINR(i.baseAmount),
        formatINR(i.gstAmount),
        formatINR(i.totalAmount),
      ]);
      autoTable(doc, {
        startY: 34,
        head: [["Date", "Vendor", "Rate", "Base", "GST", "Total"]],
        body,
      });
    } else if (reportType === "DAY_BOOK") {
      const body = reportData.entries.map((e: any) => [
        e.direction,
        e.siteName,
        e.partyName,
        e.description,
        formatINR(e.amount),
      ]);
      autoTable(doc, {
        startY: 34,
        head: [["Direction", "Site", "Party", "Description", "Amount"]],
        body,
      });
    }

    doc.save(`patil_construction_${reportType.toLowerCase()}_report.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Statements</h1>
          <p className="text-sm text-gray-500">
            Exportable compliance statements, P&L, monthly cash flow, and tax summaries
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl shadow-sm flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selection Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {[
          { key: "PL", label: "Profit & Loss (P&L)", icon: TrendingUp },
          { key: "CASH_FLOW", label: "Cash Flow Statement", icon: DollarSign },
          { key: "SITE_EXPENSE", label: "Site-wise Expenses", icon: Building2 },
          { key: "CATEGORY_MATERIAL", label: "Category & Material", icon: Layers },
          { key: "GST_SUMMARY", label: "Input GST Summary", icon: Receipt },
          { key: "PARTNER_CAPITAL", label: "Partner Capital", icon: Users },
          { key: "DAY_BOOK", label: "Day Book", icon: BookOpen },
        ].map((r: any) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => fetchReport(r.key, siteId, fy, dayBookDate)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
                reportType === r.key
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        {/* Site Filter */}
        {["PL", "CATEGORY_MATERIAL", "SITE_EXPENSE"].includes(reportType) && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-semibold">Site:</span>
            <select
              value={siteId}
              onChange={(e) => {
                setSiteId(e.target.value);
                fetchReport(reportType, e.target.value, fy, dayBookDate);
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium"
            >
              <option value="ALL">All Sites (Consolidated)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* FY Filter */}
        {reportType !== "DAY_BOOK" && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-semibold">Financial Year:</span>
            <select
              value={fy}
              onChange={(e) => {
                setFy(e.target.value);
                fetchReport(reportType, siteId, e.target.value, dayBookDate);
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-medium"
            >
              <option value="ALL">All Time</option>
              <option value="FY 2024-25">FY 2024-25</option>
              <option value="FY 2023-24">FY 2023-24</option>
            </select>
          </div>
        )}

        {/* Day Book Date Picker */}
        {reportType === "DAY_BOOK" && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-semibold">Choose Day:</span>
            <input
              type="date"
              value={dayBookDate}
              onChange={(e) => {
                setDayBookDate(e.target.value);
                fetchReport("DAY_BOOK", siteId, fy, e.target.value);
              }}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl"
            />
          </div>
        )}
      </div>

      {/* ─── REPORT OUTPUT DISPLAY ─── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        {/* REPORT 1: PROFIT & LOSS */}
        {reportType === "PL" && reportData && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Statement of Profit & Loss</h2>
              <p className="text-xs text-gray-500">
                {siteId === "ALL" ? "Consolidated Company-wide" : "Site-specific Statement"} •{" "}
                {fy === "ALL" ? "All Time" : fy}
              </p>
            </div>

            {/* Income Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg">
                I. Revenue & Inflows
              </h3>
              <div className="divide-y divide-gray-100 text-xs px-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Client Contract Receipts / Billed</span>
                  <span className="font-semibold text-gray-900">
                    {formatINR(reportData.revenue.clientBilling)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-700">Other Inflows / Revenue</span>
                  <span className="font-semibold text-gray-900">
                    {formatINR(reportData.revenue.otherIncome)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-bold text-emerald-700">
                  <span>Total Revenue (A)</span>
                  <span className="text-sm">{formatINR(reportData.revenue.total)}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg">
                II. Operating & Site Expenses
              </h3>
              <div className="divide-y divide-gray-100 text-xs px-3">
                {reportData.expenses.map((e: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2">
                    <span className="text-gray-700">{e.category}</span>
                    <span className="font-semibold text-gray-900">{formatINR(e.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 font-bold text-rose-700">
                  <span>Total Operating Expenses (B)</span>
                  <span className="text-sm">{formatINR(reportData.totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Result */}
            <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-200">
              <div>
                <span className="font-bold text-gray-900 text-sm block">Net Margin / Profit (A - B)</span>
                <span className="text-xs text-gray-500">Margin: {reportData.margin}% of turnover</span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  reportData.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatINR(reportData.netProfit)}
              </span>
            </div>
          </div>
        )}

        {/* REPORT 2: CASH FLOW STATEMENT */}
        {reportType === "CASH_FLOW" && reportData && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 text-center">
              Monthly Cash Flow Statement
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Capital In</th>
                    <th className="py-2.5 px-3 text-right">Client Receipts</th>
                    <th className="py-2.5 px-3 text-right">Total Inflow</th>
                    <th className="py-2.5 px-3 text-right">Total Outflow</th>
                    <th className="py-2.5 px-3 text-right">Net Cash Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.months.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{m.month}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">
                        {formatINR(m.inflows.capital)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-medium">
                        {formatINR(m.inflows.clientReceipts)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatINR(m.inflows.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {formatINR(m.outflows.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={m.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}>
                          {formatINR(m.netCashFlow)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 3: GST SUMMARY */}
        {reportType === "GST_SUMMARY" && reportData && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-400 text-xs block">Total Base Amount</span>
                <span className="text-xl font-bold text-gray-900 mt-1 block">
                  {formatINR(reportData.totalBaseAmount)}
                </span>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-amber-800 text-xs block font-semibold">Total Input GST Paid</span>
                <span className="text-xl font-bold text-amber-900 mt-1 block">
                  {formatINR(reportData.totalGSTPaid)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Bill #</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3 text-center">Rate</th>
                    <th className="py-2.5 px-3 text-right">Base (₹)</th>
                    <th className="py-2.5 px-3 text-right">GST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.items.map((i: any) => (
                    <tr key={i.id} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(i.date)}</td>
                      <td className="py-2.5 px-3 font-mono">{i.billNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{i.partyName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{i.gstNumber}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-700">{i.rate}</td>
                      <td className="py-2.5 px-3 text-right">{formatINR(i.baseAmount)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-800">
                        {formatINR(i.gstAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                        {formatINR(i.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 4: DAY BOOK */}
        {reportType === "DAY_BOOK" && reportData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                Day Book: {formatDate(reportData.date)}
              </h2>
              <div className="flex space-x-4 text-xs font-semibold">
                <span className="text-emerald-600">Credits: +{formatINR(reportData.dayCredit)}</span>
                <span className="text-rose-600">Debits: -{formatINR(reportData.dayDebit)}</span>
                <span className="text-gray-900">Net: {formatINR(reportData.netDayCash)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Flow</th>
                    <th className="py-2.5 px-3">Site</th>
                    <th className="py-2.5 px-3">Party</th>
                    <th className="py-2.5 px-3">Narration</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.entries.map((e: any) => {
                    const isCredit = e.direction === "CREDIT";
                    return (
                      <tr key={e.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCredit ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {e.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-800">{e.siteName}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">{e.partyName}</td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{e.description}</td>
                        <td className="py-2.5 px-3 text-gray-400">{e.paymentMode}</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={isCredit ? "text-emerald-600" : "text-gray-900"}>
                            {isCredit ? "+" : "-"}
                            {formatINR(e.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 5: CATEGORY & MATERIAL */}
        {reportType === "CATEGORY_MATERIAL" && reportData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Expense by Category
              </h3>
              <div className="divide-y divide-gray-100 text-xs">
                {reportData.categories.map((c: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2">
                    <span className="text-gray-800 font-medium">{c.name}</span>
                    <span className="font-bold text-gray-900">{formatINR(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Material Consumption Summary
              </h3>
              <div className="divide-y divide-gray-100 text-xs">
                {reportData.materials.map((m: any, idx: number) => (
                  <div key={idx} className="flex justify-between py-2">
                    <div>
                      <span className="font-semibold text-gray-900 block">{m.name}</span>
                      <span className="text-[11px] text-gray-400">
                        {m.quantity} {m.unit}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900">{formatINR(m.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REPORT 6: SITE-WISE EXPENSES */}
        {reportType === "SITE_EXPENSE" && reportData && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 text-center">
              Consolidated Site Expenditure Report
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Site</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Contract Value</th>
                    <th className="py-2.5 px-3 text-right">Total Incurred Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.sites.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{s.siteName}</td>
                      <td className="py-2.5 px-3 text-gray-500">{s.location}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatINR(s.contractValue)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {formatINR(s.totalSpent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT 7: PARTNER CAPITAL */}
        {reportType === "PARTNER_CAPITAL" && reportData && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 text-center">
              Partner Capital & Equity Statement
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Partner Name</th>
                    <th className="py-2.5 px-3 text-center">Share %</th>
                    <th className="py-2.5 px-3 text-right">Capital Invested</th>
                    <th className="py-2.5 px-3 text-right">Out-of-Pocket Paid</th>
                    <th className="py-2.5 px-3 text-right">Withdrawn</th>
                    <th className="py-2.5 px-3 text-right">Company Net Owes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.partners.map((p: any) => (
                    <tr key={p.id} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-amber-700">
                        {p.sharePercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                        {formatINR(p.invested)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-600">{formatINR(p.personalPaid)}</td>
                      <td className="py-2.5 px-3 text-right text-rose-600">{formatINR(p.withdrawn)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 text-sm">
                        {formatINR(p.netOwed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
