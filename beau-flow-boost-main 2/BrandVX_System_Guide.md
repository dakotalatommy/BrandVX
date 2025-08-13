# BrandVX System Guide (Readable Edition)

This is the **single source of truth** for how BrandVX works — written for maximum readability.
No flowcharts. Just the essentials, in order, with concrete examples.

---

## 1) Executive Summary

**BrandVX** is the master agent that runs your service business ops:
- Converts leads through a **7-bucket state model**, with well-defined cadences.
- **Books & reschedules** automatically (Square/Acuity), increases show rates.
- **Creates content**, manages inventory and **proves ROI & time saved**.
- Integrates cleanly with **HubSpot**, **Twilio/SendGrid**, and accounting/POS.
- Stores only what matters using **layered memory** + **events** for attribution.

**Goal:** a CRM-agnostic, agentic OS that grows a business and can prove it.

---

## 2) Terminology

- **BrandVX**: the master agent orchestrating everything.
- **Specialists**: Appointment Manager, Treatment Manager (Vivid Hair/Lash), Content Creator, Inventory Manager, Admin/Revenue, Research.
- **Buckets/Tags**: lead state machine (1..7) with sub-tags (e.g., 2.3).
- **Layered Memory**: Buffer, Summary, Entity, Vector (plus Events Ledger).
- **Event Clock**: timestamp controlling the next action (text/email/reminder).

---

## 3) Seven Buckets (State Model)

| Bucket | Name            | Tags & Meaning (SMS-first; emails layered where noted)                                  | Primary Exit |
|-------:|-----------------|------------------------------------------------------------------------------------------|--------------|
| 1      | New Lead        | **1.1 Outbound** (cold), **1.2 Inbound** (warm). First text; email if no phone.         | Reply → 4.x; No reply → 2.x; Disinterest → 3.2 |
| 2      | Never Answered  | **2.1 2d**, **2.2 1w**, **2.3 2w**, **2.4 1m**, **2.5 monthly/quarter**. Email D1; then cadence below. | Reply → 4.x; End of 2.5 → 3.1; 6mo silent → 7 |
| 3      | Retargeting     | **3.1 Sudden Death – No Answer** (one emotional counter-offer); **3.2 Sudden Death – Disinterested** (two-thread counter); **3.3 Ghost** (quarterly ping). | Engages → 4.1 else park |
| 4      | Engaged         | **4.1 Interested, no meeting**; **4.2 Meeting booked** (reminders **7d/3d/1d/2h**); **4.3 Meeting held**; **4.4 Onboarded**. | No trial → 3.x; Trial → 5.x |
| 5      | Retention       | **5.1 Free week** (white‑glove), **5.2 Paid month 1** (white‑glove), **5.3 Nurture cadence**, **5.4 Ambassador/Partner monitor**. | → 6 Loyalty |
| 6      | Loyalty         | **6.1 Founder tier**, **6.2 Share score**, **6.3 Usage tier**, **6.4 Ambassador**, **6.5 Partner**, **6.6 Productized**, **6.7 $1M/yr**. | N/A |
| 7      | Dead            | Opt-out or 6 months silent.                                                             | N/A |

**Never Answered Cadence (emails layered):**
- **2.1 (2d)**: text follow-up; email on Day 1 after first no-answer.
- **2.2 (1w)**: text at Day 7; emails Day 5, 9, 12, 17, 20, 23, 28.
- **2.3 (2w)**: text; emails Day 17, 20, 23, 28.
- **2.4 (1m)**: text; weekly emails thereafter.
- **2.5 (M/Q)**: text at Month 2 and 3; **emotional text** at end of Quarter; else → **3.1**.

---

## 4) Agents & Responsibilities

### BrandVX (master)
- Intent routing, compliance, quality gates.
- Loads **Entity/Summary** + top‑k **Vector** context.
- Writes **EVENT** rows and sets **next_action_at**.

