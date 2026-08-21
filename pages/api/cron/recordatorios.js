import { obtenerTodosLosEdificios } from "../../../lib/db";
import { enviarMail } from "../../../lib/mailer";

const HORAS_AVISO = 48;

export default async function handler(req, res) {
  // Vercel manda este header automáticamente en las ejecuciones de cron si
  // configuraste CRON_SECRET como variable de entorno del proyecto.
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ ok: false });
    }
  }

  const edificios = await obtenerTodosLosEdificios();
  const ahora = new Date();
  let recordatoriosEnviados = 0;

  for (const edificio of edificios) {
    const unidadesVotantes = edificio.unidades.filter((u) => u.rol !== "admin");

    for (const consulta of edificio.consultas || []) {
      if (consulta.estado !== "abierta" || !consulta.fechaLimite) continue;

      const limite = new Date(consulta.fechaLimite + "T23:59:59");
      const horasRestantes = (limite - ahora) / (1000 * 60 * 60);
      if (horasRestantes <= 0 || horasRestantes > HORAS_AVISO) continue;

      const noVotaron = unidadesVotantes.filter(
        (u) => consulta.votos[u.id] === undefined && u.email
      );

      for (const u of noVotaron) {
        const resultado = await enviarMail({
          to: u.email,
          subject: `Recordatorio: falta tu voto en ${edificio.nombre}`,
          text:
            `Hola,\n\nTodavía no votaste "${consulta.titulo}" en ${edificio.nombre}, ` +
            `y cierra el ${consulta.fechaLimite}.\n\n` +
            `Entrá a La VecindAPP con el código ${edificio.codigo} y tu unidad (${u.label}) para votar.`,
        });
        if (resultado.ok) recordatoriosEnviados++;
      }
    }
  }

  res.status(200).json({ ok: true, recordatoriosEnviados });
}
