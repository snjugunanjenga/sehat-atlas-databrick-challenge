import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { History, RotateCw, Trash2, Eye } from "lucide-react";
import { HistoryEntry, clearHistory, removeHistory } from "@/hooks/useQueryHistory";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

interface Props {
  items: HistoryEntry[];
  onRerun: (entry: HistoryEntry) => void;
  onOpenSnapshot: (entry: HistoryEntry) => void;
}

export default function QueryHistory({ items, onRerun, onOpenSnapshot }: Props) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Recent searches
          </h3>
          <button
            onClick={clearHistory}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
        <ul className="mt-3 divide-y">
          {items.map((h) => (
            <li key={h.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{h.query}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {h.resultCount} result{h.resultCount === 1 ? "" : "s"}
                  {h.topFacilityName ? ` · top: ${h.topFacilityName}` : ""}
                  {" · "}
                  <span className="rounded bg-muted px-1 py-px text-[10px] uppercase">{h.source}</span>
                  {" · "}
                  {timeAgo(h.ts)}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onOpenSnapshot(h)} title="Open saved result">
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onRerun(h)} title="Rerun">
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => removeHistory(h.id)} title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
