# La VecindAPP

**Probala acá: https://vecindapp-seven.vercel.app/**

Armé La VecindAPP para resolver algo que veo con frecuencia: en las asambleas de consorcio cada
vez participa menos gente. Las reuniones se estiran, las discusiones se van por las ramas, y no
queda un registro claro de lo que se decidió. Mi apuesta es que la participación en las decisiones
colectivas no debería depender de una reunión presencial de cuatro horas un martes o jueves a la
noche. Las decisiones concretas pueden ser tomadas de modo tan simple como "tocar un timbre" en el
tablero de esta plataforma. Y de paso, también, que sirva de lugar de encuentro virtual entre los
vecinos, sea para resolver cosas rápidas, para obtener información general, etc.

Cada edificio se inscribe una vez, recibe un código propio, y desde ahí las unidades votan temas,
proponen otros y consultan información útil — con acta redactada automáticamente al cerrarse cada
consulta.

## Qué armé hasta ahora

- **Inscripción de edificio**: cargás nombre, dirección, unidades y datos del administrador. Genero
  un código propio a partir de la calle y el número (ej. "Av. San Martín 1234" → `SAN-1234`).
- **Portero eléctrico digital**: cada unidad entra con su código, y lo cambia la primera vez que
  ingresa.
- **Votación**: se emite voto con fecha límite y quórum mínimo opcionales.
- **Acta automática por IA** al cerrar una consulta: resultado, participación, y si se alcanzó el
  quórum — con un aviso legal fijo que aclara que es un registro informativo, no un reemplazo del
  libro de actas formal.
- **Mural de mensajes**: cualquier vecino puede proponer un tema, visible para todo el edificio,
  con comentarios tipo hilo. Administración puede convertir un mensaje en consulta formal o cerrar
  el tema (rol de moderador).
- **Historial de voto personal** por unidad.
- **Información útil del edificio** (contactos, datos), editable por administración.
- **Notificaciones por mail** (consulta nueva, acta lista, recordatorio a quien no votó) y
  recuperación de código por mail — las activo con una clave de Resend.
- **Accesibilidad**: texto más grande y alto contraste con un toque, y sesión recordada por
  dispositivo para no loguearse cada vez.

## Cómo usé la IA en este proyecto

No la usé como un adorno — son dos aplicaciones concretas, distintas entre sí:

1. **Para escribir el acta.** Al cerrar una consulta, le paso a la API de Gemini los datos reales
   de la votación (tema, resultado, participación, si se alcanzó el quórum) y devuelve un texto
   institucional, listo para archivar — no un resumen genérico, sino algo redactado con la
   estructura y el tono que necesita un acta de consorcio real. Es el corazón del proyecto: ataca
   directamente el problema de "la reunión termina y nadie sabe bien qué quedó decidido".
   Programé además una lista de modelos de respaldo, para que si el modelo principal deja de
   existir (pasa seguido con las APIs de IA), el sistema pruebe con otro antes de fallar — pensado
   para que esto se pueda usar mañana, no solo hoy.
2. **Para construir la aplicación.** Construí buena parte del código con Claude, iterando en el
   chat: yo tomaba las decisiones de producto — qué construir, en qué orden, qué dejar afuera de
   esta versión — y la IA escribía la implementación. De las cinco clases, esta fue la que más
   apliqué directamente.

## Cómo apliqué las 5 clases

- **Cómo funciona la IA de verdad**: el prompt del acta no le pide a Gemini "escribí un acta" a
  secas — le paso datos estructurados (tema, resultado, participación, quórum) más instrucciones
  de formato y tono. Y programé una lista de modelos de respaldo porque entendí que los modelos de
  IA cambian de nombre o se dan de baja seguido.
- **ChatGPT y Claude a fondo**: toda la construcción de la app fue eso — yo en el rol de definir
  qué construir, la IA en el rol de escribirlo, iterando juntos hasta llegar al resultado (ver la
  sección anterior).
- **Automatizaciones**: el proyecto corre dos automatizaciones reales, disparadas por evento y por
  tiempo, sin intervención manual — cuando se publica una consulta, sale un mail solo; todos los
  días a las 10am (hora Argentina) corre un recordatorio automático a quien todavía no votó. Las
  armé directamente en código en vez de con una herramienta de automatización visual, pero es el
  mismo concepto: un disparador, una acción, cero intervención humana.
- **Publicarla con GitHub y Vercel**: repo en GitHub, deploy en Vercel, tal cual como se enseñó.

## Cómo probarlo

1. En **https://vecindapp-seven.vercel.app/**, en el buscador de la portada, elegí **"¿Administrás
   un edificio o consorcio? Inscribilo acá"** y cargá un edificio de prueba con 3-4 unidades.
2. Copiá el código generado → abrí una ventana de incógnito → pegá ese código en el buscador de la
   portada → **Tocar timbre**.
3. Entrá como **Administración** (código inicial `000000`, pide cambiarlo).
4. Publicá una consulta. En la otra pestaña/incógnito, entrá como una unidad vecina (también
   `000000` la primera vez) y votá.
5. Volvé como administración, cerrá la consulta, y mirá el acta generada.
6. Probá el Mural: proponé un mensaje desde una unidad, comentalo desde otra, y convertilo en
   consulta o cerralo desde administración.

## Decisiones técnicas

- **Stack**: Next.js (Pages Router) + Supabase (Postgres) + Gemini API (redacción del acta) +
  Resend (correo) + Vercel (deploy y cron).
