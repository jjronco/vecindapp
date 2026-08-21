import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import BuildingFacade from "../components/BuildingFacade";
import Mark from "../components/Mark";

export default function Ingresar() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const debounceRef = useRef(null);

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
        <title>Ingresar a mi edificio — La VecindAPP</title>
        <meta name="description" content="Buscá tu edificio por código, nombre o dirección, y entrá tocando tu timbre digital." />
      </Head>
      <div className="vpp-brandrow">
        <Link href="/" className="vpp-brand">
          <Mark /> La Vecind<span>APP</span>
        </Link>
      </div>

      <BuildingFacade compact />

      <div className="vpp-section-title" style={{ marginTop: 0 }}>
        Ingresar a mi edificio
      </div>
      <p className="vpp-hero-sub" style={{ fontSize: 14 }}>
        Pedile el código a tu administrador o a un vecino — o empezá a escribir el nombre o la
        dirección del edificio y te lo sugerimos.
      </p>

      <form className="vpp-card" onSubmit={handleSubmit}>
        <div className="vpp-form-field" style={{ position: "relative" }}>
          <label>Código, nombre o dirección del edificio</label>
          <input
            className="vpp-input vpp-mono"
            value={codigo}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setMostrarSugerencias(true)}
            onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
            placeholder="Ej: JNCL-450 o San Martín"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
            autoComplete="off"
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
        <button className="vpp-btn vpp-btn-brass" type="submit" disabled={buscando}>
          {buscando ? "Buscando…" : "Buscar edificio"}
        </button>
      </form>
    </div>
  );
}
