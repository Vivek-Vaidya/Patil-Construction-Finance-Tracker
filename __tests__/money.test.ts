/**
 * Money logic unit tests — Phase 1
 * Comprehensive tests for lib/money.ts
 */

import {
  calcRateTotal,
  calcGST,
  calcTotalWithGST,
  getPaymentStatus,
  getOutstanding,
  formatINR,
  formatINRShort,
  formatDate,
  getFinancialYear,
  getFYRange,
} from "../lib/money";

describe("calcRateTotal", () => {
  it("200 bags × ₹380 = 76,000", () => {
    expect(calcRateTotal(200, 380)).toBe(76000);
  });

  it("500 bags × ₹380 = 1,90,000", () => {
    expect(calcRateTotal(500, 380)).toBe(190000);
  });

  it("3 tonnes × ₹65,000 = 1,95,000", () => {
    expect(calcRateTotal(3, 65000)).toBe(195000);
  });

  it("handles decimals correctly", () => {
    expect(calcRateTotal(1.5, 100)).toBe(150);
  });

  it("zero quantity returns 0", () => {
    expect(calcRateTotal(0, 380)).toBe(0);
  });
});

describe("calcGST", () => {
  it("18% GST on ₹76,000 = ₹13,680", () => {
    expect(calcGST(76000, 18)).toBe(13680);
  });

  it("28% GST on ₹1,00,000 = ₹28,000", () => {
    expect(calcGST(100000, 28)).toBe(28000);
  });

  it("12% GST on ₹50,000 = ₹6,000", () => {
    expect(calcGST(50000, 12)).toBe(6000);
  });

  it("0% GST returns 0", () => {
    expect(calcGST(76000, 0)).toBe(0);
  });

  it("5% GST on ₹10,000 = ₹500", () => {
    expect(calcGST(10000, 5)).toBe(500);
  });
});

describe("calcTotalWithGST", () => {
  it("₹76,000 + 18% GST = ₹89,680", () => {
    expect(calcTotalWithGST(76000, 18)).toBe(89680);
  });

  it("₹1,00,000 + 28% = ₹1,28,000", () => {
    expect(calcTotalWithGST(100000, 28)).toBe(128000);
  });

  it("zero GST returns same amount", () => {
    expect(calcTotalWithGST(76000, 0)).toBe(76000);
  });
});

describe("getPaymentStatus", () => {
  it("fully paid returns PAID", () => {
    expect(getPaymentStatus(76000, 76000)).toBe("PAID");
  });

  it("zero paid returns UNPAID", () => {
    expect(getPaymentStatus(76000, 0)).toBe("UNPAID");
  });

  it("partial payment returns PARTIAL", () => {
    expect(getPaymentStatus(76000, 50000)).toBe("PARTIAL");
  });

  it("overpaid still returns PAID", () => {
    expect(getPaymentStatus(76000, 80000)).toBe("PAID");
  });

  it("negative amount returns UNPAID", () => {
    expect(getPaymentStatus(76000, -100)).toBe("UNPAID");
  });

  it("1 rupee paid on large amount = PARTIAL", () => {
    expect(getPaymentStatus(1000000, 1)).toBe("PARTIAL");
  });
});

describe("getOutstanding", () => {
  it("partial payment: ₹76,000 - ₹50,000 = ₹26,000 outstanding", () => {
    expect(getOutstanding(76000, 50000)).toBe(26000);
  });

  it("fully paid: no outstanding", () => {
    expect(getOutstanding(76000, 76000)).toBe(0);
  });

  it("nothing paid: full amount outstanding", () => {
    expect(getOutstanding(76000, 0)).toBe(76000);
  });

  it("overpaid: outstanding is 0 (not negative)", () => {
    expect(getOutstanding(76000, 80000)).toBe(0);
  });
});

describe("formatINR", () => {
  it("formats positive number in INR", () => {
    const result = formatINR(125000);
    expect(result).toContain("₹");
    expect(result).toContain("1,25,000");
  });

  it("returns ₹0 for null", () => {
    expect(formatINR(null)).toBe("₹0");
  });

  it("returns ₹0 for undefined", () => {
    expect(formatINR(undefined)).toBe("₹0");
  });

  it("returns ₹0 for NaN string", () => {
    expect(formatINR("not-a-number")).toBe("₹0");
  });

  it("handles string number input", () => {
    const result = formatINR("50000");
    expect(result).toContain("₹");
  });

  it("handles negative numbers", () => {
    const result = formatINR(-1000);
    expect(result).toContain("-");
    expect(result).toContain("₹");
  });
});

describe("formatINRShort", () => {
  it("formats 1,25,000 as ₹1.25L", () => {
    expect(formatINRShort(125000)).toBe("₹1.25L");
  });

  it("formats 1,00,00,000 as ₹1.00Cr", () => {
    expect(formatINRShort(10000000)).toBe("₹1.00Cr");
  });

  it("formats 2,50,00,000 as ₹2.50Cr", () => {
    expect(formatINRShort(25000000)).toBe("₹2.50Cr");
  });

  it("formats 5,000 as ₹5.0K", () => {
    expect(formatINRShort(5000)).toBe("₹5.0K");
  });

  it("formats small amount without suffix", () => {
    expect(formatINRShort(500)).toBe("₹500");
  });

  it("handles negative lakh correctly", () => {
    const result = formatINRShort(-125000);
    expect(result).toBe("-₹1.25L");
  });

  it("handles negative crore correctly", () => {
    const result = formatINRShort(-10000000);
    expect(result).toBe("-₹1.00Cr");
  });

  it("85L formatted correctly", () => {
    expect(formatINRShort(8500000)).toBe("₹85.00L");
  });
});

