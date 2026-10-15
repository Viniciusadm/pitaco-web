import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Trophy, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getToken } from "@/api/session";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getToken()) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Pitaco - Crie ou entre em um bolão" },
      {
        name: "description",
        content:
          "Crie seu bolão de futebol ou entre em um existente. Palpites, ranking e história em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
        <Link
          to="/login"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Já tenho conta →
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-20 text-center sm:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Bolões de futebol entre amigos
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-6xl">
          Aposte com seus amigos.
          <br />
          <span className="gold-text">Vença com estilo.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Crie um bolão em segundos, escolha o campeonato, convide a galera e acompanhe o ranking em
          tempo real a cada rodada.
        </p>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          <Link to="/bolao/criar" className="group">
            <div className="relative h-full rounded-3xl border border-primary/40 bg-card p-6 text-left transition-all hover:border-primary hover:shadow-[var(--shadow-gold)]">
              <div className="grid h-12 w-12 place-items-center rounded-2xl gold-gradient">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Criar um bolão</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Monte seu bolão e gere um link de convite para compartilhar.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Começar agora{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link to="/bolao/entrar" className="group">
            <div className="relative h-full rounded-3xl border border-border bg-card p-6 text-left transition-all hover:border-primary/60">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold">Entrar em um bolão</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tenho um código ou link de convite e quero participar.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Tenho um código{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
