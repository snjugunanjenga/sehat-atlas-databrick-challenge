import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HIGH_ACUITY, desertGaps, trustBand } from "@/data/facilities";
import { useFacilities } from "@/hooks/useFacilities";
import { AlertTriangle, Building2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function Overview() {
  const facilities = useFacilities();
  if (!facilities) return <Loading />;

  const total = facilities.length;
  const trusted = facilities.filter((f) => trustBand(f.trust) === "high").length;
  const contradictions = facilities.reduce((n, f) => n + f.contraN, 0);
  const pins = new Set(facilities.map((f) => f.pin).filter(Boolean)).size;
  const states = new Set(facilities.map((f) => f.state)).size;
  const hospitals = facilities.filter((f) => f.facilityType === "hospital").length;

  const gaps = desertGaps(facilities)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 6);

  const recent = [
    { agent: "Extractor", text: `Parsed ${total.toLocaleString()} facility records from the VF India dataset`, time: "just now" },
    { agent: "Validator", text: `Flagged ${contradictions} contradictions across ${facilities.filter((f) => f.contraN > 0).length} facilities`, time: "1m ago" },
    { agent: "Scorer", text: `Computed trust scores · ${trusted.toLocaleString()} verified high-trust`, time: "1m ago" },
    { agent: "Retriever", text: `Indexed ${total.toLocaleString()} facilities into in-memory vector store`, time: "2m ago" },
  ];

  return (
    <div>
      <PageHeader title="Overview" description="Live state of the agentic healthcare intelligence layer across India." />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Building2} label="Facilities ingested" value={total.toLocaleString()} sub={`${hospitals.toLocaleString()} hospitals`} />
          <Kpi icon={ShieldCheck} label="High-trust (≥80)" value={`${Math.round((trusted / total) * 100)}%`} sub={`${trusted.toLocaleString()} verified`} accent="verified" />
          <Kpi icon={AlertTriangle} label="Contradictions flagged" value={contradictions.toLocaleString()} sub="by validator agent" accent="flagged" />
          <Kpi icon={MapPin} label="States covered" value={states.toString()} sub={`${pins.toLocaleString()} unique PIN codes`} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Top medical deserts
              </CardTitle>
              <p className="text-xs text-muted-foreground">Lowest verified-coverage state × specialty pairs (states with ≥10 facilities).</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {gaps.map((g) => (
                <div key={g.state + g.specialty} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {g.specialty} <span className="text-muted-foreground">in {g.state}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {g.verifiedFacilities}/{g.totalFacilities} verified · {Math.round(g.coverage * 100)}%
                    </span>
                  </div>
                  <Progress value={Math.max(g.coverage * 100, 1)} className="h-1.5" />
                </div>
              ))}
              <Link to="/map" className="inline-block pt-2 text-xs font-medium text-primary hover:underline">
                Open desert map →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Agent activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recent.map((r, i) => (
                <div key={i} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <span className="mt-0.5 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    {r.agent}
                  </span>
                  <div className="flex-1 text-sm">
                    <p className="leading-snug">{r.text}</p>
                    <p className="text-xs text-muted-foreground">{r.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">High-acuity coverage across India</CardTitle>
            <p className="text-xs text-muted-foreground">Share of all facilities with verified evidence per specialty.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {HIGH_ACUITY.map((sp) => {
                const evidenced = facilities.filter((f) => f.evidenced.includes(sp)).length;
                const pct = (evidenced / total) * 100;
                return (
                  <div key={sp} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{sp}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {evidenced.toLocaleString()} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.max(pct, 0.5)} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
      Loading 10,000 facility records…
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent?: "verified" | "flagged";
}) {
  const accentClass = accent === "verified" ? "text-verified" : accent === "flagged" ? "text-flagged" : "text-primary";
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accentClass}`} />
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
