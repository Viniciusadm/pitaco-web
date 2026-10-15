import type { StageKind, TournamentStatus } from "@/api/types";

export const TOURNAMENT_STATUS_ORDER: TournamentStatus[] = [
  "draft",
  "active",
  "finished",
  "archived",
];

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  finished: "Encerrado",
  archived: "Arquivado",
};

export const STAGE_KIND_LABEL: Record<StageKind, string> = {
  group: "Fase de grupos",
  knockout: "Mata-mata",
};

export function allowedStatusTransitions(current: TournamentStatus): TournamentStatus[] {
  const index = TOURNAMENT_STATUS_ORDER.indexOf(current);
  return TOURNAMENT_STATUS_ORDER.slice(index, index + 2);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCalendarDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
