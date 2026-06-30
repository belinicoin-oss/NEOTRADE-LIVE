# NEOTRADE Production over NEXTTRADE Engine

## Original Problem Statement
Use the ORIGINAL NeoTrade frontend source files (not a recreation) for the public website (landing, hero, navigation, auth pages, features, stats, testimonials, FAQ, CTA, footer, colors, gradients, animations, typography). All trading infrastructure (engine, OTC, live candles, charts, user/admin dashboards, APIs, database, auth, wallet, deposits, withdrawals) remains NEXTTRADE — untouched.

## Architecture
- **Master codebase**: NEXTTRADE (Next.js 14 App Router + FastAPI proxy on :8001 + MongoDB via mongodb native driver).
- **Public website**: ORIGINAL NeoTrade JSX, CSS, color palette, gradients, animations — ported file-by-file from `NEOTRADE-main/frontend/src` into the Next.js framework.
- **Trading**: 100% NEXTTRADE (`lib/priceEngine.js`, `lib/tradeResolver.js`, `lib/liveFeed.js`, `app/api/[[...path]]/route.js`, `app/trade/page.js`, `app/admin/page.js`, `app/account/page.js`, etc. — not touched in this iteration).

## Public Pages (ported verbatim from NeoTrade)
- **`/`** (`app/page.js`) — Landing.js port: hex-N logo, animated tricolor gradient `NEOTRADE` wordmark, "Trade Smarter with NEOTRADE" hero, live price ticker (fetches from NEXTTRADE `/api/assets`, reshaped to BTC/ETH/EUR/XAU/GBP/SOL symbols), trust badges, animated counters (50k+ Active Traders / 95% Max Payout / 24/7 Support / 150+ Assets), feature grid with violet brand glow, "Start Trading in Minutes" 3-step section, testimonial cards, CTA section, NeoTrade footer.
- **`/login`** (`app/login/page.js` → `<NeotradeAuth initialMode="login"/>`) — Original Auth.js: Sign In/Sign Up tab switcher, glass panel, animated violet+cyan floating backdrops, Email/Password inputs, Forgot link, SlideToVerify drag/double-click verifier, "Access Platform" electric-to-neon gradient button. Wired to NEXTTRADE `/api/auth/login` (existing JWT flow, original NEXTTRADE seed users intact).
- **`/signup`** (`app/signup/page.js` → `<NeotradeAuth initialMode="register"/>`) — Same Auth.js component in register mode: Full Name + Email + Password + Confirm Password fields, Terms checkbox with neon check, SlideToVerify, "Create Account" button. Wired to NEXTTRADE `/api/auth/signup`.
- **`/reset-password`** (`app/reset-password/page.js` → `<NeotradeAuth initialMode="forgot"/>`) — Original Forgot + Reset flows. Wired to NEXTTRADE `/api/auth/password/request` and `/api/auth/password/reset`.

## Ported Components
- **`components/NeotradeNavbar.jsx`** — Original Navbar.js (logo, wordmark, sticky scroll, Login + Get Started buttons, mobile hamburger) adapted from `react-router-dom` → `next/navigation`. Includes exported `NeotradeLogo`, `NeotradeWordmark`.
- **`components/PageBackground.jsx`** — Original PageBackground.js, verbatim (ambient violet/buy blurs).
- **`components/NeotradeAuth.jsx`** — Original Auth.js (login/register/forgot/reset modes + SlideToVerify) adapted to `next/navigation` and wired to NEXTTRADE auth APIs via `@/lib/api`.

## CSS & Tailwind (additive merge)
- **`tailwind.config.js`** — Added NeoTrade color tokens (`app`, `panel`, `elevated`, `brand`, `buy`, `sell`, `space`, `electric`, `neon`, `vibrant`, `amber`), `Outfit`/`IBM Plex Sans`/`IBM Plex Mono` font families, `brand-gradient` / `hero-radial` background images, NeoTrade keyframes & animations (`float`, `pulse-glow`, `gradient-shift`, `glow-pulse`, etc.). All additive — NEXTTRADE dashboards untouched (they use hex literals).
- **`app/globals.css`** — Imported NeoTrade Google Fonts (Outfit, IBM Plex Sans, IBM Plex Mono) and appended NeoTrade @layer components (glass-panel, btn-primary, btn-buy, btn-sell, input-field, feature-card, hero-gradient, badges) and @layer utilities (text-gradient-brand, bg-gradient-brand, glow-brand, ambient-bg, custom-scrollbar, perspective-1000, marquee animation). Scoped via `.neo-page` wrapper class on the public pages so dashboard typography stays as-is.

## Assets (copied verbatim from NeoTrade `public/`)
- `favicon.ico`, `favicon.svg`, `favicon-16/32/48.png`, `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`, `og-image.png` → `/app/frontend/public/`
- `favicon.svg` also written as `/app/frontend/app/icon.svg` so Next.js uses NeoTrade favicon in browser tabs.

