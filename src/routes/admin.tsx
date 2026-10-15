import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Flag, Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToken } from "@/api/session";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/app/palpites"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-primary">Administração</div>
              <div className="font-display text-sm font-semibold">Gestão do bolão</div>
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          <Tab
            to="/admin/campeonatos"
            active={pathname.startsWith("/admin/campeonatos")}
            Icon={Trophy}
            label="Campeonatos"
          />
          <Tab
            to="/admin/selecoes"
            active={pathname === "/admin/selecoes"}
            Icon={Flag}
            label="Seleções"
          />
          <Tab
            to="/admin/partidas"
            active={pathname === "/admin/partidas"}
            Icon={Calendar}
            label="Partidas"
          />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6 pb-16">
        <Outlet />
      </main>
    </div>
  );
}

function Tab({
  to,
  active,
  Icon,
  label,
}: {
  to: string;
  active: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
