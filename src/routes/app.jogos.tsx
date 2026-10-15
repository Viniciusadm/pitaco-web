import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarX, Check, ChevronsUpDown, Globe, X } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTeams } from "@/api/teams";
import { useMatches } from "@/api/matches";
import { useTournamentDetail } from "@/api/tournaments";
import { usePools } from "@/api/pools";
import { useAuthStore } from "@/store/auth-store";
import { toMatch, toTeam } from "@/api/adapters";
import { formatGroupDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { Team } from "@/api/types";

export const Route = createFileRoute("/app/jogos")({
  head: () => ({ meta: [{ title: "Jogos - Pitaco" }] }),
  component: GamesPage,
});

const TBD: Team = { id: "", name: "A definir", flag: "🏳️", group: "" };

function GamesPage() {
  const poolId = useAuthStore((s) => s.poolId) ?? "";
  const pools = usePools();
  const tournamentId = pools.data?.find((p) => p.id === poolId)?.tournament_id ?? "";

  const tournament = useTournamentDetail(tournamentId);
  const teams = useTeams();
  const matches = useMatches(tournamentId);

  const [countryId, setCountryId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    (teams.data ?? []).forEach((t) => map.set(t.id, toTeam(t)));
    return map;
  }, [teams.data]);

  const stageNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tournament.data?.stages ?? []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [tournament.data]);

  const countries = useMemo(() => {
    const ids = new Set<string>();
    (matches.data ?? []).forEach((m) => {
      if (m.home_team_id) ids.add(m.home_team_id);
      if (m.away_team_id) ids.add(m.away_team_id);
    });
    return Array.from(ids)
      .map((id) => teamsById.get(id))
      .filter((s): s is Team => !!s)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [matches.data, teamsById]);

  const selectedCountry = countryId ? teamsById.get(countryId) : undefined;

  const grouped = useMemo(() => {
    const allMatches = (matches.data ?? []).map((m) =>
      toMatch(m, stageNameById.get(m.stage_id) ?? ""),
    );
    const filtered = countryId
      ? allMatches.filter((m) => m.homeId === countryId || m.awayId === countryId)
      : allMatches;
    const map = new Map<string, typeof allMatches>();
    [...filtered]
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .forEach((m) => {
        const key = formatGroupDate(m.date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      });
    return Array.from(map.entries());
  }, [matches.data, stageNameById, countryId]);

  const isPending = tournament.isPending || teams.isPending || matches.isPending;
  const isError = tournament.isError || teams.isError || matches.isError;

  const retry = () => {
    tournament.refetch();
    teams.refetch();
    matches.refetch();
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Jogos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Calendário completo da competição.</p>
        </div>

        {!isPending && !isError && countries.length > 0 && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-11 w-full justify-between rounded-xl border-border bg-card px-3 font-normal sm:w-64"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedCountry ? (
                    <>
                      <span className="text-base leading-none">{selectedCountry.flag}</span>
                      <span className="truncate font-medium text-foreground">
                        {selectedCountry.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Todos os países</span>
                    </>
                  )}
                </span>
                {selectedCountry ? (
                  <X
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCountryId(null);
                    }}
                  />
                ) : (
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar país..." />
                <CommandList>
                  <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Todos os países"
                      onSelect={() => {
                        setCountryId(null);
                        setOpen(false);
                      }}
                    >
                      <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                      Todos os países
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          countryId === null ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    {countries.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.name}
                        onSelect={() => {
                          setCountryId(s.id);
                          setOpen(false);
                        }}
                      >
                        <span className="mr-2 text-base leading-none">{s.flag}</span>
                        <span className="truncate">{s.name}</span>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            countryId === s.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </header>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os jogos.</p>
          <button
            onClick={retry}
            className="mt-4 inline-flex items-center justify-center rounded-md gold-gradient px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <CalendarX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {selectedCountry
              ? `Nenhum jogo para ${selectedCountry.name}.`
              : "Nenhum jogo cadastrado."}
          </p>
          {selectedCountry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCountryId(null)}
              className="mt-3 text-muted-foreground hover:text-foreground"
            >
              Ver todos
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {date}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    home={teamsById.get(m.homeId) ?? TBD}
                    away={teamsById.get(m.awayId) ?? TBD}
                    editable={false}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
