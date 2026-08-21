import { obtenerEdificio, guardarEdificio } from "../../../lib/db";

export default async function handler(req, res) {
  const { code } = req.query;

  if (req.method === "GET") {
    const data = await obtenerEdificio(code);
    if (!data) return res.status(404).json({ ok: false, error: "No encontrado" });
    return res.status(200).json({ ok: true, data });
  }

  if (req.method === "PUT") {
    try {
      await guardarEdificio(code, req.body);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.status(405).end();
}
