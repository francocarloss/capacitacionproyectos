-- Ruta de Dominio IA v4 · Varias IAs (Claude, ChatGPT, Copilot, Gemini) + endurecimiento del SISO.
-- Es seguro ejecutarlo más de una vez.

-- ===== Endurecimiento (H-01, H-03, H-04) =====
delete from public.training_results where score > max_score;
alter table public.training_results drop constraint if exists tr_score_le_max;
alter table public.training_results add constraint tr_score_le_max check (score <= max_score);
delete from public.training_results a using public.training_results b
  where a.activity = 'challenge' and b.activity = 'challenge' and a.user_id = b.user_id and a.item_id = b.item_id and a.id > b.id;
create unique index if not exists training_results_challenge_once on public.training_results(user_id, item_id) where activity = 'challenge';

create or replace function public.valid_avatar(a jsonb) returns boolean
language sql immutable set search_path = public, pg_temp as
$$ select a is null or (jsonb_typeof(a) = 'object' and not exists (
     select 1 from jsonb_each(a) e
     where e.key not in ('skin','hairStyle','hairColor','eyes','beard','glasses','outfit','bg','streak')
        or jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^[a-z0-9_#]{1,20}$')) $$;
update public.profiles set avatar = null where not public.valid_avatar(avatar);
update public.profiles set display_name = btrim(regexp_replace(display_name, '[<>]', '', 'g')) where display_name ~ '[<>]';
alter table public.profiles drop constraint if exists profiles_avatar_valid;
alter table public.profiles add constraint profiles_avatar_valid check (public.valid_avatar(avatar));
alter table public.profiles drop constraint if exists profiles_name_safe;
alter table public.profiles add constraint profiles_name_safe check (display_name !~ '[<>]');
alter table public.teams drop constraint if exists teams_name_safe;
alter table public.teams add constraint teams_name_safe check (name !~ '[<>]');
drop policy if exists "borrar mi practica" on public.training_results;
create policy "borrar mi practica" on public.training_results for delete to authenticated using (user_id = auth.uid());

-- ===== Cursos por IA y competencia; datos de presentación en la base de datos =====
alter table public.courses add column if not exists ai text not null default 'claude';
alter table public.courses add column if not exists topic text;
alter table public.courses add column if not exists org text not null default '';
alter table public.courses add column if not exists url text not null default '';
alter table public.courses add column if not exists learn text not null default '';
alter table public.courses add column if not exists detail text not null default '';
alter table public.courses add column if not exists modules jsonb not null default '[]'::jsonb;
alter table public.courses drop constraint if exists courses_ai_check;
alter table public.courses add constraint courses_ai_check check (ai in ('claude','chatgpt','copilot','gemini','comun'));
alter table public.courses drop constraint if exists courses_topic_check;
alter table public.courses add constraint courses_topic_check check (topic in ('fundamentos','criterio','colaboracion','negocio','avanzado','certificacion','proyecto','automatizacion'));

update public.courses set ai='claude', topic='fundamentos', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Redactar, resumir y analizar documentos con Claude, y organizar el trabajo en Projects.', detail='13 lecciones (~2.5 h) + 1 h de práctica en tu trabajo diario.', modules='["Primeros pasos con Claude","Conversaciones y archivos","Projects para el trabajo diario","Buenas prácticas de uso"]'::jsonb where id='c101';
update public.courses set ai='claude', topic='criterio', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Decidir qué delegar a la IA, dar instrucciones claras y revisar con criterio lo que entrega.', detail='Marco de las 4D: Delegación, Descripción, Discernimiento y Diligencia.', modules='["Delegación","Descripción","Discernimiento","Diligencia"]'::jsonb where id='fluency';
update public.courses set ai='claude', topic='colaboracion', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Compartir proyectos y flujos con Claude entre compañeros de área.', detail='Ruta Claude for Work: Claude en equipo.', modules='["Claude en equipo","Proyectos compartidos","Flujos entre áreas"]'::jsonb where id='cowork';
update public.courses set ai='claude', topic='negocio', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Aplicar Claude a atención de clientes, soporte y campañas.', detail='IA aplicada a operaciones, soporte y marketing.', modules='["Operaciones diarias","Soporte y tickets","Marketing y ventas"]'::jsonb where id='smb';
update public.courses set ai='claude', topic='avanzado', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Pedirle a Claude que escriba, corrija y ejecute scripts que automatizan tareas.', detail='12 lecciones (~1.5 h) + 1.5 h de práctica.', modules='["Instalar y configurar","Pedirle cambios al código","Ejecutar y corregir scripts"]'::jsonb where id='code101';
update public.courses set ai='claude', topic='avanzado', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Conectar Claude con el CRM, ERP o bases de datos de la empresa.', detail='10 lecciones (~1 h) + 2 h de práctica.', modules='["Tools","Resources","Prompts","Servidores y clientes MCP"]'::jsonb where id='mcp';
update public.courses set ai='claude', topic='avanzado', org='Anthropic Academy', url='https://anthropic.skilljar.com/', learn='Integrar Claude en sistemas propios: chatbots, extracción de datos y agentes.', detail='Construir aplicaciones con la API (el uso de la API se paga aparte).', modules='["Llamadas a la API","Uso de herramientas","Extracción de datos","Agentes"]'::jsonb where id='api';
update public.courses set ai='comun', topic='proyecto', org='Ruta de Dominio IA', url='', learn='Llevar dos procesos reales de tu área a un flujo de trabajo con la IA de tu equipo y documentar el ahorro de tiempo.', detail='Para perfiles no técnicos, en lugar de los cursos avanzados.', modules='["Elegir 2 procesos repetitivos","Diseñar el flujo con IA","Medir el tiempo antes y después","Presentar el resultado"]'::jsonb where id='proyecto';
update public.courses set ai='comun', topic='automatizacion', org='n8n Academy', url='https://learn.n8n.io/', learn='Crear tu primera automatización, por ejemplo de correo a hoja de cálculo con IA.', detail='Level 1 gratuito.', modules='["Navegar el editor","Estructura de datos","Nodos y flujos"]'::jsonb where id='n8n1';
update public.courses set ai='comun', topic='automatizacion', org='n8n Academy', url='https://docs.n8n.io/courses/level-two', learn='Mover datos entre sistemas y manejar errores en tus automatizaciones.', detail='~2 h de curso + 2 h construyendo una automatización de tu área.', modules='["XML y HTML","Fechas y archivos","Manejo de errores"]'::jsonb where id='n8n2';
update public.courses set ai='claude', topic='certificacion', org='Ruta de Dominio IA', url='', learn='Dominar evaluación de respuestas, integración en flujos, gobierno, prompting, selección de modelo, gestión de conocimiento y optimización.', detail='Repaso de los 7 dominios del CCAO-F y simulacros en la sección Entrenamiento.', modules='["Evaluación y validación (21%)","Integración en flujos (16%)","Gobierno y riesgo (15%)","Prompting (14%)","Producto y modelo (12%)","Gestión de conocimiento (12%)","Optimización (10%)"]'::jsonb where id='prep';

-- ===== IAs elegidas: el líder decide por el equipo; sin equipo, cada persona en su perfil =====
create or replace function public.valid_ais(a text[]) returns boolean
language sql immutable set search_path = public, pg_temp as
$$ select a is not null and cardinality(a) between 1 and 4 and a <@ array['claude','chatgpt','copilot','gemini']::text[] $$;
alter table public.teams add column if not exists ais text[] not null default '{claude}';
alter table public.teams drop constraint if exists teams_ais_valid;
alter table public.teams add constraint teams_ais_valid check (public.valid_ais(ais));
alter table public.profiles add column if not exists ais text[] not null default '{claude}';
alter table public.profiles drop constraint if exists profiles_ais_valid;
alter table public.profiles add constraint profiles_ais_valid check (public.valid_ais(ais));
grant update (ais) on public.profiles to authenticated;

create or replace function public.set_team_ais(p_ais text[]) returns text[]
language plpgsql security definer set search_path = public, pg_temp as
$$ declare v_team uuid; v_ais text[];
begin
  select id into v_team from teams where owner_id = auth.uid();
  if v_team is null then raise exception 'Solo quien administra el equipo puede elegir las IAs'; end if;
  select array_agg(distinct x order by x) into v_ais from unnest(p_ais) x;
  if not public.valid_ais(v_ais) then raise exception 'Elige entre 1 y 4 IAs válidas'; end if;
  update teams set ais = v_ais where id = v_team;
  return v_ais;
end $$;
revoke all on function public.set_team_ais(text[]) from public, anon;
grant execute on function public.set_team_ais(text[]) to authenticated;

select 'v4 aplicada' as resultado, (select count(*) from public.courses where topic is not null) as cursos_con_competencia;
