import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { runAgent, AgentResult, TraceStep } from "@/data/agent";
import { Bot, Database, GitBranch, Search, Shield, Sparkles, Timer } from "lucide-react";

const AGENT_ICONS: Record<TraceStep["agent"], React.ComponentType<{ className?: string }>> = {
  Retriever: Database,
  Extractor: Search,
  Reasoner: Sparkles,
  Validator: Shield,
  Scorer: Bot,
};

const AGENT_COLORS: Record<TraceStep["agent"], string> = {
  Retriever: "text-primary bg-primary/10 border-primary/20",
  Extractor: "text-primary bg-primary/10 border-primary/20",
  Reasoner: "text-verified bg-verified/10 border-verified/20",
  Validator: "text-flagged bg-flagged/10 border-flagged/30",
  Scorer: "text-primary bg-primary/10 border-primary/20",
};

export default function AgentTrace() {
  const location = useLocation();
  const initial = (location.state as { result?: AgentResult } | null)?.result ?? null;
  const [query, setQuery] = useState(initial?.query ?? "Trauma care in rural Jharkhand with high trust score");
  const [result, setResult] = useState<AgentResult | null>(initial);

  useEffect(() => {
    if (!initial) setResult(runAgent(query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalMs = result?.trace.reduce((n, s) => n + s.ms, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Agent Traces"
        description="Step-by-step view of the agent's chain of thought — what it retrieved, reasoned, validated, and decided."
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setResult(runAgent(query));
              }}
              className="flex gap-2"
            >
              <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-11" />
              <Button size="lg">Run trace</Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <GitBranch className="h-4 w-4" /> {result.trace.length} steps
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-4 w-4" /> {totalMs} ms total
              </span>
            </div>

            <div className="relative space-y-3 pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
              {result.trace.map((step, i) => {
                const Icon = AGENT_ICONS[step.agent];
                return (
                  <div key={step.id} className="relative">
                    <div className={`absolute -left-[18px] top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background ${AGENT_COLORS[step.agent].split(" ")[0]}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${AGENT_COLORS[step.agent]}`}>
                              <Icon className="h-3 w-3" />
                              {step.agent}
                            </span>
                            <span className="text-sm font-medium">
                              {i + 1}. {step.title}
                            </span>
                          </div>
                          <span className="tabular-nums text-xs text-muted-foreground">{step.ms} ms</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{step.detail}</p>
                        {step.sources && step.sources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {step.sources.map((s) => (
                              <span key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Final answer</p>
                  <p
                    className="mt-1 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: result.answer.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