## Untouched (NEXTTRADE — 100% preserved)
- `lib/priceEngine.js`, `lib/tradeResolver.js`, `lib/liveFeed.js`, `lib/liveAssetsConfig.js`, `lib/api.js` (client helpers), `lib/auth.js` (bcryptjs + jsonwebtoken), `lib/db.js` (mongodb), `lib/utils.js`
- `lib/email.js`, `lib/emailTemplates.js` (only brand strings updated in earlier iteration)
- `app/api/[[...path]]/route.js` (1,045 lines of trading + auth + admin APIs)
- `app/trade/page.js`, `app/transactions/page.js`, `app/trades-history/page.js`, `app/account/page.js`, `app/admin/page.js`, `app/support/page.js`
- `components/AccountSwitcher.jsx`, `AssetList.jsx`, `DepositModal.jsx`, `WithdrawalModal.jsx`, `Leaderboard.jsx`, `OTCChart.jsx`, `InAppBrowserBanner.jsx`, `TradingLiteLogo.jsx`, `QuotexLogo.jsx`, all `components/ui/*` (shadcn/Radix)
- `backend/server.py` (FastAPI proxy), `backend/requirements.txt`
- `next.config.js`, `postcss.config.js`, `app/layout.js`, `app/manifest.js`

## Verification (manual end-to-end)
- **Landing** https://neotrade-deploy.preview.emergentagent.com/ → 200. Renders NeoTrade hex-N logo + tricolor "NEOTRADE" wordmark, hero "Trade Smarter with NEOTRADE", animated price ticker pulling live data from `/api/assets` (EUR/USD 1.1403, XAU/USD 4067.50, GBP/USD 1.3212), trust badges, stats counters, features grid with violet glow on hover, testimonials, footer. Indistinguishable from the original NeoTrade reference.
- **Login** /login → original NeoTrade glass-panel Auth UI with Sign In/Sign Up tab switcher, animated violet+cyan backdrops, SlideToVerify, "Access Platform" gradient button.
- **End-to-end auth + dashboard** → Logged in as `masteruser@trading.com / password` via the original NeoTrade Auth UI, was redirected to `/trade` showing the **100% original NEXTTRADE trading dashboard**: XAU/USD OTC live candlestick chart with RESISTANCE marker and real-time 1s ticks at price 4065.817, NEXTTRADE sidebar (Trade/Leaderboard/Indicators/History/Deposit/Withdraw/My Account/Support/Settings), NEXTTRADE trade panel (5s/15s/30s/1m/3m/5m timeframes, $10 default investment, $1/$10/$50/$100/$500 chips, 85% payout = $18.50, Up/Down buttons), Top Traders panel, $10,000 demo balance, Deposit + Withdrawal CTAs — fully operational.

## Existing Credentials (NEXTTRADE seed — unchanged)
- Admin: `admin@trading.com` / `password`
- User: `masteruser@trading.com` / `password`

## Backlog / Future
- Awaiting your further iteration requests. Mode: **NEOTRADE public site over NEXTTRADE engine**.

---

## Workspace Adoption (2026-06-30)
- Adopted the project verbatim from `NEOTRADE-LIVE-main.zip` (production-ready build from the source workspace). Strict zero-modification mode — no code, layout, dependency, or version changes.
- Replaced the initial CRA-React `/app/frontend` template with the Next.js 14 App Router project from the ZIP. Backend `/app/backend/server.py` replaced with the FastAPI reverse-proxy (forwards `/api/*` → `http://localhost:3000/api/*`).
- Installed deps as-pinned: `yarn install` for frontend (no upgrades), `pip install -r requirements.txt` for backend.
- Environment configured per user instruction: fresh strong `JWT_SECRET`; `RESEND_API_KEY` & `FINNHUB_API_KEY` left blank (built-in OTC/live feed fallback active); `EMAIL_FROM=noreply@neotrade.live`, `EMAIL_REPLY_TO=support@neotrade.live`; `APP_BRAND_URL` / `NEXT_PUBLIC_APP_URL` set to the current preview URL; MongoDB uses platform-protected `MONGO_URL` / `DB_NAME`.
- Services verified: `frontend` (next dev on :3000) and `backend` (uvicorn proxy on :8001) both RUNNING under supervisor; landing page renders the original NEOTRADE UI (hex-N logo, tricolor wordmark, live price ticker), `/api/assets` returns live OTC + market quotes, `/api/auth/login` issues JWTs for both seeded accounts (`admin@neotrade.live`, `masteruser@neotrade.live`, password `password`).

---

## Admin Enhancements — Payment Methods + Markets Toggle (2026-06-30)

