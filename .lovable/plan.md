## Goal

Two outcomes in one pass:

1. **Get Databricks actually working** — currently the edge functions exist but the connector was declined last round, so `DATABRICKS_API_KEY` isn't in the environment and the toggle on `/databricks` doesn't render. We need to (a) link the connector, (b) collect the warehouse ID + table name as runtime secrets, (c) make the Databricks page interactive (status badge, toggle, test query), and (d) actually swap `FacilitySearch` and `TrustScorer` to use `searchFacilities()` / `listTrust()` from `dataSource.ts` instead of calling `runAgent` / reading JSON directly.
2. **Document everything** — replace the placeholder `README.md` and add an in-app `/docs` route so judges can read the architecture without leaving the app.

---

## Part 1 — Fix the Databricks connection (step by step)

### Step 1.1 — Link the Databricks connector
- Call `standard_connectors--connect` with `connector_id: "databricks"`.
- The picker walks the user through OAuth / personal-access-token entry against their Databricks workspace.
- Once the connection is linked, the gateway secrets `LOVABLE_API_KEY` and `DATABRICKS_API_KEY` become available to all edge functions automatically — no code change needed for those two.

### Step 1.2 — Collect the workspace-specific values
Two values can't come from OAuth and have to be entered as runtime secrets:
- `DATABRICKS_WAREHOUSE_ID` — the SQL Warehouse the queries run against.
- `DATABRICKS_FACILITIES_TABLE` — fully-qualified `catalog.schema.table` where the 10k facility dataset lives (defaults to `main.sehat.facilities` if not set).

Use `add_secret` for each so the user pastes them in the secret modal. Edge functions already read them via `Deno.env.get(...)`.

### Step 1.3 — Verify the connection from the app
- Deploy `databricks-status`, `databricks-search`, `databricks-trust` (already written; deploy once secrets are in place).
- Hit `databricks-status` via `supabase--curl_edge_functions` to confirm `{ connected: true, outcome: "verified" }`.
- If it returns `failed`, surface the error string to the user and stop — likely a token/scope issue that needs `standard_connectors--reconnect`.

### Step 1.4 — Make `Databricks.tsx` interactive
Replace the static marketing card with:
- **Live status badge** (green "Connected · 142 ms" / red "Not connected") driven by a `useQuery` against `databricks-status` that polls every 30 s.
- **"Use Databricks for queries" toggle** bound to `useDataSource()` from `src/data/dataSource.ts` — flips `localStorage.sehat.useDatabricks` and broadcasts `sehat:datasource` so the rest of the app re-renders.
- **"Test query" button** that runs `SELECT state, COUNT(*) FROM ${TABLE} GROUP BY state LIMIT 10` via `databricks-search` (or a dedicated `databricks-test` action) and shows raw JSON below.
- **Setup checklist** — three steps with green checkmarks: (1) connector linked, (2) `DATABRICKS_WAREHOUSE_ID` set, (3) `DATABRICKS_FACILITIES_TABLE` set. Each row has a "Configure" button if missing.

### Step 1.5 — Wire Search & Trust to the data-source layer
Right now `FacilitySearch.tsx` calls `runAgent(q, facilities)` directly and `TrustScorer.tsx` reads from `useFacilities()`. Both need to go through `dataSource.ts` (which already exists and already falls back to the local index on error):

- **`FacilitySearch.tsx`**: replace the `setTimeout(() => setResult(runAgent(...)))` block with `await searchFacilities(q)`. Show a small pill `via Databricks` or `via local index` next to the agent answer based on `result.source`.
- **`TrustScorer.tsx`**: replace the in-component `useMemo` filter/sort with a `useQuery(['trust', search, sortBy, asc], () => listTrust({ search, sortBy, asc, limit: 100 }))`. Same pill in the table header.
- Both pages keep working offline because `dataSource.ts` already catches errors and returns `{ source: "local", ... }`.

### Step 1.6 — Trace the Databricks calls
Each gateway call returned by the edge functions already includes a `trace[]` array (Reasoner → Retriever → Scorer with `ms` timings). The Agent Trace page reads `result.trace`, so this just works once Search uses `searchFacilities()`. No additional change needed.

---

## Part 2 — Project documentation

### Step 2.1 — Rewrite `README.md`
Replace the placeholder with a proper hackathon-grade README:
- **What it is** — Sehat Atlas, agentic healthcare intelligence over the VF India 10k facility dataset.
- **Architecture diagram** (ASCII) — frontend (React/Vite) → `dataSource.ts` switch → either local JSON index OR Supabase Edge Functions → Lovable Connector Gateway → Databricks SQL Warehouse + Vector Search + Agent Bricks.
- **Five core surfaces** with screenshots/links to each route.
- **Trust Scorer logic** — explain the contradiction rules (claims Advanced Surgery without anesthesiologist, etc.) and the 0–100 scoring formula.
- **Setup** — how to run locally, how to enable Databricks (link to in-app `/databricks` page).
- **Datasets** — note the slim/details split (3 MB + 5.7 MB) and the rationale.
- **Tech stack & file map** — short table of the important files.

### Step 2.2 — Add an in-app `/docs` route
A new page so judges/users can read everything without checking out the repo:
- New file `src/pages/Docs.tsx` rendered with the existing `PageHeader` + Markdown-style sections (using Tailwind prose).
- Add nav entry in `AppLayout.tsx` and route in `App.tsx`.
- Sections: **Overview**, **How the agent reasons**, **Trust scoring**, **Databricks integration** (with sample SQL + sample gateway response), **Data schema** (FacilitySlim / FacilityDetail), **Privacy & data handling**.

### Step 2.3 — Inline JSDoc on key modules
Add short header doc-comments to:
- `src/data/agent.ts` — explain `runAgent` stages.
- `src/data/dataSource.ts` — already has a header; expand it with the "fall back to local on error" contract.
- `src/data/facilities.ts` — document the trust formula and citation extraction.
- `supabase/functions/databricks-*/index.ts` — already have headers; extend with secret requirements.

---

## Files touched

**New**
- `src/pages/Docs.tsx`

**Edited**
- `src/pages/Databricks.tsx` — interactive status / toggle / test query / setup checklist
- `src/pages/FacilitySearch.tsx` — use `searchFacilities()`, show source pill
- `src/pages/TrustScorer.tsx` — use `listTrust()`, show source pill
- `src/components/AppLayout.tsx` — add Docs nav item
- `src/App.tsx` — add `/docs` route
- `README.md` — full rewrite
- `src/data/agent.ts`, `src/data/facilities.ts` — JSDoc only

**Tools/calls**
- `standard_connectors--connect` (databricks)
- `add_secret` × 2 (`DATABRICKS_WAREHOUSE_ID`, `DATABRICKS_FACILITIES_TABLE`)
- `supabase--deploy_edge_functions` (`databricks-status`, `databricks-search`, `databricks-trust`)
- `supabase--curl_edge_functions` to verify `databricks-status`

---

## Out of scope / assumptions
- Schema of your Databricks table is assumed to roughly match the slim JSON (`id, name, state, district, pin, latitude, longitude, beds, doctors, claimed[], evidenced[], open_247, trust, contradictions_n, missing_n`). If your real table differs, the edge function SQL will need a small column-mapping tweak — call this out after the first failed query and adjust.
- Vector Search and Agent Bricks endpoints are documented in `/docs` but not wired up yet — current implementation is SQL Warehouse only. Easy to add as a follow-up since the proxy pattern is already in place.
- If you'd rather skip Databricks entirely and just ship the local-index version, say so and I'll do only Part 2 (docs).
