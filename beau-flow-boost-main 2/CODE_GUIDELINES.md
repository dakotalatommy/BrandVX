# BrandVX Code Guidelines & Examples
_Last updated: 2025-08-08 21:16_

These rules optimize **one‑shot correctness** for GPT‑5 in Cursor and keep the codebase safe, fast, and extensible.

## Core Principles
- **Single orchestrator**: BrandVX (master) decides routing; Specialists do the work.
- **Strict TypeScript** everywhere; **Zod** to validate all inputs/outputs.
- **Pure tool wrappers** (Twilio, SendGrid, Square, Acuity, HubSpot, QuickBooks). No SDK calls from UI.
- **Layered memory**: Buffer (short), Summary (≤800 tokens), Entity (structured), Vector (top‑k ≤ 6).
- **Event‑driven**: every send/reply/booking is an **EVENT** row. Schedulers read `next_action_at`.
- **Idempotent & retry‑safe**: all webhooks/scheduled jobs must be safe to replay.
- **Least privilege**: environment variables only in server code; RLS + audit logs.

## Folder Conventions
```
/frontend                 # Next.js (UI only)
/backend                  # Express + LangGraph (BrandVX + Specialists)
/backend/src/agents       # brandvx.ts, specialists/*
/backend/src/tools        # twilio.ts, sendgrid.ts, square.ts, acuity.ts, hubspot.ts, quickbooks.ts
/backend/src/memory       # buffer.ts, summary.ts, entity.ts, vector.ts
/backend/src/sync         # hubspot-sync.ts, schedulers.ts
```

## API Contracts
- **BrandVX POST /agents/brandvx** input:
```json
{{
  "intent": "consultation|hair|lash|content|inventory|admin|book|retarget|cadence",
  "user_id": "uuid",
  "payload": {{ "…": "…" }}
}}
```
- **Specialist output**:
```json
{{ "type": "result|plan|error", "text": "summary", "data": {{}} }}
```

## Prompting & Model Use
- Use **GPT‑5** with **structured outputs**. Never parse free‑form text if JSON schema fits.
- Keep prompts **short**; fetch context from memory instead of pasting history.
- Pin **entity attributes** and **top‑k vectors**; include **summary** iff needed.
- **Retry strategy**: 1) short backoff retry, 2) truncate context further, 3) fallback template.

### Good (structured output)
```ts
const schema = z.object({ plan: z.array(z.string()), nextTag: z.string() });
const resp = await openai.responses.parse({  // pseudo
  model: "gpt-5",
  input: prompt,
  schema
});
if (!resp.success) throw new Error("Schema mismatch");
return resp.output;
```

### Bad (free text)
```ts
const txt = await openai.chat.completions.create({model:"gpt-5", messages});
JSON.parse(txt.choices[0].message.content); // brittle
```

## Tooling Rules
- **Do** call third‑party APIs only via `/tools/*.ts` wrappers with typed inputs/outputs.
- **Don’t** call Twilio/SendGrid/etc. from React components.
- **Do** centralize HubSpot sync in `/sync/hubspot-sync.ts` with a single `upsertContact()` API.

### Good (Twilio wrapper)
```ts
// tools/twilio.ts
export async function sendSMS({to, body}: {to:string; body:string}) { /* impl */ }

// specialist
await sendSMS({ to: phone, body: msg });
```

### Bad (in component)
```tsx
// React component
fetch("https://api.twilio.com/...", { headers: { Authorization: "Bearer " + TWILIO_TOKEN } });
```

## Scheduler & Idempotency
- All cadence jobs set/consume `next_action_at` and write an **EVENT** record.
- Webhooks/schedules must include a **dedupe key** (e.g., `event_id`).
- If a job runs twice, it should **no‑op** after checking existing EVENT row.

### Good
```ts
const exists = await db.eventExists(id);
if (exists) return;
await db.insertEvent({...});
await sendSMS(...);
```

## Error Handling & Observability
- Return typed errors from Specialists; BrandVX converts to HTTP errors.
- Use **pino** logs with request IDs; add **Sentry** for alerts.
- Never log secrets/PII; mask phone/email.

## Security
- `.env` only in backend; frontend uses **public** keys only (e.g., anon Supabase).
- RLS policies; per‑account scoping; consent registry for SMS/email (STOP/HELP).
- Encrypt service tokens at rest; rotate regularly.

## Testing
- **Unit**: tools and reducers are pure; mock API calls.
- **Integration**: BrandVX → Specialist happy‑path tests.
- **E2E**: Playwright for onboarding + console flows.
- Seed test data fixtures; run CI on PR.

## Memory Usage Examples
### Good
- Fetch `entity`, `summary`, top‑k=4 vectors → prompt.
- Write back new `entity` keys and a short `summary` delta after completion.

### Bad
- Dump entire conversation each time.
- Storing ephemeral IDs in summary (keep in events).

## Performance
- Use **top‑k vector recall ≤ 6**, chunk size 500–800 chars.
- For high fan‑out jobs (campaign sends), batch in n8n and back‑pressure via queues.

---
