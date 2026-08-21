import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.status(200).json({ ok: true, resultados: [] });

  const { data, error } = await supabase
    .from("edificios")
    .select("codigo, data")
    .or(`codigo.ilike.%${q}%,data->>nombre.ilike.%${q}%`)
    .limit(6);

  if (error) return res.status(200).json({ ok: true, resultados: [] });

  const resultados = (data || []).map((row) => ({
    codigo: row.codigo,
    nombre: row.data?.nombre || "",
    direccion: row.data?.direccion || "",
  }));
  res.status(200).json({ ok: true, resultados });
}
