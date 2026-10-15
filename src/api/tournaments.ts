import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type {
  AssignTeamRequest,
  CreateTournamentRequest,
  GroupRequest,
  GroupResponse,
  StageRequest,
  StageResponse,
  TournamentDetailResponse,
  TournamentResponse,
  TournamentsListResponse,
  TournamentTeamResponse,
  TournamentTeamsListResponse,
  UpdateTournamentRequest,
} from "@/api/types";

export const TOURNAMENTS_KEY = ["tournaments"] as const;

const tournamentKey = (id: string) => ["tournament", id] as const;
const tournamentTeamsKey = (id: string) => ["tournament", id, "teams"] as const;

export async function getTournaments(): Promise<TournamentResponse[]> {
  const res = await api.get<TournamentsListResponse>("/tournaments");
  return res.data.tournaments;
}

export function useTournaments() {
  return useQuery({
    queryKey: TOURNAMENTS_KEY,
    queryFn: getTournaments,
  });
}

export function useActiveTournaments() {
  const tournaments = useTournaments();
  const active = useMemo(
    () =>
      (tournaments.data ?? [])
        .filter((t) => t.status === "active")
        .sort((a, b) => (a.starts_on ?? "").localeCompare(b.starts_on ?? "")),
    [tournaments.data],
  );
  return { ...tournaments, active };
}

export async function getTournamentDetail(id: string): Promise<TournamentDetailResponse> {
  const res = await api.get<TournamentDetailResponse>(`/tournaments/${id}`);
  return res.data;
}

export function useTournamentDetail(id: string) {
  return useQuery({
    queryKey: tournamentKey(id),
    queryFn: () => getTournamentDetail(id),
    enabled: Boolean(id),
  });
}

export async function createTournament(body: CreateTournamentRequest): Promise<TournamentResponse> {
  const res = await api.post<TournamentResponse>("/tournaments", body);
  return res.data;
}

export async function updateTournament(
  id: string,
  body: UpdateTournamentRequest,
): Promise<TournamentResponse> {
  const res = await api.put<TournamentResponse>(`/tournaments/${id}`, body);
  return res.data;
}

export async function deleteTournament(id: string): Promise<void> {
  await api.delete(`/tournaments/${id}`);
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTournament,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY }),
  });
}

export function useUpdateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateTournamentRequest }) =>
      updateTournament(vars.id, vars.body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: tournamentKey(vars.id) });
    },
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTournament,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY });
      queryClient.removeQueries({ queryKey: tournamentKey(id) });
    },
  });
}

export async function createStage(
  tournamentId: string,
  body: StageRequest,
): Promise<StageResponse> {
  const res = await api.post<StageResponse>(`/tournaments/${tournamentId}/stages`, body);
  return res.data;
}

export async function updateStage(id: string, body: StageRequest): Promise<StageResponse> {
  const res = await api.put<StageResponse>(`/stages/${id}`, body);
  return res.data;
}

export async function deleteStage(id: string): Promise<void> {
  await api.delete(`/stages/${id}`);
}

export function useCreateStage(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StageRequest) => createStage(tournamentId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKey(tournamentId) }),
  });
}

export function useUpdateStage(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: StageRequest }) => updateStage(vars.id, vars.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKey(tournamentId) }),
  });
}

export function useDeleteStage(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKey(tournamentId) }),
  });
}

export async function createGroup(
  tournamentId: string,
  body: GroupRequest,
): Promise<GroupResponse> {
  const res = await api.post<GroupResponse>(`/tournaments/${tournamentId}/groups`, body);
  return res.data;
}

export async function updateGroup(id: string, body: GroupRequest): Promise<GroupResponse> {
  const res = await api.put<GroupResponse>(`/groups/${id}`, body);
  return res.data;
}

export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/groups/${id}`);
}

export function useCreateGroup(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupRequest) => createGroup(tournamentId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKey(tournamentId) }),
  });
}

export function useUpdateGroup(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: GroupRequest }) => updateGroup(vars.id, vars.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKey(tournamentId) }),
  });
}

export function useDeleteGroup(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentKey(tournamentId) }),
  });
}

export async function getTournamentTeams(tournamentId: string): Promise<TournamentTeamResponse[]> {
  const res = await api.get<TournamentTeamsListResponse>(`/tournaments/${tournamentId}/teams`);
  return res.data.teams;
}

export function useTournamentTeams(tournamentId: string) {
  return useQuery({
    queryKey: tournamentTeamsKey(tournamentId),
    queryFn: () => getTournamentTeams(tournamentId),
    enabled: Boolean(tournamentId),
  });
}

export async function assignTeam(
  tournamentId: string,
  body: AssignTeamRequest,
): Promise<TournamentTeamResponse> {
  const res = await api.post<TournamentTeamResponse>(`/tournaments/${tournamentId}/teams`, body);
  return res.data;
}

export async function unassignTeam(tournamentId: string, tournamentTeamId: string): Promise<void> {
  await api.delete(`/tournaments/${tournamentId}/teams/${tournamentTeamId}`);
}

export function useAssignTeam(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignTeamRequest) => assignTeam(tournamentId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentTeamsKey(tournamentId) }),
  });
}

export function useUnassignTeam(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tournamentTeamId: string) => unassignTeam(tournamentId, tournamentTeamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tournamentTeamsKey(tournamentId) }),
  });
}
