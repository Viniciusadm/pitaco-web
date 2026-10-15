import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Lock, LogOut, Target, Trash2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  usePools,
  useUpdatePool,
  useLeavePool,
  useDeletePool,
  useScoringRules,
  useUpdateScoringRules,
  useAllowedEmails,
  useAddAllowedEmail,
  useRemoveAllowedEmail,
} from "@/api/pools";
import { useOnline } from "@/hooks/use-online";
import { useAuthStore } from "@/store/auth-store";
import type { ScoringRuleKey } from "@/api/types";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações - Pitaco" }] }),
  component: SettingsPage,
});

const SCORING_RULES: { key: ScoringRuleKey; label: string; help: string; fallback: number }[] = [
  {
    key: "exact_score",
    label: "Placar exato",
    help: "Quando o palpite acerta o placar exato da partida.",
    fallback: 10,
  },
  {
    key: "correct_outcome",
    label: "Acertar o resultado",
    help: "Quando acerta o vencedor (ou o empate), mas não o placar.",
    fallback: 5,
  },
  {
    key: "correct_goal_difference",
    label: "Acertar o saldo de gols",
    help: "Quando acerta o resultado e também a diferença de gols.",
    fallback: 0,
  },
  {
    key: "penalties_winner",
    label: "Pênaltis cravando o empate",
    help: "Em jogos que vão para os pênaltis: cravou o empate e acertou quem venceu na disputa.",
    fallback: 5,
  },
  {
    key: "penalties_winner_no_draw",
    label: "Vencedor nos pênaltis (sem cravar o empate)",
    help: "Apostou num vencedor, o jogo foi para os pênaltis e o time que você apontou venceu a disputa.",
    fallback: 2,
  },
];

const MIN_RULE_POINTS = 0;
const MAX_RULE_POINTS = 1000;

