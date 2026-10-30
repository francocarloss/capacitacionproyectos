-- Ruta de Dominio IA v4.1 · Correcciones de la auditoría SISO de la versión multi-IA.
-- Es seguro ejecutarlo más de una vez. No borra filas.

-- H-v4-01: no revelar la respuesta mientras la lección sigue activa
create or replace function public.check_answer(p_session uuid, p_question bigint, p_option int) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare s lesson_sessions; q questions; v_ok boolean; v_prev jsonb; v_show boolean;
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
  v_show := v_ok or s.status <> 'active';
  return jsonb_build_object('correct', v_ok, 'answer_idx', case when v_show then q.answer_idx end,
    'explanation', case when v_show then q.explanation end, 'hearts', s.hearts, 'first_ok', s.first_ok, 'failed', s.status = 'failed');
end $$;

-- H-v4-01: aprobar exige acertar a la primera todas menos una. H-v4-03: una sesión cerrada no se vuelve a procesar
create or replace function public.finish_lesson(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as
$$ declare s lesson_sessions; v_all boolean; v_perfect boolean; v_xp int; v_mods int; v_hours numeric; v_prev module_mastery;
begin
  select * into s from lesson_sessions where id = p_session and user_id = auth.uid() for update;
  if s.id is null then raise exception 'Lección no válida'; end if;
  if s.status <> 'active' then
    return jsonb_build_object('passed', s.status = 'passed', 'xp', 0, 'hours', 0, 'first_ok', s.first_ok, 'total', s.total, 'hearts', s.hearts);
  end if;
  select bool_and(coalesce((s.answered -> q.id::text ->> 'ok')::boolean, false)) into v_all
    from questions q where q.course_id = s.course_id and q.module_idx = s.module_idx;
  if not v_all then raise exception 'Faltan preguntas por responder'; end if;
  if s.first_ok < greatest(1, s.total - 1) then
    update lesson_sessions set status = 'failed', finished_at = now() where id = s.id;
    return jsonb_build_object('passed', false, 'xp', 0, 'hours', 0, 'first_ok', s.first_ok, 'total', s.total, 'hearts', s.hearts, 'need', greatest(1, s.total - 1));
  end if;
  update lesson_sessions set status = 'passed', finished_at = now() where id = s.id;
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
revoke all on function public.check_answer(uuid, bigint, int), public.finish_lesson(uuid) from public, anon;
grant execute on function public.check_answer(uuid, bigint, int), public.finish_lesson(uuid) to authenticated;

-- H-v4-05: sin IAs repetidas (primero se normalizan los datos)
update public.profiles set ais = (select array_agg(distinct x order by x) from unnest(ais) x)
  where cardinality(ais) <> (select count(distinct x) from unnest(ais) x);
create or replace function public.valid_ais(a text[]) returns boolean
language sql immutable set search_path = public, pg_temp as
$$ select a is not null and cardinality(a) between 1 and 4 and a <@ array['claude','chatgpt','copilot','gemini']::text[]
     and cardinality(a) = (select count(distinct x) from unnest(a) x) $$;
-- H-v4-08: los visitantes anónimos no necesitan ejecutarla
revoke all on function public.valid_ais(text[]) from public, anon;
grant execute on function public.valid_ais(text[]) to authenticated;

-- H-v4-02: formato de los datos de cursos (defensa en profundidad)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'courses_url_https') then
    alter table public.courses add constraint courses_url_https check (url = '' or url ~ '^https://[^\s"''<>]+$'); end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_modules_array') then
    alter table public.courses add constraint courses_modules_array check (jsonb_typeof(modules) = 'array' and jsonb_array_length(modules) between 1 and 12); end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_id_safe') then
    alter table public.courses add constraint courses_id_safe check (id ~ '^[a-z0-9_]{1,30}$'); end if;
end $$;

-- H-v4-06: el registro limpia < y > del nombre en lugar de fallar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as
$$ begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(btrim(regexp_replace(new.raw_user_meta_data->>'display_name', '[<>]', '', 'g')), ''), split_part(new.email, '@', 1), 'Usuario'), 60));
  return new;
end $$;

select 'v4.1 aplicada' as resultado;
