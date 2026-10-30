-- Ruta de Dominio IA v3: usuarios registrados, equipos y calificación en el servidor.


-- Catálogo (lo administra el equipo del proyecto, no los usuarios)
create table public.courses (
  id text primary key,
  name text not null,
  hours numeric(4,1) not null check (hours > 0),
  track text not null check (track in ('todos','tecnico','general')),
  sort int not null
);
create table public.questions (
  id bigint generated always as identity primary key,
  course_id text not null references public.courses(id) on delete cascade,
  module_idx int not null check (module_idx >= 0),
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  answer_idx int not null,
  explanation text not null
);
create index questions_course_module_idx on public.questions(course_id, module_idx);

-- Perfil de cada usuario registrado
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 60),
  avatar jsonb check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 1024)),
  profile_type text not null default 'general' check (profile_type in ('general','tecnico')),
  hours_per_week numeric(4,1) not null default 3.5 check (hours_per_week between 1 and 40),
  start_date date not null default current_date check (start_date between date '2024-01-01' and date '2100-01-01'),
  configured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equipos
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  invite_code text not null unique,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Lecciones de "Demuestra" (estado en el servidor) y dominio por módulo
create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  module_idx int not null,
  hearts int not null default 3,
  first_ok int not null default 0,
  total int not null,
  answered jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','passed','failed')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index lesson_sessions_user_idx on public.lesson_sessions(user_id, created_at);
create table public.module_mastery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  module_idx int not null,
  best_score int not null,
  total int not null,
  perfect boolean not null default false,
  xp int not null default 0,
  hours_credited numeric(5,2) not null default 0,
  attempts int not null default 1,
  passed_at timestamptz not null default now(),
  primary key (user_id, course_id, module_idx)
);

-- Actividades de práctica (quiz, alucinaciones, prompts, retos): solo suman puntos
create table public.training_results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity text not null check (activity in ('quiz','hallu','prompt','challenge')),
  item_id text not null check (char_length(item_id) <= 20),
  score int not null check (score between 0 and 10),
  max_score int not null check (max_score between 0 and 10),
  payload jsonb check (payload is null or pg_column_size(payload) < 4096),
  created_at timestamptz not null default now()
);
create index training_results_user_idx on public.training_results(user_id);

-- Funciones auxiliares (no exponen datos)
create or replace function public.my_team_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as
$$ select team_id from public.team_members where user_id = auth.uid() $$;

