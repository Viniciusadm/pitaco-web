import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinPool } from "@/api/pools";
import { getToken } from "@/api/session";
import { clearPendingInvite, getPendingInvite, setPendingInvite } from "@/lib/invite";
import { useOnline } from "@/hooks/use-online";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/bolao/entrar")({
  head: () => ({ meta: [{ title: "Entrar em bolão - Pitaco" }] }),
  validateSearch: (s): { code?: string } => ({
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (typeof window === "undefined") return;
    if (search.code) setPendingInvite(search.code);
    if (!getToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: JoinPool,
});

function JoinPool() {
  const search = Route.useSearch();
  const [code, setCode] = useState(search.code ?? getPendingInvite() ?? "");
  const navigate = useNavigate();
  const setPoolId = useAuthStore((s) => s.setPoolId);
  const online = useOnline();
  const joinPool = useJoinPool();

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
        navigate({ to: "/app/palpites" });
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível entrar"),
    });
  };

  return (
    <AuthLayout>
      <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">Entrar em um bolão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Digite o código de convite que você recebeu.
        </p>

        <div className="mt-8 space-y-2">
          <Label htmlFor="code">Código de convite</Label>
          <Input
            id="code"
            placeholder="Ex: 3F9A1C7B2E"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="h-12 text-base"
          />
        </div>

        <Button
          onClick={handleJoin}
          disabled={joinPool.isPending || !online}
          className="mt-6 h-12 w-full gold-gradient text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          {joinPool.isPending ? "Entrando..." : "Entrar no bolão"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Não tem um código?{" "}
          <Link to="/bolao/criar" className="text-primary hover:underline">
            Crie seu próprio bolão
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
