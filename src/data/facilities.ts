// Realistic mock dataset of Indian medical facilities with unstructured notes,
// AI-extracted capabilities, trust scores, contradictions, and citations.
// Mirrors the shape we'd get from VF_Hackathon_Dataset_India_Large.xlsx after
// running the ingestion + extraction + validator pipeline.

export type Specialty =
  | "Oncology"
  | "Dialysis"
  | "Emergency Trauma"
  | "Neonatal ICU"
  | "Advanced Surgery"
  | "Cardiology"
  | "Maternity";

export const SPECIALTIES: Specialty[] = [
  "Oncology",
  "Dialysis",
  "Emergency Trauma",
  "Neonatal ICU",
  "Advanced Surgery",
  "Cardiology",
  "Maternity",
];

export interface Citation {
  text: string;
  field: string;
}

export interface Contradiction {
  claim: string;
  evidence: string;
  severity: "low" | "medium" | "high";
}

export interface Facility {
  id: string;
  name: string;
  state: string;
  district: string;
  pin: string;
  lat: number;
  lng: number;
  rural: boolean;
  beds: number;
  claimedServices: Specialty[];
  evidencedServices: Specialty[];
  staffSpecialties: string[];
  partTimeDoctors: boolean;
  open247: boolean;
  trustScore: number;
  contradictions: Contradiction[];
  notes: string;
  citations: Citation[];
}

