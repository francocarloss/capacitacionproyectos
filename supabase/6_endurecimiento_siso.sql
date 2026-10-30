-- Ruta de Dominio IA v3.1 · Endurecimiento tras la auditoría del SISO (H-01, H-03, H-04)

-- H-01: los puntos de práctica no se pueden inflar
delete from public.training_results where score > max_score;
alter table public.training_results add constraint tr_score_le_max check (score <= max_score);
delete from public.training_results a using public.training_results b
  where a.activity = 'challenge' and b.activity = 'challenge' and a.user_id = b.user_id and a.item_id = b.item_id and a.id > b.id;
create unique index training_results_challenge_once on public.training_results(user_id, item_id) where activity = 'challenge';

-- H-03: saneo en el servidor (defensa en profundidad además del saneo en la página)
create or replace function public.valid_avatar(a jsonb) returns boolean
language sql immutable set search_path = public, pg_temp as
$$ select a is null or (jsonb_typeof(a) = 'object' and not exists (
     select 1 from jsonb_each(a) e
     where e.key not in ('skin','hairStyle','hairColor','eyes','beard','glasses','outfit','bg','streak')
        or jsonb_typeof(e.value) <> 'string' or (e.value #>> '{}') !~ '^[a-z0-9_#]{1,20}$')) $$;
update public.profiles set avatar = null where not public.valid_avatar(avatar);
update public.profiles set display_name = btrim(regexp_replace(display_name, '[<>]', '', 'g')) where display_name ~ '[<>]';
alter table public.profiles add constraint profiles_avatar_valid check (public.valid_avatar(avatar));
alter table public.profiles add constraint profiles_name_safe check (display_name !~ '[<>]');
alter table public.teams add constraint teams_name_safe check (name !~ '[<>]');

-- H-04: cada quien puede borrar su propia práctica
create policy "borrar mi practica" on public.training_results for delete to authenticated using (user_id = auth.uid());

select 'Endurecimiento aplicado' as resultado;
