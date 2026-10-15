import { useState } from "react";
import { useActiveTournaments } from "@/api/tournaments";

export function usePoolTournamentChoice() {
  const tournaments = useActiveTournaments();
  const [selectedId, setSelectedId] = useState("");
  const tournamentId =
    selectedId || (tournaments.active.length === 1 ? tournaments.active[0].id : "");
  return {
    tournaments: tournaments.active,
    loading: tournaments.isPending,
    tournamentId,
    setTournamentId: setSelectedId,
  };
}
