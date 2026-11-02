# Changelog

All notable changes to **Patil Construction Finance Tracker** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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

[Unreleased]: https://github.com/your-org/patil-construction-finance/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.3.0
[0.2.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.2.0
[0.1.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.1.0
