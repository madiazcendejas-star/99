-- Pruebas de protección por empresa (RLS). Ejecutar en PostgreSQL local después de
-- 00_simular_supabase.sql y de la migración 0001. Cada paso indica el resultado esperado.
\set ON_ERROR_STOP 0
\pset footer off
insert into auth.users values ('11111111-1111-1111-1111-111111111111','carlos@aquaplus.mx'),('22222222-2222-2222-2222-222222222222','ana@aquaplus.mx'),('33333333-3333-3333-3333-333333333333','otro@ferreteria.mx');
-- Carlos crea Aquaplus; Otro crea su ferretería
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select public.crear_empresa('Aquaplus','Carlos Mendoza') as aquaplus \gset
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select public.crear_empresa('Ferretería Prueba','Pedro') as otra \gset
-- Carlos (admin) da de alta a Ana como Vendedor y crea productos
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into colaboradores (empresa_id, user_id, nombre, rol_id, sueldo) select :'aquaplus', '22222222-2222-2222-2222-222222222222', 'Ana López', id, 6500 from roles where empresa_id=:'aquaplus' and nombre='Vendedor';
insert into productos (empresa_id, sku, nombre, precio_publico, costo) values (:'aquaplus','TIN-1100','Tinaco 1100 L',3499,2400),(:'aquaplus','COD-100','Codo PVC',18.9,11.4);
insert into producto_precios select :'aquaplus', p.id, l.id, 3200 from productos p, listas_precio l where p.sku='TIN-1100' and l.clave='mayoreo' and l.empresa_id=:'aquaplus';
insert into inventario_movimientos (empresa_id, producto_id, tipo, cantidad, referencia) select :'aquaplus', id, 'Entrada', 10, 'OC-0001' from productos where sku='TIN-1100' and empresa_id=:'aquaplus';
insert into inventario_movimientos (empresa_id, producto_id, tipo, cantidad, referencia) select :'aquaplus', id, 'Venta', -3, 'V-0001' from productos where sku='TIN-1100' and empresa_id=:'aquaplus';
\echo '1) Existencia del tinaco tras +10 -3 (esperado 7):'
select existencia from productos where sku='TIN-1100';
select public.siguiente_folio(:'aquaplus','V') a, public.siguiente_folio(:'aquaplus','V') b;
select public.asignar_pin(id, '1234') from colaboradores where nombre='Carlos Mendoza';
\echo '2) PIN correcto / incorrecto (esperado t, f):'
select public.validar_pin(id,'1234') ok, public.validar_pin(id,'0000') mal from colaboradores where nombre='Carlos Mendoza';
-- Otro usuario de OTRA empresa
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
\echo '3) Usuario de otra empresa ve productos de Aquaplus (esperado 0):'
select count(*) from productos where empresa_id=:'aquaplus';
\echo '4) Usuario de otra empresa intenta insertar en Aquaplus (esperado ERROR RLS):'
insert into productos (empresa_id, sku, nombre) values (:'aquaplus','HACK','x');
\echo '5) ...intenta modificar precios de Aquaplus (esperado UPDATE 0):'
update productos set precio_publico = 1 where empresa_id=:'aquaplus';
\echo '6) ...intenta pedir folio de Aquaplus (esperado ERROR):'
select public.siguiente_folio(:'aquaplus','V');
-- Ana (vendedora de Aquaplus)
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
\echo '7) Ana ve productos de Aquaplus (esperado 2):'
select count(*) from productos;
\echo '8) Ana lee el pin_hash (esperado ERROR permiso):'
select pin_hash from colaboradores;
\echo '9) Ana ve sueldos en el directorio (esperado vacíos):'
select nombre, sueldo from colaboradores_directorio order by nombre;
\echo '10) Ana intenta darse rol Administrador (esperado UPDATE 0):'
update colaboradores set rol_id = (select id from roles where nombre='Administrador' and empresa_id=:'aquaplus') where nombre='Ana López';
\echo '11) Ana intenta borrar un movimiento del kardex (esperado DELETE 0):'
delete from inventario_movimientos;
\echo '12) Ana consulta la bitácora (esperado 0, solo admin):'
select count(*) from bitacora;
-- Carlos admin
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
\echo '13) Carlos ve sueldos (esperado 6500) y bitácora (>0):'
select nombre, sueldo from colaboradores_directorio where nombre='Ana López';
select count(*) > 0 as hay_bitacora, bool_and(coalesce(despues ? 'pin_hash', false) = false) as sin_pin from bitacora;
\echo '14) Carlos intenta editar el rol Administrador bloqueado (esperado UPDATE 0):'
update roles set permisos = '{}' where nombre='Administrador';
-- Sin sesión
reset role; set role anon; select set_config('request.jwt.claim.sub','',false);
\echo '15) Sin sesión lee productos / clientes / ventas (esperado ERROR o 0):'
select count(*) from productos;
\echo '16) Sin sesión registra un prospecto desde la web (esperado INSERT 0 1) y lo intenta leer (esperado 0):'
insert into prospectos (empresa_id, nombre_contacto, telefono) values (:'aquaplus','Juan','5551234567');
select count(*) from prospectos;
\echo '17) Sin sesión intenta crear empresa (esperado ERROR):'
select public.crear_empresa('x','y');
