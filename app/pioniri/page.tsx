import { supabase } from "@/lib/supabaseClient";

export default async function PioniriPage() {
  // Dohvati standings iz Supabase view-a
  const { data, error } = await supabase
    .from("standings")
    .select("*")
    .eq("league_code", "PIONIRI")
    .order("bodovi", { ascending: false });

  // DEBUG: Prikaži cijeli error objekt
  if (error) {
    console.log("SUPABASE ERROR:", JSON.stringify(error, null, 2));
    return (
      <pre className="p-4 text-red-500">
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pioniri – Tablica</h1>

      <table className="w-full border-collapse border border-gray-700 text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-600 p-2">Klub</th>
            <th className="border border-gray-600 p-2">UT</th>
            <th className="border border-gray-600 p-2">P</th>
            <th className="border border-gray-600 p-2">N</th>
            <th className="border border-gray-600 p-2">I</th>
            <th className="border border-gray-600 p-2">G+</th>
            <th className="border border-gray-600 p-2">G-</th>
            <th className="border border-gray-600 p-2">GR</th>
            <th className="border border-gray-600 p-2">Bod</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row: any) => (
            <tr key={row.team_id} className="bg-gray-900 text-gray-200">
              <td className="border border-gray-700 p-2">{row.team_name}</td>
              <td className="border border-gray-700 p-2">{row.Ut}</td>
              <td className="border border-gray-700 p-2">{row.P}</td>
              <td className="border border-gray-700 p-2">{row.N}</td>
              <td className="border border-gray-700 p-2">{row.I}</td>
              <td className="border border-gray-700 p-2">{row.Gplus}</td>
              <td className="border border-gray-700 p-2">{row.Gminus}</td>
              <td className="border border-gray-700 p-2">{row.GR}</td>
              <td className="border border-gray-700 p-2 font-bold">
                {row.bodovi}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