### Specialists (first two Treatment templates: Vivid Hair, Lash)
- **Consultation Coordinator** — handles replies, gathers requirements, triages.
- **Appointment Manager** — Square/Acuity; “soonest vs anytime”; notify-list; show‑up reminders.
- **Treatment Manager (Vivid Hair / Lash)** — domain checklists, prep/post‑care, treatment plans.
- **Content Creator** — captions, shorts/story prompts; schedule to IG/FB or export.
- **Inventory Manager** — stock levels, par, reorders; update Shopify/Square listings.
- **Admin/Revenue** — snapshots, attribution, time saved.
- **Research/Data Quality** — trend/product intel; source filtering & privacy checks.

---

## 5) Memory Model (what we store)

- **Buffer**: last few messages (fast recall).
- **Summary**: short rolling history per client/provider (≤800 tokens).
- **Entity**: structured attributes (preferences, allergies, stylist, loyalty tier, etc.).
- **Vector**: embeddings for convos/assets/SOPs/trends (top‑k ≤ 6 per call).
- **Events Ledger**: append‑only events (sends/replies/state changes) with `campaign=bucket.tag`.

**Imports at Onboarding:** clients, booking history, SOPs, last N months content, product catalogs/inventory, accounting snapshots.

---

## 6) Integrations (first targets)

- **CRM:** HubSpot (two‑way properties):  
  `brandvx_bucket`, `brandvx_tag`, `brandvx_next_action_at`, `brandvx_time_saved_min`, `brandvx_usage_index`, `brandvx_loyalty_tier`, `brandvx_ambassador_flag`.
- **Booking:** Square + Acuity (webhooks for book/reschedule/cancel; notify-list for “soonest”).  
- **Messaging:** Twilio (SMS) + **SendGrid** (emails keyed by `bucket.tag` template IDs).  
- **Social:** IG/FB post scheduling (or export).  
- **POS/Inventory:** Shopify/Square for products & stock.  
- **Accounting:** QuickBooks (revenue baseline/uplift).  
- **Schedulers:** **n8n** (cron cadences, webhook fan‑out, idempotent retries).

---

## 7) The “Time Saver” (Gamified, shareable)

**Baseline minutes** (examples): booking=6, reminder=1, follow‑up SMS=2, caption=10, inventory update=4.  
**Automation minutes** (est.): booking=1, reminder=0.1, sms=0.3, caption=2, inventory=0.5.  
**Time saved per event** = baseline − automation.

- Tracks daily/weekly/monthly + lifetime totals.
- **Milestones**: 10h/25h/50h/100h → generate shareable badges.
- **Share inflection points** (discreet button, pre-filled caption):  
  - End of onboarding, trial week complete, first fully booked week, **$25k month**, **5 referrals**, top content post.

All shares are **EVENTs**: `type=share_prompted`, with outcome recorded.

---

## 8) Ambassador/Partner Thresholds

Flag as **Ambassador Candidate** when all are true:
- **Revenue ≥ $25k/mo** post‑BrandVX.
- **Usage Index** is **moderate** (e.g., ≥3 sessions/week **and** ≥60% reply‑within‑24h).
- **Referrals ≥ 5**.

Creates a **HubSpot task** + in‑app notification; shows in dashboard table.

---

## 9) Data Model (tables)

**CONTACT**: `id`, `name`, `phone`, `email`, `hs_contact_id?`  
**LEAD_STATUS**: `id`, `contact_id`, `bucket`, `tag`, `next_action_at`, `reason`  
**EVENT**: `id`, `contact_id`, `type`, `campaign`, `payload`, `at`  
**BOOKING**: `id`, `contact_id`, `provider`, `start_at`, `status`, `soonest`  
**LOYALTY_SCORE**: `contact_id`, `referrals`, `usage_index`, `share_score`, `tier`, `ambassador_flag`  
**USAGE_STAT**: `id`, `contact_id`, `metric`, `value`, `at`  
**ENTITY**: `contact_id`, `attributes` (jsonb)  
**SUMMARY**: `contact_id`, `summary`, `updated_at`  
**VECTOR**: `id`, `contact_id`, `content`, `embedding` (pgvector)

---

## 10) Runtime: how it actually runs

