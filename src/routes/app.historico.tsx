import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Check, X, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/datetime";
import { useHistory } from "@/api/history";
import { useMatches } from "@/api/matches";
import { useTeams } from "@/api/teams";
import { toTeam } from "@/api/adapters";
import { usePools } from "@/api/pools";
import { useAuthStore } from "@/store/auth-store";
import type { MatchResponse } from "@/api/types";
import type { Team } from "@/api/types";

export const Route = createFileRoute("/app/historico")({
  head: () => ({ meta: [{ title: "Histórico - Pitaco" }] }),
  component: HistoryPage,
});

const TBD: Team = { id: "", name: "A definir", flag: "🏳️", group: "" };

function HistoryPage() {
  const poolId = useAuthStore((s) => s.poolId) ?? "";
  const pools = usePools();
  const tournamentId = pools.data?.find((p) => p.id === poolId)?.tournament_id ?? "";

  const history = useHistory(poolId);
  const matches = useMatches(tournamentId);
  const teams = useTeams();

  const matchById = useMemo(() => {
    const map = new Map<string, MatchResponse>();
    (matches.data ?? []).forEach((m) => map.set(m.id, m));
    return map;
  }, [matches.data]);

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    (teams.data ?? []).forEach((t) => map.set(t.id, toTeam(t)));
    return map;
  }, [teams.data]);

  const entries = history.data?.entries ?? [];
  const upcoming = entries.filter((e) => e.match_status === "scheduled");
  const past = [...entries]
    .filter((e) => e.match_status === "finished")
    .sort((a, b) => +new Date(b.kickoff_at) - +new Date(a.kickoff_at));

  const teamsFor = (matchId: string) => {
    const m = matchById.get(matchId);
    return {
      home: (m?.home_team_id && teamsById.get(m.home_team_id)) || TBD,
      away: (m?.away_team_id && teamsById.get(m.away_team_id)) || TBD,
    };
  };

  const isPending = history.isPending || matches.isPending || teams.isPending;
  const isError = history.isError || matches.isError || teams.isError;

  const retry = () => {
    history.refetch();
    matches.refetch();
    teams.refetch();
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Histórico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe seu desempenho ao longo do bolão.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-primary/10" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-primary/10" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o histórico.</p>
          <button
            onClick={retry}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Pontos"
              value={history.data!.total_points}
              color="text-primary"
              Icon={TrendingUp}
            />
            <Stat
              label="Acertos"
              value={history.data!.hits_count}
              color="text-success"
              Icon={Check}
            />
            <Stat
              label="Erros"
              value={history.data!.errors_count}
              color="text-destructive"
              Icon={X}
            />
            <Stat
              label="Futuros"
              value={history.data!.pending_count}
              color="text-muted-foreground"
              Icon={Clock}
            />
          </div>

          {((history.data!.penalties_count ?? 0) > 0 ||
            (history.data!.penalties_no_draw_count ?? 0) > 0) && (
            <div className="mb-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {(history.data!.penalties_count ?? 0) > 0 && (
                <span className="rounded-md bg-surface px-2 py-1">
                  Pênaltis cravando o empate:{" "}
                  <span className="font-semibold text-foreground">
                    {history.data!.penalties_count}
                  </span>
                </span>
              )}
              {(history.data!.penalties_no_draw_count ?? 0) > 0 && (
                <span className="rounded-md bg-surface px-2 py-1">
                  Vencedor nos pênaltis:{" "}
                  <span className="font-semibold text-foreground">
                    {history.data!.penalties_no_draw_count}
                  </span>
                </span>
              )}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="mb-3">
              <Section title="Palpites futuros">
                <ul className="space-y-2">
                  {upcoming.map((e) => {
                    const { home, away } = teamsFor(e.match_id);
                    return (
                      <li
                        key={e.match_id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm"
                      >
                        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {formatDateBR(e.kickoff_at, { day: "2-digit", month: "short" })}
                        </span>
                        <span className="flex-1 truncate">
                          {home.flag} {home.name} <span className="text-muted-foreground">vs</span>{" "}
                          {away.name} {away.flag}
                        </span>
                        <span className="font-display font-bold tabular-nums">
                          {e.prediction_home} × {e.prediction_away}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            </div>
          )}

          <Section title="Palpites anteriores">
            {past.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum palpite encerrado ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {past.map((e) => {
                  const { home, away } = teamsFor(e.match_id);
                  const pts = e.points_awarded ?? 0;
                  const win = pts > 0;
                  return (
                    <li
                      key={e.match_id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-card p-3 text-sm",
                        e.hit_kind === "exact" && "border-success/40",
                        e.hit_kind === "outcome" && "border-primary/40",
                        !win && "border-border",
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full",
                          win ? "bg-success/20 text-success" : "bg-destructive/15 text-destructive",
                        )}
                      >
                        {win ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {home.flag} {home.name} <span className="text-muted-foreground">vs</span>{" "}
                          {away.name} {away.flag}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Palpite:{" "}
                          <span className="text-foreground">
                            {e.prediction_home} × {e.prediction_away}
                          </span>{" "}
                          · Real:{" "}
                          <span className="text-foreground">
                            {e.result_home} × {e.result_away}
                          </span>
                        </div>
                        {(() => {
                          // Penalty call: explicit pick on a draw, else the side
                          // implied by a decisive score.
                          const call =
                            e.prediction_penalties_pick ??
                            (e.prediction_home > e.prediction_away
                              ? "home"
                              : e.prediction_home < e.prediction_away
                                ? "away"
                                : null);
                          if (e.result_penalties_winner == null) return null;
                          const teamName = (side: "home" | "away") =>
                            side === "home" ? home.name : away.name;
                          return (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              Pênaltis:{" "}
                              <span className="text-foreground">{call ? teamName(call) : "—"}</span>{" "}
                              · venceu:{" "}
                              <span className="text-foreground">
                                {teamName(e.result_penalties_winner)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                          e.hit_kind === "exact" && "bg-success/20 text-success",
                          e.hit_kind === "outcome" && "bg-primary/20 text-primary",
                          !win && "bg-muted text-muted-foreground",
                        )}
                      >
                        {win ? `+${pts}` : "0"} pts
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: number;
  color: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div className={cn("mt-2 font-display text-2xl font-bold tabular-nums", color)}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
