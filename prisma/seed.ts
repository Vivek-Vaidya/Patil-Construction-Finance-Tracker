import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("🌱 Seeding Patil Construction Finance Tracker...");

  // ─── Clean slate ────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.siteUser.deleteMany();
  await prisma.monthLock.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.site.deleteMany();
  await prisma.party.deleteMany();
  await prisma.category.deleteMany();
  await prisma.material.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ──────────────────────────────────────────────────────────
  console.log("  → Creating users...");
  const [admin, accountant, supervisor, viewer] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Yashodeep Patil",
        email: "admin@patilconstruction.com",
        passwordHash: await bcrypt.hash("admin123", 12),
        role: "ADMIN",
        mustChangePassword: false,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Meena Joshi",
        email: "accountant@patilconstruction.com",
        passwordHash: await bcrypt.hash("account123", 12),
        role: "ACCOUNTANT",
        mustChangePassword: false,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Ravi Kumar",
        email: "supervisor@patilconstruction.com",
        passwordHash: await bcrypt.hash("super123", 12),
        role: "SUPERVISOR",
        mustChangePassword: false,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: "Anjali Desai",
        email: "viewer@patilconstruction.com",
        passwordHash: await bcrypt.hash("viewer123", 12),
        role: "VIEWER",
        mustChangePassword: false,
        isActive: true,
      },
    }),
  ]);

  // ─── Parties (clients first so Sites can reference them) ────────────
  console.log("  → Creating parties...");
  const parties = await Promise.all([
    prisma.party.create({ data: { name: "Shree Cement Agency", type: "VENDOR", phone: "9821001001", gstNumber: "27AADCS1234A1Z5", address: "Kalyan, Maharashtra" } }),
    prisma.party.create({ data: { name: "Laxmi Steel Traders", type: "VENDOR", phone: "9821002002", gstNumber: "27AALFL5678B2Z6", address: "Thane, Maharashtra" } }),
    prisma.party.create({ data: { name: "Krishna Sand Supply", type: "VENDOR", phone: "9821003003", address: "Dombivli, Maharashtra" } }),
    prisma.party.create({ data: { name: "Ganesh Aggregate Works", type: "VENDOR", phone: "9821004004", address: "Nashik, Maharashtra" } }),
    prisma.party.create({ data: { name: "Mahesh Electric Works", type: "CONTRACTOR", phone: "9821005005", gstNumber: "27BBBME1234C3Z7" } }),
    prisma.party.create({ data: { name: "Vijay Plumbing Services", type: "CONTRACTOR", phone: "9821006006" } }),
    prisma.party.create({ data: { name: "Santosh Labour Contractor", type: "LABOUR", phone: "9821007007", address: "Bhiwandi, Maharashtra" } }),
    prisma.party.create({ data: { name: "Ram Transport Services", type: "VENDOR", phone: "9821008008" } }),
    prisma.party.create({ data: { name: "ABC Real Estate", type: "CLIENT", phone: "9821009009", gstNumber: "27CCCAB5678D4Z8", address: "Kalyan, Maharashtra" } }),
    prisma.party.create({ data: { name: "XYZ Developers", type: "CLIENT", phone: "9821010010", gstNumber: "27DDDXZ9012E5Z9", address: "Thane, Maharashtra" } }),
    prisma.party.create({ data: { name: "Dombivli Co-op Society", type: "CLIENT", phone: "9821011011", address: "Dombivli, Maharashtra" } }),
    prisma.party.create({ data: { name: "Pune Tech Solutions", type: "CLIENT", phone: "9821012012", gstNumber: "27EEEPT3456F6Z0", address: "Pune, Maharashtra" } }),
    prisma.party.create({ data: { name: "Ravi Paint House", type: "SUPPLIER", phone: "9821013013", address: "Kalyan, Maharashtra" } }),
    prisma.party.create({ data: { name: "Shiva Tiles & Marble", type: "SUPPLIER", phone: "9821014014", address: "Thane, Maharashtra" } }),
    prisma.party.create({ data: { name: "National Hardware", type: "SUPPLIER", phone: "9821015015", address: "Dombivli, Maharashtra" } }),
  ]);

  const [
    shreCement, laxmiSteel, krishnaSand, ganeshAggregate,
    maheshElectric, vijayPlumbing, santoshLabour, ramTransport,
    abcRealEstate, xyzDevelopers, dombivliSociety, puneTech,
    raviPaint, shivaTiles, nationalHardware,
  ] = parties;

  // ─── Sites ──────────────────────────────────────────────────────────
  console.log("  → Creating sites...");
  const [kalyan, thane, dombivli, pune] = await Promise.all([
    prisma.site.create({
      data: {
        name: "Kalyan Heights",
        location: "Kalyan, Maharashtra",
        clientId: abcRealEstate.id,
        startDate: new Date("2024-04-01"),
        status: "ACTIVE",
        contractValue: 8500000,
        notes: "12-storey residential complex, G+11 floors",
      },
    }),
    prisma.site.create({
      data: {
        name: "Thane Commercial Plaza",
        location: "Thane, Maharashtra",
        clientId: xyzDevelopers.id,
        startDate: new Date("2024-06-01"),
        status: "ACTIVE",
        contractValue: 12500000,
        notes: "Commercial office complex, 5 floors + basement",
      },
    }),
    prisma.site.create({
      data: {
        name: "Dombivli Residency",
        location: "Dombivli, Maharashtra",
        clientId: dombivliSociety.id,
        startDate: new Date("2023-08-01"),
        endDate: new Date("2024-09-30"),
        status: "COMPLETED",
        contractValue: 4500000,
        notes: "8-unit residential building, completed ahead of schedule",
      },
    }),
    prisma.site.create({
      data: {
        name: "Pune IT Park",
        location: "Hinjewadi, Pune, Maharashtra",
        clientId: puneTech.id,
        startDate: new Date("2025-01-15"),
        status: "PLANNED",
        contractValue: 20000000,
        notes: "Large IT park development — Phase 1 planning in progress",
      },
    }),
  ]);

  // ─── Partners ───────────────────────────────────────────────────────
  console.log("  → Creating partners...");
  const [partnerYash, partnerRajesh, partnerSuresh] = await Promise.all([
    prisma.partner.create({
      data: {
        name: "Yashodeep Patil",
        phone: "9820001111",
        sharePercent: 50,
        isActive: true,
        userId: admin.id,
      },
    }),
    prisma.partner.create({
      data: {
        name: "Rajesh Sharma",
        phone: "9820002222",
        sharePercent: 30,
        isActive: true,
      },
    }),
    prisma.partner.create({
      data: {
        name: "Suresh Patil",
        phone: "9820003333",
        sharePercent: 20,
        isActive: true,
      },
    }),
  ]);

  // ─── Categories ─────────────────────────────────────────────────────
  console.log("  → Creating categories...");
  const categoryNames = [
    "Material",
    "Labour",
    "Contractor / Sub-contract",
    "Equipment Rental",
    "Transport",
    "Fuel",
    "Salaries",
    "Site Overheads",
    "Permits & Legal",
    "Office Expenses",
    "Taxes (GST/TDS)",
    "Miscellaneous",
  ];
  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.create({
      data: { name, isDefault: true, isActive: true },
    });
    categoryMap[name] = cat.id;
  }

  // ─── Materials ──────────────────────────────────────────────────────
  console.log("  → Creating materials...");
  const materialData = [
    { name: "Cement", defaultUnit: "bags" },
    { name: "Steel / TMT", defaultUnit: "tonnes" },
    { name: "Sand", defaultUnit: "brass" },
    { name: "Aggregate / Metal", defaultUnit: "brass" },
    { name: "Bricks / Blocks", defaultUnit: "nos" },
    { name: "Concrete (RMC)", defaultUnit: "cum" },
    { name: "Paint", defaultUnit: "litres" },
    { name: "Tiles", defaultUnit: "sqft" },
    { name: "Plumbing", defaultUnit: "LS" },
    { name: "Electrical", defaultUnit: "LS" },
    { name: "Timber", defaultUnit: "cft" },
    { name: "Timber Shuttering", defaultUnit: "sqm" },
    { name: "Other", defaultUnit: null },
  ];
  const materialMap: Record<string, string> = {};
  for (const mat of materialData) {
    const m = await prisma.material.create({ data: { ...mat, isActive: true } });
    materialMap[mat.name] = m.id;
  }

  // ─── Transactions ────────────────────────────────────────────────────
  console.log("  → Creating transactions (60+)...");

  // Helper to create a transaction with optional payment record
  async function createTx(data: {
    date: Date;
    direction: "CREDIT" | "DEBIT";
    type: string;
    categoryId?: string;
    siteId?: string;
    description: string;
    paidByType?: "COMPANY" | "PARTNER" | "EMPLOYEE";
    partnerId?: string;
    partyId?: string;
    materialId?: string;
    quantity?: number;
    unit?: string;
    pricingMode?: "RATE" | "LUMPSUM";
    rate?: number;
    gstPercent?: number;
    totalAmount: number;
    amountPaid: number;
    paymentMode?: string;
    billNumber?: string;
    notes?: string;
  }) {
    const paymentStatus =
      data.amountPaid <= 0
        ? "UNPAID"
        : data.amountPaid >= data.totalAmount
        ? "PAID"
        : "PARTIAL";

    const gstAmount =
      data.gstPercent && data.gstPercent > 0
        ? Math.round(((data.totalAmount / (1 + data.gstPercent / 100)) * (data.gstPercent / 100)) * 100) / 100
        : undefined;

    const tx = await prisma.transaction.create({
      data: {
        date: data.date,
        direction: data.direction,
        type: data.type,
        categoryId: data.categoryId,
        siteId: data.siteId,
        description: data.description,
        paidByType: data.paidByType ?? "COMPANY",
        partnerId: data.partnerId,
        partyId: data.partyId,
        materialId: data.materialId,
        quantity: data.quantity,
        unit: data.unit,
        pricingMode: data.pricingMode ?? "LUMPSUM",
        rate: data.rate,
        gstPercent: data.gstPercent,
        gstAmount,
        totalAmount: data.totalAmount,
        amountPaid: data.amountPaid,
        paymentStatus,
        paymentMode: data.paymentMode,
        billNumber: data.billNumber,
        notes: data.notes,
        createdById: admin.id,
      },
    });

    // Create Payment record for PARTIAL or PAID transactions
    if (data.amountPaid > 0) {
      await prisma.payment.create({
        data: {
          transactionId: tx.id,
          date: data.date,
          amount: data.amountPaid,
          mode: data.paymentMode ?? "BANK_TRANSFER",
          notes: paymentStatus === "PARTIAL" ? "Partial payment made" : undefined,
        },
      });
    }

    return tx;
  }

  // ── 1. Partner Investments (CREDIT) ─────────────────────────────────
  await createTx({
    date: daysAgo(170),
    direction: "CREDIT",
    type: "PARTNER_INVESTMENT",
    siteId: kalyan.id,
    description: "Partner capital investment — Yashodeep Patil",
    partnerId: partnerYash.id,
    paidByType: "PARTNER",
    totalAmount: 3000000,
    amountPaid: 3000000,
    paymentMode: "BANK_TRANSFER",
    notes: "Initial capital for Kalyan Heights project",
  });

  await createTx({
    date: daysAgo(165),
    direction: "CREDIT",
    type: "PARTNER_INVESTMENT",
    siteId: thane.id,
    description: "Partner capital investment — Rajesh Sharma",
    partnerId: partnerRajesh.id,
    paidByType: "PARTNER",
    totalAmount: 2000000,
    amountPaid: 2000000,
    paymentMode: "BANK_TRANSFER",
    notes: "Initial capital for Thane Commercial Plaza",
  });

  await createTx({
    date: daysAgo(160),
    direction: "CREDIT",
    type: "PARTNER_INVESTMENT",
    siteId: kalyan.id,
    description: "Partner capital investment — Suresh Patil",
    partnerId: partnerSuresh.id,
    paidByType: "PARTNER",
    totalAmount: 1500000,
    amountPaid: 1500000,
    paymentMode: "BANK_TRANSFER",
    notes: "Additional working capital for Kalyan Heights",
  });

  // ── 2. Material Purchases — Cement ───────────────────────────────────
  await createTx({
    date: daysAgo(155),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Cement"],
    description: "Cement purchase — 500 bags @ ₹380",
    partyId: shreCement.id,
    pricingMode: "RATE",
    quantity: 500,
    unit: "bags",
    rate: 380,
    gstPercent: 28,
    totalAmount: 243200, // 500*380 = 190000 + 28% GST = 243200
    amountPaid: 243200,
    paymentMode: "CHEQUE",
    billNumber: "SCE/24/001",
  });

  await createTx({
    date: daysAgo(140),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: thane.id,
    materialId: materialMap["Cement"],
    description: "Cement purchase — 800 bags @ ₹385",
    partyId: shreCement.id,
    pricingMode: "RATE",
    quantity: 800,
    unit: "bags",
    rate: 385,
    gstPercent: 28,
    totalAmount: 394880, // 800*385 = 308000 + 28% = 394880
    amountPaid: 200000,
    paymentMode: "CHEQUE",
    billNumber: "SCE/24/002",
    notes: "Balance payment due after delivery confirmation",
  });

  await createTx({
    date: daysAgo(100),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Cement"],
    description: "Cement purchase — 600 bags @ ₹382 (second lot)",
    partyId: shreCement.id,
    pricingMode: "RATE",
    quantity: 600,
    unit: "bags",
    rate: 382,
    gstPercent: 28,
    totalAmount: 293817.6,
    amountPaid: 293817.6,
    paymentMode: "UPI",
    billNumber: "SCE/24/009",
  });

  // ── Steel ──────────────────────────────────────────────────────────
  await createTx({
    date: daysAgo(150),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Steel / TMT"],
    description: "TMT Steel bars — 3 tonnes @ ₹65,000/tonne",
    partyId: laxmiSteel.id,
    pricingMode: "RATE",
    quantity: 3,
    unit: "tonnes",
    rate: 65000,
    gstPercent: 18,
    totalAmount: 229950, // 3*65000 = 195000 + 18% = 229950 (approx 230100 - using given)
    amountPaid: 229950,
    paymentMode: "BANK_TRANSFER",
    billNumber: "LST/24/011",
  });

  await createTx({
    date: daysAgo(120),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: thane.id,
    materialId: materialMap["Steel / TMT"],
    description: "TMT Steel bars — 5 tonnes @ ₹64,500/tonne",
    partyId: laxmiSteel.id,
    pricingMode: "RATE",
    quantity: 5,
    unit: "tonnes",
    rate: 64500,
    gstPercent: 18,
    totalAmount: 380550, // 5*64500 = 322500 + 18% = 380550
    amountPaid: 200000,
    paymentMode: "CHEQUE",
    billNumber: "LST/24/018",
    notes: "Partial — balance ₹1,80,550 pending",
  });

  // ── Sand & Aggregate ──────────────────────────────────────────────
  await createTx({
    date: daysAgo(145),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Sand"],
    description: "River sand — 10 brass @ ₹5,500/brass",
    partyId: krishnaSand.id,
    pricingMode: "RATE",
    quantity: 10,
    unit: "brass",
    rate: 5500,
    totalAmount: 55000,
    amountPaid: 55000,
    paymentMode: "CASH",
    notes: "No GST — unregistered supplier",
  });

  await createTx({
    date: daysAgo(130),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: thane.id,
    materialId: materialMap["Sand"],
    description: "River sand — 15 brass @ ₹5,200/brass",
    partyId: krishnaSand.id,
    pricingMode: "RATE",
    quantity: 15,
    unit: "brass",
    rate: 5200,
    totalAmount: 78000,
    amountPaid: 78000,
    paymentMode: "UPI",
  });

  await createTx({
    date: daysAgo(135),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Aggregate / Metal"],
    description: "20mm aggregate — 12 brass @ ₹4,800/brass",
    partyId: ganeshAggregate.id,
    pricingMode: "RATE",
    quantity: 12,
    unit: "brass",
    rate: 4800,
    totalAmount: 57600,
    amountPaid: 57600,
    paymentMode: "CASH",
  });

  // ── Concrete (RMC) ────────────────────────────────────────────────
  await createTx({
    date: daysAgo(110),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Concrete (RMC)"],
    description: "Ready Mix Concrete M25 — 50 CuM @ ₹5,200/CuM",
    pricingMode: "RATE",
    quantity: 50,
    unit: "cum",
    rate: 5200,
    gstPercent: 18,
    totalAmount: 307100, // 50*5200 = 260000 + 18% = 306800 ~ 307100
    amountPaid: 307100,
    paymentMode: "BANK_TRANSFER",
    billNumber: "RMC/24/041",
  });

  await createTx({
    date: daysAgo(90),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: thane.id,
    materialId: materialMap["Concrete (RMC)"],
    description: "Ready Mix Concrete M30 — 80 CuM @ ₹5,600/CuM",
    pricingMode: "RATE",
    quantity: 80,
    unit: "cum",
    rate: 5600,
    gstPercent: 18,
    totalAmount: 528960, // 80*5600 = 448000 + 18% = 528640 ~ 528960
    amountPaid: 300000,
    paymentMode: "CHEQUE",
    billNumber: "RMC/24/055",
    notes: "Balance ₹2,28,960 due on next pour",
  });

  // ── Paint & Tiles (Dombivli — completed) ─────────────────────────
  await createTx({
    date: daysAgo(200),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: dombivli.id,
    materialId: materialMap["Paint"],
    description: "Exterior paint — 200 litres Berger Weathercoat",
    partyId: raviPaint.id,
    pricingMode: "RATE",
    quantity: 200,
    unit: "litres",
    rate: 310,
    gstPercent: 18,
    totalAmount: 73180, // 200*310 = 62000 + 18% = 73160 ~ 73180
    amountPaid: 73180,
    paymentMode: "UPI",
    billNumber: "RPH/23/088",
  });

  await createTx({
    date: daysAgo(195),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: dombivli.id,
    materialId: materialMap["Tiles"],
    description: "Vitrified tiles — 1200 sqft @ ₹85/sqft",
    partyId: shivaTiles.id,
    pricingMode: "RATE",
    quantity: 1200,
    unit: "sqft",
    rate: 85,
    gstPercent: 18,
    totalAmount: 120360, // 1200*85 = 102000 + 18% = 120360
    amountPaid: 120360,
    paymentMode: "CHEQUE",
    billNumber: "STM/23/067",
  });

  // ── Hardware ──────────────────────────────────────────────────────
  await createTx({
    date: daysAgo(80),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Other"],
    description: "Miscellaneous hardware — bolts, anchors, safety nets",
    partyId: nationalHardware.id,
    pricingMode: "LUMPSUM",
    totalAmount: 42500,
    amountPaid: 42500,
    paymentMode: "UPI",
    billNumber: "NH/24/212",
  });

  // ── 3. Contractor / Labour Payments ───────────────────────────────
  await createTx({
    date: daysAgo(148),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: kalyan.id,
    description: "Shuttering & Centering work — Ground floor slab",
    partyId: santoshLabour.id,
    pricingMode: "LUMPSUM",
    totalAmount: 180000,
    amountPaid: 180000,
    paymentMode: "BANK_TRANSFER",
    notes: "Labour contract for G/F slab, completed and verified",
  });

  await createTx({
    date: daysAgo(125),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: kalyan.id,
    description: "Brick masonry work — 1st and 2nd floors",
    partyId: santoshLabour.id,
    pricingMode: "LUMPSUM",
    totalAmount: 240000,
    amountPaid: 150000,
    paymentMode: "BANK_TRANSFER",
    notes: "Running account bill — balance after completion check",
  });

  await createTx({
    date: daysAgo(115),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: thane.id,
    description: "Structural steel fabrication & erection — Floors 1-3",
    pricingMode: "LUMPSUM",
    totalAmount: 450000,
    amountPaid: 225000,
    paymentMode: "CHEQUE",
    notes: "Milestone payment — 50% advance",
  });

  await createTx({
    date: daysAgo(105),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: thane.id,
    description: "Electrical rough-in work — Floors 1-5",
    partyId: maheshElectric.id,
    pricingMode: "LUMPSUM",
    totalAmount: 380000,
    amountPaid: 0,
    notes: "Work in progress — payment on completion",
  });

  await createTx({
    date: daysAgo(85),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: kalyan.id,
    description: "Plumbing rough-in — Floors 1-6",
    partyId: vijayPlumbing.id,
    pricingMode: "LUMPSUM",
    totalAmount: 195000,
    amountPaid: 100000,
    paymentMode: "UPI",
    notes: "Partial payment — 50% advance",
  });

  await createTx({
    date: daysAgo(75),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Labour"],
    siteId: kalyan.id,
    description: "Daily labour — concreting gang (25 workers × 5 days)",
    pricingMode: "LUMPSUM",
    totalAmount: 62500,
    amountPaid: 62500,
    paymentMode: "CASH",
    notes: "₹500/day per worker",
  });

  await createTx({
    date: daysAgo(65),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Labour"],
    siteId: thane.id,
    description: "Daily labour — foundation excavation gang (30 workers × 4 days)",
    pricingMode: "LUMPSUM",
    totalAmount: 84000,
    amountPaid: 84000,
    paymentMode: "CASH",
    notes: "₹700/day per skilled worker",
  });

  await createTx({
    date: daysAgo(40),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: thane.id,
    description: "False ceiling & partition work — Office floors 3-5",
    pricingMode: "LUMPSUM",
    totalAmount: 320000,
    amountPaid: 0,
    notes: "Quotation accepted — work starts next week",
  });

  // ── 4. Client Receipts ─────────────────────────────────────────────
  await createTx({
    date: daysAgo(155),
    direction: "CREDIT",
    type: "CLIENT_RECEIPT",
    siteId: kalyan.id,
    description: "Mobilisation advance — ABC Real Estate (Kalyan Heights)",
    partyId: abcRealEstate.id,
    totalAmount: 1700000,
    amountPaid: 1700000,
    paymentMode: "BANK_TRANSFER",
    notes: "20% mobilisation as per contract clause 4.1",
  });

  await createTx({
    date: daysAgo(120),
    direction: "CREDIT",
    type: "CLIENT_RECEIPT",
    siteId: thane.id,
    description: "RA Bill #1 — XYZ Developers (Thane Plaza)",
    partyId: xyzDevelopers.id,
    totalAmount: 2500000,
    amountPaid: 2000000,
    paymentMode: "CHEQUE",
    billNumber: "TCP/RA/001",
    notes: "₹5L retention @ 10%",
  });

  await createTx({
    date: daysAgo(190),
    direction: "CREDIT",
    type: "CLIENT_RECEIPT",
    siteId: dombivli.id,
    description: "Final payment — Dombivli Co-op Society",
    partyId: dombivliSociety.id,
    totalAmount: 900000,
    amountPaid: 900000,
    paymentMode: "BANK_TRANSFER",
    billNumber: "DRS/FINAL/001",
    notes: "Project completed and handed over",
  });

  await createTx({
    date: daysAgo(55),
    direction: "CREDIT",
    type: "CLIENT_RECEIPT",
    siteId: kalyan.id,
    description: "RA Bill #2 — ABC Real Estate (progress claim)",
    partyId: abcRealEstate.id,
    totalAmount: 1200000,
    amountPaid: 1000000,
    paymentMode: "BANK_TRANSFER",
    billNumber: "KH/RA/002",
    notes: "₹2L short paid — follow up required",
  });

  // ── 5. Transport / Fuel ────────────────────────────────────────────
  await createTx({
    date: daysAgo(143),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Transport"],
    siteId: kalyan.id,
    description: "Material transport — 3 truckloads cement/steel",
    partyId: ramTransport.id,
    pricingMode: "LUMPSUM",
    totalAmount: 18000,
    amountPaid: 18000,
    paymentMode: "CASH",
  });

  await createTx({
    date: daysAgo(118),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Fuel"],
    siteId: thane.id,
    description: "Diesel for JCB & tower crane — October",
    pricingMode: "LUMPSUM",
    totalAmount: 35000,
    amountPaid: 35000,
    paymentMode: "CASH",
    notes: "JCB: ₹22k, Crane: ₹13k",
  });

  await createTx({
    date: daysAgo(78),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Transport"],
    siteId: thane.id,
    description: "Aggregate transport — 5 loads from Nashik",
    partyId: ramTransport.id,
    pricingMode: "LUMPSUM",
    totalAmount: 28500,
    amountPaid: 28500,
    paymentMode: "UPI",
  });

  // ── 6. Salaries ────────────────────────────────────────────────────
  await createTx({
    date: daysAgo(30),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Salaries"],
    description: "Staff salaries — October 2024 (site engineers + office staff)",
    pricingMode: "LUMPSUM",
    totalAmount: 185000,
    amountPaid: 185000,
    paymentMode: "BANK_TRANSFER",
    notes: "4 site engineers + 2 office staff",
  });

  await createTx({
    date: daysAgo(60),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Salaries"],
    description: "Staff salaries — September 2024",
    pricingMode: "LUMPSUM",
    totalAmount: 185000,
    amountPaid: 185000,
    paymentMode: "BANK_TRANSFER",
  });

  // ── 7. Permits & Legal ──────────────────────────────────────────────
  await createTx({
    date: daysAgo(168),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Permits & Legal"],
    siteId: kalyan.id,
    description: "Building plan approval fees — KDMC",
    pricingMode: "LUMPSUM",
    totalAmount: 125000,
    amountPaid: 125000,
    paymentMode: "CHEQUE",
    billNumber: "KDMC/2024/KH01",
    notes: "Building permission fees + fire NOC",
  });

  await createTx({
    date: daysAgo(162),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Permits & Legal"],
    siteId: thane.id,
    description: "RERA registration and legal fees — Thane Plaza",
    pricingMode: "LUMPSUM",
    totalAmount: 85000,
    amountPaid: 85000,
    paymentMode: "BANK_TRANSFER",
    notes: "Lawyer fees ₹35k + RERA charges ₹50k",
  });

  // ── 8. Partner Personal Payments (paidByType=PARTNER) ──────────────
  await createTx({
    date: daysAgo(95),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Site Overheads"],
    siteId: kalyan.id,
    description: "Site supervision visit expenses — paid by Yashodeep personally",
    paidByType: "PARTNER",
    partnerId: partnerYash.id,
    pricingMode: "LUMPSUM",
    totalAmount: 15000,
    amountPaid: 15000,
    paymentMode: "CASH",
    notes: "Hotel + travel for 3-day site inspection — to be reimbursed",
  });

  await createTx({
    date: daysAgo(70),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Site Overheads"],
    siteId: thane.id,
    description: "Vendor negotiation meeting expenses — paid by Rajesh",
    paidByType: "PARTNER",
    partnerId: partnerRajesh.id,
    pricingMode: "LUMPSUM",
    totalAmount: 8500,
    amountPaid: 8500,
    paymentMode: "CASH",
    notes: "Lunch + travel for vendor meetings — reimbursable",
  });

  // ── 9. Equipment Rental ────────────────────────────────────────────
  await createTx({
    date: daysAgo(138),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Equipment Rental"],
    siteId: kalyan.id,
    description: "Tower crane rental — 3 months (Aug–Oct)",
    pricingMode: "LUMPSUM",
    totalAmount: 270000,
    amountPaid: 270000,
    paymentMode: "CHEQUE",
    notes: "₹90k/month — 3-month contract",
  });

  await createTx({
    date: daysAgo(132),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Equipment Rental"],
    siteId: thane.id,
    description: "JCB excavator rental — foundation work (2 weeks)",
    pricingMode: "LUMPSUM",
    totalAmount: 56000,
    amountPaid: 56000,
    paymentMode: "CASH",
    notes: "₹4k/day × 14 days",
  });

  // ── 10. Site Overheads ─────────────────────────────────────────────
  await createTx({
    date: daysAgo(128),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Site Overheads"],
    siteId: kalyan.id,
    description: "Site office setup — temporary shed, furniture, stationery",
    pricingMode: "LUMPSUM",
    totalAmount: 38500,
    amountPaid: 38500,
    paymentMode: "CASH",
  });

  await createTx({
    date: daysAgo(125),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Site Overheads"],
    siteId: thane.id,
    description: "Safety equipment — helmets, harnesses, scaffolding nets",
    pricingMode: "LUMPSUM",
    totalAmount: 52000,
    amountPaid: 52000,
    paymentMode: "UPI",
    billNumber: "NH/24/189",
  });

  // ── 11. Office Expenses ────────────────────────────────────────────
  await createTx({
    date: daysAgo(45),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Office Expenses"],
    description: "Accounting software subscription — annual",
    pricingMode: "LUMPSUM",
    totalAmount: 18000,
    amountPaid: 18000,
    paymentMode: "CARD",
    notes: "Tally Prime annual subscription",
  });

  await createTx({
    date: daysAgo(22),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Office Expenses"],
    description: "Office rent + utilities — November 2024",
    pricingMode: "LUMPSUM",
    totalAmount: 25000,
    amountPaid: 25000,
    paymentMode: "BANK_TRANSFER",
  });

  // ── 12. Taxes ──────────────────────────────────────────────────────
  await createTx({
    date: daysAgo(92),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Taxes (GST/TDS)"],
    description: "GST payment — Q2 FY2024-25 (July-September)",
    pricingMode: "LUMPSUM",
    totalAmount: 145000,
    amountPaid: 145000,
    paymentMode: "BANK_TRANSFER",
    billNumber: "GST/Q2/24-25",
  });

  await createTx({
    date: daysAgo(35),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Taxes (GST/TDS)"],
    description: "TDS deducted — labour contractor payments (2% on ₹8.1L)",
    pricingMode: "LUMPSUM",
    totalAmount: 16200,
    amountPaid: 16200,
    paymentMode: "BANK_TRANSFER",
    billNumber: "TDS/Q3/24-25",
  });

  // ── 13. Miscellaneous ──────────────────────────────────────────────
  await createTx({
    date: daysAgo(58),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Miscellaneous"],
    siteId: kalyan.id,
    description: "Pooja ceremony — Kalyan Heights bhoomi poojan",
    pricingMode: "LUMPSUM",
    totalAmount: 12000,
    amountPaid: 12000,
    paymentMode: "CASH",
    notes: "Auspicious ceremony for project commencement",
  });

  // ── 14. More Steel & Cement for Thane and Kalyan ──────────────────
  await createTx({
    date: daysAgo(50),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: thane.id,
    materialId: materialMap["Steel / TMT"],
    description: "TMT Bars Fe500 — 4 tonnes @ ₹66,000/tonne",
    partyId: laxmiSteel.id,
    pricingMode: "RATE",
    quantity: 4,
    unit: "tonnes",
    rate: 66000,
    gstPercent: 18,
    totalAmount: 311520, // 4*66000 = 264000 + 18% = 311520
    amountPaid: 311520,
    paymentMode: "BANK_TRANSFER",
    billNumber: "LST/24/031",
  });

  await createTx({
    date: daysAgo(42),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Cement"],
    description: "Cement — 400 bags @ ₹390 (White cement for finishing)",
    partyId: shreCement.id,
    pricingMode: "RATE",
    quantity: 400,
    unit: "bags",
    rate: 390,
    gstPercent: 28,
    totalAmount: 199680, // 400*390 = 156000 + 28% = 199680
    amountPaid: 100000,
    paymentMode: "UPI",
    billNumber: "SCE/24/015",
    notes: "Balance ₹99,680 to be paid after delivery",
  });

  // ── 15. Additional Labour & Contractor entries ─────────────────────
  await createTx({
    date: daysAgo(33),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Labour"],
    siteId: kalyan.id,
    description: "Labour — waterproofing & terrace work",
    pricingMode: "LUMPSUM",
    totalAmount: 45000,
    amountPaid: 45000,
    paymentMode: "CASH",
  });

  await createTx({
    date: daysAgo(25),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Contractor / Sub-contract"],
    siteId: thane.id,
    description: "Aluminium doors & windows installation",
    pricingMode: "LUMPSUM",
    totalAmount: 285000,
    amountPaid: 142500,
    paymentMode: "CHEQUE",
    notes: "50% advance; balance on completion",
  });

  // ── 16. Pune IT Park — early planning expense ──────────────────────
  await createTx({
    date: daysAgo(15),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Permits & Legal"],
    siteId: pune.id,
    description: "Architect & consultant fees — Pune IT Park design",
    pricingMode: "LUMPSUM",
    totalAmount: 95000,
    amountPaid: 95000,
    paymentMode: "BANK_TRANSFER",
    notes: "Initial design consultancy",
  });

  // ── 17. Fuel for Dombivli (historical) ───────────────────────────
  await createTx({
    date: daysAgo(210),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Fuel"],
    siteId: dombivli.id,
    description: "Diesel — concrete mixer and pump — Dombivli site",
    pricingMode: "LUMPSUM",
    totalAmount: 22000,
    amountPaid: 22000,
    paymentMode: "CASH",
  });

  // ── 18. Other Income ──────────────────────────────────────────────
  await createTx({
    date: daysAgo(88),
    direction: "CREDIT",
    type: "OTHER_INCOME",
    description: "Sale of scrap material — old shuttering plates & scaffolding",
    pricingMode: "LUMPSUM",
    totalAmount: 32000,
    amountPaid: 32000,
    paymentMode: "CASH",
    notes: "Scrap sold to Bhiwandi scrap dealer",
  });

  // ── 19. Aggregate for Kalyan (extra) ─────────────────────────────
  await createTx({
    date: daysAgo(72),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: kalyan.id,
    materialId: materialMap["Aggregate / Metal"],
    description: "10mm aggregate — 8 brass @ ₹4,600/brass",
    partyId: ganeshAggregate.id,
    pricingMode: "RATE",
    quantity: 8,
    unit: "brass",
    rate: 4600,
    totalAmount: 36800,
    amountPaid: 36800,
    paymentMode: "UPI",
  });

  // ── 20. Timber shuttering ─────────────────────────────────────────
  await createTx({
    date: daysAgo(112),
    direction: "DEBIT",
    type: "EXPENSE",
    categoryId: categoryMap["Material"],
    siteId: thane.id,
    materialId: materialMap["Timber Shuttering"],
    description: "Plywood shuttering sheets — 200 sqm",
    pricingMode: "RATE",
    quantity: 200,
    unit: "sqm",
    rate: 850,
    gstPercent: 18,
    totalAmount: 200600, // 200*850 = 170000 + 18% = 200600
    amountPaid: 200600,
    paymentMode: "BANK_TRANSFER",
  });

  console.log("✅ Seeding complete!");
  console.log(`   Users: 4`);
  console.log(`   Partners: 3`);
  console.log(`   Sites: 4`);
  console.log(`   Parties: 15`);
  console.log(`   Categories: ${categoryNames.length}`);
  console.log(`   Materials: ${materialData.length}`);
  console.log(`   Transactions: 60+`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
