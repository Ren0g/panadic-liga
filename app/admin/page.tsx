"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LeagueView from "@/components/LeagueView";

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

export default function AdminPage() {
  const [leagueCode, setLeagueCode] = useState<"PIONIRI" | "MLADJI">("PIONIRI");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [results, setResults] = useState<Record<string, Result | null>>({});
  const [loading, setLoading] = useState(true);

  const [editFixtureId, setEditFixtureId] = useState<string | null>(null);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFixtures = async () => {
    setLoading(true);

    // 1) Dohvati sve utakmice za ligu
    const { data: fixturesData } = await supabase
      .from("fixtures")
      .select("*")
      .eq("league_code", leagueCode)
      .order("round", { ascending: true })
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    setFixtures(fixturesData || []);

    // 2) Dohvati sve rezultate za tu ligu
    const { data: resultsData } = await supabase
      .from("results")
      .select("*");

    const byFixture: Record<string, Result | null> = {};
    resultsData?.forEach((r: any) => {
      byFixture[r.fixture_id] = {
        home_goals: r.home_goals,
        away_goals: r.away_goals,
      };
    });

    setResults(byFixture);
    setLoading(false);
  };

  useEffect(() => {
    loadFixtures();
  }, [leagueCode]);

  const startEditing = (fixture: Fixture) => {
    setEditFixtureId(fixture.id);

    const res = results[fixture.id];
    setHomeGoals(res ? String(res.home_goals) : "");
    setAwayGoals(res ? String(res.away_goals) : "");
  };

  const saveResult = async () => {
    if (!editFixtureId) return;

    const h = Number(homeGoals);
    const a = Number(awayGoals);

    if (isNaN(h) || isNaN(a)) {
      alert("Morate unijeti brojčane golove.");
      return;
    }

    setSaving(true);

    // Provjeri postoji li rezultat već
    const existing = results[editFixtureId];

    if (existing) {
      // UPDATE
      await supabase
        .from("results")
        .update({ home_goals: h, away_goals: a })
        .eq("fixture_id", editFixtureId);
    } else {
      // INSERT
      await supabase.from("results").insert({
        fixture_id: editFixtureId,
        home_goals: h,
        away_goals: a,
      });
    }

    setSaving(false);
    setEditFixtureId(null);

    // Ponovno učitaj podatke
    loadFixtures();
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin – Upravljanje rezultatima</h1>

      {/* Izbornik lige */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded ${leagueCode === "PIONIRI" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          onClick={() => setLeagueCode("PIONIRI")}
        >
          Pioniri
        </button>
        <button
          className={`px-4 py-2 rounded ${leagueCode === "MLADJI" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          onClick={() => setLeagueCode("MLADJI")}
        >
          Mlađi pioniri
        </button>
      </div>

      {/* Public prikaz tablice + iduće utakmice */}
      <div className="border rounded p-4">
        <LeagueView leagueCode={leagueCode} />
      </div>

      <h2 className="text-xl font-semibold">Sve utakmice</h2>

      {loading ? (
        <p>Učitavanje...</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left">Kolo</th>
              <th className="text-left">Datum</th>
              <th className="text-left">Vrijeme</th>
              <th className="text-left">Domaćin</th>
              <th className="text-left">Gost</th>
              <th className="text-center">Rezultat</th>
              <th className="text-center">Akcija</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => {
              const result = results[f.id];
              return (
                <tr key={f.id} className="border-b">
                  <td>{f.round}</td>
                  <td>{f.match_date}</td>
                  <td>{f.match_time}</td>
                  <td>{f.home_team_id}</td>
                  <td>{f.away_team_id}</td>
                  <td className="text-center">
                    {result ? `${result.home_goals}:${result.away_goals}` : "—"}
                  </td>
                  <td className="text-center">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                      onClick={() => startEditing(f)}
                    >
                      Uredi
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Modal za unos / edit rezultata */}
      {editFixtureId && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-xl w-80 space-y-4">
            <h3 className="text-lg font-semibold">Unos rezultata</h3>

            <div className="flex gap-2 items-center">
              <input
                type="number"
                className="border p-2 w-20 text-center"
                value={homeGoals}
                onChange={(e) => setHomeGoals(e.target.value)}
              />
              <span className="font-bold text-lg">:</span>
              <input
                type="number"
                className="border p-2 w-20 text-center"
                value={awayGoals}
                onChange={(e) => setAwayGoals(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-300"
                onClick={() => setEditFixtureId(null)}
              >
                Odustani
              </button>
              <button
                className="px-3 py-1 rounded bg-green-600 text-white"
                onClick={saveResult}
                disabled={saving}
              >
                {saving ? "Spremam..." : "Spremi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