function SettingsPage() {
  const navigate = useNavigate();
  const poolId = useAuthStore((s) => s.poolId) ?? "";
  const userId = useAuthStore((s) => s.userId);
  const online = useOnline();
  const pools = usePools();
  const pool = pools.data?.find((p) => p.id === poolId);
  const isOwner = pool?.owner_user_id === userId;

  const updatePool = useUpdatePool(poolId);
  const leavePool = useLeavePool(poolId);
  const deletePool = useDeletePool(poolId);
  const scoringRules = useScoringRules(poolId);
  const updateScoring = useUpdateScoringRules(poolId);
  const allowedEmails = useAllowedEmails(poolId, isOwner);
  const addAllowedEmail = useAddAllowedEmail(poolId);
  const removeAllowedEmail = useRemoveAllowedEmail(poolId);

  const [name, setName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [joinRequiresAllowlist, setJoinRequiresAllowlist] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [points, setPoints] = useState<Record<ScoringRuleKey, string>>({
    exact_score: "10",
    correct_outcome: "5",
    correct_goal_difference: "0",
    penalties_winner: "5",
    penalties_winner_no_draw: "2",
  });

  useEffect(() => {
    if (!pool) return;
    setName(pool.name);
    setJoinRequiresAllowlist(pool.join_requires_allowlist);
  }, [pool]);

  useEffect(() => {
    if (!scoringRules.data) return;
    setPoints(() => {
      const next = {} as Record<ScoringRuleKey, string>;
      for (const rule of SCORING_RULES) {
        const found = scoringRules.data!.find((r) => r.rule_key === rule.key);
        next[rule.key] = String(found?.points ?? rule.fallback);
      }
      return next;
    });
  }, [scoringRules.data]);

  const saveSettings = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    if (!pool) return;
    if (!name.trim()) {
      toast.error("Dê um nome ao bolão");
      return;
    }
    updatePool.mutate(
      {
        name: name.trim(),
        join_requires_allowlist: joinRequiresAllowlist,
        prediction_lock_offset_minutes: pool.prediction_lock_offset_minutes,
        status: pool.status,
      },
      {
        onSuccess: () => toast.success("Configurações salvas"),
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Não foi possível salvar"),
      },
    );
  };

  const addEmail = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    const email = newEmail.trim();
    if (!z.string().email().safeParse(email).success) {
      toast.error("E-mail inválido");
      return;
    }
    addAllowedEmail.mutate(email, {
      onSuccess: () => {
        setNewEmail("");
        toast.success("E-mail adicionado");
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível adicionar"),
    });
  };

  const removeEmail = (id: string) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    removeAllowedEmail.mutate(id, {
      onSuccess: () => toast.success("E-mail removido"),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível remover"),
    });
  };

  const saveScoring = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    const rules = [];
    for (const rule of SCORING_RULES) {
      const raw = points[rule.key].trim();
      const value = Number(raw);
      if (
        raw === "" ||
        !Number.isInteger(value) ||
        value < MIN_RULE_POINTS ||
        value > MAX_RULE_POINTS
      ) {
        toast.error(`"${rule.label}" deve ser um número inteiro entre 0 e 1000`);
        return;
      }
      rules.push({ rule_key: rule.key, points: value });
    }
    updateScoring.mutate(rules, {
      onSuccess: () => toast.success("Pontuação atualizada - ranking recalculado"),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar"),
    });
  };

  const leave = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    leavePool.mutate(undefined, {
      onSuccess: () => {
        toast.success("Você saiu do bolão");
        navigate({ to: "/" });
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível sair"),
    });
  };

  const canConfirmDelete = !!pool && confirmName.trim() === pool.name.trim();

  const remove = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    if (!canConfirmDelete) return;
    deletePool.mutate(confirmName, {
      onSuccess: () => {
        toast.success("Bolão excluído");
        navigate({ to: "/" });
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível excluir o bolão"),
    });
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ajustes do bolão e da sua conta.</p>
      </header>

      <div className="space-y-4">
        {isOwner && (
          <Card>
            <h2 className="font-display text-base font-semibold">Bolão</h2>
            <div className="mt-4 space-y-2">
              <Label htmlFor="bn">Nome do bolão</Label>
              <Input
                id="bn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
                className="h-11"
              />
            </div>
            <div className="mt-4 space-y-3">
              <Row
                icon={Lock}
                label="Exigir lista de e-mails autorizados para entrar"
                checked={joinRequiresAllowlist}
                onChange={setJoinRequiresAllowlist}
                disabled={!isOwner}
              />
            </div>
            {joinRequiresAllowlist && (
              <div className="mt-4 space-y-3 rounded-xl bg-surface p-3">
                <h3 className="text-sm font-semibold">E-mails autorizados</h3>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEmail();
                        }
                      }}
                      placeholder="email@email.com"
                      autoComplete="off"
                      className="h-11"
                    />
                    <Button
                      onClick={addEmail}
                      disabled={!isOwner || !online || addAllowedEmail.isPending}
                      className="gold-gradient font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Adicionar
                    </Button>
                  </div>
                )}
                {(allowedEmails.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum e-mail adicionado ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {allowedEmails.data!.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">{item.email}</span>
                        {isOwner && (
                          <Button
                            onClick={() => removeEmail(item.id)}
                            disabled={removeAllowedEmail.isPending || !online}
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                            aria-label="Remover e-mail"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {isOwner && (
              <Button
                onClick={saveSettings}
                disabled={updatePool.isPending || !online}
                className="mt-4 gold-gradient font-semibold text-primary-foreground hover:opacity-90"
              >
                {updatePool.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            )}
          </Card>
        )}

        <Card>
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Target className="h-4 w-4 text-muted-foreground" />
            Pontuação
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isOwner
              ? "Defina quantos pontos cada acerto vale. Alterar recalcula o ranking."
              : "Apenas o administrador pode alterar estes ajustes."}
          </p>
          {scoringRules.isPending ? (
            <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
          ) : scoringRules.isError ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Não foi possível carregar a pontuação.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-4">
                {SCORING_RULES.map((rule) => (
                  <div key={rule.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor={`pts-${rule.key}`}>{rule.label}</Label>
                      <Input
                        id={`pts-${rule.key}`}
                        type="number"
                        inputMode="numeric"
                        min={MIN_RULE_POINTS}
                        max={MAX_RULE_POINTS}
                        value={points[rule.key]}
                        onChange={(e) =>
                          setPoints((prev) => ({ ...prev, [rule.key]: e.target.value }))
                        }
                        disabled={!isOwner}
                        className="h-11 w-24 text-center"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.help}</p>
                  </div>
                ))}
              </div>
              {isOwner && (
                <Button
                  onClick={saveScoring}
                  disabled={updateScoring.isPending || !online}
                  className="mt-4 gold-gradient font-semibold text-primary-foreground hover:opacity-90"
                >
                  {updateScoring.isPending ? "Salvando..." : "Salvar pontuação"}
                </Button>
              )}
            </>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold text-destructive">Zona de risco</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você pode sair do bolão a qualquer momento. Seus palpites permanecerão visíveis no
            histórico.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={leavePool.isPending || !online}
                variant="outline"
                className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                {leavePool.isPending ? "Saindo..." : "Sair do bolão"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sair do bolão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Seus palpites permanecerão visíveis no histórico.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={leave}
                  disabled={leavePool.isPending || !online}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sair do bolão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isOwner && pool && (
            <div className="mt-6 border-t border-destructive/20 pt-5">
              <p className="text-sm text-muted-foreground">
                Excluir o bolão é permanente e remove todos os palpites, membros e o ranking. Esta
                ação não pode ser desfeita.
              </p>
              <AlertDialog onOpenChange={(open) => !open && setConfirmName("")}>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={deletePool.isPending || !online}
                    variant="outline"
                    className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {deletePool.isPending ? "Excluindo..." : "Excluir bolão"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir bolão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é permanente e remove todos os palpites, membros e o ranking. Não é
                      possível desfazer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-delete">
                      Digite <span className="font-semibold text-foreground">{pool.name}</span> para
                      confirmar
                    </Label>
                    <Input
                      id="confirm-delete"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={pool.name}
                      autoComplete="off"
                      className="h-11"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={remove}
                      disabled={!canConfirmDelete || deletePool.isPending || !online}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir definitivamente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-5">{children}</div>;
}

function Row({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
      <div className="flex items-center gap-3 text-sm">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
