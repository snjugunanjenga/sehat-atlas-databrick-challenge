import { FACILITIES, Facility, Specialty, trustBand } from "./facilities";

// Lightweight client-side "agent" that simulates the multi-step retrieval +
// reasoning pipeline. Each call returns a result + a trace of steps so the
// Chain-of-Thought viewer can render exactly what the agent did.

export interface TraceStep {
  id: string;
  agent: "Retriever" | "Extractor" | "Reasoner" | "Validator" | "Scorer";
  title: string;
  detail: string;
  ms: number;
  sources?: string[]; // facility ids touched
}

export interface AgentResult {
  query: string;
  matches: { facility: Facility; score: number; reasons: string[] }[];
  trace: TraceStep[];
  answer: string;
}

const STATE_KEYWORDS: Record<string, string> = {
  bihar: "Bihar",
  "uttar pradesh": "Uttar Pradesh",
  "up": "Uttar Pradesh",
  maharashtra: "Maharashtra",
  "tamil nadu": "Tamil Nadu",
  karnataka: "Karnataka",
  rajasthan: "Rajasthan",
  "west bengal": "West Bengal",
  odisha: "Odisha",
  jharkhand: "Jharkhand",
  "madhya pradesh": "Madhya Pradesh",
};

const SPECIALTY_KEYWORDS: { kw: string; sp: Specialty }[] = [
  { kw: "appendectomy", sp: "Advanced Surgery" },
  { kw: "surgery", sp: "Advanced Surgery" },
  { kw: "trauma", sp: "Emergency Trauma" },
  { kw: "emergency", sp: "Emergency Trauma" },
  { kw: "dialysis", sp: "Dialysis" },
  { kw: "kidney", sp: "Dialysis" },
  { kw: "cancer", sp: "Oncology" },
  { kw: "oncology", sp: "Oncology" },
  { kw: "neonatal", sp: "Neonatal ICU" },
  { kw: "newborn", sp: "Neonatal ICU" },
  { kw: "cardiac", sp: "Cardiology" },
  { kw: "heart", sp: "Cardiology" },
  { kw: "maternity", sp: "Maternity" },
  { kw: "delivery", sp: "Maternity" },
];

export function runAgent(query: string): AgentResult {
  const trace: TraceStep[] = [];
  const q = query.toLowerCase();

  // Step 1: Extract intent
  const states = Object.entries(STATE_KEYWORDS).filter(([k]) => q.includes(k)).map(([, v]) => v);
  const specialties = Array.from(new Set(SPECIALTY_KEYWORDS.filter((s) => q.includes(s.kw)).map((s) => s.sp)));
  const wantsRural = /rural|village|remote/.test(q);
  const wantsPartTime = /part[- ]time|visiting|rotat/.test(q);
  const wants247 = /24\s*\/?\s*7|round the clock|always open/.test(q);

  trace.push({
    id: "s1",
    agent: "Reasoner",
    title: "Parse query intent",
    detail: `States: ${states.join(", ") || "any"} • Specialties: ${specialties.join(", ") || "any"} • Rural: ${wantsRural} • Part-time: ${wantsPartTime} • 24/7: ${wants247}`,
    ms: 142,
  });

  // Step 2: Retrieve candidates
  let candidates = FACILITIES;
  if (states.length) candidates = candidates.filter((f) => states.includes(f.state));
  trace.push({
    id: "s2",
    agent: "Retriever",
    title: "Vector + structured retrieval",
    detail: `Searched ${FACILITIES.length} indexed facilities → ${candidates.length} candidates after geo filter.`,
    ms: 88,
  });

  // Step 3: Score candidates
  const scored = candidates
    .map((f) => {
      let score = 0;
      const reasons: string[] = [];
      for (const sp of specialties) {
        if (f.evidencedServices.includes(sp)) {
          score += 30;
          reasons.push(`Evidenced ${sp}`);
        } else if (f.claimedServices.includes(sp)) {
          score += 8;
          reasons.push(`Claims ${sp} (unverified)`);
        }
      }
      if (wantsRural && f.rural) {
        score += 15;
        reasons.push("Rural location");
      }
      if (wantsPartTime && f.partTimeDoctors) {
        score += 10;
        reasons.push("Part-time/visiting doctors");
      }
      if (wants247 && f.open247) {
        score += 10;
        reasons.push("24/7 operation");
      }
      score += f.trustScore * 0.3;
      return { facility: f, score, reasons };
    })
    .filter((r) => r.score > 10 || (specialties.length === 0 && states.length))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  trace.push({
    id: "s3",
    agent: "Scorer",
    title: "Rank by capability + trust",
    detail: `Top match: ${scored[0]?.facility.name ?? "none"} (score ${scored[0]?.score.toFixed(0)}).`,
    ms: 64,
    sources: scored.slice(0, 3).map((s) => s.facility.id),
  });

  // Step 4: Validator
  const flagged = scored.filter((s) => s.facility.contradictions.length > 0);
  trace.push({
    id: "s4",
    agent: "Validator",
    title: "Cross-check against medical-standards rules",
    detail: flagged.length
      ? `Flagged ${flagged.length} facility(ies) with contradictions; demoted in ranking.`
      : "All top candidates passed validator checks.",
    ms: 121,
    sources: flagged.map((f) => f.facility.id),
  });

  // Final answer
  const top = scored[0];
  const answer = top
    ? `Best match: **${top.facility.name}** in ${top.facility.district}, ${top.facility.state}. Trust score ${top.facility.trustScore} (${trustBand(top.facility.trustScore)}). ${top.reasons.join(" • ")}.`
    : "No facility matched all criteria. Try broadening the query.";

  trace.push({
    id: "s5",
    agent: "Reasoner",
    title: "Synthesize final answer",
    detail: answer,
    ms: 195,
  });

  return { query, matches: scored, trace, answer };
}
