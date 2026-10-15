import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { passwordRules } from "@/lib/password";
import { useRegister } from "@/api/auth";
import { getToken, setToken } from "@/api/session";
import { getPendingInvite } from "@/lib/invite";
import { useOnline } from "@/hooks/use-online";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getToken()) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({ meta: [{ title: "Criar conta - Pitaco" }] }),
  component: RegisterPage,
});

const schema = z.object({
  display_name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres")
    .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra")
    .regex(/[0-9]/, "A senha deve conter ao menos um número"),
});

type Form = z.infer<typeof schema>;

function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const online = useOnline();
  const { mutateAsync, isPending } = useRegister();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });
  const passwordValue = watch("password") ?? "";

  const onSubmit = handleSubmit(async (values) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    try {
      const res = await mutateAsync(values);
      setToken(res.access_token);
      setSession({ userId: res.user_id, displayName: res.display_name });
      const pending = getPendingInvite();
      navigate({ to: pending ? "/bolao/entrar" : "/app/historico" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta");
    }
  });

  return (
    <AuthLayout>
      <form
        onSubmit={onSubmit}
        className="w-full rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre-se para criar e participar de bolões.
        </p>

        <div className="mt-8 space-y-2">
          <Label htmlFor="display_name">Nome</Label>
          <Input
            id="display_name"
            placeholder="Seu nome"
            className="h-12 text-base"
            {...register("display_name")}
          />
          {errors.display_name && (
            <p className="text-xs text-destructive">{errors.display_name.message}</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@email.com"
            className="h-12 text-base"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            className="h-12 text-base"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          <ul className="mt-2 space-y-1">
            {passwordRules.map((rule) => {
              const ok = rule.test(passwordValue);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs ${
                    ok ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                >
                  {ok ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Button
          type="submit"
          disabled={isPending || !online}
          className="mt-6 h-12 w-full gold-gradient text-base font-semibold text-primary-foreground hover:opacity-90"
        >
          {isPending ? "Criando..." : "Criar conta"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
