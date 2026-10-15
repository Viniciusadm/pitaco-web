import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarX, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminMatchCard } from "@/components/admin-match-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useOnline } from "@/hooks/use-online";
import { useTeams } from "@/api/teams";
import { useActiveTournaments, useTournamentDetail } from "@/api/tournaments";
import { TournamentSelect } from "@/components/tournament-select";
import {
  useMatches,
  useCreateMatch,
  useUpdateMatch,
  useDeleteMatch,
  useEnterResult,
} from "@/api/matches";
import type { MatchResponse, MatchStatus, PenaltySide, TeamResponse } from "@/api/types";
import {
  brasiliaInputToIso,
  formatGroupDate,
  isoToBrasiliaInput,
  isResultWindowOpen,
} from "@/lib/datetime";

export const Route = createFileRoute("/admin/partidas")({
  head: () => ({ meta: [{ title: "Admin · Partidas" }] }),
  validateSearch: (search: Record<string, unknown>): { tournament?: string } => ({
    tournament: typeof search.tournament === "string" ? search.tournament : undefined,
  }),
  component: AdminMatches,
});

function AdminMatches() {
  const online = useOnline();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tournaments = useActiveTournaments();
  const tournamentList = tournaments.data ?? [];
  const tournamentId =
    search.tournament && tournamentList.some((t) => t.id === search.tournament)
      ? search.tournament
      : (tournaments.active[0]?.id ?? tournamentList[0]?.id ?? "");
  const selectTournament = (id: string) => navigate({ search: { tournament: id } });
  const tournament = useTournamentDetail(tournamentId);
  const teams = useTeams();
  const matches = useMatches(tournamentId);
  const createMatch = useCreateMatch(tournamentId);
  const updateMatch = useUpdateMatch(tournamentId);
  const deleteMatch = useDeleteMatch(tournamentId);
  const enterResult = useEnterResult(tournamentId);

  const [editing, setEditing] = useState<MatchResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    stageId: "",
    homeId: "",
    awayId: "",
    date: isoToBrasiliaInput(new Date().toISOString()),
    status: "scheduled" as MatchStatus,
    canGoToPenalties: false,
  });

  const teamList = teams.data ?? [];
  const stages = tournament.data?.stages ?? [];
  const matchList = matches.data ?? [];
  const saving = createMatch.isPending || updateMatch.isPending;

  const teamsById = useMemo(() => {
    const map = new Map<string, TeamResponse>();
    (teams.data ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [teams.data]);

  const stageNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tournament.data?.stages ?? []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [tournament.data]);

  const teamInfo = (id: string | null) => {
    const t = id ? teamsById.get(id) : undefined;
    return { flag: t?.flag_emoji ?? "🏳️", name: t?.name ?? "A definir" };
  };

  const groupedByDate = useMemo(() => {
    const map = new Map<string, MatchResponse[]>();
    [...(matches.data ?? [])]
      .filter((m) => m.status !== "finished")
      .sort((a, b) => +new Date(a.kickoff_at) - +new Date(b.kickoff_at))
      .forEach((m) => {
        const key = formatGroupDate(m.kickoff_at);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      });
    return Array.from(map.entries());
  }, [matches.data]);

  const finishedMatches = useMemo(
    () =>
      [...(matches.data ?? [])]
        .filter((m) => m.status === "finished")
        .sort((a, b) => +new Date(a.kickoff_at) - +new Date(b.kickoff_at)),
    [matches.data],
  );

  const submitResult = (
    m: MatchResponse,
    home: number,
    away: number,
    penaltiesWinner: PenaltySide | null,
  ) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    if (!isResultWindowOpen(m.kickoff_at)) {
      toast.error("O resultado só pode ser lançado após o jogo terminar.");
      return;
    }
    enterResult.mutate(
      {
        matchId: m.id,
        body: { home_score: home, away_score: away, penalties_winner: penaltiesWinner },
      },
      {
        onSuccess: () => toast.success("Resultado salvo"),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Não foi possível salvar"),
      },
    );
  };

  const startCreate = () => {
    setEditing(null);
    setForm({
      stageId: stages[0]?.id ?? "",
      homeId: teamList[0]?.id ?? "",
      awayId: teamList[1]?.id ?? "",
      date: isoToBrasiliaInput(new Date().toISOString()),
      status: "scheduled",
      canGoToPenalties: false,
    });
    setOpen(true);
  };
  const startEdit = (m: MatchResponse) => {
    setEditing(m);
    setForm({
      stageId: m.stage_id,
      homeId: m.home_team_id ?? "",
      awayId: m.away_team_id ?? "",
      date: isoToBrasiliaInput(m.kickoff_at),
      status: m.status,
      canGoToPenalties: m.can_go_to_penalties,
    });
    setOpen(true);
  };

  const save = () => {
    if (!online) return toast.error("Sem conexão. Conecte-se para realizar esta ação.");
    if (!form.stageId) return toast.error("Escolha a fase");
    if (!form.homeId || !form.awayId) return toast.error("Escolha as seleções");
    if (form.homeId === form.awayId) return toast.error("Seleções devem ser diferentes");
    const kickoff_at = brasiliaInputToIso(form.date);
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Partida atualizada" : "Partida criada");
        setOpen(false);
      },
      onError: (error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar"),
    };
    if (editing) {
      updateMatch.mutate(
        {
          matchId: editing.id,
          body: {
            stage_id: form.stageId,
            home_team_id: form.homeId,
            away_team_id: form.awayId,
            kickoff_at,
            status: form.status,
            can_go_to_penalties: form.canGoToPenalties,
          },
        },
        opts,
      );
    } else {
      createMatch.mutate(
        {
          stage_id: form.stageId,
          home_team_id: form.homeId,
          away_team_id: form.awayId,
          kickoff_at,
          can_go_to_penalties: form.canGoToPenalties,
        },
        opts,
      );
    }
  };

  const remove = (m: MatchResponse) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    deleteMatch.mutate(m.id, {
      onSuccess: () => toast.success("Partida removida"),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível remover"),
    });
  };

  const noTournaments = tournaments.isSuccess && tournamentList.length === 0;
  const isPending =
    tournaments.isPending || tournament.isPending || teams.isPending || matches.isPending;
  const isError = tournaments.isError || tournament.isError || teams.isError || matches.isError;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold">Partidas</h1>
          <p className="text-xs text-muted-foreground">{matchList.length} cadastradas</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tournamentList.length > 0 && (
            <TournamentSelect
              tournaments={tournamentList}
              value={tournamentId}
              onChange={selectTournament}
              className="w-56"
            />
          )}
          <Button
            onClick={startCreate}
            disabled={!online || !tournamentId}
            className="gold-gradient text-primary-foreground hover:opacity-90"
          >
            <Plus className="mr-1 h-4 w-4" /> Nova partida
          </Button>
        </div>
      </div>

      {noTournaments ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <CalendarX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum campeonato cadastrado.</p>
          <Link
            to="/admin/campeonatos"
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Cadastrar campeonato
          </Link>
        </div>
      ) : isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar as partidas.</p>
          <button
            onClick={() => {
              tournaments.refetch();
              tournament.refetch();
              teams.refetch();
              matches.refetch();
            }}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : matchList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <CalendarX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma partida cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {date}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((m) => (
                  <AdminMatchCard
                    key={m.id}
                    match={m}
                    home={teamInfo(m.home_team_id)}
                    away={teamInfo(m.away_team_id)}
                    stage={stageNameById.get(m.stage_id) ?? ""}
                    onEnterResult={(home, away, penaltiesWinner) =>
                      submitResult(m, home, away, penaltiesWinner)
                    }
                    savingResult={enterResult.isPending || !online}
                    onEdit={() => startEdit(m)}
                    onRemove={() => remove(m)}
                    removing={deleteMatch.isPending || !online}
                  />
                ))}
              </div>
            </section>
          ))}

          {finishedMatches.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Encerradas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {finishedMatches.map((m) => (
                  <AdminMatchCard
                    key={m.id}
                    match={m}
                    home={teamInfo(m.home_team_id)}
                    away={teamInfo(m.away_team_id)}
                    stage={stageNameById.get(m.stage_id) ?? ""}
                    onEnterResult={(home, away, penaltiesWinner) =>
                      submitResult(m, home, away, penaltiesWinner)
                    }
                    savingResult={enterResult.isPending || !online}
                    onEdit={() => startEdit(m)}
                    onRemove={() => remove(m)}
                    removing={deleteMatch.isPending || !online}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} partida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mandante</Label>
                <Select value={form.homeId} onValueChange={(v) => setForm({ ...form, homeId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.flag_emoji ?? "🏳️"} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Visitante</Label>
                <Select value={form.awayId} onValueChange={(v) => setForm({ ...form, awayId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.flag_emoji ?? "🏳️"} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data e horário</Label>
                <Input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fase</Label>
                <Select
                  value={form.stageId}
                  onValueChange={(v) => setForm({ ...form, stageId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as MatchStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Não iniciado</SelectItem>
                    <SelectItem value="live">Ao vivo</SelectItem>
                    <SelectItem value="finished">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5">
              <div className="space-y-0.5">
                <Label>Pode ir para os pênaltis</Label>
                <p className="text-xs text-muted-foreground">
                  Em caso de empate, o resultado pedirá quem venceu nos pênaltis.
                </p>
              </div>
              <Switch
                checked={form.canGoToPenalties}
                onCheckedChange={(v) => setForm({ ...form, canGoToPenalties: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving || !online}
              className="gold-gradient text-primary-foreground hover:opacity-90"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
