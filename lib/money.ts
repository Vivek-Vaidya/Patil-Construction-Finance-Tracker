// Indian number system formatting utilities

/**
 * Format number in Indian system: 1,25,000
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  return num < 0 ? `-${formatted}` : formatted;
}

/**
 * Format in lakh/crore shorthand for summaries
 */
export function formatINRShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/**
 * Calculate transaction total from rate-based pricing
 */
export function calcRateTotal(quantity: number, rate: number): number {
  return Math.round(quantity * rate * 100) / 100;
}

/**
 * Calculate GST amount
 */
export function calcGST(baseAmount: number, gstPercent: number): number {
  return Math.round((baseAmount * gstPercent / 100) * 100) / 100;
}

/**
 * Calculate total including GST
 */
export function calcTotalWithGST(baseAmount: number, gstPercent: number): number {
  const gst = calcGST(baseAmount, gstPercent);
  return Math.round((baseAmount + gst) * 100) / 100;
}

/**
 * Determine payment status
 */
export function getPaymentStatus(totalAmount: number, amountPaid: number): "PAID" | "PARTIAL" | "UNPAID" {
  if (amountPaid <= 0) return "UNPAID";
  if (amountPaid >= totalAmount) return "PAID";
  return "PARTIAL";
}

/**
 * Calculate outstanding balance
 */
export function getOutstanding(totalAmount: number, amountPaid: number): number {
  return Math.max(0, totalAmount - amountPaid);
}

/**
 * Format date as DD-MMM-YYYY (Indian style)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
}

/**
 * Get financial year label (Apr-Mar)
 */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  if (month >= 4) return `FY ${year}-${(year + 1).toString().slice(2)}`;
  return `FY ${year - 1}-${year.toString().slice(2)}`;
}

/**
 * Get FY start and end dates
 */
export function getFYRange(date: Date = new Date()): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  return {
    start: new Date(fyStart, 3, 1), // April 1
    end: new Date(fyStart + 1, 2, 31, 23, 59, 59), // March 31
  };
}
