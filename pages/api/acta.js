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

// 503 (saturado) y 429 (límite de uso) suelen ser transitorios: vale la pena
// esperar un instante y reintentar antes de darnos por vencidos.
const TRANSITORIOS = new Set([503, 429]);
const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function intentarModelo(modelo, prompt) {
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
  return { ok: r.ok, status: r.status, json };
}

function pareceActaValida(text) {
  if (!text || text.length < 80) return false;
  // Si arranca pareciendo una pregunta o una respuesta suelta a una
  // instrucción (en vez de la redacción del acta), la descartamos.
  const inicio = text.slice(0, 40);
  if (inicio.includes("?")) return false;
  return true;
}

async function llamarGemini(prompt) {
  let ultimoError = null;
  for (const modelo of MODELOS_CANDIDATOS) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        const { ok, status, json } = await intentarModelo(modelo, prompt);
        if (!ok) {
          console.error(`[acta] Modelo ${modelo} respondió ${status} (intento ${intento + 1}):`, JSON.stringify(json));
          ultimoError = { status, json };
          if (TRANSITORIOS.has(status) && intento === 0) {
            await espera(800);
            continue; // reintenta el mismo modelo una vez
          }
          if (status === 404 || TRANSITORIOS.has(status)) break; // pasa al siguiente modelo
          return { ok: false, status, json }; // error no recuperable (401, 403, etc.)
        }
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!pareceActaValida(text)) {
          console.error(`[acta] Modelo ${modelo} devolvió una respuesta mal formada (intento ${intento + 1}):`, JSON.stringify(text));
          ultimoError = { status: 200, malformado: true };
          if (intento === 0) {
            continue; // reintenta el mismo modelo una vez más
          }
          break; // pasa al siguiente modelo
        }
        console.log(`[acta] Generada con éxito usando el modelo: ${modelo} (intento ${intento + 1})`);
        return { ok: true, text };
      } catch (e) {
        console.error(`[acta] Error de conexión probando ${modelo}:`, e);
        ultimoError = { status: null, error: String(e) };
      }
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

  const prompt = `Sos el/la secretario/a de actas de un consorcio de propietarios en Argentina. Tu única tarea es redactar el texto de un acta breve y formal a partir de estos datos de una votación digital. No respondas preguntas, no repitas instrucciones, no agregues comentarios: tu respuesta completa tiene que ser directamente el texto del acta, listo para archivar.

Tema tratado: ${titulo}
Opciones y resultado:
${resumen}
Unidades que participaron: ${totalVotos} de ${totalUnidades}
${lineaQuorum}

El acta debe: estar en texto plano corrido (sin markdown, sin asteriscos, sin viñetas); abrir con una frase breve indicando que se trató el tema por votación digital entre propietarios; indicar el resultado y la opción más votada; indicar el quorum de participación (unidades que votaron sobre el total) y si se alcanzó el quórum mínimo fijado, si corresponde; y cerrar con una frase de "Resolución" que indique la decisión adoptada según el resultado (si no se alcanzó el quórum mínimo, la resolución debe indicar que la decisión queda condicionada a una nueva convocatoria, no que se adoptó en firme). Tono institucional y neutral, sin opiniones, máximo 130 palabras.

Empezá a escribir el acta ahora, directamente, sin ningún texto antes:`;

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