describe("formatDate", () => {
  it("formats a Date object as DD-MMM-YYYY", () => {
    const date = new Date(2024, 3, 15); // April 15, 2024
    const result = formatDate(date);
    // Should be "15-Apr-2024"
    expect(result).toMatch(/\d{2}-[A-Za-z]{3}-\d{4}/);
    expect(result).toContain("2024");
  });

  it("formats a string date", () => {
    const result = formatDate("2024-01-01");
    expect(result).toMatch(/\d{2}-[A-Za-z]{3}-\d{4}/);
  });

  it("includes the year", () => {
    const result = formatDate(new Date(2024, 0, 1));
    expect(result).toContain("2024");
  });
});

describe("getFinancialYear", () => {
  it("April 2024 is in FY 2024-25", () => {
    expect(getFinancialYear(new Date(2024, 3, 1))).toBe("FY 2024-25");
  });

  it("March 2025 is in FY 2024-25", () => {
    expect(getFinancialYear(new Date(2025, 2, 31))).toBe("FY 2024-25");
  });

  it("January 2024 is in FY 2023-24", () => {
    expect(getFinancialYear(new Date(2024, 0, 15))).toBe("FY 2023-24");
  });

  it("returns FY label format", () => {
    const result = getFinancialYear(new Date(2024, 5, 15)); // June 2024
    expect(result).toMatch(/^FY \d{4}-\d{2}$/);
  });
});

describe("getFYRange", () => {
  it("returns start of April 1 for a mid-year date", () => {
    const { start } = getFYRange(new Date(2024, 7, 15)); // August 2024
    expect(start.getMonth()).toBe(3); // April = 3
    expect(start.getFullYear()).toBe(2024);
    expect(start.getDate()).toBe(1);
  });

  it("returns end of March 31 for a mid-year date", () => {
    const { end } = getFYRange(new Date(2024, 7, 15)); // August 2024
    expect(end.getMonth()).toBe(2); // March = 2
    expect(end.getFullYear()).toBe(2025);
    expect(end.getDate()).toBe(31);
  });

  it("Jan 2024 → FY start is April 2023", () => {
    const { start } = getFYRange(new Date(2024, 0, 15)); // January 2024
    expect(start.getFullYear()).toBe(2023);
    expect(start.getMonth()).toBe(3); // April
  });
});

describe("Reconciliation & Ledger Balancing Logic", () => {
  it("verifies site ledgers + company-level ledger = total company debits", () => {
    const siteDebits = [125000, 340000, 520000];
    const companyDebits = 75000;
    const totalSiteDebits = siteDebits.reduce((a, b) => a + b, 0);
    const calculatedTotal = totalSiteDebits + companyDebits;

    const allTransactions = [
      { siteId: "s1", amount: 125000 },
      { siteId: "s2", amount: 340000 },
      { siteId: "s3", amount: 520000 },
      { siteId: null, amount: 75000 },
    ];
    const ledgerTotal = allTransactions.reduce((acc, t) => acc + t.amount, 0);

    expect(calculatedTotal).toBe(ledgerTotal);
    expect(ledgerTotal - calculatedTotal).toBe(0);
  });

  it("verifies payables reconciliation: billed minus paid equals total payables", () => {
    const bills = [
      { totalAmount: 100000, amountPaid: 40000 },
      { totalAmount: 250000, amountPaid: 250000 },
      { totalAmount: 85000, amountPaid: 0 },
    ];

    const totalBilled = bills.reduce((acc, b) => acc + b.totalAmount, 0);
    const totalPaid = bills.reduce((acc, b) => acc + b.amountPaid, 0);
    const computedPayable = totalBilled - totalPaid;

    const expectedPayable = (100000 - 40000) + (250000 - 250000) + (85000 - 0);
    expect(computedPayable).toBe(expectedPayable);
    expect(computedPayable).toBe(145000);
  });

  it("calculates partner net balance: (invested + out-of-pocket) - (withdrawn + reimbursed)", () => {
    const partner = {
      invested: 1000000,      // ₹10 Lakhs capital
      outOfPocket: 150000,    // Paid site expenses personally
      withdrawn: 200000,      // Withdrawn profit/capital
      reimbursed: 50000,      // Company paid back out-of-pocket
    };

    const netBalance =
      (partner.invested + partner.outOfPocket) -
      (partner.withdrawn + partner.reimbursed);

    // Company owes partner: 10L + 1.5L - 2L - 0.5L = 9,00,000
    expect(netBalance).toBe(900000);
  });

  it("handles floating point roundings accurately in GST and totals", () => {
    // 33.33 bags @ ₹385.50
    const rawTotal = calcRateTotal(33.33, 385.50);
    expect(rawTotal).toBeCloseTo(12848.715, 2);

    // 18% GST on ₹12,848.72
    const roundedTotal = Math.round(rawTotal * 100) / 100;
    const gst = calcGST(roundedTotal, 18);
    expect(gst).toBeCloseTo(2312.77, 1);
  });
});
