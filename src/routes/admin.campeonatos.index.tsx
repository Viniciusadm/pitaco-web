import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2, Trophy } from "lucide-react";
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
import {
  useTournaments,
  useCreateTournament,
  useUpdateTournament,
  useDeleteTournament,
} from "@/api/tournaments";
import type { TournamentResponse, TournamentStatus } from "@/api/types";
import {
  allowedStatusTransitions,
  formatCalendarDate,
  slugify,
  TOURNAMENT_STATUS_LABEL,
} from "@/lib/tournaments";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/campeonatos/")({
  head: () => ({ meta: [{ title: "Admin · Campeonatos" }] }),
  component: AdminTournaments,
});

const EMPTY_FORM = {
  name: "",
  slug: "",
  slugTouched: false,
  seasonYear: "",
  startsOn: "",
  endsOn: "",
  status: "draft" as TournamentStatus,
};

const STATUS_BADGE: Record<TournamentStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/20 text-success",
  finished: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground line-through",
};

function AdminTournaments() {
  const online = useOnline();
  const tournaments = useTournaments();
  const createTournament = useCreateTournament();
  const updateTournament = useUpdateTournament();
  const deleteTournament = useDeleteTournament();

  const [editing, setEditing] = useState<TournamentResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const list = tournaments.data ?? [];
  const saving = createTournament.isPending || updateTournament.isPending;

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };
  const startEdit = (t: TournamentResponse) => {
    setEditing(t);
    setForm({
      name: t.name,
      slug: t.slug,
      slugTouched: true,
      seasonYear: t.season_year ? String(t.season_year) : "",
      startsOn: t.starts_on ?? "",
      endsOn: t.ends_on ?? "",
      status: t.status,
    });
    setOpen(true);
  };

  const save = () => {
    if (!online) return toast.error("Sem conexão. Conecte-se para realizar esta ação.");
    if (!form.name.trim()) return toast.error("Informe o nome");
    const slug = slugify(form.slug);
    if (!slug) return toast.error("Informe o slug");
    if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
      return toast.error("A data de fim deve ser depois do início");
    }
    const body = {
      name: form.name.trim(),
      slug,
      season_year: form.seasonYear ? Number(form.seasonYear) : null,
      starts_on: form.startsOn || null,
      ends_on: form.endsOn || null,
    };
    const opts = {
      onSuccess: () => {
        toast.success(editing ? "Campeonato atualizado" : "Campeonato criado");
        setOpen(false);
      },
      onError: (error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar"),
    };
    if (editing) {
      updateTournament.mutate({ id: editing.id, body: { ...body, status: form.status } }, opts);
    } else {
      createTournament.mutate(body, opts);
    }
  };

  const remove = (t: TournamentResponse) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    deleteTournament.mutate(t.id, {
      onSuccess: () => toast.success("Campeonato removido"),
      onError: (error) =>
        toast.error(
          error instanceof Error && error.message.includes("referenced by a pool")
            ? "Este campeonato já tem bolões e não pode ser removido. Arquive-o."
            : error instanceof Error
              ? error.message
              : "Não foi possível remover",
        ),
    });
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Campeonatos</h1>
          <p className="text-xs text-muted-foreground">{list.length} cadastrados</p>
        </div>
        <Button
          onClick={startCreate}
          disabled={!online}
          className="gold-gradient text-primary-foreground hover:opacity-90"
        >
          <Plus className="mr-1 h-4 w-4" /> Novo campeonato
        </Button>
      </div>

      {tournaments.isPending ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : tournaments.isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os campeonatos.</p>
          <button
            onClick={() => tournaments.refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum campeonato cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <article
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
            >
              <Link
                to="/admin/campeonatos/$tournamentId"
                params={{ tournamentId: t.id }}
                className="min-w-0 flex-1"
              >
                <p className="truncate font-semibold">{t.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn("rounded-md px-2 py-0.5 font-semibold", STATUS_BADGE[t.status])}
                  >
                    {TOURNAMENT_STATUS_LABEL[t.status]}
                  </span>
                  {t.season_year && <span>{t.season_year}</span>}
                  {t.starts_on && (
                    <span>
                      {formatCalendarDate(t.starts_on)}
                      {t.ends_on && ` – ${formatCalendarDate(t.ends_on)}`}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(t)}
                  disabled={deleteTournament.isPending || !online}
                  className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Link
                  to="/admin/campeonatos/$tournamentId"
                  params={{ tournamentId: t.id }}
                  className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} campeonato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                placeholder="Copa do Mundo 2026"
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    slug: form.slugTouched ? form.slug : slugify(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  placeholder="copa-do-mundo-2026"
                  onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
                  onBlur={() => setForm({ ...form, slug: slugify(form.slug) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Temporada</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.seasonYear}
                  placeholder="2026"
                  onChange={(e) => setForm({ ...form, seasonYear: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="date"
                  value={form.startsOn}
                  onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={form.endsOn}
                  onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
                />
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as TournamentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatusTransitions(editing.status).map((s) => (
                      <SelectItem key={s} value={s}>
                        {TOURNAMENT_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O status só avança: Rascunho → Ativo → Encerrado → Arquivado. Apenas campeonatos
                  ativos aparecem na criação de bolões.
                </p>
              </div>
            )}
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
