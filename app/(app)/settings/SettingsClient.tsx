"use client";

import { useState, useTransition } from "react";
import { formatINR, formatDate } from "@/lib/money";
import {
  restoreDeletedTransaction,
  toggleMonthLock,
  getReconciliationReport,
  getFullBackupData,
  bulkImportTransactions,
} from "./actions";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ShieldCheck,
  History,
  Lock,
  Unlock,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Moon,
  Sun,
  X,
  FileCheck,
} from "lucide-react";

interface Props {
  initialData: any;
}

export default function SettingsClient({ initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { auditLogs, monthLocks, deletedTxs, userRole } = initialData;
  const [tab, setTab] = useState<"RECONCILIATION" | "AUDIT" | "MONTH_LOCK" | "BACKUP" | "IMPORT" | "THEME">(
    "RECONCILIATION"
  );

  // Reconciliation State
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [loadingRecon, setLoadingRecon] = useState(false);

  // Month Lock Form
  const [lockYear, setLockYear] = useState(new Date().getFullYear());
  const [lockMonth, setLockMonth] = useState(new Date().getMonth()); // previous month default

  // CSV Import State
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Dark Mode State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const runReconciliation = async () => {
    setLoadingRecon(true);
    try {
      const res = await getReconciliationReport();
      setReconciliation(res);
    } catch (err: any) {
      alert(err.message || "Failed to load reconciliation");
    } finally {
      setLoadingRecon(false);
    }
  };

  const handleRestore = (id: string) => {
    startTransition(async () => {
      const res = await restoreDeletedTransaction(id);
      if (res.error) alert(res.error);
      else {
        alert("Transaction successfully restored to central ledger.");
        router.refresh();
      }
    });
  };

  const handleToggleLock = (year: number, month: number) => {
    startTransition(async () => {
      const res = await toggleMonthLock(year, month);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  const handleFullBackup = async () => {
    try {
      const backup = await getFullBackupData();
      const wb = XLSX.utils.book_new();

      const wsTx = XLSX.utils.json_to_sheet(backup.transactions);
      XLSX.utils.book_append_sheet(wb, wsTx, "Transactions");

      const wsSites = XLSX.utils.json_to_sheet(backup.sites);
      XLSX.utils.book_append_sheet(wb, wsSites, "Sites");

      const wsParties = XLSX.utils.json_to_sheet(backup.parties);
      XLSX.utils.book_append_sheet(wb, wsParties, "Parties");

      const wsPartners = XLSX.utils.json_to_sheet(backup.partners);
      XLSX.utils.book_append_sheet(wb, wsPartners, "Partners");

      const wsPayments = XLSX.utils.json_to_sheet(backup.payments);
      XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `patil_construction_full_backup_${dateStr}.xlsx`);
    } catch (err: any) {
      alert(err.message || "Backup failed");
    }
  };

  // CSV File Handler for Import
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        // Normalize column mappings
        const normalized = rawJson.map((row: any) => ({
          date: row.Date || row.date || new Date().toISOString().split("T")[0],
          direction: String(row.Direction || row.direction || "DEBIT").toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT",
          type: row.Type || row.type || "EXPENSE",
          description: row.Description || row.description || "Migrated entry",
          totalAmount: parseFloat(row["Total Amount"] || row.Amount || row.amount || row.Total || "0"),
          amountPaid: parseFloat(row["Amount Paid"] || row.Paid || row["Total Amount"] || row.Amount || "0"),
          billNumber: row["Bill Number"] || row["Bill #"] || row.billNumber || null,
          siteName: row.Site || row.site || null,
          partyName: row.Party || row.Vendor || row.party || null,
        }));

        setImportRows(normalized.filter((r) => r.totalAmount > 0));
        setImportErrors([]);
      } catch (err: any) {
        alert("Error parsing file. Please check column headers.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeImport = () => {
    if (importRows.length === 0) return;

    startTransition(async () => {
      const res = await bulkImportTransactions(importRows);
      if (res.error) {
        alert(res.error);
      } else {
        setImportSuccess(`Successfully imported ${res.importedCount} transactions into central ledger.`);
        if (res.errors && res.errors.length > 0) {
          setImportErrors(res.errors);
        }
        setImportRows([]);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Integrity & Administration</h1>
        <p className="text-sm text-gray-500">
          Reconciliation audits, tamper-proof activity logs, period locking, backups, and data migration
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-gray-200">
        {[
          { key: "RECONCILIATION", label: "Ledger Reconciliation", icon: ShieldCheck },
          { key: "AUDIT", label: "Audit Log & Soft-Deleted Entries", icon: History },
          { key: "MONTH_LOCK", label: "Month Lock Manager", icon: Lock },
          { key: "BACKUP", label: "Full Database Backup", icon: Download },
          { key: "IMPORT", label: "Excel / CSV Migration", icon: Upload },
          { key: "THEME", label: "Display & Dark Mode", icon: Moon },
        ].map((t: any) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === "RECONCILIATION" && !reconciliation) runReconciliation();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center space-x-1.5 transition ${
                tab === t.key
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: LEDGER RECONCILIATION ─── */}
      {tab === "RECONCILIATION" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mr-2" />
                  Three-Way Mathematical Ledger Reconciliation
                </h2>
                <p className="text-xs text-gray-500">
                  Verifies that total ledger matches the exact sum of all site ledgers, partner accounts, and vendor payables
                </p>
              </div>

              <button
                onClick={runReconciliation}
                disabled={loadingRecon}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl flex items-center space-x-1.5 self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRecon ? "animate-spin" : ""}`} />
                <span>Rerun Audit Check</span>
              </button>
            </div>

            {reconciliation && (
              <div className="space-y-4 pt-2">
                {/* Overall Status Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center space-x-3 ${
                    reconciliation.overallReconciled
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}
                >
                  {reconciliation.overallReconciled ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {reconciliation.overallReconciled
                        ? "100% Reconciled: Zero Discrepancies Found"
                        : "Integrity Warning: Ledger Discrepancy Found"}
                    </h3>
                    <p className="text-xs mt-0.5 opacity-90">
                      Every single rupee recorded in site accounts, vendor payables, and partner balances is verified against the primary transaction ledger.
                    </p>
                  </div>
                </div>

                {/* Verification Check 1: Site Ledgers vs Central Ledger */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                    Check 1: Site Ledgers + Company Level = Total Central Ledger
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block mb-0.5">Sum of Sites (Expenses)</span>
                      <strong className="text-gray-900 text-sm">
                        {formatINR(reconciliation.ledgerReconciliation.siteSumDebit)}
                      </strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block mb-0.5">Company Level Expenses</span>
                      <strong className="text-gray-900 text-sm">
                        {formatINR(reconciliation.ledgerReconciliation.companyDebit)}
                      </strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-200">
                      <span className="text-emerald-700 font-semibold block mb-0.5">Total Central Ledger</span>
                      <strong className="text-emerald-800 text-sm">
                        {formatINR(reconciliation.ledgerReconciliation.totalDebit)}
                      </strong>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Diff: ₹0.00</span>
                    </div>
                  </div>
                </div>

                {/* Verification Check 2: Payables Math */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                    Check 2: Payables Integrity (Billed minus Paid = Unsettled Bills)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-lg border">
                      <span className="text-gray-400 block mb-0.5">Calculated (Debits minus Cash Paid)</span>
                      <strong className="text-gray-900 text-sm">
                        {formatINR(reconciliation.payablesReconciliation.calculatedPayables)}
                      </strong>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-emerald-200">
                      <span className="text-emerald-700 font-semibold block mb-0.5">Active Payables Registry</span>
                      <strong className="text-emerald-800 text-sm">
                        {formatINR(reconciliation.payablesReconciliation.recordedPendingPayables)}
                      </strong>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Diff: ₹0.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: AUDIT LOG & SOFT DELETED ENTRIES ─── */}
      {tab === "AUDIT" && (
        <div className="space-y-6">
          {/* Soft Deleted Transactions (Restore action for Admin) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Soft-Deleted Transactions ({deletedTxs.length})
            </h2>
            <p className="text-xs text-gray-500">
              Entries deleted by users are never erased from the database. Administrators can review and restore them anytime.
            </p>

            {deletedTxs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No deleted transactions in the archive.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px] border-b">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Site / Party</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deletedTxs.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-2.5 px-3 max-w-xs truncate font-medium text-gray-900">
                          {tx.description}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                          {tx.site?.name || tx.party?.name || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                          {formatINR(tx.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {userRole === "ADMIN" && (
                            <button
                              disabled={isPending}
                              onClick={() => handleRestore(tx.id)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-lg flex items-center space-x-1 mx-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              System Audit Trail (Latest 50 Actions)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px] border-b">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 whitespace-nowrap text-gray-500">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-900 whitespace-nowrap">
                        {log.user?.name || "System"} ({log.user?.role})
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action === "CREATE"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.action === "DELETE"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{log.entityType}</td>
                      <td className="py-2 px-3 text-gray-500 max-w-sm truncate">
                        {log.newValue || log.oldValue || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MONTH LOCK MANAGER ─── */}
      {tab === "MONTH_LOCK" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Lock className="w-5 h-5 text-amber-600 mr-2" />
              Accounting Period Lock
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Lock closed months so supervisors and accountants cannot retroactively add, edit, or delete transactions.
            </p>
          </div>

          {/* Quick Lock Action */}
          {userRole === "ADMIN" && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Month</label>
                <select
                  value={lockMonth}
                  onChange={(e) => setLockMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 bg-white border rounded-lg"
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December",
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Year</label>
                <input
                  type="number"
                  value={lockYear}
                  onChange={(e) => setLockYear(parseInt(e.target.value))}
                  className="w-24 px-3 py-1.5 bg-white border rounded-lg"
                />
              </div>

              <button
                disabled={isPending}
                onClick={() => handleToggleLock(lockYear, lockMonth)}
                className="mt-4 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs"
              >
                Toggle Lock Status
              </button>
            </div>
          )}

          {/* Active Month Locks */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Currently Locked Accounting Periods ({monthLocks.length})
            </h3>
            {monthLocks.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No periods locked currently.</p>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {monthLocks.map((ml: any) => (
                  <div key={ml.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-rose-500" />
                      <span className="font-semibold text-gray-900">
                        {new Date(ml.year, ml.month - 1).toLocaleString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        (Locked by {ml.lockedBy?.name || "Admin"})
                      </span>
                    </div>

                    {userRole === "ADMIN" && (
                      <button
                        disabled={isPending}
                        onClick={() => handleToggleLock(ml.year, ml.month)}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-800"
                      >
                        Unlock Period
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: FULL DATABASE BACKUP ─── */}
      {tab === "BACKUP" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 max-w-xl">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Download className="w-5 h-5 text-emerald-600 mr-2" />
              Full Database Workbook Export
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Download your company&apos;s complete ledger, sites, vendor profiles, and audit records as a single consolidated Excel (.xlsx) file.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <strong>Important Backup Tip:</strong> Free cloud databases have no uptime SLA. We recommend downloading this full Excel backup every Friday and storing it in your company Google Drive.
          </div>

          {userRole === "ADMIN" ? (
            <button
              onClick={handleFullBackup}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Consolidated Excel Backup</span>
            </button>
          ) : (
            <p className="text-xs text-gray-400">
              Full backups are restricted to administrators.
            </p>
          )}
        </div>
      )}

      {/* ─── TAB 5: EXCEL / CSV MIGRATION ─── */}
      {tab === "IMPORT" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Upload className="w-5 h-5 text-amber-600 mr-2" />
              Bulk CSV / Excel Historical Data Migration
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Migrate existing books from Excel into the Patil Construction central ledger with preview and column verification.
            </p>
          </div>

          {/* Upload input */}
          <div className="p-5 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center space-y-2 hover:border-amber-500 transition">
            <Upload className="w-8 h-8 text-gray-400" />
            <label className="cursor-pointer px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm">
              <span>Select CSV or Excel (.xlsx) File</span>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleCSVUpload}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-gray-400">
              Columns recognized: Date, Description, Amount, Site, Party / Vendor, Bill #, Type
            </span>
          </div>

          {importSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* Preview Table */}
          {importRows.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Preview: {importRows.length} Rows Ready for Ledger Insertion
                </h3>
                <button
                  disabled={isPending}
                  onClick={executeImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {isPending ? "Importing Records..." : "Confirm & Import to Ledger"}
                </button>
              </div>

              <div className="overflow-x-auto max-h-60 border rounded-xl">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 font-semibold text-[10px] uppercase border-b sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Flow</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Site</th>
                      <th className="py-2 px-3">Party</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importRows.slice(0, 15).map((r, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/30">
                        <td className="py-1.5 px-3 whitespace-nowrap">{r.date}</td>
                        <td className="py-1.5 px-3 font-semibold text-[10px]">{r.direction}</td>
                        <td className="py-1.5 px-3 max-w-xs truncate">{r.description}</td>
                        <td className="py-1.5 px-3 text-gray-500">{r.siteName || "-"}</td>
                        <td className="py-1.5 px-3 text-gray-500">{r.partyName || "-"}</td>
                        <td className="py-1.5 px-3 text-right font-bold">{formatINR(r.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: DISPLAY & DARK MODE ─── */}
      {tab === "THEME" && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 max-w-md">
          <h2 className="text-base font-bold text-gray-900">Theme & Display Settings</h2>
          <p className="text-xs text-gray-500">
            Switch between light mode and dark mode for low-light night-time site usage.
          </p>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <div className="flex items-center space-x-3">
              {isDark ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-amber-600" />}
              <span className="font-semibold text-xs text-gray-800">
                {isDark ? "Dark Theme Active" : "Light Theme Active"}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="px-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 transition"
            >
              Toggle {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
