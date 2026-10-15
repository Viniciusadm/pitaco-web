import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useTournamentDetail,
  useTournamentTeams,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAssignTeam,
  useUnassignTeam,
} from "@/api/tournaments";
import type { GroupResponse, StageKind, StageResponse, TeamResponse } from "@/api/types";
import { STAGE_KIND_LABEL, TOURNAMENT_STATUS_LABEL } from "@/lib/tournaments";

export const Route = createFileRoute("/admin/campeonatos/$tournamentId")({
  head: () => ({ meta: [{ title: "Admin · Campeonato" }] }),
  component: AdminTournamentDetail,
});

const OFFLINE_MESSAGE = "Sem conexão. Conecte-se para realizar esta ação.";
const NO_GROUP = "none";

const errorToast = (fallback: string) => (error: unknown) =>
  toast.error(error instanceof Error ? error.message : fallback);

function AdminTournamentDetail() {
  const { tournamentId } = Route.useParams();
  const tournament = useTournamentDetail(tournamentId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/campeonatos"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Campeonatos
        </Link>
        {tournament.isPending ? (
          <Skeleton className="mt-2 h-7 w-56" />
        ) : tournament.isError ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o campeonato.</p>
            <button
              onClick={() => tournament.refetch()}
              className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="mt-1">
            <h1 className="font-display text-xl font-bold">{tournament.data.name}</h1>
            <p className="text-xs text-muted-foreground">
              {TOURNAMENT_STATUS_LABEL[
                tournament.data.status as keyof typeof TOURNAMENT_STATUS_LABEL
              ] ?? tournament.data.status}
              {tournament.data.season_year ? ` · ${tournament.data.season_year}` : ""}
            </p>
          </div>
        )}
      </div>

      {tournament.isSuccess && (
        <>
          <StagesSection tournamentId={tournamentId} stages={tournament.data.stages} />
          <GroupsSection tournamentId={tournamentId} groups={tournament.data.groups} />
          <TeamsSection tournamentId={tournamentId} groups={tournament.data.groups} />
        </>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{count} cadastrados</p>
      </div>
      <Button size="sm" variant="outline" onClick={onAction} disabled={disabled}>
        <Plus className="mr-1 h-4 w-4" /> {actionLabel}
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function RowActions({
  onEdit,
  onRemove,
  removeDisabled,
}: {
  onEdit?: () => void;
  onRemove: () => void;
  removeDisabled: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onEdit && (
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        disabled={removeDisabled}
        className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StagesSection({
  tournamentId,
  stages,
}: {
  tournamentId: string;
  stages: StageResponse[];
}) {
  const online = useOnline();
  const createStage = useCreateStage(tournamentId);
  const updateStage = useUpdateStage(tournamentId);
  const deleteStage = useDeleteStage(tournamentId);

  const [editing, setEditing] = useState<StageResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "group" as StageKind, ordering: "1" });

  const sorted = useMemo(() => [...stages].sort((a, b) => a.ordering - b.ordering), [stages]);
  const saving = createStage.isPending || updateStage.isPending;

  const startCreate = () => {
    setEditing(null);
    const nextOrdering = sorted.length ? sorted[sorted.length - 1].ordering + 1 : 1;
    setForm({ name: "", kind: "group", ordering: String(nextOrdering) });
    setOpen(true);
  };
  const startEdit = (s: StageResponse) => {
    setEditing(s);
    setForm({ name: s.name, kind: s.kind as StageKind, ordering: String(s.ordering) });
    setOpen(true);
  };

  const save = () => {
    if (!online) return toast.error(OFFLINE_MESSAGE);
    if (!form.name.trim()) return toast.error("Informe o nome da fase");
    const ordering = Number(form.ordering);
    if (!Number.isInteger(ordering) || ordering < 0) return toast.error("Ordem inválida");
    const body = { name: form.name.trim(), kind: form.kind, ordering };
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Fase atualizada" : "Fase criada");
        setOpen(false);
      },
      onError: errorToast("Não foi possível salvar"),
    };
    if (editing) updateStage.mutate({ id: editing.id, body }, opts);
    else createStage.mutate(body, opts);
  };

  const remove = (s: StageResponse) => {
    if (!online) return toast.error(OFFLINE_MESSAGE);
    deleteStage.mutate(s.id, {
      onSuccess: () => toast.success("Fase removida"),
      onError: errorToast("Não foi possível remover"),
    });
  };

  return (
    <section>
      <SectionHeader
        title="Fases"
        count={sorted.length}
        actionLabel="Nova fase"
        onAction={startCreate}
        disabled={!online}
      />
      {sorted.length === 0 ? (
        <EmptyState message="Nenhuma fase cadastrada." />
      ) : (
        <div className="space-y-2">
          {sorted.map((s) => (
            <article
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                {s.ordering}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {STAGE_KIND_LABEL[s.kind as StageKind] ?? s.kind}
                </p>
              </div>
              <RowActions
                onEdit={() => startEdit(s)}
                onRemove={() => remove(s)}
                removeDisabled={deleteStage.isPending || !online}
              />
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} fase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                placeholder="Oitavas de final"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as StageKind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STAGE_KIND_LABEL) as StageKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {STAGE_KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.ordering}
                  onChange={(e) => setForm({ ...form, ordering: e.target.value })}
                />
              </div>
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
    </section>
  );
}

function GroupsSection({
  tournamentId,
  groups,
}: {
  tournamentId: string;
  groups: GroupResponse[];
}) {
  const online = useOnline();
  const createGroup = useCreateGroup(tournamentId);
  const updateGroup = useUpdateGroup(tournamentId);
  const deleteGroup = useDeleteGroup(tournamentId);

  const [editing, setEditing] = useState<GroupResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  const sorted = useMemo(
    () => [...groups].sort((a, b) => a.label.localeCompare(b.label)),
    [groups],
  );
  const saving = createGroup.isPending || updateGroup.isPending;

  const startCreate = () => {
    setEditing(null);
    setLabel("");
    setOpen(true);
  };
  const startEdit = (g: GroupResponse) => {
    setEditing(g);
    setLabel(g.label);
    setOpen(true);
  };

  const save = () => {
    if (!online) return toast.error(OFFLINE_MESSAGE);
    if (!label.trim()) return toast.error("Informe o nome do grupo");
    const body = { label: label.trim() };
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Grupo atualizado" : "Grupo criado");
        setOpen(false);
      },
      onError: errorToast("Não foi possível salvar"),
    };
    if (editing) updateGroup.mutate({ id: editing.id, body }, opts);
    else createGroup.mutate(body, opts);
  };

  const remove = (g: GroupResponse) => {
    if (!online) return toast.error(OFFLINE_MESSAGE);
    deleteGroup.mutate(g.id, {
      onSuccess: () => toast.success("Grupo removido"),
      onError: errorToast("Não foi possível remover"),
    });
  };

  return (
    <section>
      <SectionHeader
        title="Grupos"
        count={sorted.length}
        actionLabel="Novo grupo"
        onAction={startCreate}
        disabled={!online}
      />
      {sorted.length === 0 ? (
        <EmptyState message="Nenhum grupo cadastrado." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((g) => (
            <article
              key={g.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-card py-2 pl-4 pr-2"
            >
              <p className="min-w-0 flex-1 truncate font-semibold">{g.label}</p>
              <RowActions
                onEdit={() => startEdit(g)}
                onRemove={() => remove(g)}
                removeDisabled={deleteGroup.isPending || !online}
              />
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={label}
              placeholder="Grupo A"
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
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
    </section>
  );
}

function TeamsSection({ tournamentId, groups }: { tournamentId: string; groups: GroupResponse[] }) {
  const online = useOnline();
  const teams = useTeams();
  const assignments = useTournamentTeams(tournamentId);
  const assignTeam = useAssignTeam(tournamentId);
  const unassignTeam = useUnassignTeam(tournamentId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ teamId: "", groupId: NO_GROUP });

  const teamsById = useMemo(() => {
    const map = new Map<string, TeamResponse>();
    (teams.data ?? []).forEach((t) => map.set(t.id, t));
    return map;
  }, [teams.data]);

  const groupLabelById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.label));
    return map;
  }, [groups]);

  const assignedList = useMemo(
    () =>
      [...(assignments.data ?? [])].sort((a, b) => {
        const groupA = a.group_id ? (groupLabelById.get(a.group_id) ?? "") : "~";
        const groupB = b.group_id ? (groupLabelById.get(b.group_id) ?? "") : "~";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return (teamsById.get(a.team_id)?.name ?? "").localeCompare(
          teamsById.get(b.team_id)?.name ?? "",
        );
      }),
    [assignments.data, groupLabelById, teamsById],
  );

  const availableTeams = useMemo(() => {
    const assigned = new Set((assignments.data ?? []).map((a) => a.team_id));
    return (teams.data ?? [])
      .filter((t) => !assigned.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams.data, assignments.data]);

  const startCreate = () => {
    setForm({ teamId: availableTeams[0]?.id ?? "", groupId: NO_GROUP });
    setOpen(true);
  };

  const save = () => {
    if (!online) return toast.error(OFFLINE_MESSAGE);
    if (!form.teamId) return toast.error("Escolha a seleção");
    assignTeam.mutate(
      { team_id: form.teamId, group_id: form.groupId === NO_GROUP ? null : form.groupId },
      {
        onSuccess: () => {
          toast.success("Seleção adicionada");
          setOpen(false);
        },
        onError: errorToast("Não foi possível adicionar"),
      },
    );
  };

  const remove = (assignmentId: string) => {
    if (!online) return toast.error(OFFLINE_MESSAGE);
    unassignTeam.mutate(assignmentId, {
      onSuccess: () => toast.success("Seleção removida do campeonato"),
      onError: errorToast("Não foi possível remover"),
    });
  };

  const isPending = teams.isPending || assignments.isPending;
  const isError = teams.isError || assignments.isError;

  return (
    <section>
      <SectionHeader
        title="Seleções participantes"
        count={assignedList.length}
        actionLabel="Adicionar seleção"
        onAction={startCreate}
        disabled={!online || isPending || availableTeams.length === 0}
      />
      {isPending ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar as seleções.</p>
          <button
            onClick={() => {
              teams.refetch();
              assignments.refetch();
            }}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : assignedList.length === 0 ? (
        <EmptyState message="Nenhuma seleção adicionada a este campeonato." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assignedList.map((a) => {
            const team = teamsById.get(a.team_id);
            return (
              <article
                key={a.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card py-2 pl-4 pr-2"
              >
                <span className="text-2xl leading-none">{team?.flag_emoji ?? "🏳️"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{team?.name ?? "Seleção removida"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.group_id
                      ? (groupLabelById.get(a.group_id) ?? "Grupo removido")
                      : "Sem grupo"}
                  </p>
                </div>
                <RowActions
                  onRemove={() => remove(a.id)}
                  removeDisabled={unassignTeam.isPending || !online}
                />
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Adicionar seleção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Seleção</Label>
              <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a seleção" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.flag_emoji ?? "🏳️"} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grupo</Label>
              <Select value={form.groupId} onValueChange={(v) => setForm({ ...form, groupId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>Sem grupo</SelectItem>
                  {[...groups]
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={assignTeam.isPending || !online}
              className="gold-gradient text-primary-foreground hover:opacity-90"
            >
              {assignTeam.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