const STATES = [
  { state: "Bihar", districts: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"], lat: 25.6, lng: 85.1 },
  { state: "Uttar Pradesh", districts: ["Lucknow", "Varanasi", "Kanpur", "Gorakhpur"], lat: 26.8, lng: 80.9 },
  { state: "Maharashtra", districts: ["Mumbai", "Pune", "Nagpur", "Nashik"], lat: 19.0, lng: 72.8 },
  { state: "Tamil Nadu", districts: ["Chennai", "Madurai", "Coimbatore", "Salem"], lat: 11.1, lng: 78.6 },
  { state: "Karnataka", districts: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru"], lat: 15.3, lng: 75.7 },
  { state: "Rajasthan", districts: ["Jaipur", "Jodhpur", "Udaipur", "Ajmer"], lat: 26.9, lng: 75.8 },
  { state: "West Bengal", districts: ["Kolkata", "Howrah", "Darjeeling", "Siliguri"], lat: 22.9, lng: 87.8 },
  { state: "Odisha", districts: ["Bhubaneswar", "Cuttack", "Puri", "Rourkela"], lat: 20.9, lng: 85.0 },
  { state: "Jharkhand", districts: ["Ranchi", "Jamshedpur", "Dhanbad"], lat: 23.6, lng: 85.3 },
  { state: "Madhya Pradesh", districts: ["Bhopal", "Indore", "Gwalior", "Jabalpur"], lat: 23.5, lng: 77.4 },
];

const HOSPITAL_PREFIXES = ["Sri", "Sant", "Anand", "Jeevan", "Aarogya", "Mata", "Gandhi", "Nehru", "Rural", "Mission"];
const HOSPITAL_SUFFIXES = ["Hospital", "Health Centre", "Medical Trust", "Charitable Clinic", "Community Hospital", "Multispecialty"];

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

function pickN<T>(arr: T[], n: number, r: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  }
  return out;
}

function buildNotes(claimed: Specialty[], evidenced: Specialty[], staff: string[], r: () => number) {
  const lines: string[] = [];
  if (claimed.includes("Advanced Surgery"))
    lines.push("Operation theatre maintained, used 3-4 times weekly for elective procedures.");
  if (evidenced.includes("Dialysis"))
    lines.push("Two dialysis machines installed in Q2; nephrology referrals accepted from neighbouring districts.");
  if (claimed.includes("Neonatal ICU") && !evidenced.includes("Neonatal ICU"))
    lines.push("NICU listed in registration but cots reportedly used for general paediatrics.");
  if (evidenced.includes("Emergency Trauma"))
    lines.push("Casualty staffed 24x7 by rotating MBBS doctors; ambulance on standby.");
  if (claimed.includes("Oncology") && !evidenced.includes("Oncology"))
    lines.push("Oncology mentioned on board but no oncologist on roster as of last visit.");
  if (staff.includes("Anesthesiologist"))
    lines.push("Visiting anaesthetist available Tue/Thu for elective surgeries.");
  else if (claimed.includes("Advanced Surgery"))
    lines.push("No anaesthesia cover documented.");
  lines.push(r() > 0.5 ? "Power backup via diesel genset, ~6 hours capacity." : "Frequent outages; oxygen concentrator dependent on grid.");
  return lines.join(" ");
}

function generateFacility(i: number): Facility {
  const r = rand(i + 7);
  const region = pick(STATES, r);
  const district = pick(region.districts, r);
  const rural = r() > 0.35;
  const claimedCount = 2 + Math.floor(r() * 4);
  const claimedServices = pickN(SPECIALTIES, claimedCount, r);
  // 60% of claimed services are actually evidenced; sometimes extra ones are evidenced
  const evidencedServices = claimedServices.filter(() => r() > 0.4);
  if (r() > 0.85) {
    const extra = pick(SPECIALTIES.filter((s) => !evidencedServices.includes(s)), r);
    if (extra) evidencedServices.push(extra);
  }
  const staffPool = ["General Physician", "Surgeon", "Anesthesiologist", "Paediatrician", "Nephrologist", "Oncologist", "Cardiologist", "OB-GYN", "Nurse", "Radiologist"];
  const staffCount = 3 + Math.floor(r() * 5);
  const staffSpecialties = pickN(staffPool, staffCount, r);
  const partTimeDoctors = r() > 0.45;
  const open247 = r() > 0.5;
  const beds = rural ? 10 + Math.floor(r() * 60) : 50 + Math.floor(r() * 300);

  // Build contradictions
  const contradictions: Contradiction[] = [];
  if (claimedServices.includes("Advanced Surgery") && !staffSpecialties.includes("Anesthesiologist")) {
    contradictions.push({
      claim: "Claims Advanced Surgery capability",
      evidence: "No anesthesiologist listed in staff roster",
      severity: "high",
    });
  }
  if (claimedServices.includes("Oncology") && !staffSpecialties.includes("Oncologist")) {
    contradictions.push({
      claim: "Claims Oncology services",
      evidence: "No oncologist on roster; listed only on facility board",
      severity: "high",
    });
  }
  if (claimedServices.includes("Neonatal ICU") && !evidencedServices.includes("Neonatal ICU")) {
    contradictions.push({
      claim: "Claims Neonatal ICU",
      evidence: "NICU cots reportedly used for general paediatrics",
      severity: "medium",
    });
  }
  if (claimedServices.includes("Dialysis") && !evidencedServices.includes("Dialysis")) {
    contradictions.push({
      claim: "Claims Dialysis service",
      evidence: "No dialysis machines confirmed during last assessment",
      severity: "medium",
    });
  }

  // Trust score: starts at 100, deducts for contradictions and missing evidence
  let trust = 100;
  trust -= contradictions.filter((c) => c.severity === "high").length * 22;
  trust -= contradictions.filter((c) => c.severity === "medium").length * 12;
  trust -= contradictions.filter((c) => c.severity === "low").length * 5;
  const missingEvidence = claimedServices.filter((s) => !evidencedServices.includes(s)).length;
  trust -= missingEvidence * 4;
  trust = Math.max(15, Math.min(100, trust + Math.floor((r() - 0.5) * 8)));

  const notes = buildNotes(claimedServices, evidencedServices, staffSpecialties, r);

  const citations: Citation[] = [];
  if (evidencedServices.includes("Dialysis")) {
    citations.push({ field: "Dialysis", text: "Two dialysis machines installed in Q2; nephrology referrals accepted from neighbouring districts." });
  }
  if (evidencedServices.includes("Emergency Trauma")) {
    citations.push({ field: "Emergency Trauma", text: "Casualty staffed 24x7 by rotating MBBS doctors; ambulance on standby." });
  }
  if (staffSpecialties.includes("Anesthesiologist")) {
    citations.push({ field: "Staff: Anesthesiologist", text: "Visiting anaesthetist available Tue/Thu for elective surgeries." });
  }
  if (partTimeDoctors) {
    citations.push({ field: "Part-time doctors", text: "Roster shows visiting consultants on rotation; few full-time appointments." });
  }

  const name = `${pick(HOSPITAL_PREFIXES, r)} ${district} ${pick(HOSPITAL_SUFFIXES, r)}`;
  const pin = String(100000 + Math.floor(r() * 800000));
  const lat = region.lat + (r() - 0.5) * 3;
  const lng = region.lng + (r() - 0.5) * 3;

  return {
    id: `IND-${String(i).padStart(5, "0")}`,
    name,
    state: region.state,
    district,
    pin,
    lat,
    lng,
    rural,
    beds,
    claimedServices,
    evidencedServices,
    staffSpecialties,
    partTimeDoctors,
    open247,
    trustScore: trust,
    contradictions,
    notes,
    citations,
  };
}

// Generate 240 representative facilities (proxy for the 10k dataset).
// When the real xlsx is uploaded, the ingestion edge function replaces this.
export const FACILITIES: Facility[] = Array.from({ length: 240 }, (_, i) => generateFacility(i));

export function trustBand(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

// Aggregate medical-desert metrics by state × specialty.
export function desertGaps() {
  const out: { state: string; specialty: Specialty; coverage: number; verifiedFacilities: number; totalFacilities: number }[] = [];
  const states = Array.from(new Set(FACILITIES.map((f) => f.state)));
  for (const state of states) {
    const inState = FACILITIES.filter((f) => f.state === state);
    for (const sp of SPECIALTIES) {
      const verified = inState.filter((f) => f.evidencedServices.includes(sp) && f.trustScore >= 70);
      out.push({
        state,
        specialty: sp,
        coverage: inState.length ? verified.length / inState.length : 0,
        verifiedFacilities: verified.length,
        totalFacilities: inState.length,
      });
    }
  }
  return out;
}