create or replace function public.is_teammate(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as
$$ select uid = auth.uid() or exists (
     select 1 from public.team_members a join public.team_members b on a.team_id = b.team_id
     where a.user_id = auth.uid() and b.user_id = uid) $$;

-- Perfil automático al registrarse
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as
$$ begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Usuario'), 60));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS
alter table public.courses enable row level security;
alter table public.questions enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.module_mastery enable row level security;
alter table public.training_results enable row level security;

create policy "catalogo visible" on public.courses for select to authenticated using (true);
-- questions y lesson_sessions: sin políticas. Solo se accede mediante funciones del servidor.
create policy "perfil propio o de mi equipo" on public.profiles for select to authenticated using (public.is_teammate(id));
create policy "editar mi perfil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "ver mi equipo" on public.teams for select to authenticated using (id = public.my_team_id());
create policy "ver miembros de mi equipo" on public.team_members for select to authenticated using (team_id = public.my_team_id());
create policy "dominio propio o de mi equipo" on public.module_mastery for select to authenticated using (public.is_teammate(user_id));
create policy "practica propia o de mi equipo" on public.training_results for select to authenticated using (public.is_teammate(user_id));
create policy "registrar mi practica" on public.training_results for insert to authenticated with check (user_id = auth.uid());

-- El usuario no puede cambiar su id ni marcas de tiempo internas
revoke update on public.profiles from authenticated;
grant update (display_name, avatar, profile_type, hours_per_week, start_date, configured, updated_at) on public.profiles to authenticated;
revoke all on public.courses, public.questions, public.profiles, public.teams, public.team_members,
  public.lesson_sessions, public.module_mastery, public.training_results from anon;

-- ---------- Equipos ----------
create or replace function public.create_team(p_name text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from team_members where user_id = auth.uid()) then raise exception 'Ya perteneces a un equipo'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then raise exception 'El nombre debe tener entre 2 y 60 caracteres'; end if;
  if (select count(*) from teams where owner_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'Demasiados equipos creados hoy'; end if;
  loop
    v_code := upper(encode(extensions.gen_random_bytes(5), 'hex'));
    exit when not exists (select 1 from teams where invite_code = v_code);
  end loop;
  insert into teams (name, invite_code, owner_id) values (btrim(p_name), v_code, auth.uid()) returning id into v_id;
  insert into team_members (team_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return jsonb_build_object('id', v_id, 'invite_code', v_code);
end $$;

create or replace function public.join_team(p_code text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare v_team teams;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from team_members where user_id = auth.uid()) then raise exception 'Ya perteneces a un equipo'; end if;
  select * into v_team from teams where invite_code = upper(btrim(coalesce(p_code, '')));
  if v_team.id is null then perform pg_sleep(0.5); raise exception 'Código no válido'; end if;
  if (select count(*) from team_members where team_id = v_team.id) >= 100 then raise exception 'El equipo está lleno'; end if;
  insert into team_members (team_id, user_id, role) values (v_team.id, auth.uid(), 'member');
  return jsonb_build_object('id', v_team.id, 'name', v_team.name);
end $$;

create or replace function public.leave_team() returns void
language plpgsql security definer set search_path = public, pg_temp as
$$ declare v_team uuid; v_next uuid;
begin
  select team_id into v_team from team_members where user_id = auth.uid();
  if v_team is null then return; end if;
  delete from team_members where user_id = auth.uid();
  if (select owner_id from teams where id = v_team) = auth.uid() then
    select user_id into v_next from team_members where team_id = v_team order by joined_at limit 1;
    if v_next is null then delete from teams where id = v_team;
    else update teams set owner_id = v_next where id = v_team; update team_members set role = 'owner' where user_id = v_next; end if;
  end if;
end $$;

create or replace function public.regenerate_invite() returns text
language plpgsql security definer set search_path = public, pg_temp as
$$ declare v_code text; v_team uuid;
begin
  select id into v_team from teams where owner_id = auth.uid();
  if v_team is null then raise exception 'Solo quien administra el equipo puede cambiar el código'; end if;
  loop v_code := upper(encode(extensions.gen_random_bytes(5), 'hex')); exit when not exists (select 1 from teams where invite_code = v_code); end loop;
  update teams set invite_code = v_code where id = v_team;
  return v_code;
end $$;

-- ---------- Lecciones calificadas en el servidor ----------
create or replace function public.start_lesson(p_course text, p_module int) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare v_id uuid; v_total int; v_qs jsonb;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if not exists (select 1 from courses where id = p_course) then raise exception 'Curso no válido'; end if;
  select count(*) into v_total from questions where course_id = p_course and module_idx = p_module;
  if v_total = 0 then raise exception 'Módulo no válido'; end if;
  if p_module > 0 and not exists (select 1 from module_mastery where user_id = auth.uid() and course_id = p_course and module_idx = p_module - 1) then
    raise exception 'Primero aprueba el módulo anterior'; end if;
  if (select count(*) from lesson_sessions where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Demasiados intentos. Descansa un momento y vuelve a intentarlo'; end if;
  update lesson_sessions set status = 'failed', finished_at = now() where user_id = auth.uid() and status = 'active';
  insert into lesson_sessions (user_id, course_id, module_idx, total) values (auth.uid(), p_course, p_module, v_total) returning id into v_id;
  select jsonb_agg(jsonb_build_object('id', id, 'prompt', prompt, 'options', options) order by random()) into v_qs
    from questions where course_id = p_course and module_idx = p_module;
  return jsonb_build_object('session_id', v_id, 'questions', v_qs, 'hearts', 3);
end $$;

create or replace function public.check_answer(p_session uuid, p_question bigint, p_option int) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare s lesson_sessions; q questions; v_ok boolean; v_prev jsonb;
begin
  select * into s from lesson_sessions where id = p_session and user_id = auth.uid() for update;
  if s.id is null or s.status <> 'active' then raise exception 'La lección no está activa'; end if;
  select * into q from questions where id = p_question and course_id = s.course_id and module_idx = s.module_idx;
  if q.id is null then raise exception 'Pregunta no válida'; end if;
  v_prev := s.answered -> p_question::text;
  if v_prev is not null and (v_prev->>'ok')::boolean then raise exception 'Pregunta ya respondida'; end if;
  v_ok := (p_option = q.answer_idx);
  if v_ok then
    if v_prev is null then s.first_ok := s.first_ok + 1; end if;
    s.answered := s.answered || jsonb_build_object(p_question::text, jsonb_build_object('ok', true, 'first', v_prev is null));
  else
    s.hearts := s.hearts - 1;
    s.answered := s.answered || jsonb_build_object(p_question::text, jsonb_build_object('ok', false, 'first', false));
  end if;
  if s.hearts <= 0 then s.status := 'failed'; s.finished_at := now(); end if;
  update lesson_sessions set hearts = s.hearts, first_ok = s.first_ok, answered = s.answered, status = s.status, finished_at = s.finished_at where id = s.id;
  return jsonb_build_object('correct', v_ok, 'answer_idx', q.answer_idx, 'explanation', q.explanation, 'hearts', s.hearts, 'first_ok', s.first_ok, 'failed', s.status = 'failed');
end $$;

create or replace function public.finish_lesson(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare s lesson_sessions; v_all boolean; v_perfect boolean; v_xp int; v_mods int; v_hours numeric; v_prev module_mastery;
begin
  select * into s from lesson_sessions where id = p_session and user_id = auth.uid() for update;
  if s.id is null then raise exception 'Lección no válida'; end if;
  if s.status = 'active' then
    select bool_and(coalesce((s.answered -> q.id::text ->> 'ok')::boolean, false)) into v_all
      from questions q where q.course_id = s.course_id and q.module_idx = s.module_idx;
    if not v_all then raise exception 'Faltan preguntas por responder'; end if;
    s.status := 'passed';
    update lesson_sessions set status = 'passed', finished_at = now() where id = s.id;
  end if;
  if s.status <> 'passed' then
    return jsonb_build_object('passed', false, 'xp', 0, 'first_ok', s.first_ok, 'total', s.total, 'hearts', s.hearts);
  end if;
  v_perfect := s.first_ok = s.total;
  v_xp := s.first_ok * 10 + 5 + case when v_perfect then 5 else 0 end;
  select count(distinct module_idx) into v_mods from questions where course_id = s.course_id;
  select round(hours / v_mods, 2) into v_hours from courses where id = s.course_id;
  select * into v_prev from module_mastery where user_id = s.user_id and course_id = s.course_id and module_idx = s.module_idx;
  if v_prev.user_id is null then
    insert into module_mastery (user_id, course_id, module_idx, best_score, total, perfect, xp, hours_credited)
    values (s.user_id, s.course_id, s.module_idx, s.first_ok, s.total, v_perfect, v_xp, v_hours);
  else
    -- Repasar un módulo ya dominado no vuelve a sumar horas; solo mejora el récord
    update module_mastery set best_score = greatest(best_score, s.first_ok), perfect = perfect or v_perfect,
      xp = greatest(xp, v_xp), attempts = attempts + 1
    where user_id = s.user_id and course_id = s.course_id and module_idx = s.module_idx;
    v_hours := 0;
  end if;
  return jsonb_build_object('passed', true, 'perfect', v_perfect, 'xp', v_xp, 'first_ok', s.first_ok, 'total', s.total, 'hearts', s.hearts, 'hours', v_hours);
end $$;

-- Permisos de ejecución: solo usuarios autenticados
revoke all on function public.my_team_id(), public.is_teammate(uuid), public.handle_new_user(), public.create_team(text),
  public.join_team(text), public.leave_team(), public.regenerate_invite(), public.start_lesson(text, int),
  public.check_answer(uuid, bigint, int), public.finish_lesson(uuid) from public, anon;
grant execute on function public.my_team_id(), public.is_teammate(uuid), public.create_team(text), public.join_team(text),
  public.leave_team(), public.regenerate_invite(), public.start_lesson(text, int), public.check_answer(uuid, bigint, int),
  public.finish_lesson(uuid) to authenticated;
