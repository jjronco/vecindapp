import { crearEdificio } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const edificio = await crearEdificio(req.body);
    res.status(200).json({ ok: true, codigo: edificio.codigo, data: edificio });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
}
