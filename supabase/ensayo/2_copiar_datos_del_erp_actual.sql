-- ENSAYO · PASO 2 de 3 · Copiar los datos del ERP actual al proyecto nuevo
-- Se corre en el proyecto NUEVO. Lee el proyecto anterior SIN modificarlo.
--
-- Antes de pulsar Run, reemplaza los dos valores marcados con  <<< >>> :
--   HOST: en el proyecto ANTERIOR → botón "Connect" (arriba) → "Session pooler" → host
--         (algo como aws-0-us-east-1.pooler.supabase.com)
--   CONTRASEÑA: la contraseña de la base de datos del proyecto ANTERIOR
--         (Project Settings → Database). Si no la recuerdas, ahí mismo la puedes restablecer;
--         el ERP actual no la usa, así que no deja de funcionar.
-- Al final el script borra la conexión: la contraseña no queda guardada.

create extension if not exists postgres_fdw;

drop server if exists erp_anterior cascade;
create server erp_anterior foreign data wrapper postgres_fdw
  options (host '<<<HOST>>>', port '5432', dbname 'postgres');

create user mapping for current_user server erp_anterior
  options (user 'postgres.uwqolhoxqjpxxgyydsvf', password '<<<CONTRASEÑA>>>');

drop schema if exists legado_remoto cascade;
create schema legado_remoto;
import foreign schema public limit to (categorias, clientes, compras, configuracion_empresa, cotizaciones, devoluciones, inventario_historial, pedidos, perfiles, perfiles_usuario, productos, proveedores, rutas_entrega, vendedores, ventas, ventas_detalle, web_leads, web_cotizaciones, web_cotizaciones_items, auditoria_logs, crm_whatsapp_templates, facturas)
  from server erp_anterior into legado_remoto;

-- Copia cada tabla a la estructura `legado` (si ya había una copia, la reemplaza)
do $$
declare t text;
begin
  foreach t in array array['categorias','clientes','compras','configuracion_empresa','cotizaciones','devoluciones','inventario_historial','pedidos','perfiles','perfiles_usuario','productos','proveedores','rutas_entrega','vendedores','ventas','ventas_detalle','web_leads','web_cotizaciones','web_cotizaciones_items','auditoria_logs','crm_whatsapp_templates','facturas'] loop
    execute format('truncate legado.%I', t);
    execute format('insert into legado.%I select * from legado_remoto.%I', t, t);
  end loop;
end $$;

-- Las contraseñas del sistema anterior no se necesitan: no se guardan en la copia
update legado.perfiles set password = null;


-- Borra la conexión al proyecto anterior (y con ella la contraseña)
drop schema legado_remoto cascade;
drop user mapping for current_user server erp_anterior;
drop server erp_anterior;

-- Resumen de lo copiado
select 'productos' tabla, count(*) registros from legado.productos
union all select 'clientes', count(*) from legado.clientes
union all select 'ventas', count(*) from legado.ventas
union all select 'ventas_detalle', count(*) from legado.ventas_detalle
union all select 'cotizaciones', count(*) from legado.cotizaciones
union all select 'pedidos', count(*) from legado.pedidos
union all select 'compras', count(*) from legado.compras
union all select 'inventario_historial', count(*) from legado.inventario_historial;
