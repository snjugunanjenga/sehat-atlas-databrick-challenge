# Sehat Atlas — Agentic Healthcare Intelligence for India

A web dashboard that turns 10,000 messy Indian facility records into a living intelligence layer: searchable by natural language, scored for trust, mapped for medical deserts, and fully traceable.

## Architecture

- **Frontend**: React + Tailwind dashboard (this app)
- **Backend**: Lovable Cloud (Postgres + Edge Functions) for ingesting the dataset, caching extractions, and storing trust scores
- **AI reasoning**: Lovable AI Gateway (Gemini) for unstructured extraction, query reasoning, and the Validator Agent — used during ingestion and at query time
- **Databricks connector**: Wired in so live queries can be proxied to your Databricks workspace (Vector Search / Agent Bricks endpoints) once you have them deployed. Until then, the app runs end-to-end on Lovable Cloud + AI as a working demo your judges can click through.

## Data flow

1. You upload `VF_Hackathon_Dataset_India_Large.xlsx` from the dashboard.
2. An ingestion edge function parses rows, normalizes structured fields (PIN code, state, district, claimed services, beds, equipment), and stores them.
3. An extraction job runs Lovable AI over the unstructured notes per facility to pull: services actually evidenced, equipment evidenced, staff specialties, 24/7 claims, contradictions.
4. A Trust Scorer computes a 0–100 score per facility with explicit flags (e.g. "Claims Advanced Surgery, no Anesthesiologist mentioned").
5. A Validator Agent re-checks high-impact extractions against a small medical-standards rule set and flags hallucinations.
6. All extractions store **row-level citations** (the exact sentence in the report) so the UI can prove every claim.

## Pages & features

### 1. Dashboard (home)
- KPI tiles: facilities ingested, % with trust score ≥ 80, # contradictions flagged, # PIN codes covered
- Top 5 medical deserts (by specialty)
- Recent agent activity feed

### 2. Natural-language Facility Search
- Single search bar: "Find the nearest facility in rural Bihar that can perform an emergency appendectomy and uses part-time doctors"
- Results ranked by relevance + trust score
- Each result card shows: facility name, location, matched capabilities, trust score, and an expandable **"Why this result?"** panel with cited sentences
- Filters: state, district, specialty, 24/7, min trust score

### 3. Trust Scorer Dashboard
- Sortable table of all facilities with score, # contradictions, # missing-evidence flags
- Click a row → drawer with the full breakdown: claimed vs. evidenced services, validator notes, source snippets

### 4. Medical Desert Map
- Interactive map of India (Leaflet + open tiles)
- Heatmap / choropleth at PIN-code or district level for high-acuity gaps: Oncology, Dialysis, Emergency Trauma, Neonatal ICU, Advanced Surgery
- Toggle specialty; click a region to see what's missing and the nearest qualifying facility

### 5. Agent Chain-of-Thought Viewer
- For any search or scoring decision, view the full trace: query → retrieval → extraction steps → validator checks → final answer
- Each step shows model, input, output, and the source rows it touched (Lovable's MLflow-style trace)

### 6. Databricks tab
- Connect-status panel for the Databricks connector
- Toggle: "Use Databricks Vector Search for retrieval" (falls back to Lovable Cloud retrieval when off or unconfigured)
- Field to paste your SQL Warehouse ID + Vector Search endpoint
- Sample query runner that proves the gateway is reachable

## Design

- Clean, clinical, trustworthy: white surfaces, deep indigo primary, accent teal for "verified", amber for "flagged", red for "contradiction"
- Inter font, generous spacing, data-dense but calm
- Every AI-generated claim shows a small "cited" chip linking to source text

## What you'll do after the plan is approved

1. I'll set up Lovable Cloud, the schema, ingestion + AI edge functions, and build all five UI surfaces.
2. I'll wire the Databricks connector — you'll be prompted to connect your workspace when we reach that step.
3. You upload the xlsx and we run a first ingestion together.

## Out of scope (for v1)

- Training your own model on Databricks Agent Bricks (we call Lovable AI; the Databricks tab is the integration seam for when your endpoints exist)
- MLflow server itself (we display a trace UI built on our own logged steps)
- Statistical prediction intervals on conclusions (can be added once base extraction is solid)
