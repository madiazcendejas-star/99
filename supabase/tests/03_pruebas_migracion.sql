-- Pruebas de la migración de Aquaplus con los datos de ejemplo (02). Correr después de
-- 00, 0001, migraciones-datos/aquaplus_00..02 y select migracion.migrar_aquaplus();
\pset footer off
\echo 'A) Segunda vez sin reiniciar (esperado ERROR claro):'
select migracion.migrar_aquaplus();
\echo 'B) Repetir el ensayo desde cero (esperado nuevo id y mismas cifras):'
select migracion.migrar_aquaplus(true) is not null as ok;
select count(*) filter (where cuadra = false) as revisiones_que_no_cuadran from migracion.validar_aquaplus();
select count(*) as empresas_aquaplus from empresas where politicas->>'origen'='aquaplus-erp';
\echo 'C) Primer acceso del administrador migrado (correo igual) → ve los datos:'
insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999','admin@dipepsasasdecv.com.mx');
insert into auth.users (id, email, email_confirmed_at) values ('88888888-8888-8888-8888-888888888888','ex@dipepsasasdecv.com.mx', now());
set role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-9999-9999-999999999999',false);
select public.reclamar_acceso() as vinculados;
select count(*) as productos_visibles from productos;
select nombre, (select nombre from roles r where r.id = c.rol_id) rol from colaboradores c where user_id = auth.uid();
\echo 'D) Empleado dado de baja intenta reclamar acceso (esperado 0 y 0 productos):'
select set_config('request.jwt.claim.sub','88888888-8888-8888-8888-888888888888',false);
select public.reclamar_acceso() as vinculados;
select count(*) as productos_visibles from productos;
\echo 'E) Triggers reactivados: un movimiento nuevo mueve la existencia y deja bitácora:'
select set_config('request.jwt.claim.sub','99999999-9999-9999-9999-999999999999',false);
select existencia as antes from productos where sku = 'SKU-001';
insert into inventario_movimientos (empresa_id, producto_id, tipo, cantidad, referencia) select empresa_id, id, 'Entrada', 5, 'prueba' from productos where sku='SKU-001';
select existencia as despues from productos where sku = 'SKU-001';
update productos set precio_publico = precio_publico + 1 where sku='SKU-001';
select count(*) as bitacora_nueva from bitacora where tabla = 'productos';
\echo 'F) Siguiente folio de venta continúa después de los migrados:'
select public.siguiente_folio(empresa_id, 'V') from productos limit 1;
\echo 'G) Ventas pendientes y precios por lista de un cliente plomero:'
select estado, count(*), sum(total) from ventas group by estado order by 1;
select c.nombre, l.nombre lista from clientes c join listas_precio l on l.id=c.lista_precio_id order by c.nombre limit 5;
