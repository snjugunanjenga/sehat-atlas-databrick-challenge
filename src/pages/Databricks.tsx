import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle2, AlertCircle, Loader2, XCircle } from "lucide-react";
import { useDataSource } from "@/data/dataSource";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Status {
  connected: boolean;
  outcome?: string;
  latency_ms?: number;
  error?: string;
}

export default function Databricks() {
  const [source, setSource] = useDataSource();
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refresh = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("databricks-status");
      if (error) throw error;
      setStatus(data as Status);
    } catch (e) {
      setStatus({ connected: false, error: e instanceof Error ? e.message : "Function not deployed yet" });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, []);

  const onToggle = (on: boolean) => {
    if (on && !status?.connected) {
      toast.error("Connect Databricks first.");
      return;
    }
    setSource(on ? "databricks" : "local");
    toast.success(on ? "Routing queries through Databricks" : "Using local index");
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("databricks-search", {
        body: { query: "Cardiology hospitals in Maharashtra" },
      });
      if (error) throw error;
      setTestResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setTestResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setTesting(false);
    }
  };

  // Setup checklist — three things must be true to flip the toggle.
  const checks = [
    { label: "Databricks connector linked", ok: !!status && !status.error?.includes("not linked") },
    { label: "DATABRICKS_WAREHOUSE_ID configured", ok: !status?.error?.includes("WAREHOUSE_ID") },
    { label: "Connection verified by gateway", ok: !!status?.connected },
  ];

  return (
    <div>
      <PageHeader
        title="Databricks Integration"
        description="Run retrieval and reasoning against your Databricks workspace via the Lovable connector gateway."
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold">Workspace status</h3>
                  <StatusBadge status={status} checking={checking} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once verified, Facility Search and Trust Scorer route through your Databricks SQL Warehouse. Token refresh and credential storage are handled automatically — no API keys leak to the browser.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button onClick={refresh} variant="outline" size="sm" disabled={checking}>
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Re-check status
                  </Button>
                  {status?.error && (
                    <span className="text-xs text-muted-foreground">{status.error}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold">Setup checklist</h3>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-verified" />
                  ) : (
                    <XCircle className="h-4 w-4 text-contradicted" />
                  )}
                  <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <Label htmlFor="db-toggle" className="text-sm font-semibold">
                Use Databricks for queries
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                When on, Facility Search and Trust Scorer hit your Databricks SQL Warehouse. When off, they use the local precomputed index.
              </p>
            </div>
            <Switch
              id="db-toggle"
              checked={source === "databricks"}
              onCheckedChange={onToggle}
              disabled={!status?.connected}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Capability title="SQL Warehouse" desc="Live now. Powers Search & Trust Scorer via parameterized SQL through the gateway." />
          <Capability title="Vector Search" desc="Drop-in replacement for retrieval — proxy ready, swap the SQL call for /vector-search/index/{name}/query." />
          <Capability title="Agent Bricks" desc="Call your trained extraction model for structured pull from new facility notes." />
        </div>

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Live test query</h3>
              <Button size="sm" onClick={runTest} disabled={testing || !status?.connected}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Run sample query
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sends <code className="rounded bg-muted px-1 py-px">"Cardiology hospitals in Maharashtra"</code> through the gateway and shows the raw response.
            </p>
            {testResult && (
              <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-[11px]">{testResult}</pre>
            )}
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
  "statement": "SELECT state, COUNT(*) FROM facilities WHERE array_contains(evidenced, 'Oncology') GROUP BY state",
  "wait_timeout": "30s"
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status, checking }: { status: Status | null; checking: boolean }) {
  if (checking) return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</Badge>;
  if (!status) return null;
  if (status.connected)
    return (
      <Badge className="bg-verified text-verified-foreground hover:bg-verified">
        <CheckCircle2 className="h-3 w-3" /> Connected{status.latency_ms ? ` · ${status.latency_ms} ms` : ""}
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-flagged/40 text-flagged">
      <AlertCircle className="h-3 w-3" /> Not connected
    </Badge>
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