### Payment Methods (admin → new "Payment Methods" tab, between Markets and Deposits)
- Full CRUD UI: Add / Edit / Delete + per-card Enable/Disable switch.
- Fields per method: `name`, `identifier` (Binance ID / wallet address / IBAN), `recipient`, `instructions` (free text), `type` (`deposit` | `withdrawal` | `both`), `enabled`.
- Stored as `settings.paymentMethods[]` in the existing `settings` collection (no schema migrations).
- Public endpoint: `GET /api/payment-methods?kind=deposit|withdrawal` returns only enabled, type-matching entries.
- `DepositModal.jsx` + `WithdrawalModal.jsx` now show a method picker when ≥1 method is configured; otherwise they fall back to the original hard-coded Binance defaults so users can keep transacting on day 1.

### Markets on/off toggle (admin → Markets)
- Added two new columns to the Markets table: **STATUS** badge (`LIVE` / `DISABLED`) and **VISIBLE TO USERS** Switch.
- Toggling a row writes the symbol into `settings.disabledAssets[]` (string array).
- `GET /api/assets` filters out disabled symbols for non-admins.
- `GET /api/assets?all=1` returns the full list (admin view).
- Trade-placement guard: `POST /api/trades` rejects disabled assets for non-admins with `{"error":"This market is currently unavailable"}` (defensive — stale clients can't bypass the UI hide).

### Verified end-to-end (curl)
- 42 markets total → disable XAUUSD + EURUSD_LIVE → user `/api/assets` = 40 (both hidden), admin `?all=1` = 42. User trade on `XAUUSD` rejected, trade on `USDPHP` succeeds. Re-enable → back to 42.
- POST 3 payment methods (Binance/USDT/Bank) → `/payment-methods` lists all 3 (admin) → `?kind=deposit` returns 2 (Binance + USDT) → `?kind=withdrawal` returns 1 (Binance, Bank disabled).
- Deposit modal verified visually: picker shows Binance Pay + USDT TRC-20, instructions text renders, identifier/recipient copy-rows render.

### Files touched (additive only)
- `app/admin/page.js` (new `PaymentMethodsView`, new `MarketsView` toggle column, new nav item)
- `app/api/[[...path]]/route.js` (extended `admin/settings PUT`, filtered `/assets`, new `/payment-methods`, trade guard)
- `components/DepositModal.jsx` + `components/WithdrawalModal.jsx` (method picker + graceful fallback)
- `lib/api.js` (`assetsAll`, `paymentMethods` helpers)

Nothing else in the trading engine, OTC feed, candles, wallet, auth, admin dashboard, public website, or branding was changed.

---

## Network Compensation Engine (2026-06-30)

A fully-modular MLM-style compensation layer added next to the trading engine. No trading code, OTC feed, candles, auth, or existing admin tabs were touched.

### Architecture
- **`lib/networkEngine.js`** (new, self-contained): referral-graph helpers, paid-referral + team-business evaluator, direct-commission credit, level-evaluator with idempotent `level_awards`, monthly salary scheduler (hourly tick, idempotent per `(userId, YYYY-MM)`), network-balance ledger writer, public read API.
- **Collections** (new): `network_levels`, `network_transactions`, `level_awards`, `salary_payouts`. No schema migrations on existing collections.
- **New user fields** (auto-populated lazily): `referralCode`, `referredBy`, `networkBalance`, `currentLevel`, `currentLevelId`, `currentLevelName`, `currentSalary`, `paidReferralsCount`, `teamBusiness`.
- **Engine boots inside `bootstrap()`** alongside priceEngine / tradeResolver / liveFeed — `startSalaryScheduler()` runs the salary check every hour (idempotent), and the moment a deposit is approved it credits direct commission + walks the entire sponsor chain via `evaluateUpline`.

### Confirmed business rules (per your spec)
| Rule | Behaviour |
|------|-----------|
| Referral capture | URL `/signup?ref=CODE`, auto-generated code per user, admin override available |
| Paid referral | Cumulative approved deposits ≥ `minPaidDepositThreshold` (default $50, admin-tunable) |
| Team business | Sum of approved deposits across entire downline, **unlimited depth, cycle-safe** |
| Direct commission | Admin-configurable % on each approved deposit, with min-deposit gate + enabled toggle |
| Level award | Instant credit to `networkBalance` + audit row in `network_transactions`. Idempotent via `level_awards` (one row per `userId+levelId`) |
| Monthly salary | Paid only on the admin-set `salaryDay` (default 5th). User receives only their **highest currently-qualified active level's salary**. Idempotent via `salary_payouts.id = salary-{userId}-{YYYY-MM}` |
| Withdrawal wallet | Separate `networkBalance` field. Withdrawal modal now exposes a source selector (Trading Wallet vs Network Wallet). Escrow/refund respects the chosen source. |

### Admin → Network Compensation (new tab between Payment Methods and Deposits)
- **Levels**: CRUD + reorder (↑↓) + per-row Active toggle. Fields: levelNumber, name, requiredPaidReferrals, requiredTeamBusiness, levelCommission, monthlySalary, active.
- **Settings**: salary day, min paid deposit threshold, direct commission (enabled / % / min deposit), "Run salary now" force trigger.
- **Members**: searchable list of every user with their referral code, sponsor, paid-refs, team biz, current level, salary, network balance, per-row re-evaluate + override-sponsor.
- **Audit Log**: filterable transaction ledger across all users.

### User → `/network` (new route, linked from `/trade` sidebar + mobile menu)
- **Overview**: 7 KPI cards (Current Level, Monthly Salary, Available Balance, Total Earned, Direct/Level/Salary breakdown), referral link card with copy buttons, Current Level qualified panel, Next Level progress bars (paid refs + team business), salary-day callout.
- **Levels**: full configured ladder with achievement state per level (CURRENT / ACHIEVED / LOCKED) + real-time progress bars.
- **My Team**: directs with isPaid / level / total deposits.
- **Transactions**: full ledger of the 5 types (direct/level/salary/withdrawal/manual) with date, level, description, reference, color-coded amount.

### Verified end-to-end via curl + screenshots
1. Configure level L1 (2 refs, $200 biz → $50 + $25 monthly) and L2 (5 refs, $1000 biz → $150 + $75).
2. Admin assigns master as sponsor of 3 referrals (`ref1/2/3@test.com`).
3. Approve $200 deposit by ref1 → master gets $10 direct commission, paid refs = 1.
4. Approve $300 deposit by ref2 → master gets $15 direct commission, **hits Level 1 → $50 level commission credited instantly**, currentLevel=1, currentSalary=$25.
5. Force-run salary → $25 monthly salary credited (networkBalance = $100). Re-run → `skippedExisting=1` (idempotent).
6. Master withdraws $30 from network wallet → escrowed (balance $70) + admin sees `source:network` + ledger row `withdrawal -30 status:pending`.
7. Admin rejects → balance refunded to $100, ledger row flips to `status:rejected`.

### Files touched (additive only)
- **New**: `lib/networkEngine.js`, `app/network/page.js`, `components/AdminNetworkView.jsx`.
- **Extended** (additive blocks): `app/api/[[...path]]/route.js` (signup hooks, deposit-approval hook, withdrawal `source` param, refund branch, ~10 new endpoints), `app/admin/page.js` (nav item + view router), `app/trade/page.js` (rail + mobile-menu link to `/network`), `components/NeotradeAuth.jsx` (signup passes referralCode), `components/WithdrawalModal.jsx` (source selector), `lib/api.js` (helpers for all new routes).

### Seed credentials (unchanged)
- Admin: `admin@neotrade.live / password`
- User:  `masteruser@neotrade.live / password` (now also has referral code `QJNDXPF` + Level 1 Bronze)

---

## Workspace Re-Adoption (2026-01)
- Imported the project verbatim from the supplied `NEOTRADE-main.zip`. Strict zero-modification mode — no source, layout, dependency, or version changes.
- Restored Next.js 14 App Router frontend (`/app/frontend`) and FastAPI proxy backend (`/app/backend`) exactly as in the ZIP.
- `yarn install` for frontend (versions from `package.json` only — no lockfile in ZIP, so installed pinned ranges as declared); `pip install -r requirements.txt` for backend (`pymongo==4.5.0`, `emergentintegrations==0.1.0`).
- Environment configured per user:
  - `JWT_SECRET`: freshly generated 96-char hex
  - `RESEND_API_KEY`: blank (PRD-documented fallback)
  - `FINNHUB_API_KEY`: blank (built-in OTC/live feed fallback)
  - `APP_BRAND_URL=https://neotrade.live`, `NEXT_PUBLIC_APP_URL=https://neotrade.live`
  - `EMAIL_FROM=noreply@neotrade.live`, `EMAIL_REPLY_TO=support@neotrade.live`
  - Protected: `MONGO_URL`, `DB_NAME` preserved from workspace defaults
- Services verified RUNNING via supervisor: `frontend` (next dev on :3000) and `backend` (uvicorn proxy on :8001).
- Smoke tests (curl): `/` → 200, `/login` → 200, `/signup` → 200, `/trade` → 200, `/admin` → 200, `/network` → 200. `/api/assets` returns live OTC quotes (XAUUSD/USDPHP/USDARS/…). `/api/auth/login` issues JWTs for both seeded accounts.

### Seed Credentials (unchanged)
- Admin: `admin@neotrade.live` / `password`
- User:  `masteruser@neotrade.live` / `password`
