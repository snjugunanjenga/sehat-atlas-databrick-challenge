import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Database, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Databricks() {
  return (
    <div>
      <PageHeader
        title="Databricks Integration"
        description="Run retrieval and reasoning against your Databricks workspace — Vector Search, Agent Bricks, and SQL Warehouses."
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Connect your Databricks workspace</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once connected, the agent can route retrieval to your Mosaic AI Vector Search index, run SQL against your Unity Catalog, and call Agent Bricks endpoints — all proxied through the Lovable connector gateway.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button>Connect Databricks</Button>
                  <span className="text-xs text-muted-foreground">Status: not connected</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Capability title="Vector Search" desc="Route facility retrieval to Mosaic AI Vector Search for sub-100 ms semantic search across the full 10k corpus." />
          <Capability title="SQL Warehouse" desc="Run analytical SQL on Unity Catalog tables for desert detection at PIN-code granularity." />
          <Capability title="Agent Bricks" desc="Call your trained extraction model for structured pull from messy facility notes." />
        </div>

        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="text-sm font-semibold">How it works</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <Step n={1}>This frontend runs against an in-memory index built from the VF India dataset (10,000 rows).</Step>
              <Step n={2}>When Databricks is connected, an edge function proxies queries to your workspace via the gateway, with secure token refresh handled automatically.</Step>
              <Step n={3}>Toggle individual subsystems (Vector Search, SQL Warehouse, Agent Bricks) on/off — the app falls back to the local index when off.</Step>
              <Step n={4}>Every call is recorded as a trace step in the Agent Traces view, just like MLflow 3 tracing.</Step>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold">Sample gateway call</h3>
            <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-4 text-xs">
{`POST https://connector-gateway.lovable.dev/databricks/2.0/sql/statements
Authorization: Bearer \${LOVABLE_API_KEY}
X-Connection-Api-Key: \${DATABRICKS_API_KEY}

{
  "warehouse_id": "<your-warehouse-id>",
  "statement": "SELECT state, COUNT(*) FROM facilities WHERE evidenced_oncology GROUP BY state",
  "wait_timeout": "30s"
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Capability({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-verified" />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{n}</span>
      <span className="flex-1 pt-0.5">{children}</span>
    </li>
  );
}
