import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TrustBadge from "@/components/TrustBadge";
import { runAgent, AgentResult } from "@/data/agent";
import { FacilityDetail, loadDetails } from "@/data/facilities";
import { useFacilities } from "@/hooks/useFacilities";
import { ChevronDown, MapPin, Search, Sparkles, Quote } from "lucide-react";
import { Link } from "react-router-dom";

const SUGGESTIONS = [
  "Emergency trauma hospital in rural Bihar",
  "Dialysis centres in Tamil Nadu open 24/7",
  "Cancer treatment facilities in Maharashtra",
  "Maternity hospital in Kerala",
  "Cardiology in Delhi",
];

export default function FacilitySearch() {
  const facilities = useFacilities();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, FacilityDetail>>({});

  useEffect(() => {
    loadDetails().then(setDetails);
  }, []);

  const onSearch = (q: string) => {
    if (!q.trim() || !facilities) return;
    setLoading(true);
    setQuery(q);
    setTimeout(() => {
      setResult(runAgent(q, facilities));
      setLoading(false);
    }, 300);
  };

  return (
    <div>
      <PageHeader title="Facility Search" description="Ask in plain English. The agent retrieves, scores, validates, and cites every claim across 10,000 Indian facilities." />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(query);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. dialysis centres in rural Tamil Nadu open 24/7"
                  className="h-11 pl-9"
                />
              </div>
              <Button type="submit" disabled={loading || !facilities} size="lg">
                {loading ? "Reasoning..." : "Ask agent"}
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSearch(s)}
                  className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            {!facilities && <p className="mt-3 text-xs text-muted-foreground">Loading dataset…</p>}
          </CardContent>
        </Card>

        {result && (
          <>
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Agent answer</p>
                  <p
                    className="mt-1 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: result.answer.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }}
                  />
                  <Link to="/trace" state={{ result }} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                    View chain of thought ({result.trace.length} steps) →
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {result.matches.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No facilities matched. Try a broader query.
                  </CardContent>
                </Card>
              )}
              {result.matches.map(({ facility, reasons }) => {
                const d = details[facility.id];
                return (
                  <Collapsible key={facility.id} asChild>
                    <Card>
                      <CardContent className="space-y-3 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{facility.name}</h3>
                              <TrustBadge score={facility.trust} />
                              <Badge variant="outline" className="text-[10px] uppercase">{facility.facilityType}</Badge>
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {facility.district || "—"}, {facility.state}
                              {facility.pin && <> · PIN {facility.pin}</>}
                              {facility.beds && <> · {facility.beds} beds</>}
                              {facility.open247 && <> · 24/7</>}
                            </p>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs">
                              Why this result? <ChevronDown className="h-3 w-3" />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {reasons.slice(0, 6).map((r) => (
                            <Badge key={r} variant="secondary" className="font-normal">
                              {r}
                            </Badge>
                          ))}
                        </div>
                        <CollapsibleContent className="space-y-3 border-t pt-3">
                          {d?.description && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source description</p>
                              <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cited evidence</p>
                            <div className="mt-2 space-y-2">
                              {(!d || d.citations.length === 0) && (
                                <p className="text-xs italic text-muted-foreground">No structured citations extracted.</p>
                              )}
                              {d?.citations.map((c, i) => (
                                <div key={i} className="rounded-md border-l-2 border-primary bg-muted/40 p-2.5">
                                  <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">{c.field}</div>
                                  <p className="mt-0.5 flex gap-1.5 text-xs">
                                    <Quote className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span>{c.text}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {d?.contradictions && d.contradictions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-contradicted">Validator flags</p>
                              <ul className="mt-2 space-y-1 text-xs">
                                {d.contradictions.map((c, i) => (
                                  <li key={i} className="text-muted-foreground">
                                    <span className="font-medium text-foreground">{c.claim}</span> — {c.evidence}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </>
        )}

        {!result && facilities && (
          <Card>
            <CardContent className="p-12 text-center text-sm text-muted-foreground">
              Ask anything about the {facilities.length.toLocaleString()} indexed facilities — capability, location, staffing, or trust.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
