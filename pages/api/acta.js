const AVISO_LEGAL =
  "\n\n— — —\nEste documento es un registro informativo de la votación digital realizada en " +
  "La VecindAPP. No reemplaza el libro de actas del consorcio ni los requisitos formales de " +
  "convocatoria, notificación y quórum que exige la normativa de Propiedad Horizontal vigente. " +
  "Para que una decisión tenga plena validez legal, corresponde su tratamiento conforme a dicha " +
  "normativa.";

const MODELOS_CANDIDATOS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-3.5-flash",
];

async function llamarGemini(prompt) {
  let ultimoError = null;
  for (const modelo of MODELOS_CANDIDATOS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 500 },
          }),
        }
      );
      const json = await r.json();
      if (!r.ok) {
        console.error(`[acta] Modelo ${modelo} respondió ${r.status}:`, JSON.stringify(json));
        ultimoError = { status: r.status, json };
        // 404 = el modelo no existe con ese nombre; probamos el siguiente candidato.
        // Cualquier otro código (401, 403, 429...) no se arregla cambiando de modelo, cortamos ahí.
        if (r.status === 404) continue;
        return { ok: false, status: r.status, json };
      }
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        console.error(`[acta] Modelo ${modelo} respondió sin texto:`, JSON.stringify(json));
        return { ok: false, status: 200, json, sinTexto: true };
      }
      console.log(`[acta] Generada con éxito usando el modelo: ${modelo}`);
      return { ok: true, text };
    } catch (e) {
      console.error(`[acta] Error de conexión probando ${modelo}:`, e);
      ultimoError = { status: null, error: String(e) };
    }
  }
  return { ok: false, agotado: true, ultimoError };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { titulo, opciones, conteo, totalVotos, totalUnidades, quorumMinimo } = req.body;

  const resumen = opciones.map((op, i) => `- ${op}: ${conteo[i] || 0} voto(s)`).join("\n");

  const lineaQuorum = quorumMinimo
    ? `Quórum mínimo requerido: ${quorumMinimo} unidades. ${
        totalVotos >= quorumMinimo ? "Se alcanzó el quórum." : "NO se alcanzó el quórum."
      }`
    : "No se fijó un quórum mínimo para este tema.";

  const prompt = `Sos el/la secretario/a de actas de un consorcio de propietarios en Argentina. Redactá un acta breve y formal a partir de estos datos de una votación digital:

Tema tratado: ${titulo}
Opciones y resultado:
${resumen}
Unidades que participaron: ${totalVotos} de ${totalUnidades}
${lineaQuorum}

Instrucciones de formato:
- Texto plano, sin markdown ni asteriscos.
- Encabezado breve indicando que se trató el tema por votación digital entre propietarios.
- Indicar el resultado y la opción más votada.
- Indicar el quorum de participación (unidades que votaron sobre el total) y si se alcanzó el quórum mínimo fijado, si corresponde.
- Cerrar con una línea de "Resolución" que indique la decisión adoptada según el resultado. Si no se alcanzó el quórum mínimo, la resolución debe indicar que la decisión queda condicionada a una nueva convocatoria, no que se adoptó en firme.
- Tono institucional y neutral, sin opiniones. Máximo 130 palabras.`;

  if (!process.env.GEMINI_API_KEY) {
    console.error("[acta] Falta GEMINI_API_KEY en las variables de entorno.");
    return res.status(200).json({
      ok: false,
      acta: "No se pudo generar el acta automáticamente: falta configurar GEMINI_API_KEY.",
    });
  }

  const resultado = await llamarGemini(prompt);

  if (resultado.ok) {
    return res.status(200).json({ ok: true, acta: resultado.text + AVISO_LEGAL });
  }

  const detalle = resultado.status
    ? `Gemini respondió ${resultado.status}`
    : "no se pudo conectar con ningún modelo probado";
  res.status(200).json({
    ok: false,
    acta: `No se pudo generar el acta automáticamente (${detalle}). Revisá la terminal del servidor para más detalle.`,
  });
}
