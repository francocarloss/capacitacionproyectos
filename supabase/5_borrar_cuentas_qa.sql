-- Borra las cuentas temporales de QA y todos sus datos (perfil, equipo, lecciones, práctica).
delete from public.teams where owner_id in (select id from auth.users where email in ('qa.uno@ruta-ia.test','qa.dos@ruta-ia.test'));
delete from auth.users where email in ('qa.uno@ruta-ia.test','qa.dos@ruta-ia.test');
select count(*) as cuentas_qa_restantes from auth.users where email like 'qa.%@ruta-ia.test';
