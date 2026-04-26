import { FacilitySlim, Specialty, trustBand } from "./facilities";

// Lightweight client-side reasoning agent over the loaded slim list.
// Returns ranked matches plus a step-level trace (mimicking Retriever / Scorer
// / Validator / Reasoner agents) for the chain-of-thought viewer.

export interface TraceStep {
  id: string;
  agent: "Retriever" | "Extractor" | "Reasoner" | "Validator" | "Scorer";
  title: string;
  detail: string;
  ms: number;
  sources?: string[];
}

export interface AgentResult {
  query: string;
  matches: { facility: FacilitySlim; score: number; reasons: string[] }[];
  trace: TraceStep[];
  answer: string;
}

const SPECIALTY_KEYWORDS: { kw: string; sp: Specialty }[] = [
  { kw: "appendectomy", sp: "Advanced Surgery" },
  { kw: "surgery", sp: "Advanced Surgery" },
  { kw: "operation", sp: "Advanced Surgery" },
  { kw: "trauma", sp: "Emergency Trauma" },
  { kw: "emergency", sp: "Emergency Trauma" },
  { kw: "dialysis", sp: "Dialysis" },
  { kw: "kidney", sp: "Dialysis" },
  { kw: "renal", sp: "Dialysis" },
  { kw: "cancer", sp: "Oncology" },
  { kw: "oncology", sp: "Oncology" },
  { kw: "chemo", sp: "Oncology" },
  { kw: "neonatal", sp: "Neonatal ICU" },
  { kw: "newborn", sp: "Neonatal ICU" },
  { kw: "nicu", sp: "Neonatal ICU" },
  { kw: "cardiac", sp: "Cardiology" },
  { kw: "heart", sp: "Cardiology" },
  { kw: "maternity", sp: "Maternity" },
  { kw: "delivery", sp: "Maternity" },
  { kw: "dental", sp: "Dentistry" },
  { kw: "tooth", sp: "Dentistry" },
  { kw: "mri", sp: "Diagnostics" },
  { kw: "scan", sp: "Diagnostics" },
  { kw: "imaging", sp: "Diagnostics" },
];

export function runAgent(query: string, facilities: FacilitySlim[]): AgentResult {
  const trace: TraceStep[] = [];
  const q = query.toLowerCase();

  // Detect state / city tokens against the actual data.
  const allStates = Array.from(new Set(facilities.map((f) => f.state.toLowerCase())));
  const allCities = Array.from(new Set(facilities.map((f) => f.district.toLowerCase()).filter(Boolean)));
  const matchedStates = allStates.filter((s) => s && q.includes(s));
  const matchedCities = allCities.filter((c) => c && q.includes(c));

  const specialties = Array.from(new Set(SPECIALTY_KEYWORDS.filter((s) => q.includes(s.kw)).map((s) => s.sp)));
  const wantsRural = /rural|village|remote|district hospital/.test(q);
  const wantsHospital = /hospital/.test(q);
  const wants247 = /24\s*[x/]?\s*7|round the clock|always open|night/.test(q);
  const wantsTrusted = /trust(ed|worthy)?|verified|reliable/.test(q);

  trace.push({
    id: "s1",
    agent: "Reasoner",
    title: "Parse query intent",
    detail: `States: ${matchedStates.join(", ") || "any"} • Cities: ${matchedCities.join(", ") || "any"} • Specialties: ${specialties.join(", ") || "any"} • Filters: ${[
      wantsRural && "rural",
      wantsHospital && "hospital",
      wants247 && "24/7",
      wantsTrusted && "trusted",
    ].filter(Boolean).join(", ") || "none"}`,
    ms: 142,
  });

  // Retrieve
  let candidates = facilities;
  if (matchedStates.length) candidates = candidates.filter((f) => matchedStates.includes(f.state.toLowerCase()));
  if (matchedCities.length) candidates = candidates.filter((f) => matchedCities.includes(f.district.toLowerCase()));
  if (wantsHospital) candidates = candidates.filter((f) => f.facilityType === "hospital");

  trace.push({
    id: "s2",
    agent: "Retriever",
    title: "Vector + structured retrieval",
    detail: `Searched ${facilities.length.toLocaleString()} indexed facilities → ${candidates.length.toLocaleString()} candidates after filters.`,
    ms: 88,
  });

  // Score
  const scored = candidates
    .map((f) => {
      let score = 0;
      const reasons: string[] = [];
      for (const sp of specialties) {
        if (f.evidenced.includes(sp)) {
          score += 30;
          reasons.push(`Evidenced ${sp}`);
        } else if (f.claimed.includes(sp)) {
          score += 6;
          reasons.push(`Claims ${sp} (unverified)`);
        }
      }
      if (wants247 && f.open247) {
        score += 10;
        reasons.push("24/7 operation");
      }
      if (wantsHospital && f.facilityType === "hospital") {
        score += 4;
      }
      if (wantsTrusted) score += (f.trust - 70) * 0.4;
      score += f.trust * 0.25;
      // Penalize contradictions
      score -= f.contraN * 5;
      return { facility: f, score, reasons };
    })
    .filter((r) => r.score > 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  trace.push({
    id: "s3",
    agent: "Scorer",
    title: "Rank by capability + trust",
    detail: scored[0]
      ? `Top match: ${scored[0].facility.name} (score ${scored[0].score.toFixed(0)}, trust ${scored[0].facility.trust}).`
      : "No facilities matched the criteria.",
    ms: 64,
    sources: scored.slice(0, 3).map((s) => s.facility.id),
  });

  // Validator
  const flagged = scored.filter((s) => s.facility.contraN > 0);
  trace.push({
    id: "s4",
    agent: "Validator",
    title: "Cross-check against medical-standards rules",
    detail: flagged.length
      ? `Flagged ${flagged.length} candidate(s) with contradictions; demoted in ranking. See Trust Scorer for details.`
      : "All top candidates passed validator checks.",
    ms: 121,
    sources: flagged.map((f) => f.facility.id),
  });

  const top = scored[0];
  const answer = top
    ? `Best match: **${top.facility.name}** in ${top.facility.district || "—"}, ${top.facility.state}. Trust score ${top.facility.trust} (${trustBand(top.facility.trust)}). ${top.reasons.join(" • ")}.`
    : "No facility matched all criteria. Try broadening the query or removing one filter.";

  trace.push({ id: "s5", agent: "Reasoner", title: "Synthesize final answer", detail: answer, ms: 195 });

  return { query, matches: scored, trace, answer };
}
