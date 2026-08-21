import { obtenerEdificio } from "../../lib/db";
import { enviarMailAUnidades } from "../../lib/mailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { codigoEdificio, consultaId } = req.body;

  const edificio = await obtenerEdificio(codigoEdificio);
  if (!edificio) return res.status(200).json({ ok: false });

  const consulta = edificio.consultas.find((c) => c.id === consultaId);
  if (!consulta) return res.status(200).json({ ok: false });

  const destinatarios = edificio.unidades.filter((u) => u.rol !== "admin");
  const resultados = await enviarMailAUnidades(destinatarios, {
    subject: `Nueva consulta en ${edificio.nombre}: ${consulta.titulo}`,
    textoPorUnidad: (u) =>
      `Hola,\n\nSe abrió una consulta nueva en ${edificio.nombre}:\n\n"${consulta.titulo}"\n\n` +
      (consulta.fechaLimite ? `Cierra el ${consulta.fechaLimite}.\n\n` : "") +
      `Entrá a La VecindAPP con el código ${edificio.codigo} y tu unidad (${u.label}) para votar.`,
  });

  res.status(200).json({ ok: true, resultados });
}
