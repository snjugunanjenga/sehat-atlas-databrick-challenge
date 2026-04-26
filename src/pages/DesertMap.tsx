import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import TrustBadge from "@/components/TrustBadge";
import ExportMenu from "@/components/ExportMenu";
import { HIGH_ACUITY, Specialty, desertGaps, FacilitySlim, FacilityDetail, loadDetails } from "@/data/facilities";
import { useFacilities } from "@/hooks/useFacilities";
import { MapPin, AlertTriangle, ArrowRight } from "lucide-react";

const BOUNDS = { minLat: 8, maxLat: 35, minLng: 68, maxLng: 97 };
const W = 720;
const H = 720;

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W;
  const y = H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H;
  return { x, y };
}

interface Tooltip {
  x: number;
  y: number;
  state: string;
  cov: number;
  verified: number;
  total: number;
  topName?: string;
}

export default function DesertMap() {
  const facilities = useFacilities();
  const [params, setParams] = useSearchParams();
  const initialSpecialty = (params.get("specialty") as Specialty) || "Emergency Trauma";
  const [specialty, setSpecialty] = useState<Specialty>(initialSpecialty);
  const [openState, setOpenState] = useState<string | null>(params.get("state"));
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [details, setDetails] = useState<Record<string, FacilityDetail>>({});

  useEffect(() => {
    loadDetails().then(setDetails);
  }, []);

  // Sync URL ↔ state so shared links reopen the right view.
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("specialty", specialty);
    if (openState) next.set("state", openState);
    else next.delete("state");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, openState]);

  const gaps = useMemo(
    () =>
      facilities
        ? desertGaps(facilities)
            .filter((g) => g.specialty === specialty)
            .sort((a, b) => a.coverage - b.coverage)
        : [],
    [facilities, specialty],
  );

  const stateCenters = useMemo(() => {
    if (!facilities) return {};
    const acc: Record<string, { lat: number; lng: number; n: number }> = {};
    for (const f of facilities) {
      if (f.lat == null || f.lng == null) continue;
      if (!acc[f.state]) acc[f.state] = { lat: 0, lng: 0, n: 0 };
      acc[f.state].lat += f.lat;
      acc[f.state].lng += f.lng;
      acc[f.state].n += 1;
    }
    const out: Record<string, { lat: number; lng: number; n: number }> = {};
    for (const k of Object.keys(acc))
      out[k] = { lat: acc[k].lat / acc[k].n, lng: acc[k].lng / acc[k].n, n: acc[k].n };
    return out;
  }, [facilities]);

  const coverageByState: Record<string, number> = {};
  for (const g of gaps) coverageByState[g.state] = g.coverage;

  // Top facilities per state for the active specialty (used by tooltip & drill-down).
  const topByState = useMemo(() => {
    if (!facilities) return {};
    const m: Record<string, FacilitySlim[]> = {};
    for (const f of facilities) {
      if (!f.evidenced.includes(specialty)) continue;
      (m[f.state] ??= []).push(f);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => b.trust - a.trust - (b.contraN - a.contraN) * 5).splice(20);
    }
    return m;
  }, [facilities, specialty]);

  function colorFor(coverage: number) {
    if (coverage < 0.05) return "hsl(var(--contradicted))";
    if (coverage < 0.2) return "hsl(var(--flagged))";
    return "hsl(var(--verified))";
  }

  if (!facilities) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading 10,000 facility records…
      </div>
    );
  }

  const sampled =
    facilities.length > 3000
      ? facilities.filter((_, i) => i % Math.ceil(facilities.length / 2500) === 0)
      : facilities;

  const drillTop = openState ? topByState[openState] ?? [] : [];

  const exportRows = drillTop.slice(0, 10).map((f) => ({
    facility: f,
    detail: details[f.id],
  }));

  return (
    <div>
      <PageHeader
        title="Medical Desert Map"
        description="Verified-coverage gaps across India by specialty. Click any state bubble for the top facilities."
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {HIGH_ACUITY.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={specialty === s ? "default" : "outline"}
                  onClick={() => setSpecialty(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="relative w-full overflow-hidden rounded-md border bg-gradient-to-br from-muted/40 to-background">
                <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full">
                  {sampled.map((f) => {
                    if (f.lat == null || f.lng == null) return null;
                    const { x, y } = project(f.lat, f.lng);
                    const has = f.evidenced.includes(specialty) && f.trust >= 70;
                    return (
                      <circle
                        key={f.id}
                        cx={x}
                        cy={y}
                        r={has ? 2.5 : 1.2}
                        fill={has ? "hsl(var(--verified))" : "hsl(var(--muted-foreground))"}
                        fillOpacity={has ? 0.95 : 0.25}
                      />
                    );
                  })}
                  {Object.entries(stateCenters)
                    .filter(([, c]) => c.n >= 30)
                    .map(([state, c]) => {
                      const cov = coverageByState[state] ?? 0;
                      const { x, y } = project(c.lat, c.lng);
                      const radius = 18 + Math.min(38, c.n / 30) + (1 - Math.min(cov * 5, 1)) * 18;
                      const top = topByState[state]?.[0];
                      return (
                        <g
                          key={state}
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            setTooltip({
                              x,
                              y,
                              state,
                              cov,
                              verified: gaps.find((g) => g.state === state)?.verifiedFacilities ?? 0,
                              total: c.n,
                              topName: top?.name,
                            })
                          }
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => setOpenState(state)}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={radius}
                            fill={colorFor(cov)}
                            fillOpacity={openState === state ? 0.32 : 0.16}
                            stroke={colorFor(cov)}
                            strokeWidth={openState === state ? 2.4 : 1.4}
                          />
                          <text x={x} y={y - radius - 4} textAnchor="middle" className="fill-foreground pointer-events-none" fontSize="11" fontWeight="600">
                            {state}
                          </text>
                          <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground pointer-events-none" fontSize="11" fontWeight="700">
                            {(cov * 100).toFixed(0)}%
                          </text>
                        </g>
                      );
                    })}
                </svg>

                {tooltip && (
                  <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
                    style={{
                      left: `${(tooltip.x / W) * 100}%`,
                      top: `${(tooltip.y / H) * 100}%`,
                      marginTop: "-12px",
                    }}
                  >
                    <div className="font-semibold">{tooltip.state}</div>
                    <div className="text-muted-foreground">
                      {(tooltip.cov * 100).toFixed(1)}% coverage · {tooltip.verified}/{tooltip.total}
                    </div>
                    {tooltip.topName && <div className="mt-1 text-muted-foreground">Top: {tooltip.topName}</div>}
                    <div className="mt-1 text-primary">Click to drill down →</div>
                  </div>
                )}

                <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-md border bg-card/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
                  <Legend color="hsl(var(--contradicted))" label="<5%" />
                  <Legend color="hsl(var(--flagged))" label="5–20%" />
                  <Legend color="hsl(var(--verified))" label=">20%" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-contradicted" /> Worst gaps for {specialty}
              </h3>
              <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {gaps.slice(0, 15).map((g) => (
                  <button
                    key={g.state}
                    onClick={() => setOpenState(g.state)}
                    className="flex w-full items-center justify-between border-b pb-2 last:border-0 last:pb-0 text-sm hover:text-primary"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{g.state}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tabular-nums">{(g.coverage * 100).toFixed(1)}%</div>
                      <div className="text-[11px] text-muted-foreground">
                        {g.verifiedFacilities}/{g.totalFacilities}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={!!openState} onOpenChange={(o) => !o && setOpenState(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {openState && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle>{openState}</SheetTitle>
                    <SheetDescription>
                      Top facilities with evidenced {specialty} ·{" "}
                      {((coverageByState[openState] ?? 0) * 100).toFixed(1)}% verified coverage
                    </SheetDescription>
                  </div>
                  <ExportMenu
                    rows={exportRows}
                    meta={{
                      title: `${openState} — ${specialty} drill-down`,
                      subtitle: `Top ${exportRows.length} facilities with evidenced ${specialty}`,
                    }}
                    filenameBase={`sehat-${openState.toLowerCase().replace(/\s+/g, "-")}-${specialty.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                </div>
              </SheetHeader>
              <div className="mt-5 space-y-2">
                {drillTop.length === 0 && (
                  <p className="rounded-md border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                    No facilities in {openState} with evidenced {specialty}. This is a medical desert.
                  </p>
                )}
                {drillTop.slice(0, 10).map((f) => (
                  <div key={f.id} className="rounded-md border p-3 text-sm hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{f.name}</span>
                          <TrustBadge score={f.trust} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {f.district || "—"}
                          {f.beds ? ` · ${f.beds} beds` : ""}
                          {f.open247 ? " · 24/7" : ""}
                          {f.contraN ? ` · ${f.contraN} flag${f.contraN > 1 ? "s" : ""}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {f.evidenced.slice(0, 4).map((s) => (
                            <Badge key={s} variant="secondary" className="font-normal">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="shrink-0">
                        <Link to={`/trust?focus=${f.id}`}>
                          View <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
