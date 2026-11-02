# Changelog

All notable changes to **Patil Construction Finance Tracker** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.0.0] — 2026-11-03

### Added
- Integrity & Ledger Reconciliation Engine (`/settings`):
  - Automated 3-point mathematical reconciliation:
    1. Site Ledgers + Company Expenses vs Central Ledger Total
    2. Total Payables vs Billed minus Paid settlements
    3. Total Receivables vs Client Billing minus Inflows
    4. Partner Balance integrity verification
  - Status badges ("RECONCILED" vs "DISCREPANCY") with breakdown metrics
- Audit Logging & Soft Delete Protection:
  - Full audit logging for every create, edit, delete, and payment action
  - Soft delete system with Admin-only restoration modal and reason tracking
- Financial Month Lock:
  - Admin toggle to lock closed financial months (e.g., April 2024 - March 2025)
  - Prevents accidental edits or tampering of finalized historical accounts
- Full Multi-Sheet Database Backup:
  - One-click Excel backup downloading 8 comprehensive sheets: Transactions, Payments, Partners, Sites, Parties, Categories, Materials, and Audit Logs
- Bulk CSV Migration Engine:
  - Smart CSV file uploader for importing historical books
  - Column mapping preview, data type parsing, and automatic Party/Site/Category matching
- Global Command Palette / Search Modal (`Ctrl+K`):
  - Universal search across vendors, clients, construction sites, bill numbers, and transactions
  - Instant navigation shortcuts and highlighted search results
- Dark Mode / UI Theme System:
  - Persistent theme switching (Light / Dark / System default)
- Unit Testing & Verification:
  - 51 passing unit tests verifying financial math, INR formatting, GST calculations, and reconciliation logic

## [0.6.0] — 2026-11-03

### Added
- Executive Dashboard (`/dashboard`):
  - KPI cards with click-through drilldown: Total Credit (Inflows), Total Expense (Debits), Net Cash Position, Total Payables (Owed), Total Receivables, Total Partner Investment, Construction Sites count
  - 5 Interactive Charts powered by Recharts:
    1. Monthly Inflows vs Expenses Bar Chart (Cash Flow Trend)
    2. Expense Breakdown by Category Donut Chart
    3. Site Expenditure Comparison Bar Chart
    4. Partner Capital Share Split Chart
    5. Top Vendors & Contractors by Spend Chart
  - Overdue Payables Alert List (>60 days overdue)
  - Recent Ledger Entries table with live drill-down
  - Global filter controls: Site selection, Financial Year (FY 2024-25, FY 2023-24), and custom Date Range
- Financial Reports Suite (`/reports`):
  - Statement of Profit & Loss (P&L) company-wide and per construction site with turnover margins
  - Monthly Cash Flow Statement detailing capital, receipts, loans, materials, and contractor outflows
  - Partner Capital Statement showing invested, withdrawn, out-of-pocket paid, and company owed
  - Site-wise consolidated expense report with category distributions
  - Category and Material consumption report
  - Input GST summary report detailing tax paid per period, GSTIN numbers, and base amounts
  - Day Book detailing every transaction for any selected day with net cash balance
  - Instant one-click export to Excel (.xlsx via SheetJS) and PDF (via jsPDF + autoTable) for all reports

## [0.5.0] — 2026-11-03

### Added
- Vendors, Contractors & Clients Management (`/parties`):
  - Party categorization by Vendor, Contractor, Labour, Supplier, and Client
  - Running balance tracking: Total Billed, Total Settled, and Current Outstanding Balance
  - Comprehensive Party Ledger modal displaying chronological billing, payments, and running balance
  - Add new party modal with phone, GST number, and address
- Outstanding Payables Screen (`/payables`):
  - Interactive aging bucket cards: 0-30 Days (Current), 31-60 Days, 61-90 Days, 90+ Days (Critical Overdue)
  - Full payables bill list with bill date, aging days badge, total amount, paid so far, and balance due
  - One-click "Record Payment" modal supporting partial settlements or full payment
  - Real-time status transitions: UNPAID → PARTIAL → PAID upon settlements
  - Multi-payment history tracking on individual bills
- Client Receivables Screen (`/receivables`):
  - Client billing and contract receivables with 0-30, 31-60, 61-90, 90+ day aging buckets
  - Client collection summary and outstanding project balances
  - "Record Client Receipt" modal to log payments directly to company accounts

## [0.4.0] — 2026-11-03

