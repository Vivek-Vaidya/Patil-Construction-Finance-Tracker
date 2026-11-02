# Changelog

All notable changes to **Patil Construction Finance Tracker** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.1.0] — 2026-11-02

### Added
- Initial project scaffold: Next.js 14 App Router, TypeScript, Tailwind CSS
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

[Unreleased]: https://github.com/your-org/patil-construction-finance/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/your-org/patil-construction-finance/releases/tag/v0.1.0

