import { useState } from "react";
import { Check, Copy, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePool } from "@/api/pools";
import { PoolTournamentField } from "@/components/tournament-select";
import { usePoolTournamentChoice } from "@/hooks/use-pool-tournament-choice";
import { buildInviteUrl } from "@/lib/invite";
import { useOnline } from "@/hooks/use-online";
import { useAuthStore } from "@/store/auth-store";

export function CreatePoolDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const setPoolId = useAuthStore((s) => s.setPoolId);
  const online = useOnline();
  const createPool = useCreatePool();
  const tournamentChoice = usePoolTournamentChoice();
  const { tournamentId } = tournamentChoice;

  const reset = () => {
    setName("");
    setInviteCode(null);
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    if (!name.trim()) {
      toast.error("Dê um nome ao seu bolão");
      return;
    }
    if (!tournamentId) {
      toast.error("Escolha o campeonato");
      return;
    }
    createPool.mutate(
      { name: name.trim(), tournament_id: tournamentId },
      {
        onSuccess: (pool) => {
          setPoolId(pool.id);
          setInviteCode(pool.invite_code);
          toast.success("Bolão criado com sucesso!");
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Não foi possível criar o bolão"),
      },
    );
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(buildInviteUrl(inviteCode));
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {!inviteCode ? (
          <>
            <DialogHeader>
              <div className="grid h-12 w-12 place-items-center rounded-2xl gold-gradient">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <DialogTitle className="mt-4">Criar novo bolão</DialogTitle>
              <DialogDescription>
                Dê um nome para o seu bolão. Você poderá convidar participantes em seguida.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="new-pool-name">Nome do bolão</Label>
              <Input
                id="new-pool-name"
                placeholder="Ex: Bolão da firma 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="h-12 text-base"
                autoFocus
              />
            </div>

            <PoolTournamentField
              tournaments={tournamentChoice.tournaments}
              loading={tournamentChoice.loading}
              value={tournamentId}
              onChange={tournamentChoice.setTournamentId}
            />

            <Button
              onClick={handleCreate}
              disabled={
                createPool.isPending || !online || tournamentChoice.tournaments.length === 0
              }
              className="h-12 w-full gold-gradient text-base font-semibold text-primary-foreground hover:opacity-90"
            >
              {createPool.isPending ? "Criando..." : "Criar bolão"}
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-success/20">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <DialogTitle>Pronto! "{name}" está no ar</DialogTitle>
                  <DialogDescription>Compartilhe o link de convite abaixo</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="flex items-center gap-2 rounded-2xl border border-border bg-input p-2">
              <code className="flex-1 truncate px-3 text-sm font-semibold tracking-wider text-foreground">
                {buildInviteUrl(inviteCode)}
              </code>
              <Button
                onClick={copyCode}
                size="sm"
                className="gold-gradient text-primary-foreground hover:opacity-90"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
              </Button>
            </div>

            <Button
              onClick={() => handleOpenChange(false)}
              variant="outline"
              className="w-full border-primary/40 hover:bg-primary/10"
            >
              Ir para o bolão →
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
