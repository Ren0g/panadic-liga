'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminPage() {
  const [league, setLeague] = useState('PIONIRI')
  const [fixtures, setFixtures] = useState<any[]>([])
  const [selectedFixture, setSelectedFixture] = useState<string>('')
  const [homeGoals, setHomeGoals] = useState('')
  const [awayGoals, setAwayGoals] = useState('')

  // Fetch fixtures when league is changed
  useEffect(() => {
    async function loadFixtures() {
      const { data, error } = await supabase
        .from('fixtures')
        .select(`
          id, 
          round, 
          match_time, 
          home_team_id (name), 
          away_team_id (name)
        `)
        .eq('league_code', league)

      if (error) {
        console.error(error)
      } else {
        const mapped = data.map((f: any) => ({
          id: f.id,
          round: f.round,
          time: f.match_time,
          home: f.home_team_id?.name,
          away: f.away_team_id?.name,
        }))
        setFixtures(mapped)
      }
    }

    loadFixtures()
  }, [league])

  async function submitResult() {
    if (!selectedFixture || homeGoals === '' || awayGoals === '') {
      alert('Popuni sve podatke!')
      return
    }

    const { error } = await supabase.from('results').insert({
      fixture_id: selectedFixture,
      home_goals: Number(homeGoals),
      away_goals: Number(awayGoals),
    })

    if (error) {
      alert('Greška: ' + error.message)
    } else {
      alert('Rezultat spremljen!')
      setSelectedFixture('')
      setHomeGoals('')
      setAwayGoals('')
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">Admin – Unos Rezultata</h1>

      <div className="mb-4">
        <label className="block mb-1">Liga:</label>
        <select
          className="w-full p-2 bg-gray-800"
          value={league}
          onChange={(e) => setLeague(e.target.value)}
        >
          <option value="PIONIRI">Pioniri</option>
          <option value="MLADJI">Mlađi pioniri</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1">Utakmica:</label>
        <select
          className="w-full p-2 bg-gray-800"
          value={selectedFixture}
          onChange={(e) => setSelectedFixture(e.target.value)}
        >
          <option value="">Odaberi utakmicu</option>
          {fixtures.map((f) => (
            <option key={f.id} value={f.id}>
              {f.round} — {f.home} vs {f.away}
            </option>
          ))}
        </select>
      </div>

      {selectedFixture && (
        <>
          <div className="mb-4">
            <label className="block mb-1">Golovi domaćin:</label>
            <input
              type="number"
              className="w-full p-2 bg-gray-800"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1">Golovi gost:</label>
            <input
              type="number"
              className="w-full p-2 bg-gray-800"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
            />
          </div>
        </>
      )}

      <button
        onClick={submitResult}
        className="px-4 py-2 bg-green-600 rounded text-white"
      >
        Spremi rezultat
      </button>
    </div>
  )
}
