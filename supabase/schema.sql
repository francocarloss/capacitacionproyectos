-- Ruta de Dominio IA · esquema de base de datos para Supabase
-- Pegar completo en Supabase > SQL Editor > New query > Run.

-- 1. Perfil de cada persona y su reto semanal
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null unique check (full_name in (
    'Nicte Antonieta Salinas Martinez',
    'Walter Danilo Lopez Antillon',
    'Alejandro Castañeda Porras',
    'Tania Yadira Gomez Gomez',
    'Carlos Yovany Franco Cano'
  )),
  profile_type text not null default 'general' check (profile_type in ('general', 'tecnico')),
  hours_per_week numeric(4,1) not null default 3.5 check (hours_per_week between 0.5 and 40),
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Registro de horas y avances
create table if not exists public.progress_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  course_id text not null,
  log_date date not null default current_date,
  hours numeric(4,1) not null check (hours > 0 and hours <= 24),
  note text,
  evidence_url text,
  created_at timestamptz not null default now()
);

-- 3. Estado de cada curso por persona
create table if not exists public.course_status (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  course_id text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_curso', 'completado')),
  completed_at date,
  primary key (user_id, course_id)
);

-- 4. Resultados del entrenamiento (quiz, alucinaciones, laboratorio de prompts, retos)
create table if not exists public.training_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  activity text not null check (activity in ('quiz', 'hallu', 'prompt', 'challenge', 'cards')),
  item_id text not null,
  score int not null default 0,
  max_score int not null default 0,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists progress_logs_user_idx on public.progress_logs(user_id);
create index if not exists training_results_user_idx on public.training_results(user_id);

-- Seguridad: todo el equipo puede ver el avance de todos (tablero),
-- pero cada persona solo puede crear o cambiar sus propios registros.
alter table public.profiles enable row level security;
alter table public.progress_logs enable row level security;
alter table public.course_status enable row level security;
alter table public.training_results enable row level security;

create policy "equipo ve perfiles" on public.profiles for select to authenticated using (true);
create policy "crea su perfil" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "edita su perfil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "equipo ve avances" on public.progress_logs for select to authenticated using (true);
create policy "registra sus avances" on public.progress_logs for insert to authenticated with check (user_id = auth.uid());
create policy "borra sus avances" on public.progress_logs for delete to authenticated using (user_id = auth.uid());

create policy "equipo ve estados" on public.course_status for select to authenticated using (true);
create policy "crea sus estados" on public.course_status for insert to authenticated with check (user_id = auth.uid());
create policy "edita sus estados" on public.course_status for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "equipo ve entrenamiento" on public.training_results for select to authenticated using (true);
create policy "registra su entrenamiento" on public.training_results for insert to authenticated with check (user_id = auth.uid());
