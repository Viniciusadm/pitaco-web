import { createFileRoute } from "@tanstack/react-router";
import { Copy, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/datetime";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembers, usePools, useRemoveMember } from "@/api/pools";
import { buildInviteUrl } from "@/lib/invite";
import { useOnline } from "@/hooks/use-online";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/app/participantes")({
  head: () => ({ meta: [{ title: "Participantes - Pitaco" }] }),
  component: ParticipantsPage,
});

function ParticipantsPage() {
  const poolId = useAuthStore((s) => s.poolId) ?? "";
  const userId = useAuthStore((s) => s.userId);
  const online = useOnline();
  const pools = usePools();
  const members = useMembers(poolId);
  const removeMember = useRemoveMember(poolId);

  const inviteCode = pools.data?.find((p) => p.id === poolId)?.invite_code ?? "";
  const me = members.data?.find((m) => m.user_id === userId);
  const isOwner = me?.role === "owner";

  const copy = async () => {
    await navigator.clipboard.writeText(buildInviteUrl(inviteCode));
    toast.success("Link de convite copiado!");
  };

  const remove = (memberId: string, name: string) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success(`${name} foi removido`),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível remover"),
    });
  };

  const list = members.data ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Participantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{list.length} pessoas no bolão.</p>
        </div>
        {isOwner && inviteCode && (
          <Button onClick={copy} className="gold-gradient text-primary-foreground hover:opacity-90">
            <Copy className="mr-1.5 h-4 w-4" /> Copiar link
          </Button>
        )}
      </header>

      {members.isPending ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-2xl" />
          ))}
        </div>
      ) : members.isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os participantes.
          </p>
          <button
            onClick={() => members.refetch()}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Ainda não há participantes.</p>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {list.map((p) => {
            const owner = p.role === "owner";
            const active = p.status === "active";
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-primary">
                  {p.display_name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{p.display_name}</span>
                    {owner && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={active ? "text-success" : "text-muted-foreground"}>
                      ● {active ? "Ativo" : "Inativo"}
                    </span>
                    <span>·</span>
                    <span>
                      Entrou em {formatDateBR(p.joined_at, { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>
                {isOwner && !owner && (
                  <Button
                    onClick={() => remove(p.id, p.display_name)}
                    disabled={removeMember.isPending || !online}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    aria-label="Remover participante"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
