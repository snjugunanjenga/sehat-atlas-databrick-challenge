import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Docs() {
  return (
    <div>
      <PageHeader
        title="Documentation"
        description="Architecture, scoring formulas, and integration reference for Sehat Atlas."
      />
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <Section title="What is Sehat Atlas?">
          <p>
            Sehat Atlas is the reasoning layer for Indian healthcare. It ingests 10,000+ unstructured facility records,
            extracts evidenced services, computes trust scores, flags contradictions, and surfaces medical-desert gaps —
            all queryable in plain English.
          </p>
        </Section>

        <Section title="Five surfaces">
          <Table
            rows={[
              ["Overview", "KPIs, top deserts, agent activity, specialty coverage."],
              ["Facility Search", "Natural-language query → ranked, cited matches."],
              ["Trust Scorer", "Sortable table of every facility with validator flags."],
              ["Desert Map", "India choropleth by specialty with click-to-drill-down."],
              ["Agent Traces", "Step-by-step view of the agent's chain of thought."],
              ["Databricks", "Live status, toggle, and sample query runner."],
            ]}
          />
        </Section>

        <Section title="Architecture">
          <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-[11px] leading-snug">{`
   React UI ─► dataSource.ts ─┬─► /public/data (local JSON)
                              │
                              └─► Edge Functions
                                    └─► Lovable Gateway
                                          └─► Databricks Workspace
                                                ├─ SQL Warehouse  ✅
                                                ├─ Vector Search  (ready)
                                                └─ Agent Bricks   (ready)
`}</pre>
          <p>
            The frontend never holds gateway credentials. All Databricks calls go through{" "}
            <Code>supabase/functions/databricks-*</Code> which inject{" "}
            <Code>X-Connection-Api-Key</Code> server-side.
          </p>
        </Section>

        <Section title="Agent pipeline">
          <ol className="list-decimal space-y-1 pl-5">
            <li><b>Reasoner</b> parses intent — states, specialties, rural / 24-7 / hospital flags.</li>
            <li><b>Retriever</b> filters the 10k corpus (or proxies SQL to Databricks).</li>
            <li><b>Scorer</b> ranks: <Code>+30 evidenced, +6 claimed, +10 24-7, +0.25×trust, −5×contradictions</Code>.</li>
            <li><b>Validator</b> cross-checks against medical-standards rules (e.g. surgery requires anaesthesia).</li>
            <li><b>Reasoner</b> synthesises the final cited answer.</li>
          </ol>
          <p>Every step is rendered in <Code>/trace</Code> with model, input, output, and source rows.</p>
        </Section>

        <Section title="Trust scoring formula">
          <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-[11px]">{`score = 100
       − 22  per HIGH-severity contradiction
       − 12  per MEDIUM
       −  5  per LOW
       −  3  per claimed-but-unevidenced specialty
       −  5  if no description
       −  6  if hospital with no equipment listed
score = clamp(score, 15, 100)`}</pre>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge className="bg-verified text-verified-foreground hover:bg-verified">High 80–100</Badge>
            <Badge className="bg-flagged text-flagged-foreground hover:bg-flagged">Medium 55–79</Badge>
            <Badge className="bg-contradicted text-contradicted-foreground hover:bg-contradicted">Low 15–54</Badge>
          </div>
        </Section>

        <Section title="Contradiction rules">
          <Table
            rows={[
              ["Claims Advanced Surgery, no anaesthesiologist", "HIGH"],
              ["Claims Oncology, no oncologist", "HIGH"],
              ["Claims Dialysis, no dialysis machine", "MEDIUM"],
              ["Claims Neonatal ICU, no incubator or neonatologist", "MEDIUM"],
              ["Claims Emergency Trauma, no ICU bed or ventilator", "LOW"],
            ]}
          />
        </Section>

        <Section title="Databricks setup">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Link the Databricks connector via the Connectors panel.</li>
            <li>Add runtime secrets <Code>DATABRICKS_WAREHOUSE_ID</Code> and <Code>DATABRICKS_FACILITIES_TABLE</Code>.</li>
            <li>Visit <Code>/databricks</Code> — confirm the green "Connected" badge.</li>
            <li>Flip the toggle. Search & Trust Scorer route through your warehouse.</li>
          </ol>
          <p className="text-muted-foreground">Falls back to local index automatically on any gateway error.</p>
        </Section>

        <Section title="Expected table schema">
          <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-[11px]">{`CREATE TABLE main.sehat.facilities (
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
);`}</pre>
        </Section>

        <Section title="Sample gateway call">
          <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-[11px]">{`POST https://connector-gateway.lovable.dev/databricks/2.0/sql/statements
Authorization: Bearer \${LOVABLE_API_KEY}
X-Connection-Api-Key: \${DATABRICKS_API_KEY}

{
  "warehouse_id": "...",
  "statement": "SELECT state, COUNT(*) FROM facilities WHERE array_contains(evidenced, 'Oncology') GROUP BY state",
  "wait_timeout": "30s"
}`}</pre>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-6 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-px font-mono text-[12px]">{children}</code>;
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a} className="border-b last:border-0">
              <td className="bg-muted/40 px-3 py-2 font-medium text-foreground">{a}</td>
              <td className="px-3 py-2">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
