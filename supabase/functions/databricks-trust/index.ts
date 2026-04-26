import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.104.1/cors";
import { z } from "https://esm.sh/zod@3.23.8";

// Returns paginated trust-scored facility rows from a Databricks SQL Warehouse.
// Output shape mirrors the local FacilitySlim list so the frontend doesn't
// need to know which backend served the request.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/databricks";

const BodySchema = z.object({
  search: z.string().max(200).optional(),
  sortBy: z.enum(["trust", "name", "contraN", "missN"]).optional(),
  asc: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const DATABRICKS_API_KEY = Deno.env.get("DATABRICKS_API_KEY");
  const WAREHOUSE_ID = Deno.env.get("DATABRICKS_WAREHOUSE_ID");
  const TABLE = Deno.env.get("DATABRICKS_FACILITIES_TABLE") ?? "main.sehat.facilities";

  if (!LOVABLE_API_KEY || !DATABRICKS_API_KEY || !WAREHOUSE_ID) {
    return json({ error: "Databricks connector not fully configured." }, 400);
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const { search = "", sortBy = "contraN", asc = false, limit = 100 } = parsed.data;

  const sortColumn = ({
    trust: "trust",
    name: "name",
    contraN: "contradictions_n",
    missN: "missing_n",
  } as const)[sortBy];

  const sql = `
    SELECT id, name, facility_type, state, district, pin,
           latitude AS lat, longitude AS lng, beds, doctors,
           claimed, evidenced, open_247, trust,
           contradictions_n, missing_n,
           COUNT(*) OVER () AS total_count
    FROM ${TABLE}
    WHERE :s = '' OR LOWER(name) LIKE :s OR LOWER(state) LIKE :s OR LOWER(district) LIKE :s
    ORDER BY ${sortColumn} ${asc ? "ASC" : "DESC"}
    LIMIT ${limit}
  `;

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
      parameters: [{ name: "s", value: { value: search ? `%${search.toLowerCase()}%` : "", type: "STRING" } }],
      wait_timeout: "30s",
    }),
  });
  const data = await r.json();
  if (!r.ok) return json({ error: `Databricks SQL failed [${r.status}]: ${JSON.stringify(data)}` }, 502);

  const cols: string[] = (data.manifest?.schema?.columns ?? []).map((c: { name: string }) => c.name);
  const arr: unknown[][] = data.result?.data_array ?? [];
  const rows = arr.map((row) => {
    const o: Record<string, unknown> = {};
    cols.forEach((c, i) => (o[c] = row[i]));
    return {
      id: o.id as string,
      name: o.name as string,
      facilityType: (o.facility_type as string) ?? "",
      state: o.state as string,
      district: (o.district as string) ?? "",
      pin: (o.pin as string) ?? "",
      lat: (o.lat as number) ?? null,
      lng: (o.lng as number) ?? null,
      beds: (o.beds as number) ?? null,
      doctors: (o.doctors as number) ?? null,
      claimed: (o.claimed as string[]) ?? [],
      evidenced: (o.evidenced as string[]) ?? [],
      open247: !!o.open_247,
      trust: o.trust as number,
      contraN: o.contradictions_n as number,
      missN: o.missing_n as number,
    };
  });
  const total = (rows[0] as unknown as { total_count?: number })?.total_count ?? rows.length;

  return json({ rows, total });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
