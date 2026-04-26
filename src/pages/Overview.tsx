import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FACILITIES, SPECIALTIES, desertGaps, trustBand } from "@/data/facilities";
import { AlertTriangle, Building2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function Overview() {
  const total = FACILITIES.length;
  const trusted = FACILITIES.filter((f) => trustBand(f.trustScore) === "high").length;
  const contradictions = FACILITIES.reduce((n, f) => n + f.contradictions.length, 0);
  const pins = new Set(FACILITIES.map((f) => f.pin)).size;

  const gaps = desertGaps()
    .filter((g) => g.totalFacilities >= 5)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 5);

  const recent = [
    { agent: "Extractor", text: "Re-parsed 12 facility notes for NICU evidence", time: "2m ago" },
    { agent: "Validator", text: "Flagged 3 facilities claiming Oncology with no oncologist", time: "8m ago" },
    { agent: "Scorer", text: "Recomputed trust scores after dataset refresh", time: "21m ago" },
    { agent: "Retriever", text: "Indexed 240 facilities into vector store", time: "1h ago" },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Live state of the agentic healthcare intelligence layer across India."
      />
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Building2} label="Facilities ingested" value={total.toLocaleString()} sub="of 10,000 target" />
          <Kpi icon={ShieldCheck} label="High-trust (≥80)" value={`${Math.round((trusted / total) * 100)}%`} sub={`${trusted} facilities verified`} accent="verified" />
          <Kpi icon={AlertTriangle} label="Contradictions flagged" value={contradictions.toString()} sub="by validator agent" accent="flagged" />
          <Kpi icon={MapPin} label="PIN codes covered" value={pins.toString()} sub="across 10 states" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Top medical deserts
              </CardTitle>
              <p className="text-xs text-muted-foreground">Lowest verified-coverage state × specialty pairs.</p>
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
                  <Progress value={g.coverage * 100} className="h-1.5" />
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
            <CardTitle className="text-base">Specialty coverage across India</CardTitle>
            <p className="text-xs text-muted-foreground">Share of facilities with verified evidence per specialty.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {SPECIALTIES.map((sp) => {
                const evidenced = FACILITIES.filter((f) => f.evidencedServices.includes(sp)).length;
                const pct = Math.round((evidenced / total) * 100);
                return (
                  <div key={sp} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span>{sp}</span>
                      <span className="tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
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
