import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TrustBadge from "@/components/TrustBadge";
import QueryHistory from "@/components/QueryHistory";
import ExportMenu from "@/components/ExportMenu";
import { FacilityDetail, loadDetails } from "@/data/facilities";
import { searchFacilities, useDataSource, type SearchResult } from "@/data/dataSource";
import { pushHistory, useQueryHistory, type HistoryEntry } from "@/hooks/useQueryHistory";
import { ChevronDown, MapPin, Search, Sparkles, Quote, Map as MapIcon } from "lucide-react";
import { Link } from "react-router-dom";

const SUGGESTIONS = [
  "Emergency trauma hospital in rural Bihar",
  "Dialysis centres in Tamil Nadu open 24/7",
  "Cancer treatment facilities in Maharashtra",
  "Maternity hospital in Kerala",
  "Cardiology in Delhi",
];

export default function FacilitySearch() {
  const [source] = useDataSource();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, FacilityDetail>>({});
  const history = useQueryHistory();

  useEffect(() => {
    loadDetails().then(setDetails);
  }, []);

  const onSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setQuery(q);
    try {
      const res = await searchFacilities(q);
      setResult(res);
      pushHistory(res);
    } finally {
      setLoading(false);
    }
  };

  const onOpenSnapshot = (h: HistoryEntry) => {
    setQuery(h.query);
    setResult(h.snapshot);
  };

  const exportRows = result
    ? result.matches.map((m) => ({
        facility: m.facility,
        detail: details[m.facility.id],
        reasons: m.reasons,
      }))
    : [];

  return (
    <div>
      <PageHeader
        title="Facility Search"
        description="Ask in plain English. The agent retrieves, scores, validates, and cites every claim across 10,000 Indian facilities."
        actions={
          <ExportMenu
            rows={exportRows}
            meta={{
              title: "Facility Search Results",
              query: result?.query,
              source: result?.source === "databricks" ? "Databricks" : "Local index",
            }}
            filenameBase="sehat-search"
            disabled={!result}
          />
        }
      />
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
              <Button type="submit" disabled={loading} size="lg">
                {loading ? "Reasoning..." : "Ask agent"}
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">via</span>
              <Badge variant={source === "databricks" ? "default" : "secondary"}>
                {source === "databricks" ? "Databricks" : "Local index"}
              </Badge>
              <span className="mx-2 text-muted-foreground">·</span>
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
          </CardContent>
        </Card>

        <QueryHistory items={history} onRerun={(h) => onSearch(h.query)} onOpenSnapshot={onOpenSnapshot} />

        {result && (
          <>
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Agent answer</p>
                    <Badge variant="outline" className="text-[10px] uppercase">{result.source}</Badge>
                  </div>
                  <p
                    className="mt-1 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{
                      __html: result.answer.replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>"),
                    }}
                  />
                  <Link
                    to="/trace"
                    state={{ result }}
                    className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  >
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
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{facility.name}</h3>
                              <TrustBadge score={facility.trust} />
                              <Badge variant="outline" className="text-[10px] uppercase">{facility.facilityType}</Badge>
                            </div>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" /> {facility.district || "—"}, {facility.state}
                              {facility.pin && <> · PIN {facility.pin}</>}
                              {facility.beds && <> · {facility.beds} beds</>}
                              {facility.open247 && <> · 24/7</>}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="text-xs" asChild>
                              <Link to={`/map?state=${encodeURIComponent(facility.state)}`} title="View on map">
                                <MapIcon className="h-3 w-3" />
                                Map
                              </Link>
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-xs">
                                Why? <ChevronDown className="h-3 w-3" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {reasons.slice(0, 6).map((r) => (
                            <Badge key={r} variant="secondary" className="font-normal">{r}</Badge>
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
      </div>
    </div>
  );
}
