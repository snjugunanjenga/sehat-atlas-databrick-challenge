// Real-data layer: loads the 10,000-row VF Hackathon India dataset from /data/*.json.
// The slim list is enough to power Overview / Search / Trust / Map; details
// (raw specialties, equipment, citations, contradictions text) load on demand.

export type Specialty =
  | "Oncology"
  | "Dialysis"
  | "Emergency Trauma"
  | "Neonatal ICU"
  | "Advanced Surgery"
  | "Cardiology"
  | "Maternity"
  | "Dentistry"
  | "Diagnostics";

export const SPECIALTIES: Specialty[] = [
  "Oncology",
  "Dialysis",
  "Emergency Trauma",
  "Neonatal ICU",
  "Advanced Surgery",
  "Cardiology",
  "Maternity",
  "Dentistry",
  "Diagnostics",
];

// High-acuity specialties used for "medical desert" analysis.
export const HIGH_ACUITY: Specialty[] = [
  "Oncology",
  "Dialysis",
  "Emergency Trauma",
  "Neonatal ICU",
  "Advanced Surgery",
  "Cardiology",
];

export interface FacilitySlim {
  id: string;
  name: string;
  facilityType: string;
  state: string;
  district: string;
  pin: string;
  lat: number | null;
  lng: number | null;
  beds: number | null;
  doctors: number | null;
  claimed: Specialty[];
  evidenced: Specialty[];
  open247: boolean;
  trust: number;
  contraN: number;
  missN: number;
}

export interface FacilityDetail {
  rawSpecialties: string[];
  staff: string[];
  equipment: string[];
  contradictions: { claim: string; evidence: string; severity: "low" | "medium" | "high" }[];
  missing: string[];
  description: string;
  citations: { field: string; text: string }[];
  phone: string;
  website: string;
  operatorType: string;
}

let _slimPromise: Promise<FacilitySlim[]> | null = null;
let _detailsPromise: Promise<Record<string, FacilityDetail>> | null = null;

export function loadFacilities(): Promise<FacilitySlim[]> {
  if (!_slimPromise) {
    _slimPromise = fetch("/data/facilities.slim.json")
      .then((r) => r.json())
      .catch(() => []);
  }
  return _slimPromise;
}

export function loadDetails(): Promise<Record<string, FacilityDetail>> {
  if (!_detailsPromise) {
    _detailsPromise = fetch("/data/facilities.details.json")
      .then((r) => r.json())
      .catch(() => ({}));
  }
  return _detailsPromise;
}

export function trustBand(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

export function desertGaps(facilities: FacilitySlim[]) {
  const out: { state: string; specialty: Specialty; coverage: number; verifiedFacilities: number; totalFacilities: number }[] = [];
  const states = Array.from(new Set(facilities.map((f) => f.state)));
  for (const state of states) {
    const inState = facilities.filter((f) => f.state === state);
    if (inState.length < 10) continue;
    for (const sp of HIGH_ACUITY) {
      const verified = inState.filter((f) => f.evidenced.includes(sp) && f.trust >= 70);
      out.push({
        state,
        specialty: sp,
        coverage: verified.length / inState.length,
        verifiedFacilities: verified.length,
        totalFacilities: inState.length,
      });
    }
  }
  return out;
}
