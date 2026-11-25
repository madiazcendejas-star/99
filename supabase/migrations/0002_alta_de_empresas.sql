-- =====================================================================
-- 99 ERP · Alta de empresas desde el SQL Editor (dueño de la plataforma)
-- Para dar de alta a un cliente nuevo o a una empresa de prueba:
--   1. Authentication → Users → Add user (correo del administrador del cliente, Auto Confirm)
--   2. select app.alta_empresa('Ferretería X', 'admin@ferreteriax.mx', 'Nombre del administrador');
-- Crea la empresa con sus roles base y listas de precios, y deja a esa persona como Administrador.
-- Solo la puede ejecutar el dueño del proyecto (no está disponible desde la app).
-- =====================================================================
create or replace function app.alta_empresa(p_nombre text, p_correo_admin text, p_nombre_admin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; admin_rol uuid; u uuid;
begin
  select id into u from auth.users where lower(email) = lower(btrim(p_correo_admin));
  if u is null then
    raise exception 'Primero crea el usuario % en Authentication → Users', p_correo_admin;
  end if;
  insert into empresas (nombre_comercial, politicas) values (btrim(p_nombre), jsonb_build_object('alta', now())) returning id into e;
  admin_rol := app.preparar_empresa(e);
  insert into listas_precio (empresa_id, clave, nombre, orden) values (e, 'plomero', 'Plomero', 2), (e, 'distribuidor', 'Distribuidor', 3);
  insert into colaboradores (empresa_id, user_id, nombre, puesto, area, rol_id, correo)
  values (e, u, btrim(p_nombre_admin), 'Administrador', 'Administración', admin_rol, lower(btrim(p_correo_admin)));
  return e;
end;
$$;
revoke execute on function app.alta_empresa(text, text, text) from public, anon, authenticated;

-- Empresas dadas de alta y su administrador
create or replace view app.empresas_resumen as
select e.nombre_comercial as empresa, e.plan, e.creado_en::date as alta,
       (select string_agg(c.correo, ', ') from colaboradores c join roles r on r.id = c.rol_id
        where c.empresa_id = e.id and r.nombre = 'Administrador') as administradores,
       (select count(*) from productos p where p.empresa_id = e.id) as productos,
       (select count(*) from ventas v where v.empresa_id = e.id) as ventas
from empresas e order by e.creado_en;
revoke all on app.empresas_resumen from public, anon, authenticated;
