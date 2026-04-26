## Plan — 4 features for Sehat Atlas

### 1. Databricks connector wired into Facility Search & Trust Scorer

**Connection setup**
- Use `standard_connectors--connect` with `connector_id: "databricks"` to link the Databricks connection to this project. (Lovable Cloud will be enabled first if not already, since gateway secrets are exposed via edge functions.)
- The user will be asked in the picker for: their Databricks **warehouse ID** and the **catalog.schema.table** name where the 10k facility dataset lives (we'll capture these as runtime secrets `DATABRICKS_WAREHOUSE_ID` and `DATABRICKS_FACILITIES_TABLE` so the same code works for any workspace).

**New edge functions** (proxy the gateway, keep secrets server-side)
- `supabase/functions/databricks-search/index.ts` — accepts `{ query, filters }`, parses intent (state/city/specialty/24-7) and runs a parameterized SQL statement against `${GATEWAY_URL}/2.0/sql/statements` to return the top ~50 candidate rows, then runs the existing JS scorer on the result.
- `supabase/functions/databricks-trust/index.ts` — accepts `{ search, sortBy, asc, limit, offset }` and returns paginated trust-scored rows + per-facility detail (claimed/evidenced/contradictions/citations) on demand.
- `supabase/functions/databricks-status/index.ts` — calls `/api/v1/verify_credentials` to confirm the connection is live; powers a green/red badge on the Databricks page and in the sidebar.
- All three include CORS headers, Zod input validation, and `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${DATABRICKS_API_KEY}`.

**Frontend changes**
- New `src/data/dataSource.ts` — single switch (`useDatabricks` from `localStorage`) that decides whether `runAgent` / Trust list call the edge functions or fall back to the precomputed JSON. Exposes `searchFacilities(query)` and `listTrust(params)` with the same return shape as today, so pages don't change much.
- `Databricks.tsx` becomes interactive: live status badge, "Use Databricks for queries" toggle, "Test query" button that runs a sample SQL and shows raw JSON, and step list that records each gateway call as a new TraceStep so it shows up in `/trace`.
- `FacilitySearch.tsx` and `TrustScorer.tsx` swap `runAgent(...)` / direct `useFacilities()` reads for the `dataSource` helpers; UI shows a small "via Databricks" or "via local index" pill.

### 2. Query history panel on Facility Search

- New `src/hooks/useQueryHistory.ts` — `localStorage`-backed (key `sehat.history`), keeps last 20 entries: `{ id, query, ts, resultCount, topFacilityId, snapshot }`. `snapshot` stores the full `AgentResult` so re-opening is instant and consistent with the run that produced it.
- New `src/components/QueryHistory.tsx` — collapsible card under the search bar on `/search` showing recent queries with result count + timestamp; each row has **Rerun** (re-executes against current data source so live data refreshes) and **Open snapshot** (loads stored `AgentResult` without re-querying). Trash icon clears one or all.
- The same hook is reused by Agent Trace page so users can jump back to the original chain-of-thought from history.

### 3. Map hover + click drill-down

- In `DesertMap.tsx`:
  - State bubbles get `onMouseEnter`/`onMouseLeave` for a floating tooltip showing `state · coverage% · verified/total · top facility name`.
  - Clicking a state bubble opens a new right-side `Sheet` ("State drill-down") listing the **top 10 facilities** in that state for the selected specialty, ranked by `evidenced + trust − contraN` — same scoring used by the agent. Each row shows trust badge, district, beds, 24/7 flag, and a "View in Trust Scorer" link (deep-links to `/trust?focus=<id>` which auto-opens the detail sheet).
  - Individual facility dots also become clickable and hover-highlightable (cursor + radius bump), opening the same drill-down filtered to that one facility.
  - A small "View on map" button is added to each Facility Search result that scrolls/links to `/map?specialty=<sp>&state=<state>` with the right specialty pre-selected and the state bubble pre-opened.

### 4. Export results as CSV or PDF

- New `src/lib/export.ts`:
  - `exportCSV(rows, filename)` — builds CSV with columns: name, type, state, district, pin, beds, claimed, evidenced, trust, contradictions count, missing count, top citation. Uses native `Blob` + `URL.createObjectURL` (no deps).
  - `exportPDF(result, details, filename)` — uses `jspdf` + `jspdf-autotable` (already common, small) to render: header (query, timestamp, data source), summary table of top facilities with trust scores, then a per-facility section with citations and validator flags. Footer has a "Sehat Atlas" mark and page numbers.
- New `src/components/ExportMenu.tsx` — dropdown button ("Export ▾") with CSV / PDF options; placed in:
  - **Facility Search** results header — exports the current `AgentResult.matches` + their `details`.
  - **Trust Scorer** — exports the currently filtered/sorted rows (top 100 visible).
  - **Desert Map state drill-down** — exports the top facilities for the selected state+specialty.
- A `?download=csv|pdf` query param also triggers export on load, so users can share a link that produces a report.

### Files touched
- New: `supabase/functions/databricks-{search,trust,status}/index.ts`, `src/data/dataSource.ts`, `src/hooks/useQueryHistory.ts`, `src/components/QueryHistory.tsx`, `src/components/ExportMenu.tsx`, `src/lib/export.ts`.
- Edited: `src/pages/Databricks.tsx` (interactive), `src/pages/FacilitySearch.tsx` (history + export + map link), `src/pages/TrustScorer.tsx` (data-source switch + export + `?focus=`), `src/pages/DesertMap.tsx` (hover/click drill-down + URL params), `src/data/agent.ts` (extract reusable scorer), `src/App.tsx` (no route changes; just imports if needed).
- Deps added: `jspdf`, `jspdf-autotable`.

### Out of scope / assumptions
- Schema of the Databricks table is assumed to roughly mirror `FacilitySlim` + a `details_json` column. If the user's table is different, the edge function's SQL will be adjusted in a follow-up — the rest of the UI is decoupled via `dataSource.ts`.
- No auth gate on the edge functions for now (single-tenant demo); rate limiting is in-memory inside the function. Can be hardened later.