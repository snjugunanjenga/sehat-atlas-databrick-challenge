import { cn } from "@/lib/utils";
import { trustBand } from "@/data/facilities";

export default function TrustBadge({ score, className }: { score: number; className?: string }) {
  const band = trustBand(score);
  const styles = {
    high: "bg-verified/15 text-verified border-verified/30",
    medium: "bg-flagged/15 text-flagged border-flagged/40",
    low: "bg-contradicted/15 text-contradicted border-contradicted/40",
  }[band];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", styles, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Trust {score}
    </span>
  );
}
