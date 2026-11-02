# Patil Construction Finance Tracker

> Single source of truth for every rupee that moves in **Yashodeep Patil Construction** — partner investments, site expenses, vendor payables, client receivables, and financial reports — all in one place.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Environment Variables](#environment-variables)
4. [Database: Migrations and Seeding](#database-migrations-and-seeding)
5. [Default Credentials](#default-credentials)
6. [Version Control](#version-control)
7. [Free Deployment (Netlify + Neon)](#free-deployment-netlify--neon)
8. [Backup Reminder](#backup-reminder)
9. [Rollback Guide](#rollback-guide)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma |
| Database | PostgreSQL (Neon free tier) / SQLite (local dev) |
| Auth | Auth.js (NextAuth v5) — credentials |
| Charts | Recharts |
| Export | SheetJS (xlsx) + jsPDF |
| Testing | Jest + Testing Library |

---

## Getting Started

```bash
# 1. Clone the repo
git clone <repo-url> patil-construction-finance
cd patil-construction-finance

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values
cp .env.example .env

# 4. Run migrations (creates SQLite DB locally)
npx prisma migrate dev --name init

# 5. Seed the database
npx prisma db seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

See [.env.example](.env.example) for all required variables with descriptions. Never commit `.env`.

---

## Database: Migrations and Seeding

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name describe-your-change

# Apply migrations in production (CI / Netlify build)
npx prisma migrate deploy

# Reset and reseed (dev only — destroys data!)
npx prisma migrate reset

# Seed only (without resetting)
npx prisma db seed
```

**Rule:** Never edit a migration file that has already been committed. Add a new migration instead.

---

## Default Credentials

> ⚠️ **Change these passwords immediately after first login.** The app forces a password change on first login for seeded users.

| Role | Email | Password |
|------|-------|----------|
| Admin / Partner | `admin@patilconstruction.com` | `Admin@1234` |
| Accountant | `accountant@patilconstruction.com` | `Acct@1234` |
| Site Supervisor | `supervisor@patilconstruction.com` | `Super@1234` |
| Viewer | `viewer@patilconstruction.com` | `View@1234` |

---

## Version Control

### Branching Model

```
main        ← always stable and deployable, protected
develop     ← integration branch
feature/*   ← one branch per feature / phase
fix/*       ← bug fixes
chore/*     ← tooling, deps, config
docs/*      ← documentation only
```

**Rules:**
- Never commit directly to `main` after the initial scaffold commit.
- Open a PR from `feature/*` → `develop`, then `develop` → `main`.
- CI must be green before merging.
- No `git push --force` on `main` or `develop`.

### Commit Format (Conventional Commits)

```
<type>(<scope>): <subject>   ← max 72 chars, imperative mood

[optional body — explain WHY, not what]
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `build`, `ci`

Examples:
```
feat: add rate-based total calculation to expense form
fix: correct GST rounding to nearest paisa
chore: upgrade Prisma to 5.14
```

### Creating a Release

```bash
# Merge develop → main via PR, then:
git checkout main
git pull origin main
git tag -a v0.2.0 -m "feat: auth, schema, and seed data"
git push origin v0.2.0
# Update CHANGELOG.md
```

### Rollback to a Previous Tag

```bash
# View available tags
git tag -l

# Check out a previous version (read-only, detached HEAD)
git checkout v0.1.0

# Create a hotfix branch from a previous tag
git checkout -b fix/emergency-rollback v0.1.0

# Undo a bad commit safely (never rewrite history on main)
git revert <commit-hash>
git push origin main
```

### Adding a Remote and Pushing

```bash
git remote add origin <your-private-github-repo-url>
git push -u origin main
git push -u origin develop
git push --tags
```

### Enable Branch Protection on GitHub (main)

1. Go to **Settings → Branches → Add branch ruleset**
2. Target: `main`
3. Enable: **Require a pull request before merging**
4. Enable: **Require status checks to pass** → add `CI / build-and-test`
5. Enable: **Block force pushes**
6. Save

---

## Free Deployment (Netlify + Neon)

### Step 1 — Create Neon Database

1. Sign up at [neon.tech](https://neon.tech) (free tier).
2. Create a project → name it `patil-construction`.
3. Copy the **Pooled connection string** → `DATABASE_URL`
4. Copy the **Direct connection string** → `DIRECT_URL`

### Step 2 — Run Migrations and Seed

```bash
# From your local machine with .env filled in
npx prisma migrate deploy
npx prisma db seed
```

### Step 3 — Import on Netlify

1. Push the repo to a **private** GitHub repository.
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
3. Connect GitHub and select the repo.
4. Build settings are auto-detected from `netlify.toml`.

### Step 4 — Set Environment Variables on Netlify

In **Site configuration → Environment variables**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL |
| `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-site.netlify.app` |
| `NEXT_PUBLIC_APP_NAME` | `Patil Construction Finance Tracker` |
| `NEXT_PUBLIC_COMPANY_NAME` | `Yashodeep Patil Construction` |

### Step 5 — Deploy

Click **Deploy site**. Netlify runs `prisma generate && next build` automatically.

> **Cold starts:** Neon's free database sleeps after 5 minutes of inactivity. The app handles this automatically — the first request after a sleep retries once with a 1-second delay and shows a loading state.

---

## Backup Reminder

> ⚠️ Free tiers have no uptime guarantee. **Take a weekly full backup:**
> 1. Log in as Admin.
> 2. Go to **Settings → Full Backup**.
> 3. Download the Excel file and store it in Google Drive or a personal hard drive.

---

## Rollback Guide

See [Version Control → Rollback](#rollback-to-a-previous-tag) above. For database rollback, restore from your last Excel backup and reimport using the CSV import feature.

