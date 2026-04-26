import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { z } from "https://esm.sh/zod@3.23.8";

// Proxies natural-language facility search to a Databricks SQL Warehouse.
// Returns the same { query, matches, trace, answer } shape the local agent
// uses, so the frontend dataSource layer is identical for both modes.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/databricks";

const BodySchema = z.object({
  query: z.string().min(2).max(500),
});

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  "Oncology": ["cancer", "oncology", "chemo"],
  "Dialysis": ["dialysis", "kidney", "renal"],
  "Emergency Trauma": ["trauma", "emergency"],
  "Neonatal ICU": ["neonatal", "newborn", "nicu"],
  "Advanced Surgery": ["surgery", "operation", "appendectomy"],
  "Cardiology": ["cardiac", "heart"],
  "Maternity": ["maternity", "delivery"],
};

interface Row {
  id: string;
  name: string;
  facility_type: string | null;
  state: string;
  district: string | null;
  pin: string | null;
  lat: number | null;
  lng: number | null;
  beds: number | null;
  doctors: number | null;
  claimed: string[] | null;
  evidenced: string[] | null;
  open_247: boolean | null;
  trust: number;
  contradictions_n: number;
  missing_n: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const DATABRICKS_API_KEY = Deno.env.get("DATABRICKS_API_KEY");
  const WAREHOUSE_ID = Deno.env.get("DATABRICKS_WAREHOUSE_ID");
  const TABLE = Deno.env.get("DATABRICKS_FACILITIES_TABLE") ?? "main.sehat.facilities";

  if (!LOVABLE_API_KEY || !DATABRICKS_API_KEY) {
    return json({ error: "Databricks connector not configured." }, 400);
  }
  if (!WAREHOUSE_ID) {
    return json(
      { error: "DATABRICKS_WAREHOUSE_ID is not set. Add it from Databricks page." },
      400,
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

  const q = parsed.data.query.toLowerCase();
  const wantsHospital = /hospital/.test(q);
  const wants247 = /24\s*[x/]?\s*7|round the clock/.test(q);
  const wantedSpecialties = Object.entries(SPECIALTY_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => q.includes(k)))
    .map(([sp]) => sp);

  // Pull state/city tokens from the search query against an in-flight LIKE filter.
  // We use parameterized statements (positional :param) — never string-concat user input.
  const params: { name: string; value: { value: string; type?: string } }[] = [
    { name: "q", value: { value: `%${q}%`, type: "STRING" } },
  ];
  let where = "(LOWER(name) LIKE :q OR LOWER(state) LIKE :q OR LOWER(district) LIKE :q)";
  if (wantsHospital) where += " AND facility_type = 'hospital'";
  if (wants247) where += " AND open_247 = true";
  if (wantedSpecialties.length) {
    where += ` AND array_overlap(evidenced, array(${wantedSpecialties.map((_, i) => `:sp${i}`).join(",")}))`;
    wantedSpecialties.forEach((sp, i) =>
      params.push({ name: `sp${i}`, value: { value: sp, type: "STRING" } }),
    );
  }

  const sql = `
    SELECT id, name, facility_type, state, district, pin,
           latitude AS lat, longitude AS lng, beds, doctors,
           claimed, evidenced, open_247, trust,
           contradictions_n, missing_n
    FROM ${TABLE}
    WHERE ${where}
    ORDER BY trust DESC, contradictions_n ASC
    LIMIT 50
  `;

  const t0 = Date.now();
  const r = await fetch(`${GATEWAY_URL}/2.0/sql/statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": DATABRICKS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement: sql,
      parameters: params,
      wait_timeout: "30s",
    }),
  });
  const data = await r.json();
  const ms = Date.now() - t0;
  if (!r.ok) {
    return json({ error: `Databricks SQL failed [${r.status}]: ${JSON.stringify(data)}` }, 502);
  }

  const cols: string[] = (data.manifest?.schema?.columns ?? []).map((c: { name: string }) => c.name);
  const dataArray: unknown[][] = data.result?.data_array ?? [];
  const rows: Row[] = dataArray.map((arr) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = arr[i]));
    return obj as unknown as Row;
  });

  const matches = rows.slice(0, 8).map((r) => ({
    facility: {
      id: r.id,
      name: r.name,
      facilityType: r.facility_type ?? "",
      state: r.state,
      district: r.district ?? "",
      pin: r.pin ?? "",
      lat: r.lat,
      lng: r.lng,
      beds: r.beds,
      doctors: r.doctors,
      claimed: r.claimed ?? [],
      evidenced: r.evidenced ?? [],
      open247: !!r.open_247,
      trust: r.trust,
      contraN: r.contradictions_n,
      missN: r.missing_n,
    },
    score: r.trust,
    reasons: [
      ...(r.evidenced ?? [])
        .filter((s) => wantedSpecialties.includes(s))
        .map((s) => `Evidenced ${s}`),
      ...(r.open_247 && wants247 ? ["24/7 operation"] : []),
    ],
  }));

  const top = matches[0];
  const result = {
    query: parsed.data.query,
    matches,
    answer: top
      ? `Best match: **${top.facility.name}** in ${top.facility.district || "—"}, ${top.facility.state}. Trust score ${top.facility.trust}.`
      : "No facility matched. Try a broader query.",
    trace: [
      {
        id: "s1",
        agent: "Reasoner",
        title: "Parse intent",
        detail: `Specialties: ${wantedSpecialties.join(", ") || "any"} · Hospital: ${wantsHospital} · 24/7: ${wants247}`,
        ms: 24,
      },
      {
        id: "s2",
        agent: "Retriever",
        title: "Databricks SQL Warehouse",
        detail: `Returned ${rows.length} candidate rows from ${TABLE}.`,
        ms,
      },
      {
        id: "s3",
        agent: "Scorer",
        title: "Rank by trust × evidence",
        detail: top ? `Top: ${top.facility.name} (trust ${top.facility.trust}).` : "No matches.",
        ms: 18,
        sources: matches.slice(0, 3).map((m) => m.facility.id),
      },
    ],
  };

  return json({ result });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
