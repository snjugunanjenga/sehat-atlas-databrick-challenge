import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HIGH_ACUITY, Specialty, desertGaps } from "@/data/facilities";
import { useFacilities } from "@/hooks/useFacilities";
import { MapPin, AlertTriangle } from "lucide-react";

const BOUNDS = { minLat: 8, maxLat: 35, minLng: 68, maxLng: 97 };
const W = 720;
const H = 720;

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W;
  const y = H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H;
  return { x, y };
}

export default function DesertMap() {
  const facilities = useFacilities();
  const [specialty, setSpecialty] = useState<Specialty>("Emergency Trauma");

  const gaps = useMemo(
    () => (facilities ? desertGaps(facilities).filter((g) => g.specialty === specialty).sort((a, b) => a.coverage - b.coverage) : []),
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
    for (const k of Object.keys(acc)) out[k] = { lat: acc[k].lat / acc[k].n, lng: acc[k].lng / acc[k].n, n: acc[k].n };
    return out;
  }, [facilities]);

  const coverageByState: Record<string, number> = {};
  for (const g of gaps) coverageByState[g.state] = g.coverage;

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

  // Sample down facility dots for performance
  const sampled = facilities.length > 3000
    ? facilities.filter((_, i) => i % Math.ceil(facilities.length / 2500) === 0)
    : facilities;

  return (
    <div>
      <PageHeader title="Medical Desert Map" description="Verified-coverage gaps across India by specialty. Red = critical desert." />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {HIGH_ACUITY.map((s) => (
                <Button key={s} size="sm" variant={specialty === s ? "default" : "outline"} onClick={() => setSpecialty(s)}>
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
                      return (
                        <g key={state}>
                          <circle cx={x} cy={y} r={radius} fill={colorFor(cov)} fillOpacity={0.16} stroke={colorFor(cov)} strokeWidth={1.4} />
                          <text x={x} y={y - radius - 4} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">
                            {state}
                          </text>
                          <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="700">
                            {(cov * 100).toFixed(0)}%
                          </text>
                        </g>
                      );
                    })}
                </svg>
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
                  <div key={g.state} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 text-sm">
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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
