-- Ruta de Dominio IA · Prueba de seguridad (SISO + QA)
-- Pegar completo en Supabase > SQL Editor y pulsar Run.
-- Crea 3 usuarios temporales, ataca el sistema y al final DESHACE TODO lanzando un error a propósito.
-- El mensaje de "error" que verás ES el reporte: cada línea dice PASA o FALLA.

do $$
declare
  rep text := '';
  pass int := 0; fail int := 0;
  u1 uuid := '11111111-1111-4111-8111-111111111111';
  u2 uuid := '22222222-2222-4222-8222-222222222222';
  u3 uuid := '33333333-3333-4333-8333-333333333333';
  r jsonb; res jsonb; sid uuid; q jsonb; c int; code text; ok boolean; h numeric;

  i int := 0;
begin
  -- Usuarios de prueba (como administrador)
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-000000000000', u1, 'authenticated', 'authenticated', 'qa1@prueba.local', '{"display_name":"QA Uno"}'),
    ('00000000-0000-0000-0000-000000000000', u2, 'authenticated', 'authenticated', 'qa2@prueba.local', '{"display_name":"QA Dos"}'),
    ('00000000-0000-0000-0000-000000000000', u3, 'authenticated', 'authenticated', 'qa3@prueba.local', '{"display_name":"<img src=x onerror=alert(1)>"}');
  select count(*) into c from public.profiles where id in (u1, u2, u3);
  ok := c = 3; rep := rep || format(E'\n%s  01 Registro crea el perfil automáticamente (%s de 3)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  ------------------------------------------------------------------ Usuario 1
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u1::text, true);
  execute 'set local role authenticated';

  select count(*) into c from public.questions;
  ok := c = 0; rep := rep || format(E'\n%s  02 Un usuario NO puede leer la tabla de preguntas y respuestas (ve %s)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.start_lesson('c101', 1); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  03 No se puede saltar al módulo 2 sin aprobar el 1', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  r := public.start_lesson('c101', 0); sid := (r->>'session_id')::uuid;
  ok := not exists (select 1 from jsonb_array_elements(r->'questions') e where e ? 'answer_idx' or e ? 'explanation');
  rep := rep || format(E'\n%s  04 Las preguntas llegan al navegador SIN la respuesta correcta', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.finish_lesson(sid); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  05 No se puede terminar una lección sin responder', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  select count(*) into c from public.lesson_sessions;
  ok := c = 0; rep := rep || format(E'\n%s  06 El usuario no puede leer ni manipular las sesiones de examen (ve %s)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  -- Responde: primero una opción incorrecta en la 1a pregunta, luego todo bien
  for q in select * from jsonb_array_elements(r->'questions') loop
    i := i + 1;
    res := public.check_answer(sid, (q->>'id')::bigint, case when i = 1 then 3 else 0 end);
    if not (res->>'correct')::boolean then res := public.check_answer(sid, (q->>'id')::bigint, (res->>'answer_idx')::int); end if;
  end loop;
  res := public.finish_lesson(sid);
  ok := (res->>'passed')::boolean and (res->>'hours')::numeric > 0;
  rep := rep || format(E'\n%s  07 Aprobar en el servidor suma horas automáticamente (%s h, %s XP)', case when ok then 'PASA' else 'FALLA' end, res->>'hours', res->>'xp');
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  res := public.finish_lesson(sid);
  select sum(hours_credited) into h from public.module_mastery where user_id = u1;
  ok := (res->>'hours')::numeric = 0; rep := rep || format(E'\n%s  08 Repetir el cierre de la lección NO duplica horas (total %s h)', case when ok then 'PASA' else 'FALLA' end, h);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.check_answer(sid, (r->'questions'->0->>'id')::bigint, 0); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  09 No se puede responder en una lección ya cerrada', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin insert into public.module_mastery (user_id, course_id, module_idx, best_score, total, hours_credited) values (u1, 'prep', 6, 3, 3, 99); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  10 No se puede escribir dominio falso directamente en la tabla', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  r := public.create_team('Equipo QA'); code := r->>'invite_code';
  ok := code ~ '^[0-9A-F]{10}$'; rep := rep || format(E'\n%s  11 Crear equipo genera un código aleatorio de 10 caracteres', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  update public.teams set name = 'hackeado'; get diagnostics c = row_count;
  ok := c = 0; rep := rep || format(E'\n%s  12 No se puede modificar un equipo saltándose las funciones (%s filas)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  ------------------------------------------------------------------ Usuario 2
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u2::text, true);
  execute 'set local role authenticated';

  select count(*) into c from public.profiles;
  ok := c = 1; rep := rep || format(E'\n%s  13 Fuera de un equipo solo ves tu propio perfil (ve %s)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  select count(*) into c from public.module_mastery;
  ok := c = 0; rep := rep || format(E'\n%s  14 No ves el avance de personas de otro equipo (ve %s)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.join_team('FFFFFFFFFF'); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  15 Un código de invitación falso es rechazado', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  perform public.join_team(lower(code));
  select count(*) into c from public.profiles;
  ok := c = 2; rep := rep || format(E'\n%s  16 Al unirse con el código, ve a su equipo (ve %s perfiles)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  update public.profiles set display_name = 'Hackeado' where id = u1; get diagnostics c = row_count;
  ok := c = 0; rep := rep || format(E'\n%s  17 No puedes editar el perfil de un compañero (%s filas)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin update public.profiles set id = u1 where id = u2; ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  18 No puedes cambiar el identificador de tu perfil', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin insert into public.training_results (user_id, activity, item_id, score, max_score) values (u1, 'quiz', 'q1', 1, 1); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  19 No puedes registrar práctica a nombre de otra persona', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.regenerate_invite(); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  20 Solo el administrador del equipo puede cambiar el código', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.create_team('Segundo equipo'); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  21 Una persona no puede estar en dos equipos a la vez', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  ------------------------------------------------------------------ Usuario 3 (nombre con código malicioso)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u3::text, true);
  execute 'set local role authenticated';

  select count(*) into c from public.profiles;
  ok := c = 1; rep := rep || format(E'\n%s  22 Otra persona fuera del equipo no ve a los demás (ve %s)', case when ok then 'PASA' else 'FALLA' end, c);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin update public.profiles set avatar = jsonb_build_object('a', repeat('x', 5000)) where id = u3; ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  23 Se rechazan datos de avatar inválidos o gigantes', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  ------------------------------------------------------------------ Visitante sin cuenta
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';

  begin select count(*) into c from public.profiles; ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  24 Un visitante sin cuenta no puede leer perfiles', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin perform public.start_lesson('c101', 0); ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  25 Un visitante sin cuenta no puede iniciar exámenes', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  begin select count(*) into c from public.questions; ok := false;
  exception when others then ok := true; end;
  rep := rep || format(E'\n%s  26 Un visitante sin cuenta no puede leer preguntas', case when ok then 'PASA' else 'FALLA' end);
  if ok then pass := pass + 1; else fail := fail + 1; end if;

  execute 'reset role';
  -- Deshace todo: los usuarios de prueba y sus datos desaparecen
  raise exception E'REPORTE DE SEGURIDAD: % de % pruebas pasan, % fallan. (Este "error" es intencional: deshace todos los datos de prueba.)%', pass, pass + fail, fail, rep;
end $$;
