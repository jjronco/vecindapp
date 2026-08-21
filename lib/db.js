import { supabase } from "./supabase";

const PREFIJOS_CALLE = /^(av\.?|avenida|avda\.?|calle|c\/|bv\.?|boulevard|blvd\.?|pje\.?|pasaje|diag\.?|diagonal|ruta|rta\.?)\s+/i;
const CONECTORES = new Set(["de", "del", "la", "las", "los", "y"]);

function quitarAcentos(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(nombre) {
  return (
    quitarAcentos(nombre)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 4) || "EDIF"
  );
}

// "Av. San Martín 1234" -> "SAN-1234". Contempla calles con número en el nombre
// (Av. 9 de Julio 1500 -> "JUL-1500") y dirección con ciudad después de coma.
function codigoDesdeDireccion(direccion, nombreFallback) {
  const dir = (direccion || "").trim();
  if (!dir) return slugify(nombreFallback);

  const segmento = dir.split(",")[0].replace(PREFIJOS_CALLE, "");
  const palabras = quitarAcentos(segmento).split(/\s+/).filter(Boolean);

  const candidata = palabras.find(
    (p) => /[A-Za-z]/.test(p) && !CONECTORES.has(p.toLowerCase())
  );
  const letras = candidata
    ? candidata.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
    : slugify(nombreFallback);

  const numeros = quitarAcentos(segmento).match(/\d+/g);
  const numero = numeros ? numeros[numeros.length - 1] : null;

  if (!letras) return slugify(nombreFallback);
  return numero ? `${letras}-${numero}` : letras;
}

export async function crearEdificio({ nombre, direccion, adminNombre, adminContacto, unidadesRaw }) {
  const unidadIds = (unidadesRaw || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!nombre || unidadIds.length === 0) {
    throw new Error("Falta el nombre del edificio o la lista de unidades.");
  }

  const unidades = [
    {
      id: "ADM",
      label: adminNombre?.trim() || "Administración",
      codigo: "000000",
      rol: "admin",
      contacto: adminContacto || "",
    },
    ...unidadIds.map((label, i) => ({
      id: `U${i + 1}`,
      label,
      codigo: "000000",
      rol: "vecino",
    })),
  ];

  const base = codigoDesdeDireccion(direccion, nombre);
  let codigo = null;
  for (let intento = 0; intento < 8; intento++) {
    const candidato = intento === 0 ? base : `${base}-${intento + 1}`;
    const { data: existente } = await supabase
      .from("edificios")
      .select("codigo")
      .eq("codigo", candidato)
      .maybeSingle();
    if (!existente) {
      codigo = candidato;
      break;
    }
  }
  if (!codigo) throw new Error("No se pudo generar un código único, reintentá.");

  const data = {
    codigo,
    nombre: nombre.trim(),
    direccion: (direccion || "").trim(),
    unidades,
    consultas: [],
    propuestas: [],
    infoUtil: { contactos: [], datos: [] },
    creado: Date.now(),
  };

  const { error } = await supabase.from("edificios").insert({ codigo, data });
  if (error) throw error;
  return data;
}

export async function obtenerEdificio(codigo) {
  if (!codigo) return null;
  const { data, error } = await supabase
    .from("edificios")
    .select("data")
    .eq("codigo", codigo.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data.data;
}

export async function guardarEdificio(codigo, edificioData) {
  const { error } = await supabase
    .from("edificios")
    .update({ data: edificioData })
    .eq("codigo", codigo.toUpperCase());
  if (error) throw error;
}

export async function obtenerTodosLosEdificios() {
  const { data, error } = await supabase.from("edificios").select("codigo, data");
  if (error || !data) return [];
  return data.map((row) => row.data);
}