- **Model**: GPT‑5 (structured output) makes decisions and plans.  
- **Orchestrator**: **LangGraph (Node)** manages tool calls + memory fetches + branching.  
- **Schedulers**: **n8n** performs cadences and webhook fan‑out with idempotent retries.  
- **Why not “just GPT‑5”?** You still need **durable state**, **scheduling**, **retries**, **compliance**, and **attribution** — that’s LangGraph + n8n + Supabase.

**Message Path (example – booking):**
1. Inbound SMS → BrandVX → intent = `book`.
2. Load Entity/Summary + top‑k vectors → compact prompt to GPT‑5.
3. BrandVX routes to **Appointment Manager**.
4. Appointment Manager calls Square/Acuity; asks “**soonest vs anytime**”; may add to notify‑list.
5. Writes **EVENT** + updates **BOOKING** + sets **next_action_at** (reminders).
6. n8n later executes each reminder; events stay idempotent via unique IDs.

---

## 11) Coding Rules (short version)

- **Strict TS**; **Zod** schemas at all boundaries.  
- **Tool wrappers only** for Twilio/SendGrid/etc.; no SDKs in React.  
- **Every send/reply is an EVENT**; schedulers read/write `next_action_at`.  
- **Idempotent** webhooks & jobs; dedupe key everywhere.  
- **Security**: secrets only in backend; RLS; consent registry; audit logs.  
- **Testing**: unit (tools), integration (BrandVX→Specialists), E2E (onboarding + console).

For the long version, see `CODE_GUIDELINES.md` (keep in /docs).

---

## 12) Implementation Checklist (Cursor one‑shot ready)

1. Rename master agent to **BrandVX**; keep `/agents/guardian` alias.
2. Create **lead_status**, **event**, **loyalty_score**, **usage_stat**, **booking** tables.
3. Implement **Time Saver** (EVENT fields: `baseline_min`, `auto_min` → rollups).
4. Add **share points** (onboarding end, trial week complete, fully booked, $25k month, 5 referrals, top post). Each produces share card + optional SendGrid email.
5. Build **Appointment Manager** (Square/Acuity) with notify‑list and reminder cadence.
6. Build **Treatment Manager templates** (Vivid Hair, Lash).
7. Add **HubSpot sync** properties (see §6).
8. Wire **n8n** flows: cadences for 2.x & 4.2; webhook handlers; property sync.
9. Lock **structured outputs** and Zod validation on all GPT‑5 calls.
10. Ship **Operator Dashboard** cards: Time Saved, Revenue Uplift, Usage Index, Referrals; plus Ambassador table and Cadence Queue.

---

## 13) Example Payloads

**/agents/brandvx (book intent)**
```json
{
  "intent": "book",
  "user_id": "uuid",
  "payload": {
    "client_name": "Alex R",
    "preference": "soonest",
    "service": "vivid_color_refresh"
  }
}
```

**Specialist result (success)**
```json
{
  "type": "result",
  "text": "Booked 2pm Friday; added to notify-list for earlier slots.",
  "data": {
    "booking_id": "b2c...",
    "reminders": ["7d","3d","1d","2h"]
  }
}
```

**EVENT example (send)**
```json
{
  "type": "sms_sent",
  "campaign": "4.2",
  "payload": { "to": "+1...","template": "reminder_3d" },
  "at": "2025-08-08T17:30:00Z",
  "baseline_min": 1,
  "auto_min": 0.1
}
```

---

## 14) Notes on Modularity (subgits vs monorepo)

Prefer **monorepo** with `/apps` and `/packages` (agents, tools, domain packs).  
If you need private verticals, you can mount them as **git submodules**, but a manifest‑based plugin loader is simpler for daily dev.

---

## 15) What to hand GPT‑5 in Cursor

- Put this file and the three supporting docs into `/docs/`.  
- Open them in the editor; then say:

> Read `/docs/BrandVX_System_Guide.md`, `/docs/CODE_GUIDELINES.md`, `/docs/FEATURES_TIME_SAVER_AND_SHARING.md`, and `/docs/AGENT_RUNTIME_AND_MODULARITY.md`. Acknowledge in 5 bullets. Implement items in **§12 Implementation Checklist**. No architecture changes. List every file you changed and why.

That’s it.
