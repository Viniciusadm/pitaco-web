import { useState } from "react";
import { KeyRound } from "lucide-react";
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
import { useJoinPool } from "@/api/pools";
import { clearPendingInvite } from "@/lib/invite";
import { useOnline } from "@/hooks/use-online";
import { useAuthStore } from "@/store/auth-store";

export function JoinPoolDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const setPoolId = useAuthStore((s) => s.setPoolId);
  const online = useOnline();
  const joinPool = useJoinPool();

  const handleOpenChange = (next: boolean) => {
    if (!next) setCode("");
    onOpenChange(next);
  };

  const handleJoin = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    if (!code.trim()) {
      toast.error("Informe o código do bolão");
      return;
    }
    joinPool.mutate(code.trim(), {
      onSuccess: (res) => {
        setPoolId(res.pool.id);
        clearPendingInvite();
        toast.success(res.already_member ? "Você já participa deste bolão" : "Bem-vindo ao bolão!");
        handleOpenChange(false);
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível entrar"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="mt-4">Entrar em um bolão</DialogTitle>
          <DialogDescription>Digite o código de convite que você recebeu.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="entrar-bolao-code">Código de convite</Label>
          <Input
            id="entrar-bolao-code"
            placeholder="Ex: 3F9A1C7B2E"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="h-12 text-base"
            autoFocus
          />
        </div>

        <Button
          onClick={handleJoin}
          disabled={joinPool.isPending || !online}
          className="h-12 w-full gold-gradient text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          {joinPool.isPending ? "Entrando..." : "Entrar no bolão"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
