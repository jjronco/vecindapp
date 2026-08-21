-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar y correr.

create table if not exists edificios (
  codigo text primary key,
  data jsonb not null,
  creado timestamptz default now()
);

-- Nadie necesita autenticarse para leer/escribir en esta demo (el "login" real
-- lo maneja la app con el código de unidad, no Supabase Auth). Habilitamos RLS
-- con una política abierta porque usamos la clave "anon" desde el navegador.
-- Si más adelante esto crece, conviene mover las escrituras a rutas /api
-- (ya está así) y cerrar esta política a solo lectura, escribiendo con la
-- service_role key desde el servidor en lugar de la anon key.

alter table edificios enable row level security;

create policy "lectura publica" on edificios
  for select using (true);

create policy "escritura publica" on edificios
  for insert with check (true);

create policy "actualizacion publica" on edificios
  for update using (true);
