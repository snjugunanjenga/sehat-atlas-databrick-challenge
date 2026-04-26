# Sehat Atlas

> Agentic Healthcare Maps for India — turning 10,000+ messy facility records into a living intelligence layer.

[![Powered by Databricks](https://img.shields.io/badge/Powered%20by-Databricks-FF3621)](https://www.databricks.com)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-7C3AED)](https://lovable.dev)

In a country of 1.4 billion, a postal code often determines a lifespan. Sehat Atlas builds the **reasoning layer** for Indian healthcare — sifting through 10k unstructured facility reports to find hidden life-saving capabilities, flagging contradictions, and mapping medical deserts at PIN-code granularity.

---

## Architecture

```
                ┌───────────────────────┐
                │   React + Vite UI     │
                │   (this repo)         │
                └─────────┬─────────────┘
                          │
                ┌─────────▼─────────────┐
                │  src/data/dataSource  │  ← runtime switch
                │  (local | databricks) │
                └──┬─────────────────┬──┘
                   │                 │
       ┌───────────▼───┐    ┌────────▼──────────────────┐
       │ /public/data  │    │ Supabase Edge Functions   │
       │  facilities   │    │ databricks-{search,trust, │
       │  .slim.json   │    │              status}      │
       │  .details.json│    └────────┬──────────────────┘
       │  (~9 MB)      │             │
       └───────────────┘    ┌────────▼──────────────────┐
                            │ Lovable Connector Gateway │
                            │   auto token refresh      │
                            └────────┬──────────────────┘
                                     │
                            ┌────────▼──────────────────┐
                            │ Databricks Workspace      │
                            │  • SQL Warehouse  ✅      │
                            │  • Vector Search  (ready) │
                            │  • Agent Bricks   (ready) │
                            └───────────────────────────┘
```

The frontend never talks to Databricks directly. All gateway secrets live server-side; the UI just calls `searchFacilities()` / `listTrust()` and gets the same shape back regardless of source.

---

## The five surfaces

| Route | Purpose |
|---|---|
| `/` Overview | KPIs, top medical deserts, agent activity, specialty coverage |
| `/search` Facility Search | Natural-language query → ranked matches with citations + chain-of-thought link |
| `/trust` Trust Scorer | Sortable table of every facility with claimed-vs-evidenced services and validator flags |
| `/map` Desert Map | India choropleth by specialty; click any state for top facilities |
| `/trace` Agent Traces | Step-by-step view of Retriever → Scorer → Validator → Reasoner |
| `/databricks` Databricks | Live status, "use Databricks" toggle, sample query runner |
| `/docs` Docs | In-app architecture & API reference |

---

## How the agent reasons

For each natural-language query, five virtual agents run in sequence:

1. **Reasoner** parses intent — extracts states, cities, specialties, and modifiers (rural / 24-7 / hospital).
2. **Retriever** filters the 10k corpus (or proxies a SQL query to Databricks) — geo + facility type prefiltering.
3. **Scorer** ranks candidates: `+30 evidenced specialty, +6 claimed-only, +10 24/7, +0.25 × trust − 5 × contradictions`.
4. **Validator** cross-checks against medical-standards rules (e.g. claims Advanced Surgery → must mention an anaesthesiologist or anaesthesia equipment).
5. **Reasoner** synthesizes the final answer with the top facility cited.

Every step is logged with timing and source row IDs and rendered in the Agent Traces view.

## Trust scoring (0–100)

```
score = 100
       − 22  per HIGH-severity contradiction
       − 12  per MEDIUM contradiction
       −  5  per LOW contradiction
       −  3  per claimed-but-unevidenced specialty
       −  5  if description is empty
       −  6  if hospital with no equipment listed
score = clamp(score, 15, 100)
```

| Band | Range | Meaning |
|---|---|---|
| **High** | 80–100 | Claims match evidence; safe to recommend |
| **Medium** | 55–79 | Some gaps; verify before recommending |
| **Low** | 15–54 | Major contradictions; do not recommend without review |

Across the 10k dataset: **78.8% high · 19.9% medium · 1.3% low**, with **2,448 facilities** flagged for at least one contradiction.

## Contradiction rules

| Trigger | Severity |
|---|---|
| Claims Advanced Surgery, no anaesthesiologist or anaesthesia equipment | HIGH |
| Claims Oncology, no oncologist mentioned | HIGH |
| Claims Dialysis, no dialysis machine listed | MEDIUM |
| Claims Neonatal ICU, no incubator or neonatologist | MEDIUM |
| Claims Emergency Trauma, no ICU bed or ventilator | LOW |

---

## Databricks integration

When enabled (toggle on `/databricks`), Search and Trust Scorer route through your SQL Warehouse via the Lovable connector gateway.

**Required setup**

1. Connect the Databricks connector from the Connectors panel.
2. Add two runtime secrets in Lovable Cloud:
   - `DATABRICKS_WAREHOUSE_ID` — your SQL Warehouse ID
   - `DATABRICKS_FACILITIES_TABLE` — fully-qualified table name (e.g. `main.sehat.facilities`)
3. Visit `/databricks` and confirm the green "Connected" badge.
4. Flip the toggle. Falls back to local index automatically on any error.

**Expected table schema**

```sql
CREATE TABLE main.sehat.facilities (
  id                STRING,
  name              STRING,
  facility_type     STRING,
  state             STRING,
  district          STRING,
  pin               STRING,
  latitude          DOUBLE,
  longitude         DOUBLE,
  beds              INT,
  doctors           INT,
  claimed           ARRAY<STRING>,
  evidenced         ARRAY<STRING>,
  open_247          BOOLEAN,
  trust             INT,
  contradictions_n  INT,
  missing_n         INT
);
```

---

## Local development

```bash
bun install
bun dev
```

The slim and details JSON files live in `public/data/` and are lazy-loaded on demand.

## Tech stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind, shadcn/ui
- **Backend**: Lovable Cloud (Supabase) Edge Functions in Deno
- **Integration**: Lovable Connector Gateway → Databricks
- **PDF/CSV export**: `jspdf` + `jspdf-autotable`
- **Dataset**: Virtue Foundation VF_Hackathon_Dataset_India (10,000 rows, 41 columns)

## Project layout

```
src/
  pages/         5 surfaces + Docs
  components/    AppLayout, ExportMenu, QueryHistory, TrustBadge, …
  data/
    facilities.ts   types + loaders for the 10k dataset
    agent.ts        local 5-step reasoning pipeline
    dataSource.ts   local ↔ Databricks switch (single API surface)
  hooks/         useFacilities, useQueryHistory
  lib/           export.ts (CSV + PDF)

supabase/functions/
  databricks-status/   verify_credentials probe
  databricks-search/   parameterized SQL → AgentResult
  databricks-trust/    paginated trust list

public/data/
  facilities.slim.json     (3 MB — drives all list/map views)
  facilities.details.json  (5.7 MB — lazy-loaded on detail open)
```

## Credits

Built for the Databricks for Good — Virtue Foundation hackathon. Dataset © Virtue Foundation.
