import { supabase } from "./supabaseClient";

export type LeagueCode = "PIONIRI" | "MLADJI";

type TeamStats = {
  team_id: string;
  ut: number;      // odigrane
  p: number;       // pobjede
  n: number;       // neriješene
  i: number;       // izgubljene
  gplus: number;   // postignuti
  gminus: number;  // primljeni
  gr: number;      // gol razlika
  bodovi: number;  // bodovi
};

/**
 * Ponovno izračunava tablicu za zadanu ligu (PIONIRI / MLADJI)
 * na temelju tablica fixtures + results i upisuje u standings.
 */
export async function recalculateStandings(leagueCode: LeagueCode) {
  // 1) Učitaj timove za tu ligu
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id")
    .eq("league_code", leagueCode);

  if (teamsError) {
    console.error("recalculateStandings: error loading teams", teamsError);
    return;
  }

  if (!teams || teams.length === 0) {
    console.warn("recalculateStandings: no teams for league", leagueCode);
    return;
  }

  // 2) Učitaj sve utakmice za tu ligu
  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures")
    .select("id, home_team_id, away_team_id, league_code")
    .eq("league_code", leagueCode);

  if (fixturesError) {
    console.error("recalculateStandings: error loading fixtures", fixturesError);
    return;
  }

  // 3) Učitaj sve rezultate
  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select("fixture_id, home_goals, away_goals");

  if (resultsError) {
    console.error("recalculateStandings: error loading results", resultsError);
    return;
  }

  // Mapiraj rezultate po fixture_id radi bržeg pristupa
  const resultsByFixture: Record<string, { home_goals: number; away_goals: number }> = {};
  (results || []).forEach((r) => {
    resultsByFixture[r.fixture_id] = {
      home_goals: r.home_goals,
      away_goals: r.away_goals,
    };
  });

  // 4) Inicijaliziraj statistiku za svaki tim na nule
  const statsMap: Record<string, TeamStats> = {};
  teams.forEach((t) => {
    statsMap[t.id] = {
      team_id: t.id,
      ut: 0,
      p: 0,
      n: 0,
      i: 0,
      gplus: 0,
      gminus: 0,
      gr: 0,
      bodovi: 0,
    };
  });

  // 5) Prođi kroz sve utakmice lige i obračunaj statistiku
  (fixtures || []).forEach((f) => {
    const res = resultsByFixture[f.id];
    if (!res) {
      // utakmica još nema rezultat
      return;
    }

    const homeId = f.home_team_id as string;
    const awayId = f.away_team_id as string;

    const home = statsMap[homeId];
    const away = statsMap[awayId];

    if (!home || !away) {
      // neka ekipa ne postoji u teams za ovu ligu – preskoči
      return;
    }

    const hg = Number(res.home_goals) || 0;
    const ag = Number(res.away_goals) || 0;

    // odigrana utakmica
    home.ut += 1;
    away.ut += 1;

    // golovi
    home.gplus += hg;
    home.gminus += ag;

    away.gplus += ag;
    away.gminus += hg;

    // bodovi / P / N / I
    if (hg > ag) {
      // domaćin pobijedio
      home.p += 1;
      home.bodovi += 3;

      away.i += 1;
    } else if (hg < ag) {
      // gost pobijedio
      away.p += 1;
      away.bodovi += 3;

      home.i += 1;
    } else {
      // neriješeno
      home.n += 1;
      away.n += 1;

      home.bodovi += 1;
      away.bodovi += 1;
    }
  });

  // 6) Izračunaj gol razliku (gr) za svaki tim
  Object.values(statsMap).forEach((s) => {
    s.gr = s.gplus - s.gminus;
  });

  const rowsToInsert = Object.values(statsMap).map((s) => ({
    league_code: leagueCode,
    team_id: s.team_id,
    ut: s.ut,
    p: s.p,
    n: s.n,
    i: s.i,
    gplus: s.gplus,
    gminus: s.gminus,
    gr: s.gr,
    bodovi: s.bodovi,
  }));

  // 7) Očisti postojeće standings za tu ligu
  const { error: deleteError } = await supabase
    .from("standings")
    .delete()
    .eq("league_code", leagueCode);

  if (deleteError) {
    console.error("recalculateStandings: error deleting old standings", deleteError);
    return;
  }

  // 8) Upis novih izračunatih podataka
  const { error: insertError } = await supabase
    .from("standings")
    .insert(rowsToInsert);

  if (insertError) {
    console.error("recalculateStandings: error inserting new standings", insertError);
    return;
  }

  console.log(`recalculateStandings: standings updated for league ${leagueCode}`);
}
