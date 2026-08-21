import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import BuildingFacade from "../components/BuildingFacade";
import Mark from "../components/Mark";

export default function Inscribir() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [adminNombre, setAdminNombre] = useState("");
  const [adminContacto, setAdminContacto] = useState("");
  const [unidadesRaw, setUnidadesRaw] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const res = await fetch("/api/inscribir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, direccion, adminNombre, adminContacto, unidadesRaw }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "No se pudo inscribir el edificio.");
      setResultado(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="vpp-shell">
        <div className="vpp-brandrow">
          <Link href="/" className="vpp-brand">
            <Mark /> La Vecind<span>APP</span>
          </Link>
        </div>
        <BuildingFacade compact />
        <h1 className="vpp-hero-title" style={{ fontSize: 22 }}>
          {resultado.data.nombre} quedó inscripto
        </h1>
        <p className="vpp-hero-sub" style={{ marginBottom: 8 }}>
          Este es el código de tu edificio. Compartilo con los vecinos: es la llave para que
          encuentren el edificio antes de tocar su timbre.
        </p>
        <div className="vpp-code-display">{resultado.codigo}</div>
        <div style={{ display: "flex", gap: 8, marginTop: -8, marginBottom: 16 }}>
          <button
            className="vpp-btn vpp-btn-ghost"
            onClick={() => navigator.clipboard.writeText(resultado.codigo)}
          >
            Copiar código
          </button>
          <a
            className="vpp-btn vpp-btn-ghost"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(
              `Ya inscribí ${resultado.data.nombre} en La VecindAPP. Entrá en la app y usá el código ${resultado.codigo} para votar los temas del edificio.`
            )}`}
          >
            Compartir por WhatsApp
          </a>
        </div>
        <div className="vpp-hint">
          Todas las unidades, incluida <b>Administración</b>, arrancan con el código{" "}
          <b>000000</b>. Al ingresar por primera vez, cada uno va a tener que elegir su propio
          código de 6 dígitos.
        </div>
        <Link
          href={`/edificio/${resultado.codigo}`}
          className="vpp-btn vpp-btn-brass vpp-btn-block"
          style={{ display: "block", marginTop: 20 }}
        >
          Ir al portero de mi edificio
        </Link>
      </div>
    );
  }

  return (
    <div className="vpp-shell">
      <Head>
        <title>Inscribir mi edificio — La VecindAPP</title>
        <meta name="description" content="Cargá tu edificio, sus unidades y el administrador. Genera un código propio para que los vecinos empiecen a votar." />
      </Head>
      <div className="vpp-brandrow">
        <Link href="/" className="vpp-brand">
          <Mark /> La Vecind<span>APP</span>
        </Link>
      </div>
      <div className="vpp-section-title" style={{ marginTop: 0 }}>
        Inscribir edificio o consorcio
      </div>

      <form className="vpp-card" onSubmit={handleSubmit}>
        <div className="vpp-form-field">
          <label>Nombre del edificio (para identificarlo)</label>
          <input
            className="vpp-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Edificio Juncal 1450"
            required
          />
        </div>
        <div className="vpp-form-field">
          <label>Dirección</label>
          <input
            className="vpp-input"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Ej: Av. Juncal 1450, CABA"
          />
        </div>
        <div className="vpp-form-field">
          <label>Nombre de quien administra</label>
          <input
            className="vpp-input"
            value={adminNombre}
            onChange={(e) => setAdminNombre(e.target.value)}
            placeholder="Ej: Estudio González / Consejo de administración"
          />
        </div>
        <div className="vpp-form-field">
          <label>Contacto del administrador (opcional)</label>
          <input
            className="vpp-input"
            value={adminContacto}
            onChange={(e) => setAdminContacto(e.target.value)}
            placeholder="Teléfono o email"
          />
        </div>
        <div className="vpp-form-field">
          <label>Unidades del edificio</label>
          <textarea
            className="vpp-textarea"
            value={unidadesRaw}
            onChange={(e) => setUnidadesRaw(e.target.value)}
            placeholder={"Una por línea, por ejemplo:\n1° A\n1° B\n2° A\n2° B"}
            required
          />
          <div className="vpp-field-note">
            Se crea un usuario por cada unidad, todos con código inicial 000000.
          </div>
        </div>

        {error && <div className="vpp-error">{error}</div>}

        <button className="vpp-btn vpp-btn-ink" type="submit" disabled={enviando}>
          {enviando ? "Inscribiendo…" : "Inscribir edificio"}
        </button>
      </form>
    </div>
  );
}
