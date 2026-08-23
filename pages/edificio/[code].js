import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import BuildingFacade from "../../components/BuildingFacade";
import Mark from "../../components/Mark";
import BellIcon from "../../components/BellIcon";
import Footer from "../../components/Footer";

const uid = () => Math.random().toString(36).slice(2, 10);
const POLL_MS = 12000;

function estaVencida(c) {
  if (!c.fechaLimite) return false;
  const limite = new Date(c.fechaLimite + "T23:59:59");
  return new Date() > limite;
}

async function fetchEdificio(code) {
  const res = await fetch(`/api/edificio/${code}`);
  const json = await res.json();
  return json.ok ? json.data : null;
}

async function putEdificio(code, data) {
  await fetch(`/api/edificio/${code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function pedirActa(payload) {
  try {
    const res = await fetch("/api/acta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return json.acta || "No se pudo generar el acta automáticamente.";
  } catch (e) {
    return "No se pudo generar el acta automáticamente (error de conexión).";
  }
}

// ---------- Componentes de nivel superior (estables entre renders) ----------

function ConsultaCard({
  c,
  mostrarVotar,
  esAdmin,
  user,
  unidades,
  totalUnidadesVotantes,
  seleccion,
  elegirOpcion,
  emitirVoto,
  busyId,
  cerrarYGenerarActa,
  regenerarActa,
  cancelarConsulta,
}) {
  const totalVotos = Object.keys(c.votos).length;
  const vencida = c.estado === "abierta" && estaVencida(c);
  const faltan = unidades.filter((u) => u.rol !== "admin" && c.votos[u.id] === undefined);
  const quorumAlcanzado = c.quorumMinimo ? totalVotos >= c.quorumMinimo : null;
  const actaFallida = c.acta && c.acta.startsWith("No se pudo generar");
  const elegida = seleccion[c.id] !== undefined ? seleccion[c.id] : c.votos[user.id];
  const yaVotoEsto = c.votos[user.id];
  const cambioSinConfirmar = elegida !== undefined && elegida !== yaVotoEsto;

  return (
    <div className="vpp-card">
      <span
        className={
          "vpp-tag " +
          (c.estado === "cerrada" ? "vpp-tag-closed" : vencida ? "vpp-tag-pending" : "vpp-tag-open")
        }
      >
        {c.estado === "cerrada" ? "Cerrada" : vencida ? "Venció · falta cerrar" : "Abierta"}
      </span>
      <div className="vpp-card-title" style={{ marginTop: 8 }}>
        {c.titulo}
      </div>
      <div className="vpp-card-meta">
        {totalVotos} de {totalUnidadesVotantes} unidades votaron
        {c.fechaLimite ? ` · ${vencida ? "venció" : "cierra"} ${c.fechaLimite}` : ""}
        {c.quorumMinimo ? ` · quórum mínimo ${c.quorumMinimo}` : ""}
      </div>

      {c.estado === "cerrada" && c.quorumMinimo && (
        <div className={quorumAlcanzado ? "vpp-ok" : "vpp-error"} style={{ marginTop: -4, marginBottom: 10 }}>
          {quorumAlcanzado ? "Quórum alcanzado." : "Quórum no alcanzado — la decisión queda condicionada."}
        </div>
      )}

      {c.estado === "abierta" && !esAdmin && mostrarVotar && !vencida && (
        <>
          {c.opciones.map((op, i) => (
            <div className="vpp-option-row" key={i} onClick={() => elegirOpcion(c.id, i)}>
              <div className={"vpp-option-radio" + (elegida === i ? " checked" : "")} />
              <div className="vpp-option-label">{op}</div>
            </div>
          ))}
          <button
            className="vpp-btn vpp-btn-accent vpp-btn-vote"
            disabled={elegida === undefined || !cambioSinConfirmar}
            onClick={() => emitirVoto(c.id)}
          >
            {yaVotoEsto !== undefined ? "Actualizar voto" : "Emitir voto"}
          </button>
          {yaVotoEsto !== undefined && !cambioSinConfirmar && (
            <div className="vpp-quorum">
              Tu voto: <b>{c.opciones[yaVotoEsto]}</b>.
            </div>
          )}
        </>
      )}

      {c.estado === "abierta" && !esAdmin && vencida && (
        <div className="vpp-quorum">El plazo para votar este tema venció. Falta que administración lo cierre.</div>
      )}

      {(c.estado === "cerrada" || esAdmin) &&
        c.opciones.map((op, i) => {
          const votosOp = Object.values(c.votos).filter((v) => v === i).length;
          const pct = totalVotos ? Math.round((votosOp / totalVotos) * 100) : 0;
          return (
            <div className="vpp-bar-row" key={i}>
              <div className="vpp-bar-label">
                <span>{op}</span>
                <span>{votosOp}</span>
              </div>
              <div className="vpp-bar-track">
                <div className="vpp-bar-fill" style={{ width: pct + "%" }} />
              </div>
            </div>
          );
        })}

      {esAdmin && c.estado === "abierta" && faltan.length > 0 && (
        <div className="vpp-quorum">Faltan votar: {faltan.map((u) => u.label).join(", ")}</div>
      )}

      {esAdmin && c.estado === "abierta" && (
        <>
          {vencida && (
            <div className="vpp-quorum" style={{ color: "var(--accent)" }}>
              El plazo venció — cerrala para que quede el acta.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="vpp-btn vpp-btn-accent"
              disabled={busyId === c.id}
              onClick={() => cerrarYGenerarActa(c.id)}
            >
              {busyId === c.id ? "Generando acta…" : "Cerrar consulta y generar acta"}
            </button>
            <button className="vpp-btn vpp-btn-ghost" type="button" onClick={() => cancelarConsulta(c.id)}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {c.acta && (
        <>
          <div className="vpp-acta">{c.acta}</div>
          {actaFallida ? (
            esAdmin && (
              <button
                className="vpp-btn vpp-btn-accent"
                style={{ marginTop: 8 }}
                disabled={busyId === c.id}
                onClick={() => regenerarActa(c.id)}
              >
                {busyId === c.id ? "Generando…" : "Reintentar generar acta"}
              </button>
            )
          ) : (
            <button
              className="vpp-btn vpp-btn-ghost"
              style={{ marginTop: 8, fontSize: 12, padding: "6px 12px" }}
              onClick={() => navigator.clipboard.writeText(c.acta)}
            >
              Copiar acta
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PropuestaCard({
  p,
  esAdmin,
  comentarioTexto,
  onComentarioChange,
  comentarPropuesta,
  convertirEnConsulta,
  cerrarTemaPropuesta,
}) {
  const cerrada = p.estado === "cerrada";
  const convertida = p.estado === "convertida";
  const puedeComentar = !cerrada && !convertida;
  const tagTexto =
    p.estado === "pendiente"
      ? "Sin responder"
      : p.estado === "conversacion"
      ? "En conversación"
      : p.estado === "convertida"
      ? "Convertida en consulta"
      : "Archivada";
  const tagClase = cerrada || convertida ? "vpp-tag-closed" : "vpp-tag-pending";

  return (
    <div className="vpp-card">
      <span className={"vpp-tag " + tagClase}>{tagTexto}</span>
      <div className="vpp-card-title" style={{ marginTop: 8 }}>
        {p.texto}
      </div>
      <div className="vpp-card-meta">Propuesto por {p.autorLabel}</div>

      {(p.comentarios || []).length > 0 && (
        <div className="vpp-comments">
          {p.comentarios.map((cm) => (
            <div className="vpp-comment" key={cm.id}>
              <b>{cm.autorLabel}:</b> {cm.texto}
            </div>
          ))}
        </div>
      )}

      {puedeComentar && (
        <div className="vpp-comment-form">
          <input
            className="vpp-input"
            value={comentarioTexto || ""}
            onChange={(e) => onComentarioChange(p.id, e.target.value)}
            placeholder="Responder…"
            onKeyDown={(e) => {
              if (e.key === "Enter") comentarPropuesta(p.id);
            }}
          />
          <button className="vpp-btn vpp-btn-ghost" onClick={() => comentarPropuesta(p.id)}>
            Comentar
          </button>
        </div>
      )}

      {cerrada && <div className="vpp-quorum">Tema cerrado por administración. Queda archivado.</div>}
      {convertida && <div className="vpp-quorum">Este mensaje ya se convirtió en una consulta.</div>}

      {esAdmin && puedeComentar && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="vpp-btn vpp-btn-brass" onClick={() => convertirEnConsulta(p)}>
            Convertir en consulta
          </button>
          <button className="vpp-btn vpp-btn-ghost" onClick={() => cerrarTemaPropuesta(p.id)}>
            Cerrar tema
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Página principal ----------

export default function EdificioPage() {
  const router = useRouter();
  const { code } = router.query;

  const [edificio, setEdificio] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(null);

  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [recuperarEmail, setRecuperarEmail] = useState("");
  const [recuperarMsg, setRecuperarMsg] = useState("");
  const [recuperarEnviando, setRecuperarEnviando] = useState(false);

  const [needsCodeChange, setNeedsCodeChange] = useState(false);
  const [newCode1, setNewCode1] = useState("");
  const [newCode2, setNewCode2] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [codeChangeError, setCodeChangeError] = useState("");

  const [tab, setTab] = useState("inicio");
  const [busyId, setBusyId] = useState(null);

  const [seleccion, setSeleccion] = useState({});

  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoQuorum, setNuevoQuorum] = useState("");
  const [opciones, setOpciones] = useState(["", ""]);
  const [origenPropuesta, setOrigenPropuesta] = useState(null);

  const [propuestaTexto, setPropuestaTexto] = useState("");
  const [propuestaEnviando, setPropuestaEnviando] = useState(false);
  const [propuestaEnviada, setPropuestaEnviada] = useState(false);
  const [comentarioTexto, setComentarioTexto] = useState({});

  const [editandoInfo, setEditandoInfo] = useState(false);
  const [infoContactos, setInfoContactos] = useState("");
  const [infoDatos, setInfoDatos] = useState("");

  const [recordarme, setRecordarme] = useState(false);
  const [sesionRestaurada, setSesionRestaurada] = useState(false);

  const [textoGrande, setTextoGrande] = useState(false);
  const [altoContraste, setAltoContraste] = useState(false);

  useEffect(() => {
    try {
      setTextoGrande(localStorage.getItem("vpp:textoGrande") === "1");
      setAltoContraste(localStorage.getItem("vpp:altoContraste") === "1");
    } catch (e) {
      // localStorage puede no estar disponible (modo incógnito estricto, etc.)
    }
  }, []);

  function toggleTextoGrande() {
    setTextoGrande((v) => {
      const nuevo = !v;
      try {
        localStorage.setItem("vpp:textoGrande", nuevo ? "1" : "0");
      } catch (e) {}
      return nuevo;
    });
  }

  function toggleAltoContraste() {
    setAltoContraste((v) => {
      const nuevo = !v;
      try {
        localStorage.setItem("vpp:altoContraste", nuevo ? "1" : "0");
      } catch (e) {}
      return nuevo;
    });
  }

  const claseAccesibilidad =
    (textoGrande ? " vpp-texto-grande" : "") + (altoContraste ? " vpp-alto-contraste" : "");

  const editandoInfoRef = useRef(editandoInfo);
  useEffect(() => {
    editandoInfoRef.current = editandoInfo;
  }, [editandoInfo]);

  const load = useCallback(async () => {
    if (!code) return;
    const data = await fetchEdificio(code);
    if (!data) {
      setNotFound(true);
      return;
    }
    setEdificio(data);
    // No pisamos el formulario de información útil si el admin lo está editando
    // en este momento (evita que un refresco de fondo borre lo que está tipeando).
    if (!editandoInfoRef.current) {
      setInfoContactos(
        (data.infoUtil?.contactos || []).map((c) => `${c.nombre}: ${c.valor}`).join("\n")
      );
      setInfoDatos((data.infoUtil?.datos || []).map((d) => `${d.label}: ${d.valor}`).join("\n"));
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  // Si este dispositivo ya tiene una sesión guardada para este edificio, entra
  // directo sin pasar por el portero (solo si la unidad sigue existiendo).
  useEffect(() => {
    if (!edificio || user || sesionRestaurada) return;
    setSesionRestaurada(true);
    try {
      const guardada = localStorage.getItem(`vpp:sesion:${edificio.codigo}`);
      if (!guardada) return;
      const { unidadId } = JSON.parse(guardada);
      const unidad = edificio.unidades.find((u) => u.id === unidadId);
      if (unidad && unidad.codigo !== "000000") {
        setUser({ id: unidad.id, label: unidad.label, rol: unidad.rol });
      } else {
        localStorage.removeItem(`vpp:sesion:${edificio.codigo}`);
      }
    } catch (e) {}
  }, [edificio, user, sesionRestaurada]);

  // Actualiza los datos al cambiar de pestaña, para reflejar lo que hicieron
  // otros vecinos o administración mientras tanto.
  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Sondeo periódico mientras hay sesión iniciada, para que los cambios de
  // otras unidades (votos, mensajes, información) aparezcan sin recargar.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [user, load]);

  async function persist(nuevo) {
    setEdificio(nuevo);
    await putEdificio(code, nuevo);
  }

  function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    const unidad = edificio.unidades.find((u) => u.id === selectedUnit);
    if (!unidad) {
      setLoginError("Elegí tu unidad tocando el timbre correspondiente.");
      return;
    }
    if (codeInput.trim() !== unidad.codigo) {
      setLoginError("Código incorrecto.");
      return;
    }
    if (recordarme) {
      try {
        localStorage.setItem(
          `vpp:sesion:${edificio.codigo}`,
          JSON.stringify({ unidadId: unidad.id })
        );
      } catch (e) {}
    }
    if (unidad.codigo === "000000") {
      setUser({ id: unidad.id, label: unidad.label, rol: unidad.rol });
      setNeedsCodeChange(true);
      return;
    }
    setUser({ id: unidad.id, label: unidad.label, rol: unidad.rol });
    setCodeInput("");
  }

  async function handleCambiarCodigo(e) {
    e.preventDefault();
    setCodeChangeError("");
    if (!/^\d{6}$/.test(newCode1)) {
      setCodeChangeError("El código debe tener exactamente 6 números.");
      return;
    }
    if (newCode1 !== newCode2) {
      setCodeChangeError("Los códigos no coinciden.");
      return;
    }
    if (newCode1 === "000000") {
      setCodeChangeError("Elegí un código distinto al inicial.");
      return;
    }
    if (newEmail.trim() && !/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
      setCodeChangeError("Ese mail no parece válido. Podés dejarlo vacío si preferís.");
      return;
    }
    const nuevo = { ...edificio };
    nuevo.unidades = nuevo.unidades.map((u) =>
      u.id === user.id ? { ...u, codigo: newCode1, email: newEmail.trim() || u.email || "" } : u
    );
    await persist(nuevo);
    setNeedsCodeChange(false);
    setNewCode1("");
    setNewCode2("");
    setNewEmail("");
  }

  async function handleRecuperar(e) {
    e.preventDefault();
    setRecuperarMsg("");
    const unidad = edificio.unidades.find((u) => u.id === selectedUnit);
    if (!unidad) {
      setRecuperarMsg("Elegí primero tu unidad tocando el timbre.");
      return;
    }
    if (!recuperarEmail.trim()) {
      setRecuperarMsg("Ingresá el mail que registraste.");
      return;
    }
    setRecuperarEnviando(true);
    try {
      const res = await fetch("/api/recuperar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoEdificio: edificio.codigo, unidadId: unidad.id, email: recuperarEmail.trim() }),
      });
      const json = await res.json();
      setRecuperarMsg(json.mensaje);
    } catch (err) {
      setRecuperarMsg("No se pudo enviar. Probá de nuevo en un momento.");
    }
    setRecuperarEnviando(false);
  }

  function logout() {
    if (edificio) {
      try {
        localStorage.removeItem(`vpp:sesion:${edificio.codigo}`);
      } catch (e) {}
    }
    setUser(null);
    setSelectedUnit(null);
    setCodeInput("");
    setLoginError("");
    setTab("inicio");
    setSeleccion({});
    setMostrarRecuperar(false);
    setRecordarme(false);
  }

  function elegirOpcion(consultaId, opcionIndex) {
    setSeleccion((s) => ({ ...s, [consultaId]: opcionIndex }));
  }

  async function emitirVoto(consultaId) {
    const c = edificio.consultas.find((x) => x.id === consultaId);
    if (!c || c.estado !== "abierta" || estaVencida(c)) return;
    const elegida = seleccion[consultaId] !== undefined ? seleccion[consultaId] : c.votos[user.id];
    if (elegida === undefined) return;
    const nuevo = JSON.parse(JSON.stringify(edificio));
    nuevo.consultas.find((x) => x.id === consultaId).votos[user.id] = elegida;
    await persist(nuevo);
    setSeleccion((s) => {
      const copy = { ...s };
      delete copy[consultaId];
      return copy;
    });
  }

  async function crearConsulta(e) {
    e.preventDefault();
    const opcionesLimpias = opciones.map((o) => o.trim()).filter(Boolean);
    if (!nuevoTitulo.trim() || opcionesLimpias.length < 2) return;
    const nuevaId = uid();
    const nueva = {
      id: nuevaId,
      titulo: nuevoTitulo.trim(),
      opciones: opcionesLimpias,
      fechaLimite: nuevaFecha || null,
      quorumMinimo: nuevoQuorum ? parseInt(nuevoQuorum, 10) : null,
      estado: "abierta",
      votos: {},
      acta: null,
      creada: Date.now(),
    };
    const nuevo = { ...edificio, consultas: [nueva, ...edificio.consultas] };
    if (origenPropuesta) {
      nuevo.propuestas = nuevo.propuestas.map((p) =>
        p.id === origenPropuesta.id ? { ...p, estado: "convertida", consultaId: nuevaId } : p
      );
    }
    await persist(nuevo);
    setNuevoTitulo("");
    setNuevaFecha("");
    setNuevoQuorum("");
    setOpciones(["", ""]);
    setOrigenPropuesta(null);
    fetch("/api/notificar-consulta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigoEdificio: code, consultaId: nuevaId }),
    }).catch(() => {});
  }

  async function cancelarConsulta(consultaId) {
    if (!window.confirm("¿Cancelar esta consulta? Se va a borrar y no se puede deshacer.")) return;
    const nuevo = { ...edificio };
    nuevo.consultas = nuevo.consultas.filter((x) => x.id !== consultaId);
    await persist(nuevo);
  }

  async function cerrarYGenerarActa(consultaId) {
    setBusyId(consultaId);
    const fresh = await fetchEdificio(code);
    const c = fresh.consultas.find((x) => x.id === consultaId);
    const totalUnidadesVotantes = fresh.unidades.filter((u) => u.rol !== "admin").length;
    const conteo = c.opciones.map((_, i) => Object.values(c.votos).filter((v) => v === i).length);
    const totalVotos = Object.keys(c.votos).length;

    const acta = await pedirActa({
      titulo: c.titulo,
      opciones: c.opciones,
      conteo,
      totalVotos,
      totalUnidades: totalUnidadesVotantes,
      quorumMinimo: c.quorumMinimo || null,
    });

    c.estado = "cerrada";
    c.acta = acta;
    await persist(fresh);
    setBusyId(null);
    fetch("/api/notificar-acta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigoEdificio: code, consultaId }),
    }).catch(() => {});
  }

  // Para una consulta que ya quedó cerrada pero con un acta fallida (error de
  // Gemini, por ejemplo) — vuelve a pedirla sin tocar el estado ni los votos.
  async function regenerarActa(consultaId) {
    setBusyId(consultaId);
    const fresh = await fetchEdificio(code);
    const c = fresh.consultas.find((x) => x.id === consultaId);
    const totalUnidadesVotantes = fresh.unidades.filter((u) => u.rol !== "admin").length;
    const conteo = c.opciones.map((_, i) => Object.values(c.votos).filter((v) => v === i).length);
    const totalVotos = Object.keys(c.votos).length;

    const acta = await pedirActa({
      titulo: c.titulo,
      opciones: c.opciones,
      conteo,
      totalVotos,
      totalUnidades: totalUnidadesVotantes,
      quorumMinimo: c.quorumMinimo || null,
    });

    c.acta = acta;
    await persist(fresh);
    setBusyId(null);
    if (!acta.startsWith("No se pudo generar")) {
      fetch("/api/notificar-acta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoEdificio: code, consultaId }),
      }).catch(() => {});
    }
  }

  async function enviarPropuesta(e) {
    e.preventDefault();
    if (!propuestaTexto.trim() || propuestaEnviando) return;
    setPropuestaEnviando(true);
    const nueva = {
      id: uid(),
      texto: propuestaTexto.trim(),
      autorUnidadId: user.id,
      autorLabel: user.label,
      estado: "pendiente",
      creada: Date.now(),
      comentarios: [],
    };
    const nuevo = { ...edificio, propuestas: [nueva, ...(edificio.propuestas || [])] };
    await persist(nuevo);
    setPropuestaTexto("");
    setPropuestaEnviando(false);
    setPropuestaEnviada(true);
    setTimeout(() => setPropuestaEnviada(false), 4000);
  }

  function handleComentarioChange(propuestaId, texto) {
    setComentarioTexto((s) => ({ ...s, [propuestaId]: texto }));
  }

  async function comentarPropuesta(propuestaId) {
    const texto = (comentarioTexto[propuestaId] || "").trim();
    if (!texto) return;
    const nuevo = { ...edificio };
    nuevo.propuestas = nuevo.propuestas.map((p) => {
      if (p.id !== propuestaId) return p;
      const comentarios = [
        ...(p.comentarios || []),
        { id: uid(), autorLabel: user.label, texto, creada: Date.now() },
      ];
      return { ...p, comentarios, estado: p.estado === "pendiente" ? "conversacion" : p.estado };
    });
    await persist(nuevo);
    setComentarioTexto((s) => ({ ...s, [propuestaId]: "" }));
  }

  function convertirEnConsulta(propuesta) {
    setOrigenPropuesta({ id: propuesta.id, texto: propuesta.texto });
    setNuevoTitulo(propuesta.texto);
    setTab("administracion");
  }

  async function cerrarTemaPropuesta(propuestaId) {
    const nuevo = { ...edificio };
    nuevo.propuestas = nuevo.propuestas.map((p) =>
      p.id === propuestaId ? { ...p, estado: "cerrada" } : p
    );
    await persist(nuevo);
  }

  function exportarActas() {
    const cerradasConActa = edificio.consultas.filter((c) => c.estado === "cerrada" && c.acta);
    if (cerradasConActa.length === 0) {
      window.alert("Todavía no hay actas cerradas para exportar.");
      return;
    }
    const fecha = new Date().toLocaleDateString("es-AR");
    const encabezado = `ACTAS — ${edificio.nombre}\n${edificio.direccion}\nExportado el ${fecha}\n\n${"=".repeat(50)}\n\n`;
    const cuerpo = cerradasConActa
      .slice()
      .sort((a, b) => a.creada - b.creada)
      .map((c) => `TEMA: ${c.titulo}\n\n${c.acta}\n`)
      .join(`\n${"-".repeat(50)}\n\n`);
    const blob = new Blob([encabezado + cuerpo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `actas-${edificio.codigo}-${fecha.replace(/\//g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function guardarInfoUtil(e) {
    e.preventDefault();
    const contactos = infoContactos
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [nombre, ...resto] = l.split(":");
        return { nombre: nombre.trim(), valor: resto.join(":").trim() };
      });
    const datos = infoDatos
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [label, ...resto] = l.split(":");
        return { label: label.trim(), valor: resto.join(":").trim() };
      });
    const nuevo = { ...edificio, infoUtil: { contactos, datos } };
    await persist(nuevo);
    setEditandoInfo(false);
  }

  // ---------- Estados de carga / error ----------
  if (notFound) {
    return (
      <div className="vpp-shell">
        <div className="vpp-brandrow">
          <Link href="/" className="vpp-brand">
            <Mark /> La Vecind<span>APP</span>
          </Link>
        </div>
        <div className="vpp-empty">
          No encontramos un edificio con el código <b>{code}</b>.
          <div style={{ marginTop: 12 }}>
            <Link href="/ingresar" className="vpp-btn vpp-btn-ghost">
              Probar otro código
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!edificio) {
    return (
      <div className="vpp-shell">
        <div className="vpp-brandrow">
          <div className="vpp-brand">
            <Mark /> La Vecind<span>APP</span>
          </div>
        </div>
        Cargando…
      </div>
    );
  }

  // ---------- Login (portero) ----------
  if (!user) {
    return (
      <div className={"vpp-shell" + claseAccesibilidad}>
        <Head>
          <title>{edificio.nombre} — La VecindAPP</title>
          <meta
            name="description"
            content={`Portero digital de ${edificio.nombre}. Tocá tu timbre para votar, proponer temas y ver información del edificio.`}
          />
        </Head>
        <div className="vpp-brandrow">
          <Link href="/" className="vpp-brand">
            <Mark /> La Vecind<span>APP</span>
          </Link>
          <div className="vpp-a11y-toggles">
            <button
              type="button"
              className={"vpp-a11y-btn" + (textoGrande ? " active" : "")}
              onClick={toggleTextoGrande}
              title="Texto más grande"
            >
              Aa
            </button>
            <button
              type="button"
              className={"vpp-a11y-btn" + (altoContraste ? " active" : "")}
              onClick={toggleAltoContraste}
              title="Más contraste"
            >
              ◐
            </button>
          </div>
        </div>
        <div className="vpp-building">
          {edificio.nombre} · {edificio.direccion} · código <b className="vpp-mono">{edificio.codigo}</b>{" "}
          <button
            className="vpp-btn vpp-btn-ghost"
            style={{ padding: "3px 9px", fontSize: 11, marginLeft: 4 }}
            onClick={() => navigator.clipboard.writeText(edificio.codigo)}
          >
            Copiar
          </button>
        </div>

        <div className="vpp-intercom">
          <div className="vpp-intercom-head">Portero eléctrico · elegí tu timbre</div>
          <div className="vpp-buzzers">
            {edificio.unidades.map((u) => (
              <button
                key={u.id}
                className={"vpp-buzzer" + (selectedUnit === u.id ? " selected" : "")}
                onClick={() => {
                  setSelectedUnit(u.id);
                  setLoginError("");
                }}
              >
                <div className="vpp-buzzer-num">{u.label}</div>
                <div className="vpp-buzzer-role">
                  {u.rol === "admin" ? "Administración" : "Propietario / inquilino"}
                </div>
              </button>
            ))}
          </div>

          <form className="vpp-login-form" onSubmit={handleLogin}>
            <input
              className="vpp-code-input"
              placeholder="Código de 6 dígitos"
              maxLength={6}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
            />
            <button className="vpp-btn vpp-btn-brass" type="submit">
              <BellIcon /> Entrar
            </button>
          </form>
          <label className="vpp-remember-label">
            <input
              type="checkbox"
              checked={recordarme}
              onChange={(e) => setRecordarme(e.target.checked)}
            />
            Recordarme en este dispositivo
          </label>
          {loginError && <div className="vpp-error">{loginError}</div>}

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="vpp-btn vpp-btn-ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
              onClick={() => setMostrarRecuperar((v) => !v)}
            >
              ¿Olvidaste tu código?
            </button>
          </div>

          {mostrarRecuperar && (
            <form className="vpp-recover-form" onSubmit={handleRecuperar}>
              <div className="vpp-field-note" style={{ marginBottom: 8, color: "var(--brass-light)" }}>
                Elegí tu timbre arriba y escribí el mail que registraste para recibir tu código.
              </div>
              <input
                type="email"
                className="vpp-input"
                value={recuperarEmail}
                onChange={(e) => setRecuperarEmail(e.target.value)}
                placeholder="tu-mail@ejemplo.com"
              />
              <button
                className="vpp-btn vpp-btn-brass"
                type="submit"
                style={{ marginTop: 8 }}
                disabled={recuperarEnviando}
              >
                {recuperarEnviando ? "Enviando…" : "Enviar mi código por mail"}
              </button>
              {recuperarMsg && <div className="vpp-hint" style={{ color: "var(--brass-light)" }}>{recuperarMsg}</div>}
            </form>
          )}
        </div>

        <div className="vpp-hint">
          Primera vez en tu unidad: el código inicial es <b>000000</b>. Te vamos a pedir que lo
          cambies apenas entres.
        </div>
        <Footer />
      </div>
    );
  }

  // ---------- Cambio de código forzado ----------
  if (needsCodeChange) {
    return (
      <div className="vpp-shell">
        <div className="vpp-brandrow">
          <div className="vpp-brand">
            <Mark /> La Vecind<span>APP</span>
          </div>
        </div>
        <div className="vpp-section-title" style={{ marginTop: 0 }}>
          Elegí tu código de acceso
        </div>
        <p className="vpp-hero-sub" style={{ fontSize: 14 }}>
          Es la primera vez que entrás como <b>{user.label}</b>. Elegí un código de 6 dígitos que
          vas a usar de ahora en más para votar.
        </p>
        <form className="vpp-card" onSubmit={handleCambiarCodigo}>
          <div className="vpp-form-field">
            <label>Nuevo código (6 dígitos)</label>
            <input
              className="vpp-input vpp-mono"
              maxLength={6}
              value={newCode1}
              onChange={(e) => setNewCode1(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="vpp-form-field">
            <label>Repetilo</label>
            <input
              className="vpp-input vpp-mono"
              maxLength={6}
              value={newCode2}
              onChange={(e) => setNewCode2(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="vpp-form-field">
            <label>Tu mail (opcional, para recuperar el código si lo olvidás)</label>
            <input
              type="email"
              className="vpp-input"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="tu-mail@ejemplo.com"
            />
          </div>
          {codeChangeError && <div className="vpp-error">{codeChangeError}</div>}
          <button className="vpp-btn vpp-btn-brass" type="submit">
            Guardar código y entrar
          </button>
        </form>
      </div>
    );
  }

  // ---------- App logueada ----------
  const abiertas = edificio.consultas.filter((c) => c.estado === "abierta");
  const cerradas = edificio.consultas.filter((c) => c.estado === "cerrada");
  const destacada = [...abiertas].sort((a, b) => {
    if (a.fechaLimite && b.fechaLimite) return a.fechaLimite.localeCompare(b.fechaLimite);
    if (a.fechaLimite) return -1;
    if (b.fechaLimite) return 1;
    return b.creada - a.creada;
  })[0];
  const propuestas = edificio.propuestas || [];
  const propuestasActivas = propuestas.filter(
    (p) => p.estado !== "cerrada" && p.estado !== "convertida"
  ).length;
  const esAdmin = user.rol === "admin";
  const totalUnidadesVotantes = edificio.unidades.filter((u) => u.rol !== "admin").length;

  const consultaCardProps = {
    esAdmin,
    user,
    unidades: edificio.unidades,
    totalUnidadesVotantes,
    seleccion,
    elegirOpcion,
    emitirVoto,
    busyId,
    cerrarYGenerarActa,
    regenerarActa,
    cancelarConsulta,
  };

  return (
    <div className={"vpp-shell" + claseAccesibilidad}>
      <Head>
        <title>{edificio.nombre} — La VecindAPP</title>
      </Head>
      <div className="vpp-brandrow">
        <div className="vpp-brand">
          <Mark /> La Vecind<span>APP</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="vpp-a11y-toggles">
            <button
              type="button"
              className={"vpp-a11y-btn" + (textoGrande ? " active" : "")}
              onClick={toggleTextoGrande}
              title="Texto más grande"
            >
              Aa
            </button>
            <button
              type="button"
              className={"vpp-a11y-btn" + (altoContraste ? " active" : "")}
              onClick={toggleAltoContraste}
              title="Más contraste"
            >
              ◐
            </button>
          </div>
          <button className="vpp-btn vpp-btn-ghost" onClick={logout} style={{ padding: "6px 12px", fontSize: 12 }}>
            Salir
          </button>
        </div>
      </div>
      <div className="vpp-topbar">
        <div className="vpp-who">
          {edificio.nombre} · {edificio.direccion} · <b>{user.label}</b>
        </div>
      </div>

      <div className="vpp-tabs">
        <div className={"vpp-tab" + (tab === "inicio" ? " active" : "")} onClick={() => setTab("inicio")}>
          Inicio
        </div>
        <div className={"vpp-tab" + (tab === "consultas" ? " active" : "")} onClick={() => setTab("consultas")}>
          Consultas ({edificio.consultas.length})
        </div>
        <div className={"vpp-tab" + (tab === "mural" ? " active" : "")} onClick={() => setTab("mural")}>
          Mural{propuestasActivas > 0 ? ` · ${propuestasActivas}` : ""}
        </div>
        {!esAdmin && (
          <div className={"vpp-tab" + (tab === "historial" ? " active" : "")} onClick={() => setTab("historial")}>
            Mi historial
          </div>
        )}
        {esAdmin && (
          <div
            className={"vpp-tab" + (tab === "administracion" ? " active" : "")}
            onClick={() => setTab("administracion")}
          >
            Administración
          </div>
        )}
      </div>

      {tab === "inicio" && (
        <>
          <div className="vpp-section-title">Votación destacada</div>
          {destacada ? (
            <ConsultaCard c={destacada} mostrarVotar {...consultaCardProps} />
          ) : (
            <div className="vpp-empty">No hay consultas abiertas por ahora.</div>
          )}

          <div className="vpp-section-title">Información del edificio</div>
          <div className="vpp-card">
            {(edificio.infoUtil?.contactos?.length || 0) === 0 &&
            (edificio.infoUtil?.datos?.length || 0) === 0 ? (
              <div className="vpp-card-meta" style={{ marginBottom: 0 }}>
                La administración todavía no cargó información útil.
              </div>
            ) : (
              <div className="vpp-info-list">
                {edificio.infoUtil.datos?.map((d, i) => (
                  <div className="vpp-info-row" key={"d" + i}>
                    <span>{d.label}</span>
                    <span>{d.valor}</span>
                  </div>
                ))}
                {edificio.infoUtil.contactos?.map((c, i) => (
                  <div className="vpp-info-row" key={"c" + i}>
                    <span>{c.nombre}</span>
                    <span>{c.valor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "mural" && (
        <>
          <div className="vpp-section-title">Proponer un tema</div>
          <form className="vpp-card" onSubmit={enviarPropuesta}>
            <div className="vpp-form-field">
              <label>Mensaje visible para todo el edificio</label>
              <textarea
                className="vpp-textarea"
                value={propuestaTexto}
                onChange={(e) => setPropuestaTexto(e.target.value)}
                placeholder="Ej: Propongo votar si instalamos bicicletero en el palier de PB"
              />
            </div>
            <button className="vpp-btn vpp-btn-ink" type="submit" disabled={propuestaEnviando}>
              {propuestaEnviando ? "Enviando…" : "Enviar mensaje"}
            </button>
            {propuestaEnviada && (
              <div className="vpp-ok">✓ Mensaje enviado — ya lo puede ver todo el edificio.</div>
            )}
          </form>

          <div className="vpp-section-title">Mensajes del edificio</div>
          {propuestas.length === 0 && (
            <div className="vpp-empty">Todavía no hay mensajes. Sé el primero en proponer algo.</div>
          )}
          {propuestas
            .slice()
            .sort((a, b) => b.creada - a.creada)
            .map((p) => (
              <PropuestaCard
                key={p.id}
                p={p}
                esAdmin={esAdmin}
                comentarioTexto={comentarioTexto[p.id]}
                onComentarioChange={handleComentarioChange}
                comentarPropuesta={comentarPropuesta}
                convertirEnConsulta={convertirEnConsulta}
                cerrarTemaPropuesta={cerrarTemaPropuesta}
              />
            ))}
        </>
      )}

      {tab === "historial" && !esAdmin && (
        <>
          <div className="vpp-section-title">Mi historial de votos</div>
          {(() => {
            const misConsultas = edificio.consultas
              .filter((c) => c.votos[user.id] !== undefined)
              .sort((a, b) => b.creada - a.creada);
            if (misConsultas.length === 0) {
              return <div className="vpp-empty">Todavía no votaste ningún tema.</div>;
            }
            return misConsultas.map((c) => (
              <ConsultaCard key={c.id} c={c} mostrarVotar={c.estado === "abierta"} {...consultaCardProps} />
            ));
          })()}
        </>
      )}

      {tab === "consultas" && (
        <>
          <div className="vpp-section-title">Abiertas</div>
          {abiertas.length === 0 && <div className="vpp-empty">No hay consultas activas.</div>}
          {abiertas.map((c) => (
            <ConsultaCard key={c.id} c={c} mostrarVotar {...consultaCardProps} />
          ))}
          <div className="vpp-section-title">Cerradas</div>
          {cerradas.length === 0 && <div className="vpp-empty">Todavía no se cerró ninguna.</div>}
          {cerradas.map((c) => (
            <ConsultaCard key={c.id} c={c} {...consultaCardProps} />
          ))}
        </>
      )}

      {tab === "administracion" && esAdmin && (
        <>
          <div className="vpp-section-title">Nueva consulta</div>

          {origenPropuesta && (
            <div className="vpp-origen-banner">
              Basado en el mensaje de un vecino: <b>“{origenPropuesta.texto}”</b>
              <button
                type="button"
                className="vpp-btn vpp-btn-ghost"
                style={{ marginLeft: 10, padding: "3px 9px", fontSize: 11 }}
                onClick={() => setOrigenPropuesta(null)}
              >
                Quitar referencia
              </button>
            </div>
          )}

          <form className="vpp-card" onSubmit={crearConsulta}>
            <div className="vpp-form-field">
              <label>Tema / orden del día</label>
              <input
                className="vpp-input"
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                placeholder="Ej: Pintura de fachada — presupuesto A o B"
              />
            </div>
            <div className="vpp-form-field">
              <label>Opciones</label>
              <div className="vpp-opt-inputs">
                {opciones.map((op, i) => (
                  <div className="vpp-opt-inputs-row" key={i}>
                    <input
                      className="vpp-input"
                      value={op}
                      onChange={(e) => {
                        const copy = [...opciones];
                        copy[i] = e.target.value;
                        setOpciones(copy);
                      }}
                      placeholder={`Opción ${i + 1}`}
                    />
                    {opciones.length > 2 && (
                      <button
                        type="button"
                        className="vpp-btn vpp-btn-ghost"
                        onClick={() => setOpciones(opciones.filter((_, idx) => idx !== i))}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="vpp-btn vpp-btn-ghost"
                style={{ marginTop: 8, fontSize: 12, padding: "6px 12px" }}
                onClick={() => setOpciones([...opciones, ""])}
              >
                + Agregar opción
              </button>
            </div>
            <div className="vpp-form-field">
              <label>Fecha límite (opcional)</label>
              <input
                type="date"
                className="vpp-input"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
              />
            </div>
            <div className="vpp-form-field">
              <label>Quórum mínimo (opcional, cantidad de unidades)</label>
              <input
                type="number"
                min="1"
                className="vpp-input"
                value={nuevoQuorum}
                onChange={(e) => setNuevoQuorum(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 4"
              />
            </div>
            <button className="vpp-btn vpp-btn-ink" type="submit">
              Publicar consulta
            </button>
          </form>

          <div className="vpp-section-title">Actas del período</div>
          <div className="vpp-card">
            <div className="vpp-card-meta" style={{ marginBottom: 12 }}>
              Descarga en un solo archivo todas las actas ya cerradas, útil para presentar en la
              asamblea anual.
            </div>
            <button className="vpp-btn vpp-btn-ghost" onClick={exportarActas}>
              Exportar actas del período
            </button>
          </div>

          <div className="vpp-section-title">Información útil del edificio</div>
          <div className="vpp-card">
            {!editandoInfo ? (
              <button className="vpp-btn vpp-btn-ghost" onClick={() => setEditandoInfo(true)}>
                Editar información
              </button>
            ) : (
              <form onSubmit={guardarInfoUtil}>
                <div className="vpp-form-field">
                  <label>Datos del edificio (uno por línea: Etiqueta: valor)</label>
                  <textarea
                    className="vpp-textarea"
                    value={infoDatos}
                    onChange={(e) => setInfoDatos(e.target.value)}
                    placeholder={"Nomenclatura catastral: 12-345-67\nMedidor de gas: 0012345"}
                  />
                </div>
                <div className="vpp-form-field">
                  <label>Contactos (uno por línea: Nombre: valor)</label>
                  <textarea
                    className="vpp-textarea"
                    value={infoContactos}
                    onChange={(e) => setInfoContactos(e.target.value)}
                    placeholder={"Portería: 11-1234-5678\nPlomero de confianza: 11-2233-4455\nBomberos: 100"}
                  />
                </div>
                <button className="vpp-btn vpp-btn-ink" type="submit">
                  Guardar información
                </button>
              </form>
            )}
          </div>
        </>
      )}

      <div className="vpp-footer-note">
        Próximamente en La VecindAPP:
        <div style={{ marginTop: 6 }}>
          <span className="vpp-roadmap-tag">Turnos de SUM y quincho</span>
          <span className="vpp-roadmap-tag">Historial de expensas</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}
