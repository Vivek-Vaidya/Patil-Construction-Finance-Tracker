"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTransaction,
  checkDuplicateTransaction,
  createQuickParty,
  createQuickSite,
  createQuickCategory,
  createQuickMaterial,
} from "../actions";
import { formatINR, calcRateTotal, calcGST, calcTotalWithGST } from "@/lib/money";
import {
  Calendar,
  Building2,
  Users,
  Layers,
  Package,
  Receipt,
  Upload,
  AlertTriangle,
  Plus,
  Check,
  ChevronDown,
  X,
  CreditCard,
  Wallet,
} from "lucide-react";

interface Option {
  id: string;
  name: string;
  [key: string]: any;
}

interface FormProps {
  initialData: {
    sites: Option[];
    parties: Option[];
    categories: Option[];
    materials: Option[];
    partners: Option[];
    userRole: string;
  };
}

export default function TransactionForm({ initialData }: FormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for options to support inline adding
  const [sites, setSites] = useState(initialData.sites);
  const [parties, setParties] = useState(initialData.parties);
  const [categories, setCategories] = useState(initialData.categories);
  const [materials, setMaterials] = useState(initialData.materials);
  const [partners] = useState(initialData.partners);

  // Form Fields
  const [direction, setDirection] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [type, setType] = useState<string>("EXPENSE");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [siteId, setSiteId] = useState<string>("");
  const [partyId, setPartyId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [materialId, setMaterialId] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Pricing
  const [pricingMode, setPricingMode] = useState<"RATE" | "LUMPSUM">("LUMPSUM");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("bags");
  const [rate, setRate] = useState<string>("");
  const [lumpsumAmount, setLumpsumAmount] = useState<string>("");
  const [gstPercent, setGstPercent] = useState<string>("0");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paidByType, setPaidByType] = useState<"COMPANY" | "PARTNER" | "EMPLOYEE">("COMPANY");
  const [partnerId, setPartnerId] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [billNumber, setBillNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Attachment
  const [attachment, setAttachment] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Modals for "Add New"
  const [inlineModal, setInlineModal] = useState<"PARTY" | "SITE" | "CATEGORY" | "MATERIAL" | null>(null);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyType, setNewPartyType] = useState("VENDOR");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteLoc, setNewSiteLoc] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("bags");

  // Duplicate Warning
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load smart defaults from localStorage
  useEffect(() => {
    try {
      const savedSite = localStorage.getItem("ypc_last_site");
      if (savedSite && sites.some((s) => s.id === savedSite)) {
        setSiteId(savedSite);
      } else if (sites.length > 0) {
        setSiteId(sites[0].id);
      }

      const savedPaidBy = localStorage.getItem("ypc_last_paidby");
      if (savedPaidBy && ["COMPANY", "PARTNER", "EMPLOYEE"].includes(savedPaidBy)) {
        setPaidByType(savedPaidBy as any);
      }

      const savedPartner = localStorage.getItem("ypc_last_partner");
      if (savedPartner && partners.some((p) => p.id === savedPartner)) {
        setPartnerId(savedPartner);
      }
    } catch (_) {}
  }, [sites, partners]);

  // Derived Calculations
  const qtyNum = parseFloat(quantity) || 0;
  const rateNum = parseFloat(rate) || 0;
  const lumpsumNum = parseFloat(lumpsumAmount) || 0;
  const gstPctNum = parseFloat(gstPercent) || 0;

  const baseAmount = pricingMode === "RATE" ? calcRateTotal(qtyNum, rateNum) : lumpsumNum;
  const gstAmount = calcGST(baseAmount, gstPctNum);
  const totalAmount = calcTotalWithGST(baseAmount, gstPctNum);

  // Sync amountPaid default when total changes if user hasn't explicitly set partial
  const paidNum = parseFloat(amountPaid) || 0;
  const pendingAmount = Math.max(0, totalAmount - paidNum);

  // Check duplicate debounced
  useEffect(() => {
    if (totalAmount <= 0) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      const dup = await checkDuplicateTransaction({
        date,
        partyId: partyId || undefined,
        totalAmount,
        billNumber: billNumber || undefined,
      });
      setDuplicateWarning(dup);
    }, 400);

    return () => clearTimeout(timer);
  }, [date, partyId, totalAmount, billNumber]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAttachment(data);
      } else {
        alert(data.error || "File upload failed");
      }
    } catch (err) {
      alert("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  // Submit Handler
  const handleSubmit = (addAnother: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!description.trim()) {
      setErrorMsg("Please provide a description.");
      return;
    }

    if (totalAmount <= 0) {
      setErrorMsg("Total amount must be greater than zero.");
      return;
    }

    if (paidNum > totalAmount) {
      setErrorMsg("Amount paid cannot be greater than total amount.");
      return;
    }

    if (paidByType === "PARTNER" && !partnerId) {
      setErrorMsg("Please select which partner paid for this.");
      return;
    }

    startTransition(async () => {
      const res = await createTransaction({
        date,
        direction,
        type,
        categoryId: categoryId || null,
        siteId: siteId || null,
        description,
        paidByType,
        partnerId: paidByType === "PARTNER" ? partnerId : null,
        partyId: partyId || null,
        materialId: materialId || null,
        quantity: pricingMode === "RATE" ? qtyNum : null,
        unit: pricingMode === "RATE" ? unit : null,
        pricingMode,
        rate: pricingMode === "RATE" ? rateNum : null,
        gstPercent: gstPctNum > 0 ? gstPctNum : null,
        gstAmount: gstPctNum > 0 ? gstAmount : null,
        totalAmount,
        amountPaid: paidNum,
        paymentMode,
        billNumber: billNumber || null,
        notes: notes || null,
        attachment,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        // Save smart defaults
        try {
          if (siteId) localStorage.setItem("ypc_last_site", siteId);
          localStorage.setItem("ypc_last_paidby", paidByType);
          if (partnerId) localStorage.setItem("ypc_last_partner", partnerId);
        } catch (_) {}

        if (addAnother) {
          setSuccessMsg("Transaction recorded! Form reset for next entry.");
          setDescription("");
          setLumpsumAmount("");
          setQuantity("");
          setRate("");
          setAmountPaid("");
          setBillNumber("");
          setNotes("");
          setAttachment(null);
          setDuplicateWarning(null);
        } else {
          router.push("/transactions");
        }
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Transaction</h1>
          <p className="text-sm text-gray-500">
            Enter expense, client receipt, partner investment, or site payment.
          </p>
        </div>
        {/* Direction Switcher */}
        <div className="inline-flex p-1 bg-gray-100 rounded-xl shadow-inner self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setDirection("DEBIT");
              setType("EXPENSE");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              direction === "DEBIT"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Debit (Outflow / Expense)
          </button>
          <button
            type="button"
            onClick={() => {
              setDirection("CREDIT");
              setType("CLIENT_RECEIPT");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              direction === "CREDIT"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Credit (Inflow / Receipt)
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Duplicate warning badge */}
      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Possible Duplicate Entry Detected</p>
            <p className="text-amber-800 mt-0.5">
              An existing transaction on this date with matching bill # or amount was found:{" "}
              <span className="font-medium">
                &ldquo;{duplicateWarning.description}&rdquo; ({formatINR(duplicateWarning.totalAmount)})
              </span>
              {duplicateWarning.partyName && ` for ${duplicateWarning.partyName}`}.
              Please confirm this is not an unintentional duplicate.
            </p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
        {/* Row 1: Type, Date, Site */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Transaction Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {direction === "DEBIT" ? (
                <>
                  <option value="EXPENSE">Site / General Expense</option>
                  <option value="LOAN_REPAYMENT">Loan Repayment</option>
                  <option value="PARTNER_WITHDRAWAL">Partner Withdrawal</option>
                  <option value="OTHER">Other Debit</option>
                </>
              ) : (
                <>
                  <option value="CLIENT_RECEIPT">Client Receipt / Billing Payment</option>
                  <option value="PARTNER_INVESTMENT">Partner Investment / Capital</option>
                  <option value="LOAN_RECEIVED">Loan Received</option>
                  <option value="OTHER_INCOME">Other Income</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-gray-500" />
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                <Building2 className="w-3.5 h-3.5 mr-1 text-gray-500" />
                Construction Site
              </label>
              <button
                type="button"
                onClick={() => setInlineModal("SITE")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center"
              >
                <Plus className="w-3 h-3 mr-0.5" /> New
              </button>
            </div>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">(Company-level / Office / General)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Description & Bill Number */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Description / Narration *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 200 bags of UltraTech Cement for 2nd floor slab"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center">
              <Receipt className="w-3.5 h-3.5 mr-1 text-gray-500" />
              Bill / Invoice Number
            </label>
            <input
              type="text"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. INV-2024-892"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Row 3: Party (Vendor/Contractor/Client) & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                <Users className="w-3.5 h-3.5 mr-1 text-gray-500" />
                {direction === "DEBIT" ? "Paid To / Vendor / Contractor" : "Received From / Client / Partner"}
              </label>
              <button
                type="button"
                onClick={() => setInlineModal("PARTY")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center"
              >
                <Plus className="w-3 h-3 mr-0.5" /> New Party
              </button>
            </div>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Select party / vendor...</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.type}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-gray-500" />
                Expense Category
              </label>
              <button
                type="button"
                onClick={() => setInlineModal("CATEGORY")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center"
              >
                <Plus className="w-3 h-3 mr-0.5" /> New Category
              </button>
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing Mode Toggle & Details */}
        <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Pricing Calculation Mode
            </span>
            <div className="inline-flex p-1 bg-amber-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPricingMode("LUMPSUM")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  pricingMode === "LUMPSUM"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-amber-700 hover:text-amber-900"
                }`}
              >
                Lumpsum (Fixed Amount)
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("RATE")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  pricingMode === "RATE"
                    ? "bg-white text-amber-900 shadow-sm"
                    : "text-amber-700 hover:text-amber-900"
                }`}
              >
                Rate-Based (Qty × Rate)
              </button>
            </div>
          </div>

          {pricingMode === "RATE" ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Material</label>
                  <button
                    type="button"
                    onClick={() => setInlineModal("MATERIAL")}
                    className="text-[11px] text-amber-600 font-medium"
                  >
                    + New
                  </button>
                </div>
                <select
                  value={materialId}
                  onChange={(e) => {
                    setMaterialId(e.target.value);
                    const mat = materials.find((m) => m.id === e.target.value);
                    if (mat?.defaultUnit) setUnit(mat.defaultUnit);
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                >
                  <option value="">Select material...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity</label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="200"
                    className="w-2/3 px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                  />
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="bags"
                    className="w-1/3 px-2 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rate (₹ / unit)</label>
                <input
                  type="number"
                  step="any"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="380"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">GST Rate</label>
                <select
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                >
                  <option value="0">0% (None)</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18% (Standard)</option>
                  <option value="28">28% (Cement, Luxury)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Base Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={lumpsumAmount}
                  onChange={(e) => setLumpsumAmount(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl text-base font-semibold text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">GST Rate</label>
                <select
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
                >
                  <option value="0">0% (No GST)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>
          )}

          {/* Live Calculation Banner */}
          <div className="pt-3 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center space-x-4 text-xs text-amber-900">
              <span>Base: <strong className="font-semibold">{formatINR(baseAmount)}</strong></span>
              {gstPctNum > 0 && (
                <span>+ GST ({gstPctNum}%): <strong className="font-semibold">{formatINR(gstAmount)}</strong></span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs uppercase text-amber-800 tracking-wide mr-2">Total Amount:</span>
              <span className="text-xl font-bold text-amber-900">{formatINR(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Row 4: Settlement / Payment Details */}
        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Payment & Settlement Status
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Amount Actually Paid / Settled (₹)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={totalAmount > 0 ? String(totalAmount) : "0"}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setAmountPaid(String(totalAmount))}
                  className="absolute right-2 top-2 text-[11px] font-bold text-amber-600 hover:text-amber-700"
                >
                  FULL
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {pendingAmount > 0 ? (
                  <span className="text-rose-600 font-medium">
                    Owed / Payable: {formatINR(pendingAmount)}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">Fully Paid</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT / RTGS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Paid From Whose Pocket / Account?
              </label>
              <select
                value={paidByType}
                onChange={(e) => setPaidByType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm"
              >
                <option value="COMPANY">Company Bank / Cash Account</option>
                <option value="PARTNER">Partner Personally (Creates Partner Payable)</option>
                <option value="EMPLOYEE">Site Supervisor / Employee</option>
              </select>
            </div>
          </div>

          {paidByType === "PARTNER" && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                Which partner paid personally? *
              </label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full sm:w-1/2 px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-medium text-amber-950 focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">Select partner...</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-amber-700 mt-1">
                ✓ The company ledger will automatically reflect that this ₹ amount is owed back to this partner until reimbursed.
              </p>
            </div>
          )}
        </div>

        {/* Row 5: Notes & Receipt Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Additional Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Unloaded at Site Tower B, delivery challan #452"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center">
              <Upload className="w-3.5 h-3.5 mr-1 text-gray-500" />
              Bill Photo or Receipt Attachment
            </label>

            {attachment ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-sm">
                <span className="font-medium text-amber-900 truncate">{attachment.fileName}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/40 transition">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-medium text-gray-600">
                  {uploading ? "Uploading..." : "Click or tap to upload photo / PDF"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/transactions")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isPending || uploading}
            onClick={() => handleSubmit(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-amber-500 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save & Add Another"}
          </button>

          <button
            type="button"
            disabled={isPending || uploading}
            onClick={() => handleSubmit(false)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isPending ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── INLINE MODAL FOR ADDING PARTY / SITE / CATEGORY / MATERIAL ─── */}
      {inlineModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {inlineModal === "PARTY" && "Add New Party / Vendor / Client"}
                {inlineModal === "SITE" && "Add New Construction Site"}
                {inlineModal === "CATEGORY" && "Add New Expense Category"}
                {inlineModal === "MATERIAL" && "Add New Material"}
              </h3>
              <button onClick={() => setInlineModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inlineModal === "PARTY" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Party Name *</label>
                  <input
                    type="text"
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="e.g. Balaji Steel Suppliers"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Party Type</label>
                  <select
                    value={newPartyType}
                    onChange={(e) => setNewPartyType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="VENDOR">Vendor / Supplier</option>
                    <option value="CONTRACTOR">Contractor / Sub-contractor</option>
                    <option value="LABOUR">Labour Contractor</option>
                    <option value="CLIENT">Client</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            )}

            {inlineModal === "SITE" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Site Name *</label>
                  <input
                    type="text"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                    placeholder="e.g. Navi Mumbai Complex"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    value={newSiteLoc}
                    onChange={(e) => setNewSiteLoc(e.target.value)}
                    placeholder="e.g. Vashi, Navi Mumbai"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {inlineModal === "CATEGORY" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Safety Gear"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            {inlineModal === "MATERIAL" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    placeholder="e.g. Waterproofing Chemical"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Default Unit</label>
                  <input
                    type="text"
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    placeholder="e.g. litre, bags, kg"
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInlineModal(null)}
                className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (inlineModal === "PARTY" && newPartyName.trim()) {
                    const res = await createQuickParty({ name: newPartyName, type: newPartyType });
                    if (res.party) {
                      setParties((prev) => [...prev, res.party]);
                      setPartyId(res.party.id);
                      setNewPartyName("");
                      setInlineModal(null);
                    }
                  } else if (inlineModal === "SITE" && newSiteName.trim() && newSiteLoc.trim()) {
                    const res = await createQuickSite({ name: newSiteName, location: newSiteLoc });
                    if (res.site) {
                      setSites((prev) => [...prev, res.site]);
                      setSiteId(res.site.id);
                      setNewSiteName("");
                      setNewSiteLoc("");
                      setInlineModal(null);
                    }
                  } else if (inlineModal === "CATEGORY" && newCatName.trim()) {
                    const res = await createQuickCategory(newCatName);
                    if (res.category) {
                      setCategories((prev) => [...prev, res.category]);
                      setCategoryId(res.category.id);
                      setNewCatName("");
                      setInlineModal(null);
                    }
                  } else if (inlineModal === "MATERIAL" && newMatName.trim()) {
                    const res = await createQuickMaterial({ name: newMatName, defaultUnit: newMatUnit });
                    if (res.material) {
                      setMaterials((prev) => [...prev, res.material]);
                      setMaterialId(res.material.id);
                      setUnit(res.material.defaultUnit || "nos");
                      setNewMatName("");
                      setInlineModal(null);
                    }
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold"
              >
                Create & Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

