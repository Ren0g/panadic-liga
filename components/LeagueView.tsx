"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Standing = {
  league_code: string;
  team_id: string;
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
  const [standings, setStandings] = useState<
    (Standing & { team_name: string })[]
  >([]);
  const [nextMatch, setNextMatch] = useState<any | null>(null);
  const [nextMatchResult, setNextMatchResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  const leagueName = leagueCode === "PIONIRI" ? "Pioniri" : "Mlađi pioniri";
  const banTeamName =
    leagueCode === "PIONIRI" ? "Ban Jelačić 2" : "Ban Jelačić";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // -------------------------
      // 1) Load teams
      // -------------------------
      const { data: teams } = await supabase
        .from("teams")
        .select("id, name");

      const teamMap: Record<string, string> = {};
      teams?.forEach((t) => (teamMap[t.id] = t.name));

      // -------------------------
      // 2) Load standings
      // -------------------------
      const { data: rawStandings } = await supabase
        .from("standings")
        .select("*")
        .eq("league_code", leagueCode)
        .order("bodovi", { ascending: false })
        .order("gr", { ascending: false });

      const finalStandings =
        rawStandings?.map((s: Standing) => ({
          ...s,
          team_name: teamMap[s.team_id] ?? "Nepoznato",
        })) ?? [];

      setStandings(finalStandings);

      // -------------------------
      // 3) Find Ban Jelačić team ID
      // -------------------------
      const banTeam = finalStandings.find(
        (t) => t.team_name === banTeamName
      );
      if (!banTeam) {
        setNextMatch(null);
        setNextMatchResult(null);
        setLoading(false);
        return;
      }

      // -------------------------
      // 4) Load fixtures
      // -------------------------
      const { data: rawFixtures } = await supabase
        .from("fixtures")
        .select("*")
        .eq("league_code", leagueCode)
        .or(
          `home_team_id.eq.${banTeam.team_id},away_team_id.eq.${banTeam.team_id}`
        );

      const now = new Date();

      const future = (rawFixtures || [])
        .map((f: any) => ({
          ...f,
          home_team_name: teamMap[f.home_team_id] ?? "Nepoznato",
          away_team_name: teamMap[f.away_team_id] ?? "Nepoznato",
          fullDate: new Date(`${f.match_date}T${f.match_time}:00`),
        }))
        .filter((f) => f.fullDate > now)
        .sort((a, b) => a.fullDate - b.fullDate);

      const next = future[0] ?? null;
      setNextMatch(next);

      // -------------------------
      // 5) Result
      // -------------------------
      if (next) {
        const { data: res } = await supabase
          .from("results")
          .select("home_goals, away_goals")
          .eq("fixture_id", next.id)
          .maybeSingle();

        setNextMatchResult(res ?? null);
      }

      setLoading(false);
    };

    loadData();
  }, [leagueCode, refreshKey]);

  if (loading) return <p className="text-black">Učitavanje...</p>;

  return (
    <div className="space-y-6">

      {/* -------------------------------- */}
      {/* TABLICA */}
      {/* -------------------------------- */}
      <div className="bg-[#f3ebd8] p-4 rounded-xl shadow border border-[#c8b59a] text-[#1a1a1a]">
        <h1 className="text-xl font-bold mb-4 text-[#0A5E2A]">
          {leagueName} — Tablica
        </h1>

        <table className="w-full text-sm">
          <thead className="border-b border-[#c8b59a] text-[#0A5E2A]">
            <tr>
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
              <tr
                key={s.team_id}
                className="border-b border-[#e3d4bf] bg-white"
              >
                <td className="py-2 px-1 text-[#1a1a1a]">{i + 1}</td>
                <td className="py-2 text-[#1a1a1a]">{s.team_name}</td>
                <td className="py-2 text-center">{s.ut}</td>
                <td className="py-2 text-center">{s.p}</td>
                <td className="py-2 text-center">{s.n}</td>
                <td className="py-2 text-center">{s.i}</td>
                <td className="py-2 text-center">{s.gplus}</td>
                <td className="py-2 text-center">{s.gminus}</td>
                <td className="py-2 text-center">{s.gr}</td>
                <td className="py-2 text-center text-[#0A5E2A] font-bold">
                  {s.bodovi}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* -------------------------------- */}
      {/* SLJEDEĆA UTAKMICA */}
      {/* -------------------------------- */}
      <div className="bg-[#0A5E2A] text-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-2">
          Iduća utakmica — {banTeamName}
        </h2>

        {nextMatch ? (
          <div className="space-y-1 text-sm">
            <p>
              <b>Par:</b>{" "}
              {nextMatch.home_team_name} — {nextMatch.away_team_name}
            </p>
            <p>
              <b>Kolo:</b> {nextMatch.round}
            </p>
            <p>
              <b>Datum:</b> {nextMatch.match_date} u {nextMatch.match_time}
            </p>
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
