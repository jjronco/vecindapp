import { obtenerEdificio } from "../../lib/db";
import { enviarMailAUnidades } from "../../lib/mailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { codigoEdificio, consultaId } = req.body;

  const edificio = await obtenerEdificio(codigoEdificio);
  if (!edificio) return res.status(200).json({ ok: false });

  const consulta = edificio.consultas.find((c) => c.id === consultaId);
  if (!consulta || !consulta.acta) return res.status(200).json({ ok: false });

  const destinatarios = edificio.unidades.filter((u) => u.rol !== "admin");
  const resultados = await enviarMailAUnidades(destinatarios, {
    subject: `Acta de "${consulta.titulo}" — ${edificio.nombre}`,
    textoPorUnidad: () =>
      `Hola,\n\nSe cerró la consulta "${consulta.titulo}" en ${edificio.nombre}. Este es el acta:\n\n${consulta.acta}`,
  });

  res.status(200).json({ ok: true, resultados });
}
