import Head from "next/head";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import BuildingFacade from "../components/BuildingFacade";
import Mark from "../components/Mark";
import Footer from "../components/Footer";

const FUNCIONES = [
  {
    titulo: "Votar con confirmación",
    desc: "Elegís una opción y confirmás con un botón — nada de votos por clic accidental. Fecha límite y quórum mínimo opcionales.",
  },
  {
    titulo: "Mural de mensajes",
    desc: "Proponé un tema, visible para todo el edificio, con comentarios tipo hilo de redes sociales.",
  },
  {
    titulo: "Acta automática por IA",
    desc: "Al cerrar una consulta, la IA redacta el acta sola: resultado, participación y quórum.",
  },
  {
    titulo: "Avisos por mail",
    desc: "Te enteras cuando se abre una consulta nueva, y recibís un recordatorio si todavía no votaste.",
  },
  {
    titulo: "Tu historial de votos",
    desc: "Cada vecino puede ver qué votó en cada tema, abierto o cerrado.",
  },
  {
    titulo: "Información del edificio",
    desc: "Contactos y datos útiles, cargados por administración, a la vista de todos.",
  },
];

export default function Home() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    try {
      setMostrarBienvenida(localStorage.getItem("vpp:vistoBienvenida") !== "1");
    } catch (e) {
      setMostrarBienvenida(true);
    }
  }, []);

  function cerrarBienvenida() {
    setMostrarBienvenida(false);
    try {
      localStorage.setItem("vpp:vistoBienvenida", "1");
    } catch (e) {}
  }

  function handleChange(valor) {
    setCodigo(valor);
    setMostrarSugerencias(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valor.trim().length < 2) {
      setSugerencias([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar-edificios?q=${encodeURIComponent(valor.trim())}`);
        const json = await res.json();
        setSugerencias(json.resultados || []);
      } catch (e) {
        setSugerencias([]);
      }
    }, 300);
  }

  function elegirSugerencia(item) {
    setCodigo(item.codigo);
    setMostrarSugerencias(false);
    router.push(`/edificio/${item.codigo}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const limpio = codigo.trim().toUpperCase();
    if (!limpio) return;
    setBuscando(true);
    try {
      const res = await fetch(`/api/edificio/${limpio}`);
      const json = await res.json();
      if (!json.ok) {
        setError("No encontramos un edificio con ese código. Revisalo con tu administrador.");
        setBuscando(false);
        return;
      }
      router.push(`/edificio/${limpio}`);
    } catch (err) {
      setError("Hubo un problema buscando el edificio. Probá de nuevo.");
      setBuscando(false);
    }
  }

  return (
    <div className="vpp-shell">
      <Head>
        <title>La VecindAPP — Vota tu consorcio sin la asamblea eterna</title>
        <meta
          name="description"
          content="Cada edificio se inscribe con un código propio. Los vecinos votan tocando su timbre digital, proponen temas en un mural, y la IA redacta el acta al cerrar cada consulta."
        />
        <meta property="og:title" content="La VecindAPP" />
        <meta
          property="og:description"
          content="Votá tu consorcio tan fácil como tocar un timbre. Acta redactada por IA al cerrar cada consulta."
        />
        <meta property="og:type" content="website" />
      </Head>
      <div className="vpp-brandrow">
        <div className="vpp-brand">
          <Mark /> La Vecind<span>APP</span>
        </div>
      </div>

      <BuildingFacade />

      <div className="vpp-hero-center">
        <h1 className="vpp-hero-title">Vecinos participando.</h1>
        <p className="vpp-hero-sub">
          La VecindAPP optimiza las votaciones de consorcio y le da voz a quienes no pudieron
          sentarse dos horas en una asamblea un martes a la noche. Ahora votar es tan fácil como
          tocar un timbre.
        </p>
      </div>

      {mostrarBienvenida && (
        <div className="vpp-testing-banner">
          <button className="vpp-testing-close" onClick={cerrarBienvenida} aria-label="Cerrar">
            ✕
          </button>
          <b>👋 ¿Primera vez por acá?</b> Para probarla: inscribí un edificio de prueba — vas a
          entrar como administrador. Te va a dar un código de edificio (si lo olvidás, no pasa
          nada: buscá por la dirección entre las sugerencias). Después abrí una ventana de
          incógnito y entrá a ese mismo edificio como vecino — tu primera clave siempre es{" "}
          <b>000000</b>.
        </div>
      )}

      <div className="vpp-portico">
        <div className="vpp-portico-label">Tocá tu timbre</div>
        <form onSubmit={handleSubmit}>
          <div className="vpp-form-field" style={{ position: "relative", marginBottom: 12 }}>
            <input
              className="vpp-portico-input"
              value={codigo}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setMostrarSugerencias(true)}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              placeholder="Código, nombre o dirección del edificio"
              autoComplete="off"
              autoFocus
            />
            {mostrarSugerencias && sugerencias.length > 0 && (
              <div className="vpp-suggestions">
                {sugerencias.map((s) => (
                  <div
                    key={s.codigo}
                    className="vpp-suggestion-row"
                    onMouseDown={() => elegirSugerencia(s)}
                  >
                    <span className="vpp-mono">{s.codigo}</span>
                    <span className="vpp-suggestion-meta">
                      {s.nombre}
                      {s.direccion ? ` · ${s.direccion}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <div className="vpp-error">{error}</div>}
          <button className="vpp-btn vpp-btn-brass vpp-btn-block" type="submit" disabled={buscando}>
            {buscando ? "Buscando…" : "Tocar timbre"}
          </button>
        </form>
      </div>

      <div className="vpp-secondary-link">
        ¿Administrás un edificio o consorcio?{" "}
        <Link href="/inscribir">Inscribilo acá</Link>
      </div>

      <div className="vpp-section-title">Qué podés hacer</div>
      <div className="vpp-features">
        {FUNCIONES.map((f) => (
          <div className="vpp-feature-item" key={f.titulo}>
            <div className="vpp-feature-title">
              <span className="vpp-feature-icon" />
              {f.titulo}
            </div>
            <div className="vpp-feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="vpp-footer-note">
        Próximamente en La VecindAPP:
        <div style={{ marginTop: 6 }}>
          <span className="vpp-roadmap-tag">Turnos de SUM y quincho</span>
          <span className="vpp-roadmap-tag">Historial de expensas</span>
          <span className="vpp-roadmap-tag">Consulta entre edificios del barrio</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}
