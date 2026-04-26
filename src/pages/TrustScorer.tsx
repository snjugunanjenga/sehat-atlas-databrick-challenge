import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TrustBadge from "@/components/TrustBadge";
import { FACILITIES, Facility } from "@/data/facilities";
import { AlertTriangle, ArrowUpDown, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

type SortKey = "trustScore" | "name" | "contradictions" | "missing";

export default function TrustScorer() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("trustScore");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState<Facility | null>(null);

  const rows = useMemo(() => {
    const filtered = FACILITIES.filter(
      (f) =>
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.state.toLowerCase().includes(search.toLowerCase()) ||
        f.district.toLowerCase().includes(search.toLowerCase()),
    );
    const dir = asc ? 1 : -1;
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "contradictions":
          return (a.contradictions.length - b.contradictions.length) * dir;
        case "missing":
          return (
            (a.claimedServices.filter((s) => !a.evidencedServices.includes(s)).length -
              b.claimedServices.filter((s) => !b.evidencedServices.includes(s)).length) *
            dir
          );
        default:
          return (a.trustScore - b.trustScore) * dir;
      }
    });
  }, [search, sortBy, asc]);

  const setSort = (k: SortKey) => {
    if (sortBy === k) setAsc(!asc);
    else {
      setSortBy(k);
      setAsc(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Trust Scorer"
        description="Every facility's trust score, evidenced services, and validator-flagged contradictions."
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
                    <SortBtn label="Missing evidence" onClick={() => setSort("missing")} active={sortBy === "missing"} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Contradictions" onClick={() => setSort("contradictions")} active={sortBy === "contradictions"} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Trust" onClick={() => setSort("trustScore")} active={sortBy === "trustScore"} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 80).map((f) => {
                  const missing = f.claimedServices.filter((s) => !f.evidencedServices.includes(s)).length;
                  return (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => setOpen(f)}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.district}, {f.state}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {f.claimedServices.slice(0, 3).map((s) => (
                            <Badge key={s} variant="outline" className="font-normal">
                              {s}
                            </Badge>
                          ))}
                          {f.claimedServices.length > 3 && (
                            <Badge variant="outline" className="font-normal">
                              +{f.claimedServices.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{missing}</TableCell>
                      <TableCell className="text-right">
                        {f.contradictions.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-contradicted">
                            <AlertTriangle className="h-3 w-3" />
                            {f.contradictions.length}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TrustBadge score={f.trustScore} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              Showing {Math.min(80, rows.length)} of {rows.length} facilities
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
                  {open.district}, {open.state} · PIN {open.pin} · {open.beds} beds
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div className="flex items-center gap-3">
                  <TrustBadge score={open.trustScore} />
                  <span className="text-xs text-muted-foreground">{open.rural ? "Rural" : "Urban"} · {open.open247 ? "24/7" : "Daytime only"}</span>
                </div>

                <Section title="Claimed vs evidenced services">
                  <div className="space-y-1.5">
                    {open.claimedServices.map((s) => {
                      const ok = open.evidencedServices.includes(s);
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

                <Section title="Staff specialties">
                  <div className="flex flex-wrap gap-1.5">
                    {open.staffSpecialties.map((s) => (
                      <Badge key={s} variant="secondary" className="font-normal">{s}</Badge>
                    ))}
                  </div>
                </Section>

                {open.contradictions.length > 0 && (
                  <Section title="Validator contradictions">
                    <ul className="space-y-2 text-sm">
                      {open.contradictions.map((c, i) => (
                        <li key={i} className="rounded-md border-l-2 border-contradicted bg-contradicted/5 p-2.5">
                          <div className="font-medium">{c.claim}</div>
                          <div className="text-xs text-muted-foreground">{c.evidence}</div>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                <Section title="Source notes">
                  <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{open.notes}</p>
                </Section>

                {open.citations.length > 0 && (
                  <Section title="Citations">
                    <div className="space-y-2">
                      {open.citations.map((c, i) => (
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
