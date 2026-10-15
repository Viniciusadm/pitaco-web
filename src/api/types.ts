export type MatchStatus = "scheduled" | "live" | "finished";

/** Which side won a penalty shootout (mirrors the home/away score structure). */
export type PenaltySide = "home" | "away";

export interface Team {
  id: string;
  name: string;
  flag: string;
  group: string;
}

export interface Match {
  id: string;
  homeId: string;
  awayId: string;
  date: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  canGoToPenalties: boolean;
  penaltiesWinner: PenaltySide | null;
  stage: string;
}

export interface CreateTeamRequest {
  name: string;
  code: string;
  flag_emoji: string | null;
}

export type UpdateTeamRequest = CreateTeamRequest;

export interface CreateMatchRequest {
  stage_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
  can_go_to_penalties: boolean;
}

export interface UpdateMatchRequest extends CreateMatchRequest {
  status: string;
}

export interface EnterResultRequest {
  home_score: number;
  away_score: number;
  penalties_winner?: PenaltySide | null;
}

export interface TeamResponse {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
  flag_file_id: string | null;
}

export interface TeamsListResponse {
  teams: TeamResponse[];
}

export interface MatchResponse {
  id: string;
  tournament_id: string;
  stage_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  can_go_to_penalties: boolean;
  penalties_winner: PenaltySide | null;
  finished_at: string | null;
}

export interface MatchesListResponse {
  matches: MatchResponse[];
}

export interface StageResponse {
  id: string;
  tournament_id: string;
  name: string;
  kind: string;
  ordering: number;
}

export interface GroupResponse {
  id: string;
  tournament_id: string;
  label: string;
}

export interface TournamentDetailResponse {
  id: string;
  name: string;
  slug: string;
  season_year: number;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
  stages: StageResponse[];
  groups: GroupResponse[];
}

export type TournamentStatus = "draft" | "active" | "finished" | "archived";

export type StageKind = "group" | "knockout";

export interface TournamentResponse {
  id: string;
  name: string;
  slug: string;
  season_year: number | null;
  starts_on: string | null;
  ends_on: string | null;
  status: TournamentStatus;
}

export interface TournamentsListResponse {
  tournaments: TournamentResponse[];
}

export interface CreateTournamentRequest {
  name: string;
  slug: string;
  season_year: number | null;
  starts_on: string | null;
  ends_on: string | null;
}

export interface UpdateTournamentRequest extends CreateTournamentRequest {
  status: TournamentStatus;
}

export interface StageRequest {
  name: string;
  kind: StageKind;
  ordering: number;
}

export interface GroupRequest {
  label: string;
}

export interface TournamentTeamResponse {
  id: string;
  tournament_id: string;
  team_id: string;
  group_id: string | null;
}

export interface TournamentTeamsListResponse {
  teams: TournamentTeamResponse[];
}

export interface AssignTeamRequest {
  team_id: string;
  group_id: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  display_name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  display_name: string;
}

export interface MeResponse {
  user: {
    id: string;
    display_name: string;
    email: string;
    role: string;
    sync_predictions_across_pools: boolean;
  };
}

export interface UpdateUserPreferencesRequest {
  sync_predictions_across_pools: boolean;
}

export interface PoolResponse {
  id: string;
  tournament_id: string;
  owner_user_id: string;
  name: string;
  invite_code: string;
  join_requires_allowlist: boolean;
  prediction_lock_offset_minutes: number;
  status: string;
}

export interface PoolsListResponse {
  pools: PoolResponse[];
}

export interface PoolMemberResponse {
  id: string;
  pool_id: string;
  user_id: string;
  display_name: string;
  role: string;
  status: string;
  joined_at: string;
  left_at: string | null;
}

export interface PoolMembersListResponse {
  members: PoolMemberResponse[];
}

export interface CreatePoolRequest {
  name: string;
  tournament_id: string;
}

export interface UpdatePoolRequest {
  name: string;
  join_requires_allowlist: boolean;
  prediction_lock_offset_minutes: number;
  status: string;
}

export interface AllowedEmail {
  id: string;
  email: string;
  created_at: string;
}

export interface AllowedEmailsResponse {
  emails: AllowedEmail[];
}

export type ScoringRuleKey =
  | "exact_score"
  | "correct_outcome"
  | "correct_goal_difference"
  | "penalties_winner"
  | "penalties_winner_no_draw";

export interface ScoringRuleResponse {
  id: string;
  pool_id: string;
  rule_key: string;
  points: number;
}

export interface ScoringRulesListResponse {
  rules: ScoringRuleResponse[];
}

export interface ScoringRuleInput {
  rule_key: string;
  points: number;
}

export interface NotificationPreference {
  id: string;
  pool_id: string | null;
  type: string;
  channel: string;
  enabled: boolean;
}

export interface NotificationPreferencesListResponse {
  preferences: NotificationPreference[];
}

export interface PreferenceItem {
  type: string;
  channel: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  pool_id: string | null;
  type: string;
  title: string;
  body: string;
  related_match_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsListResponse {
  notifications: Notification[];
}

export interface JoinPoolResponse {
  pool: PoolResponse;
  member: PoolMemberResponse;
  already_member: boolean;
}

export interface RankingEntry {
  pool_member_id: string;
  display_name: string;
  total_points: number;
  exact_count: number;
  outcome_count: number;
  hits_count: number;
  // Optional: clients with cached/old API responses may not include these.
  penalties_count?: number;
  penalties_no_draw_count?: number;
  position: number;
}

export interface RankingResponse {
  standings: RankingEntry[];
}

export interface MemberPrediction {
  match_id: string;
  match_status: MatchStatus;
  kickoff_at: string;
  prediction_home: number;
  prediction_away: number;
  result_home: number | null;
  result_away: number | null;
  prediction_penalties_pick: PenaltySide | null;
  result_penalties_winner: PenaltySide | null;
  points_awarded: number | null;
  point_reasons?: string[];
}

export interface MemberPredictionsResponse {
  predictions: MemberPrediction[];
}

export interface PredictionResponse {
  id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  penalties_pick: PenaltySide | null;
  points_awarded: number | null;
  scored_at: string | null;
}

export interface PredictionsListResponse {
  predictions: PredictionResponse[];
}

export interface UpsertPredictionRequest {
  home_score: number;
  away_score: number;
  penalties_pick?: PenaltySide | null;
}

export interface HistoryEntry {
  match_id: string;
  match_status: MatchStatus;
  kickoff_at: string;
  prediction_home: number;
  prediction_away: number;
  result_home: number | null;
  result_away: number | null;
  prediction_penalties_pick: PenaltySide | null;
  result_penalties_winner: PenaltySide | null;
  points_awarded: number | null;
  hit_kind: string | null;
}

export interface HistoryResponse {
  pool_member_id: string;
  total_points: number;
  exact_count: number;
  outcome_count: number;
  hits_count: number;
  // Optional: clients with cached/old API responses may not include these.
  penalties_count?: number;
  penalties_no_draw_count?: number;
  errors_count: number;
  pending_count: number;
  entries: HistoryEntry[];
}
