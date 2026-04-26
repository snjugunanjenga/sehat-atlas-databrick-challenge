import { NavLink, Outlet } from "react-router-dom";
import { Activity, Search, ShieldCheck, Map, GitBranch, Database, Stethoscope, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: Activity, end: true },
  { to: "/search", label: "Facility Search", icon: Search },
  { to: "/trust", label: "Trust Scorer", icon: ShieldCheck },
  { to: "/map", label: "Desert Map", icon: Map },
  { to: "/trace", label: "Agent Traces", icon: GitBranch },
  { to: "/databricks", label: "Databricks", icon: Database },
  { to: "/docs", label: "Documentation", icon: BookOpen },
];

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Sehat Atlas</div>
            <div className="text-[11px] text-sidebar-foreground/60">Agentic Healthcare Maps</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/60">
          <div className="font-medium text-sidebar-foreground/80">Powered by</div>
          <div>Databricks Data Intelligence</div>
          <div>+ Lovable AI Gateway</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
