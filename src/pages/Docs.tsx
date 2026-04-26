import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Docs() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <div>
      <PageHeader
        title="Documentation"
        description="Architecture, scoring formulas, and integration reference for Sehat Atlas."
      />
      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <div className="sticky top-0 z-10 -mx-2 bg-background/80 px-2 py-2 backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs — try 'trust scoring', 'schema', 'pipeline'…"
              className="pl-9 pr-9"
              aria-label="Search documentation"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {q && (
            <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
              <span>Quick jump:</span>
              {["Trust scoring formula", "Expected table schema", "Agent pipeline", "Contradiction rules", "Architecture"].map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="rounded border bg-muted/50 px-1.5 py-0.5 hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <SearchableArea query={q}>
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
        </SearchableArea>
      </div>
    </div>
  );
}

function SearchableArea({ query, children }: { query: string; children: React.ReactNode }) {
  const sections = useMemo(() => {
    const arr = Array.isArray(children) ? children : [children];
    if (!query) return { nodes: arr, matches: arr.length, total: arr.length };
    const filtered = arr.filter((child: any) => {
      if (!child || typeof child !== "object") return false;
      const title: string = child.props?.title ?? "";
      const text = extractText(child).toLowerCase();
      return title.toLowerCase().includes(query) || text.includes(query);
    });
    return { nodes: filtered, matches: filtered.length, total: arr.length };
  }, [children, query]);

  return (
    <div className="space-y-6">
      {query && (
        <p className="text-xs text-muted-foreground">
          {sections.matches} of {sections.total} sections match "{query}"
        </p>
      )}
      {sections.nodes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No sections match. Try "trust", "schema", "pipeline", "contradiction", or "databricks".
          </CardContent>
        </Card>
      ) : (
        sections.nodes
      )}
    </div>
  );
}

function extractText(node: any): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && node.props) {
    let s = "";
    if (node.props.title) s += " " + node.props.title;
    if (node.props.rows) s += " " + JSON.stringify(node.props.rows);
    if (node.props.children) s += " " + extractText(node.props.children);
    return s;
  }
  return "";
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
