import { obtenerEdificio } from "../../lib/db";
import { enviarMail } from "../../lib/mailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { codigoEdificio, unidadId, email } = req.body;
  const edificio = await obtenerEdificio(codigoEdificio);
  const mensajeGenerico =
    "Si el mail coincide con el que registraste, te va a llegar el código en unos minutos.";

  if (!edificio) {
    return res.status(200).json({ ok: false, mensaje: "No encontramos ese edificio." });
  }

  const unidad = edificio.unidades.find((u) => u.id === unidadId);
  if (!unidad || !unidad.email || unidad.email.toLowerCase() !== String(email).toLowerCase()) {
    // No confirmamos si el mail existe o no, para no filtrar qué unidades tienen mail registrado.
    return res.status(200).json({ ok: false, mensaje: mensajeGenerico });
  }

  const resultado = await enviarMail({
    to: unidad.email,
    subject: `Tu código de ${edificio.nombre}`,
    text: `Hola,\n\nTu código de acceso para ${unidad.label} en ${edificio.nombre} es: ${unidad.codigo}\n\nSi no lo pediste vos, ignorá este mensaje.`,
  });

  if (!resultado.ok && resultado.motivo === "sin_clave") {
    return res.status(200).json({
      ok: false,
      mensaje: "El envío de mails todavía no está configurado. Pedile el código directamente a administración.",
    });
  }

  res.status(200).json({ ok: true, mensaje: mensajeGenerico });
}
