import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TrustBadge from "@/components/TrustBadge";
import { FacilityDetail, FacilitySlim, loadDetails } from "@/data/facilities";
import { useFacilities } from "@/hooks/useFacilities";
import { AlertTriangle, ArrowUpDown, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortKey = "trust" | "name" | "contraN" | "missN";

export default function TrustScorer() {
  const facilities = useFacilities();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("contraN");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState<FacilitySlim | null>(null);
  const [details, setDetails] = useState<Record<string, FacilityDetail>>({});

  useEffect(() => {
    loadDetails().then(setDetails);
  }, []);

  const rows = useMemo(() => {
    if (!facilities) return [];
    const filtered = facilities.filter(
      (f) =>
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.state.toLowerCase().includes(search.toLowerCase()) ||
        (f.district || "").toLowerCase().includes(search.toLowerCase()),
    );
    const dir = asc ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "contraN":
          return (a.contraN - b.contraN) * dir;
        case "missN":
          return (a.missN - b.missN) * dir;
        default:
          return (a.trust - b.trust) * dir;
      }
    });
  }, [facilities, search, sortBy, asc]);

  const setSort = (k: SortKey) => {
    if (sortBy === k) setAsc(!asc);
    else {
      setSortBy(k);
      setAsc(false);
    }
  };

  if (!facilities) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading 10,000 facility records…
      </div>
    );
  }

  const detail = open ? details[open.id] : undefined;

  return (
    <div>
      <PageHeader
        title="Trust Scorer"
        description={`Every facility's trust score, evidenced services, and validator-flagged contradictions across ${facilities.length.toLocaleString()} records.`}
      />
      <div className="space-y-4 p-8">
        <Input
          placeholder="Search by name, state, or district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortBtn label="Facility" onClick={() => setSort("name")} active={sortBy === "name"} />
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Claimed services</TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Missing evidence" onClick={() => setSort("missN")} active={sortBy === "missN"} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Contradictions" onClick={() => setSort("contraN")} active={sortBy === "contraN"} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Trust" onClick={() => setSort("trust")} active={sortBy === "trust"} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => setOpen(f)}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {f.district || "—"}, {f.state}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {f.claimed.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="font-normal">
                            {s}
                          </Badge>
                        ))}
                        {f.claimed.length > 3 && (
                          <Badge variant="outline" className="font-normal">
                            +{f.claimed.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{f.missN}</TableCell>
                    <TableCell className="text-right">
                      {f.contraN > 0 ? (
                        <span className="inline-flex items-center gap-1 text-contradicted">
                          <AlertTriangle className="h-3 w-3" />
                          {f.contraN}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TrustBadge score={f.trust} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              Showing {Math.min(100, rows.length).toLocaleString()} of {rows.length.toLocaleString()} facilities
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <SheetDescription>
                  {open.district || "—"}, {open.state}
                  {open.pin && <> · PIN {open.pin}</>}
                  {open.beds && <> · {open.beds} beds</>}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <TrustBadge score={open.trust} />
                  <Badge variant="outline" className="text-[10px] uppercase">{open.facilityType}</Badge>
                  {detail?.operatorType && <Badge variant="outline" className="text-[10px] uppercase">{detail.operatorType}</Badge>}
                  {open.open247 && <Badge variant="secondary">24/7</Badge>}
                </div>

                <Section title="Claimed vs evidenced services">
                  <div className="space-y-1.5">
                    {open.claimed.length === 0 && <p className="text-xs italic text-muted-foreground">No high-acuity specialties claimed.</p>}
                    {open.claimed.map((s) => {
                      const ok = open.evidenced.includes(s);
                      return (
                        <div key={s} className="flex items-center justify-between text-sm">
                          <span>{s}</span>
                          <Badge className={ok ? "bg-verified text-verified-foreground hover:bg-verified" : "bg-flagged text-flagged-foreground hover:bg-flagged"}>
                            {ok ? "Evidenced" : "No evidence"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                {detail?.staff && detail.staff.length > 0 && (
                  <Section title="Staff specialties (extracted)">
                    <div className="flex flex-wrap gap-1.5">
                      {detail.staff.map((s) => (
                        <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                      ))}
                    </div>
                  </Section>
                )}

                {detail?.equipment && detail.equipment.length > 0 && (
                  <Section title="Equipment evidenced">
                    <div className="flex flex-wrap gap-1.5">
                      {detail.equipment.map((s) => (
                        <Badge key={s} variant="outline" className="font-normal">{s}</Badge>
                      ))}
                    </div>
                  </Section>
                )}

                {detail?.contradictions && detail.contradictions.length > 0 && (
                  <Section title="Validator contradictions">
                    <ul className="space-y-2 text-sm">
                      {detail.contradictions.map((c, i) => (
                        <li key={i} className="rounded-md border-l-2 border-contradicted bg-contradicted/5 p-2.5">
                          <div className="font-medium">{c.claim}</div>
                          <div className="text-xs text-muted-foreground">{c.evidence}</div>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {detail?.description && (
                  <Section title="Source description">
                    <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{detail.description}</p>
                  </Section>
                )}

                {detail?.citations && detail.citations.length > 0 && (
                  <Section title="Citations">
                    <div className="space-y-2">
                      {detail.citations.map((c, i) => (
                        <div key={i} className="rounded-md border-l-2 border-primary bg-muted/40 p-2.5 text-xs">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">{c.field}</div>
                          <p className="mt-0.5 flex gap-1.5">
                            <Quote className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span>{c.text}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {(detail?.phone || detail?.website) && (
                  <Section title="Contact">
                    {detail?.phone && <div className="text-xs">📞 {detail.phone}</div>}
                    {detail?.website && (
                      <a href={detail.website} target="_blank" rel="noreferrer" className="break-all text-xs text-primary hover:underline">
                        🌐 {detail.website}
                      </a>
                    )}
                  </Section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SortBtn({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className={`-ml-2 h-7 gap-1 px-2 text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>
      {label} <ArrowUpDown className="h-3 w-3" />
    </Button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}
