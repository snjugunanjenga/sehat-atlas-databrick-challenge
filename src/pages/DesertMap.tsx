import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FACILITIES, SPECIALTIES, Specialty, desertGaps } from "@/data/facilities";
import { MapPin, AlertTriangle } from "lucide-react";

// India bounding box for naive lat/lng → SVG projection.
const BOUNDS = { minLat: 8, maxLat: 35, minLng: 68, maxLng: 97 };
const W = 720;
const H = 720;

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W;
  const y = H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H;
  return { x, y };
}

export default function DesertMap() {
  const [specialty, setSpecialty] = useState<Specialty>("Emergency Trauma");

  const gaps = useMemo(
    () =>
      desertGaps()
        .filter((g) => g.specialty === specialty && g.totalFacilities >= 3)
        .sort((a, b) => a.coverage - b.coverage),
    [specialty],
  );

  // Compute average lat/lng per state for label placement.
  const stateCenters = useMemo(() => {
    const acc: Record<string, { lat: number; lng: number; n: number }> = {};
    for (const f of FACILITIES) {
      if (!acc[f.state]) acc[f.state] = { lat: 0, lng: 0, n: 0 };
      acc[f.state].lat += f.lat;
      acc[f.state].lng += f.lng;
      acc[f.state].n += 1;
    }
    const out: Record<string, { lat: number; lng: number }> = {};
    for (const k of Object.keys(acc)) out[k] = { lat: acc[k].lat / acc[k].n, lng: acc[k].lng / acc[k].n };
    return out;
  }, []);

  const coverageByState: Record<string, number> = {};
  for (const g of gaps) coverageByState[g.state] = g.coverage;

  function colorFor(coverage: number) {
    // 0 → red, 0.5 → amber, 1 → teal
    if (coverage < 0.2) return "hsl(var(--contradicted))";
    if (coverage < 0.5) return "hsl(var(--flagged))";
    return "hsl(var(--verified))";
  }

  return (
    <div>
      <PageHeader
        title="Medical Desert Map"
        description="Verified-coverage gaps across India by specialty. Red = critical desert."
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
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
                  {/* State coverage circles */}
                  {Object.entries(stateCenters).map(([state, c]) => {
                    const cov = coverageByState[state] ?? 0;
                    const { x, y } = project(c.lat, c.lng);
                    const radius = 28 + (1 - cov) * 30;
                    return (
                      <g key={state}>
                        <circle cx={x} cy={y} r={radius} fill={colorFor(cov)} fillOpacity={0.18} stroke={colorFor(cov)} strokeWidth={1.5} />
                        <text x={x} y={y - radius - 6} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="600">
                          {state}
                        </text>
                        <text x={x} y={y + 4} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="700">
                          {Math.round(cov * 100)}%
                        </text>
                      </g>
                    );
                  })}
                  {/* Facility dots */}
                  {FACILITIES.map((f) => {
                    const { x, y } = project(f.lat, f.lng);
                    const has = f.evidencedServices.includes(specialty) && f.trustScore >= 70;
                    return (
                      <circle
                        key={f.id}
                        cx={x}
                        cy={y}
                        r={has ? 2.5 : 1.5}
                        fill={has ? "hsl(var(--verified))" : "hsl(var(--muted-foreground))"}
                        fillOpacity={has ? 0.95 : 0.35}
                      />
                    );
                  })}
                </svg>
                <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-md border bg-card/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
                  <Legend color="hsl(var(--contradicted))" label="<20%" />
                  <Legend color="hsl(var(--flagged))" label="20–50%" />
                  <Legend color="hsl(var(--verified))" label=">50%" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-contradicted" /> Worst gaps for {specialty}
              </h3>
              <div className="mt-4 space-y-3">
                {gaps.slice(0, 8).map((g) => (
                  <div key={g.state} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{g.state}</span>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums">{Math.round(g.coverage * 100)}%</div>
                      <div className="text-[11px] text-muted-foreground">
                        {g.verifiedFacilities}/{g.totalFacilities} verified
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
