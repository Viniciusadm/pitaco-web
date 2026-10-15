import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatGroupDate } from "@/lib/datetime";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchCard } from "@/components/match-card";
import { useMatches } from "@/api/matches";
import { useTeams } from "@/api/teams";
import { useTournamentDetail } from "@/api/tournaments";
import { useMyPredictions, useSavePrediction } from "@/api/predictions";
import { usePools } from "@/api/pools";
import { toMatch, toTeam } from "@/api/adapters";
import { useAuthStore } from "@/store/auth-store";
import type { PenaltySide, Team } from "@/api/types";

export const Route = createFileRoute("/app/palpites")({
  head: () => ({ meta: [{ title: "Meus palpites - Pitaco" }] }),
  component: PredictionsPage,
});

type Tab = "upcoming" | "mine" | "finished";

const TBD: Team = { id: "", name: "A definir", flag: "🏳️", group: "" };

function PredictionsPage() {
  const poolId = useAuthStore((s) => s.poolId) ?? "";
  const pools = usePools();
  const tournamentId = pools.data?.find((p) => p.id === poolId)?.tournament_id ?? "";

  const tournament = useTournamentDetail(tournamentId);
  const teams = useTeams();
  const matches = useMatches(tournamentId);
  const predictions = useMyPredictions(poolId);
  const savePrediction = useSavePrediction(poolId);

  const [tab, setTab] = useState<Tab>("upcoming");

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    (teams.data ?? []).forEach((t) => map.set(t.id, toTeam(t)));
    return map;
  }, [teams.data]);

  const stageNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tournament.data?.stages ?? []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [tournament.data]);

  const predictionByMatch = useMemo(() => {
    const map = new Map<
      string,
      { home: number; away: number; points: number | null; penaltiesPick: PenaltySide | null }
    >();
    (predictions.data ?? []).forEach((p) =>
      map.set(p.match_id, {
        home: p.home_score,
        away: p.away_score,
        points: p.points_awarded,
        penaltiesPick: p.penalties_pick,
      }),
    );
    return map;
  }, [predictions.data]);

  const allMatches = useMemo(
    () => (matches.data ?? []).map((m) => toMatch(m, stageNameById.get(m.stage_id) ?? "")),
    [matches.data, stageNameById],
  );

  const filtered = useMemo(() => {
    if (tab === "finished") return allMatches.filter((p) => p.status === "finished");
    if (tab === "mine") return allMatches.filter((p) => predictionByMatch.has(p.id));
    return allMatches.filter((p) => p.status !== "finished");
  }, [tab, allMatches, predictionByMatch]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof allMatches>();
    [...filtered]
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .forEach((m) => {
        const key = formatGroupDate(m.date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      });
    return Array.from(map.entries());
  }, [filtered]);

  const isPending =
    tournament.isPending || teams.isPending || matches.isPending || predictions.isPending;
  const isError = teams.isError || matches.isError || predictions.isError;

  const save = (matchId: string, home: number, away: number, penaltiesPick: PenaltySide | null) => {
    savePrediction.mutate(
      { matchId, body: { home_score: home, away_score: away, penalties_pick: penaltiesPick } },
      {
        onSuccess: () => toast.success("Palpite salvo!"),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Não foi possível salvar"),
      },
    );
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Meus palpites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre seus placares antes do apito inicial.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="bg-surface">
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="mine">Meus palpites</TabsTrigger>
          <TabsTrigger value="finished">Encerrados</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPending ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os palpites.</p>
          <button
            onClick={() => {
              matches.refetch();
              teams.refetch();
              predictions.refetch();
            }}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
              <CalendarX className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhum jogo nessa categoria.</p>
            </div>
          )}
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {date}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    home={teamsById.get(m.homeId) ?? TBD}
                    away={teamsById.get(m.awayId) ?? TBD}
                    prediction={predictionByMatch.get(m.id)}
                    onSave={(home, away, penaltiesPick) => save(m.id, home, away, penaltiesPick)}
                    saving={savePrediction.isPending && savePrediction.variables?.matchId === m.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
