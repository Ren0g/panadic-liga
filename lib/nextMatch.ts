import { supabase } from "./supabaseClient";

export type NextMatch = {
  id: string;
  round: string | null;
  match_date: string | null;
  match_time: string | null;
  home_team_name: string;
  away_team_name: string;
  isHome: boolean;
};

export async function getNextMatchForTeam(
  leagueCode: string,
  teamName: string
): Promise<NextMatch | null> {
  // 1) nađi ID ekipe
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("name", teamName)
    .eq("league_code", leagueCode)
    .single();

  if (teamError || !team) {
    console.error("Team not found", teamError?.message);
    return null;
  }

  const teamId = team.id as string;

  // 2) uzmi prvu sljedeću utakmicu
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures")
    .select(
      `
      id,
      round,
      match_date,
      match_time,
      league_code,
      home_team_id,
      away_team_id,
      home:home_team_id ( name ),
      away:away_team_id ( name )
    `
    )
    .eq("league_code", leagueCode)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .gte("match_date", today)
    .order("match_date", { ascending: true })
    .order("match_time", { ascending: true })
    .limit(1);

  if (fixturesError) {
    console.error("Error loading next match", fixturesError.message);
    return null;
  }

  if (!fixtures || fixtures.length === 0) {
    return null;
  }

  const f = fixtures[0] as any;
  const isHome = f.home_team_id === teamId;

  return {
    id: f.id,
    round: f.round,
    match_date: f.match_date,
    match_time: f.match_time,
    home_team_name: f.home?.name ?? "",
    away_team_name: f.away?.name ?? "",
    isHome,
  };
}
