-- Ruta de Dominio IA · esquema aplicado en el proyecto Supabase "capacitacion-proyectos".
-- Acceso eligiendo el nombre (sin correo): la página usa la clave publicable (rol anon).

create table public.members (
  name text primary key check (name in (
    'Nicte Antonieta Salinas Martinez','Walter Danilo Lopez Antillon','Alejandro Castañeda Porras',
    'Tania Yadira Gomez Gomez','Carlos Yovany Franco Cano')),
  avatar jsonb,
  profile_type text not null default 'general' check (profile_type in ('general','tecnico')),
  hours_per_week numeric(4,1) check (hours_per_week between 0.5 and 40),
  start_date date,
  configured boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.members (name) values
  ('Nicte Antonieta Salinas Martinez'),('Walter Danilo Lopez Antillon'),('Alejandro Castañeda Porras'),
  ('Tania Yadira Gomez Gomez'),('Carlos Yovany Franco Cano');

create table public.progress_logs (
  id bigint generated always as identity primary key,
  member text not null references public.members(name) on delete cascade,
  course_id text not null check (length(course_id) <= 40),
  log_date date not null default current_date,
  hours numeric(4,1) not null check (hours > 0 and hours <= 24),
  note text check (length(note) <= 2000),
  evidence_url text check (length(evidence_url) <= 500),
  created_at timestamptz not null default now()
);
create table public.course_status (
  member text not null references public.members(name) on delete cascade,
  course_id text not null check (length(course_id) <= 40),
  status text not null default 'pendiente' check (status in ('pendiente','en_curso','completado')),
  completed_at date,
  primary key (member, course_id)
);
create table public.training_results (
  id bigint generated always as identity primary key,
  member text not null references public.members(name) on delete cascade,
  activity text not null check (activity in ('quiz','hallu','prompt','challenge','cards')),
  item_id text not null check (length(item_id) <= 40),
  score int not null default 0,
  max_score int not null default 0,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index progress_logs_member_idx on public.progress_logs(member);
create index training_results_member_idx on public.training_results(member);

alter table public.members enable row level security;
alter table public.progress_logs enable row level security;
alter table public.course_status enable row level security;
alter table public.training_results enable row level security;

create policy "leer integrantes" on public.members for select to anon, authenticated using (true);
create policy "actualizar integrante" on public.members for update to anon, authenticated using (true) with check (true);
create policy "leer avances" on public.progress_logs for select to anon, authenticated using (true);
create policy "registrar avance" on public.progress_logs for insert to anon, authenticated with check (true);
create policy "borrar avance" on public.progress_logs for delete to anon, authenticated using (true);
create policy "leer estados" on public.course_status for select to anon, authenticated using (true);
create policy "crear estado" on public.course_status for insert to anon, authenticated with check (true);
create policy "actualizar estado" on public.course_status for update to anon, authenticated using (true) with check (true);
create policy "leer entrenamiento" on public.training_results for select to anon, authenticated using (true);
create policy "registrar entrenamiento" on public.training_results for insert to anon, authenticated with check (true);