### Added
- Partner Accounts & Capital Management (`/partners`):
  - Live partner capital KPIs: Total Capital Invested, Out-of-pocket Expenses Paid, Total Withdrawn, Net Partner Equity
  - Recharts Donut/Pie chart for Partner Capital Share % distribution
  - Individual Partner cards with complete balance breakdown (Invested, Withdrawn, Personal Expenses Owed, Net Balance)
  - Quick modals to record partner investments and partner drawings/withdrawals
  - Partner Account Ledger drill-down modal showing every individual transaction for that partner
  - Add new partner modal with ownership percentage configuration
- Construction Sites Management (`/sites` and `/sites/[id]`):
  - Multi-view site overview: Grid Cards with budget progress bars, and Side-by-Side Comparison Table
  - Site metrics: Contract Value, Total Expense, Client Receipts, Pending Receivable, Vendor Payables, Profit/Loss, and Utilization %
  - Site Detail Dashboard (`/sites/[id]`):
    - Category-wise expense breakdown with interactive Pie Chart
    - Material consumption tracker (Cement, TMT Steel, Sand, etc. with quantities and units)
    - Financial health summary comparing contract billing, expenditures, payables, and net margin
    - Full site ledger timeline with status filters
  - Create site modal with client assignment and contract values

## [0.3.0] — 2026-11-03

### Added
- Complete Transaction / Expense entry form (`/transactions/new`):
  - Lumpsum vs Rate-based (Qty × Rate) calculation mode with live computation
  - GST calculation (0%, 5%, 12%, 18%, 28%) with instant total updating
  - Smart defaults: today's date, saved last-used site, and last-used paid-by from localStorage
  - Inline "Add New" modals for Party, Site, Category, and Material without leaving the entry screen
  - Photo / PDF bill attachment upload (`/api/upload`) with file validation
  - "Save & Add Another" workflow for fast bulk expense entry
  - Live duplicate warning detection based on date, vendor/party, amount, and bill number
  - Automatic tracking for expenses paid out-of-pocket by partners (owed to partner)
- Central Ledger Transaction List (`/transactions`):
  - Live KPI summary cards: Total Credit, Total Debit, Net Cash, Outstanding Payables
  - Filtering by Date Range, Site, Category, Party, Paid By, Direction, and Payment Status
  - Full-text search across descriptions, bill numbers, vendors, and construction sites
  - Export to CSV and formatted Excel (.xlsx) using SheetJS
  - Full transaction drill-down modal showing all ledger fields, rate breakdown, settlement history, and attached receipts
  - Soft delete support for Administrators with confirmation modal

## [0.2.0] — 2026-11-02

### Added
- Complete production Prisma schema (User, Partner, Site, SiteUser, Party, Category, Material, Transaction, Payment, Attachment, AuditLog, MonthLock)
- Initial Prisma database migration `init-full-schema`
- Auth.js (NextAuth v5) credentials provider with bcrypt password hashing
- Edge-compatible auth configuration (`auth.config.ts` and `middleware.ts`)
- Role-based access control utilities (`lib/auth-utils.ts`) supporting ADMIN, ACCOUNTANT, SUPERVISOR, VIEWER
- Branded login page with instant interactive feedback and error states
- Mandatory first-login password change flow (`/change-password`)
- Responsive application shell with sidebar navigation, mobile nav, user profile card, and mobile floating action button
- Comprehensive Indian currency formatting and calculation utilities (`lib/money.ts`): Lakh/Crore shorthand, Indian number grouping, live rate calculations, GST calculations, FY helpers
- Database seed script with 4 users, 3 partners, 4 sites, 15 parties, 12 categories, 13 materials, and 60+ realistic transactions
- 47 unit tests for money and transaction calculation logic

## [0.1.0] — 2026-11-02

### Added
- Initial project scaffold: Next.js 15 App Router, TypeScript, Tailwind CSS
- Comprehensive `.gitignore` (no secrets, no build outputs, no local DBs)
- `.env.example` with all environment variable names and safe placeholders
- `README.md` skeleton with setup, deployment, version control, and rollback guide
- `netlify.toml` for Netlify + `@netlify/plugin-nextjs` deployment
- Husky git hooks: `pre-commit` (lint + format), `commit-msg` (commitlint), `pre-push` (money tests)
- `commitlint` with Conventional Commits configuration
- `lint-staged` for fast staged-file linting
- GitHub Actions CI workflow (`install → lint → type-check → test → build`)
- GitHub PR template and issue templates (bug report, feature request)
- Jest configuration for unit tests
- `CHANGELOG.md` in Keep a Changelog format
- `develop` integration branch created

[Unreleased]: https://github.com/your-org/patil-construction-finance/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.6.0
[0.5.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.5.0
[0.4.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.4.0
[0.3.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.3.0
[0.2.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.2.0
[0.1.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.1.0
