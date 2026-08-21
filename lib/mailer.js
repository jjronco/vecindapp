export async function enviarMail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[mailer] Falta RESEND_API_KEY, no se envía:", subject, "→", to);
    return { ok: false, motivo: "sin_clave" };
  }
  if (!to) return { ok: false, motivo: "sin_destinatario" };

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "La VecindAPP <notificaciones@vecindapp.juanronco.com.ar>",
        to: [to],
        subject,
        text,
      }),
    });
    if (!r.ok) {
      const errJson = await r.json().catch(() => ({}));
      console.error("[mailer] Resend respondió", r.status, JSON.stringify(errJson), "→", to);
      return { ok: false, motivo: "resend_error", status: r.status };
    }
    return { ok: true };
  } catch (e) {
    console.error("[mailer] Error de conexión con Resend:", e);
    return { ok: false, motivo: "conexion" };
  }
}

// Manda el mismo mail a varias unidades (las que tengan email registrado),
// una por una, sin cortar el resto si alguna falla.
export async function enviarMailAUnidades(unidades, { subject, textoPorUnidad }) {
  const resultados = [];
  for (const u of unidades) {
    if (!u.email) continue;
    const resultado = await enviarMail({ to: u.email, subject, text: textoPorUnidad(u) });
    resultados.push({ unidadId: u.id, ...resultado });
  }
  return resultados;
}
