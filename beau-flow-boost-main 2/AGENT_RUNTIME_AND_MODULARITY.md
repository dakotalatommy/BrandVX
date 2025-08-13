# Agent Runtime & Modularity – How BrandVX Runs
_Last updated: 2025-08-08 21:16_

## TL;DR
- **Model**: GPT‑5 API for reasoning + structured outputs.
- **Orchestrator**: **LangGraph (Node)** in the backend to manage tool calls and memory.
- **Schedulers**: **n8n** for cadences, webhooks, and fan‑out sends.
- **CRM**: HubSpot via a dedicated sync layer (properties listed in the Feature spec).
- **Storage**: Supabase (RLS + pgvector) as the behavior/memory store.
- **Modularity**: monorepo with pluggable Specialists; submodules optional for industry packs.

## Why not “just GPT‑5”?
You still need **durable state, scheduling, idempotency, and integrations**. GPT‑5 decides *what* to do; LangGraph + n8n handle *when/how* reliably (and replays).

## Message Flow (example)
1. Event (inbound SMS or HubSpot webhook) hits **BrandVX** endpoint.
2. BrandVX loads Entity/Summary + top‑k vectors.
3. Calls GPT‑5 with a compact, schema‑bound prompt.
4. Routes to a Specialist (Appointment, Treatment, Content, Inventory, Admin).
5. Specialist uses tool wrappers (Twilio/SendGrid/Square/Acuity/QuickBooks).
6. Writes **EVENT** row, updates `lead_status`, sets `next_action_at` if needed.
7. n8n picks up `next_action_at` to schedule future touches.

## LangGraph Shape (simplified)
- **Nodes**: `decide_intent`, `gather_context`, `specialist_*`, `writebacks`, `notify`.
- **Edges**: based on model outputs (`nextTag`, `actions[]`).
- **State**: request ID, user_id, entity subset, summary snippet, top‑k docs, safety flags.

## Using Other Models (Claude, etc.)
- Introduce a `ModelProvider` interface (`generate`, `parse`, `embed`).
- Plug Claude/Sonnet or Groq models behind the same contract for A/B or fallbacks.

## Schedulers
- **n8n** flows:
  - Cron → query contacts where `next_action_at <= now()` → call BrandVX `/send` endpoint.
  - Square/Acuity webhooks → BrandVX → update bookings + reminders.
  - HubSpot property change → BrandVX → `lead_status` + events.
- Idempotency: include `event_id` everywhere; BrandVX returns 200 on duplicates.

## Repo Strategy
- **Monorepo** (recommended):  
  - `/apps/frontend`, `/apps/backend`
  - `/packages/agents` (BrandVX + base Specialists)
  - `/packages/tools` (Twilio, SendGrid, Square, Acuity, HubSpot, QuickBooks)
  - `/packages/domain-vivid-hair`, `/packages/domain-lash` (industry packs)
- **Submodules** (optional) for private industry packs; pros: separation; cons: dev friction.
- Load Specialists via a simple **manifest**:
```ts
export default {
  name: "treatment-vivid-hair",
  inputs: ["client_profile","history","goals"],
  tools: ["square","twilio"],
  outputs: ["plan","products","aftercare"]
};
```

## Data Contracts Worth Locking
- `EVENT(type, campaign, payload, at)` — single source for attribution.
- `LEAD_STATUS(bucket, tag, next_action_at, reason)` — drives all cadences.
- `LOYALTY_SCORE(usage_index, referrals, share_score, ambassador_flag)` — feeds tiers.

## Deployment Notes
- Queue for fan‑out (BullMQ + Redis) behind n8n if needed.
- Metrics + traces (OpenTelemetry); Sentry for alerts.
- Feature flags for share prompts, leaderboards, and beta features.

---