- **Modelo de datos**: guardo cada edificio como una fila en la tabla `edificios`, con todo su
  contenido (unidades, consultas, propuestas, información útil) en una sola columna `jsonb`. Para
  el tamaño de un consorcio (decenas de unidades, pocas consultas por mes) me resultó más simple
  de mantener que normalizar en varias tablas, y evita múltiples llamadas a la base por pantalla.

## Puntos a mejorar en próximos pasos

Decisiones de alcance que tomé a propósito para esta versión, y quedan pendientes para una nueva
edición:

- **Las reglas de negocio se validan del lado del cliente, no del servidor.** El servidor hoy
  guarda lo que el navegador le manda sin volver a chequearlo (por ejemplo, que una unidad no vote
  dos veces o que el plazo no haya vencido). Funciona bien para el uso normal de la app; para
  escalarla, el próximo paso es mover esas validaciones al servidor.
- **Vía no digital para quien no puede votar en la app.** Que administración pueda tomar el voto
  de un vecino por otro medio (en persona, por teléfono, por escrito) y cargarlo en el sistema en
  su nombre. Especialmente, en los casos en que un vecino no pueda utilizar la app.

## Instalación para desarrollo

No hace falta nada de esto para probar la app — usá el link de arriba. Esto es para correrla en tu
propia máquina o seguir desarrollándola.

### 1. Requisitos

- Node.js 18 o superior
- Cuenta gratuita en [supabase.com](https://supabase.com)
- Cuenta de Google para [aistudio.google.com](https://aistudio.google.com) (actas gratis, sin
  tarjeta, sin vencimiento)
- Cuenta en [vercel.com](https://vercel.com) para el deploy
- Opcional: cuenta en [resend.com](https://resend.com) para activar el correo

### 2. Base de datos (Supabase)

1. supabase.com → **New Project**.
2. **SQL Editor** → **New query** → pegar todo `supabase-setup.sql` (raíz del proyecto) → correr.
3. **Project Settings → API** (pestaña "Legacy anon, service_role API keys" si aparece) → copiar
   la clave **anon / public**.
4. **Project Settings → General** → copiar el **Project ID**. La URL completa es
   `https://ESE-ID.supabase.co`.

### 3. Clave de Gemini

aistudio.google.com con tu cuenta de Google → **Get API key** → **Create API key**.

### 4. Variables de entorno

```bash
cd vecindapp
npm install
```

Creá un archivo `.env.local` en la raíz del proyecto con este contenido, completando tus valores
reales:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
RESEND_API_KEY=...        # opcional, ver sección de correo abajo
CRON_SECRET=...           # opcional, cualquier texto random
```

Probar local: `npm run dev` → `http://localhost:3000`.

### 5. GitHub y Vercel

```bash
git init
git add -A
git commit -m "La VecindAPP"
git branch -M main
git remote add origin https://github.com/jjronco/vecindapp.git
git push -u origin main
```

En vercel.com → **Add New → Project** → importar el repo → cargar las mismas variables de entorno
en **Environment Variables** (Vercel no lee `.env.local`) → **Deploy**.

### 6. Correo (Resend) — opcional

1. resend.com → cuenta gratis (sin tarjeta) → **API Keys** → generar y agregar como
   `RESEND_API_KEY`.
2. **Limitación del modo sandbox**: sin verificar un dominio propio en Resend, solo se puede
   enviar a la dirección con la que te registraste ahí. Para mandar a cualquier vecino real, hace
   falta verificar un dominio (Resend → Domains).
3. Sin esta clave configurada, la app funciona igual — esas funciones puntuales avisan que no
   están configuradas en vez de fallar.

Con la clave activa: recuperar código por mail, aviso de consulta nueva, acta por mail, y
recordatorio diario a quien no votó.

El recordatorio diario corre vía **Vercel Cron** (ya configurado en `vercel.json`, 13:00 UTC).
Necesita `CRON_SECRET` como variable de entorno en Vercel (cualquier texto random; Vercel lo manda
automáticamente en cada ejecución para que nadie más pueda llamar a esa ruta desde afuera). No
corre en local, solo en el proyecto deployado.

## Estructura del proyecto

```
pages/
  index.js                 landing + buscador de ingreso
  inscribir.js              inscripción de un edificio nuevo
  ingresar.js                buscar edificio por código o nombre (ruta directa alternativa)
  edificio/[code].js        portero, votación, mural, historial y panel de administración
  api/
    inscribir.js             crea el edificio en Supabase
    edificio/[code].js       GET/PUT de los datos del edificio
    buscar-edificios.js      autocompletado de edificios
    acta.js                   redacción del acta con Gemini (con modelos de respaldo)
    recuperar-codigo.js      recuperación de código por mail
    notificar-consulta.js   aviso de consulta nueva
    notificar-acta.js        envío del acta por mail
    cron/recordatorios.js   recordatorio diario a quien no votó (Vercel Cron)
lib/
  supabase.js                cliente de Supabase
  db.js                       alta/lectura/escritura de edificios, generación de código
  mailer.js                   helper de envío de correo (Resend)
components/
  BuildingFacade.js          motivo visual de fachada de edificio
  Mark.js                     isotipo de la marca
  BellIcon.js                 ícono de campanita
supabase-setup.sql            schema + políticas para Supabase
vercel.json                   configuración del cron de recordatorios
```

---

Juan J. Ronco Rampulla
jjroncorampulla@gmail.com
https://www.linkedin.com/in/juanronco/
