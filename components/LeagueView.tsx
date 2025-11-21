"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Standing = {
  league_code: string;
  team_id: string;
  team_name: string;
  ut: number;
  p: number;
  n: number;
  i: number;
  gplus: number;
  gminus: number;
  gr: number;
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

export default function LeagueView({
  leagueCode,
  refreshKey,
}: {
  leagueCode: "PIONIRI" | "MLADJI";
  refreshKey?: number;
}) {
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

      const { data: standingsData } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", leagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      setStandings(standingsData || []);

      const team = standingsData?.find((t) => t.team_name === banTeamName);
      if (!team) {
        setNextMatch(null);
        setNextMatchResult(null);
        setLoading(false);
        return;
      }

      const now = new Date();

      const { data: fixturesData } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", leagueCode)
        .or(`home_team_id.eq.${team.team_id},away_team_id.eq.${team.team_id}`);

      const upcoming = (fixturesData || [])
        .map((f: any) => ({
          ...f,
          fullDate: new Date(`${f.match_date}T${f.match_time}:00`),
        }))
        .filter((f) => f.fullDate > now)
        .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

      const next = upcoming[0] || null;
      setNextMatch(next);

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
  }, [leagueCode, refreshKey]);

  if (loading) return <p>Učitavanje...</p>;

  return (
    <div className="space-y-6">

      {/* BEŽ KARTICA — TABLICA */}
      <div className="bg-[#fdf7ef] p-4 rounded-xl shadow border border-[#e8dfd5]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {leagueName} — Tablica
        </h1>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e2d7c7]">
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Klub</th>
              <th className="py-2 text-center">UT</th>
              <th className="py-2 text-center">P</th>
              <th className="py-2 text-center">N</th>
              <th className="py-2 text-center">I</th>
              <th className="py-2 text-center">G+</th>
              <th className="py-2 text-center">G-</th>
              <th className="py-2 text-center">GR</th>
              <th className="py-2 text-center">Bod</th>
            </tr>
          </thead>

          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team_id} className="border-b border-[#eee2d5]">
                <td className="py-2">{i + 1}</td>
                <td className="py-2">{s.team_name}</td>
                <td className="py-2 text-center">{s.ut}</td>
                <td className="py-2 text-center">{s.p}</td>
                <td className="py-2 text-center">{s.n}</td>
                <td className="py-2 text-center">{s.i}</td>
                <td className="py-2 text-center">{s.gplus}</td>
                <td className="py-2 text-center">{s.gminus}</td>
                <td className="py-2 text-center">{s.gr}</td>
                <td className="py-2 text-center">{s.bodovi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ZELENI BLOK — IDUĆA UTAKMICA */}
      <div className="bg-[#0A5E2A] text-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">
          Iduća utakmica — {banTeamName}
        </h2>

        {nextMatch ? (
          <div className="space-y-1 text-sm">
            <p><b>Kolo:</b> {nextMatch.round}</p>
            <p><b>Datum:</b> {nextMatch.match_date} u {nextMatch.match_time}</p>
            <p>
              <b>Rezultat:</b>{" "}
              {nextMatchResult
                ? `${nextMatchResult.home_goals}:${nextMatchResult.away_goals}`
                : "—"}
            </p>
          </div>
        ) : (
          <p>Nema nadolazećih utakmica.</p>
        )}
      </div>
    </div>
  );
}
