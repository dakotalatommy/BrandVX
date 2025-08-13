# Features Spec – Social Sharing & Time Saver
_Last updated: 2025-08-08 21:16_

## 1) Onboarding Flow (with sharing options)
- Steps: Account → Connect (HubSpot, Square/Acuity, SendGrid) → Import → Preferences → **Share**.
- **Share screen** at the end (optional):
  - Share card: “I’m launching with BrandVX — AI that runs my bookings, follow‑ups and content.”
  - Buttons: **Copy link**, **Instagram**, **Facebook**, **X**, **Email**.
  - Toggle: “Auto‑share key wins (time saved, milestones).”

## 2) Natural Share Inflection Points
Embed subtle “Share” buttons at:
- **After trial week completed** (5.1) — “x hours saved this week.”
- **First fully booked week** — “Booked out 🔥”
- **$25k+ month achieved** — “Hit a new monthly record.”
- **5 referrals** reached — “Unlocked Founder discount.”
- **Top content post** (Content Creator) — “Best performing post this month.”
Each has a prefilled caption + asset and logs an **EVENT** with `type=share_prompted` (+ accepted/declined).

## 3) Time Saver (Gamified)
### What we track
- **Task baselines** (minutes): booking=6, reminder=1, follow‑up sms=2, caption=10, inventory update=4, etc.
- **Automation estimate** (minutes): booking=1, reminder=0.1, sms=0.3, caption=2, inventory=0.5.
- **Time saved** per event = baseline − automation.
- Rolling totals: daily/weekly/monthly + lifetime.

### UX
- Dashboard card: **Time Saved (hrs)** with sparkline.
- **Milestones**: 10h/25h/50h/100h → unlock sharable badges.
- **Leaderboard** (optional): by service or city.
- **Share card** generator (image w/ stats + brand).

### Data
- Table: `USAGE_STAT` for raw counts; `EVENT` for each automated action with `baseline_min` & `auto_min`.
- Aggregator job computes rollups to `LOYALTY_SCORE.usage_index` and `time_saved_min` (HubSpot prop).

## 4) SendGrid Email Cadence
- Templates versioned by **bucket.tag** (e.g., `2.2_followup_A`).
- n8n job selects template + merge fields; BrandVX personalizes micro‑copy from Summary/Entity.

## 5) HubSpot Integration
- Properties created:
  - `brandvx_bucket (enum)`, `brandvx_tag (string)`, `brandvx_next_action_at (datetime)`
  - `brandvx_time_saved_min (number)`, `brandvx_usage_index (number)`
  - `brandvx_loyalty_tier (enum)`, `brandvx_ambassador_flag (bool)`
- Two‑way sync worker in `/backend/src/sync/hubspot-sync.ts`.

## 6) Ambassadors / Partners
- **Flag rule**: Revenue ≥ **$25k/mo**, **Usage index = moderate**, **Referrals ≥ 5**.
- When flagged, create a **HubSpot task** + BrandVX notification.
- Optional “Partner Journey” page with steps to productization.

---
