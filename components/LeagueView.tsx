"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Standing = {
  league_code: string;
  team_id: string;
  team_name: string;
  ut: number; // utakmica
  p: number;  // pobjede
  n: number;  // neriješene
  i: number;  // izgubljene
  gplus: number;
  gminus: number;
  gr: number; // gol razlika
  bodovi: number;
};

type Fixture = {
  id: string;
  league_code: string;
  round: string;
  match_date: string;
  match_time: string;
  home_team_id: string;
  away_team_id: string;
};

type Result = {
  home_goals: number;
  away_goals: number;
};

export default function LeagueView({ leagueCode }: { leagueCode: "PIONIRI" | "MLADJI" }) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [nextMatch, setNextMatch] = useState<Fixture | null>(null);
  const [nextMatchResult, setNextMatchResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  const leagueName =
    leagueCode === "PIONIRI" ? "Pioniri" : "Mlađi pioniri";

  const banTeamName =
    leagueCode === "PIONIRI" ? "Ban Jelačić 2" : "Ban Jelačić";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1) TABLICA
      const { data: standingsData } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", leagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      setStandings(standingsData || []);

      // 2) NAĐI ID teama Ban Jelačić / Ban Jelačić 2
      const team = standingsData?.find((t) => t.team_name === banTeamName);
      if (!team) {
        setNextMatch(null);
        setNextMatchResult(null);
        setLoading(false);
        return;
      }

      // 3) PRONAĐI IDUĆU UTAKMICU
      const today = new Date();

      const { data: fixturesData } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", leagueCode)
        .or(`home_team_id.eq.${team.team_id},away_team_id.eq.${team.team_id}`);

      const upcoming = (fixturesData || [])
        .map((f: Fixture) => ({
          ...f,
          fullDate: new Date(`${f.match_date}T${f.match_time}:00`),
        }))
        .filter((f) => f.fullDate > today)
        .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

      const next = upcoming[0] || null;
      setNextMatch(next);

      // 4) AKO POSTOJI REZULTAT ZA TU UTAKMICU
      if (next) {
        const { data: resultData } = await supabase
          .from("results")
          .select("home_goals, away_goals")
          .eq("fixture_id", next.id)
          .maybeSingle();

        setNextMatchResult(resultData || null);
      }

      setLoading(false);
    };

    loadData();
  }, [leagueCode]);

  if (loading) return <p>Učitavanje...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{leagueName} – Tablica</h1>

      {/* TABLICA */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left">#</th>
            <th className="text-left">Klub</th>
            <th className="text-center">UT</th>
            <th className="text-center">P</th>
            <th className="text-center">N</th>
            <th className="text-center">I</th>
            <th className="text-center">G+</th>
            <th className="text-center">G-</th>
            <th className="text-center">GR</th>
            <th className="text-center">Bod</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team_id} className="border-b">
              <td>{i + 1}</td>
              <td>{s.team_name}</td>
              <td className="text-center">{s.ut}</td>
              <td className="text-center">{s.p}</td>
              <td className="text-center">{s.n}</td>
              <td className="text-center">{s.i}</td>
              <td className="text-center">{s.gplus}</td>
              <td className="text-center">{s.gminus}</td>
              <td className="text-center">{s.gr}</td>
              <td className="text-center">{s.bodovi}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* IDUĆA UTAKMICA */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">
          Iduća utakmica – {banTeamName}
        </h2>

        {nextMatch ? (
          <div className="text-sm space-y-1">
            <p>
              <b>Kolo:</b> {nextMatch.round}
            </p>
            <p>
              <b>Datum:</b> {nextMatch.match_date} u {nextMatch.match_time}
            </p>

            {nextMatchResult ? (
              <p>
                <b>Rezultat:</b> {nextMatchResult.home_goals}:
                {nextMatchResult.away_goals}
              </p>
            ) : (
              <p><b>Rezultat:</b> —</p>
            )}
          </div>
        ) : (
          <p>Nema nadolazećih utakmica.</p>
        )}
      </div>
    </div>
  );
}
