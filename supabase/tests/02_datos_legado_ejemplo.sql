-- Datos de EJEMPLO con la forma del ERP anterior de Aquaplus (no son datos reales).
-- Incluyen los casos difíciles: columnas repetidas, partidas en JSON, tarifas escritas
-- de distintas formas y ventas sin detalle.
insert into legado.configuracion_empresa (id, nombre_comercial, razon_social, rfc, regimen_fiscal, direccion, telefono, correo, logo_url)
values (1, 'Aquaplus', 'DIPEPSA S.A.S. DE C.V.', 'DIP200101AB1', '601', 'Calle Ejemplo 10, Col. Centro, Morelia', '443 000 0000', 'ventas@dipepsasasdecv.com.mx', null);

insert into legado.categorias (id, nombre, activo) values
 ('c0000000-0000-0000-0000-000000000001','Hidráulica',true),('c0000000-0000-0000-0000-000000000002','Conexiones',true),('c0000000-0000-0000-0000-000000000003','Tinacos',true);

-- 40 productos: el costo viene en distintas columnas según la época
insert into legado.productos (id, sku, codigo_barras, nombre, categoria_id, categoria, unidad_medida, costo_compra, costo_unitario, costo,
  precio_publico, precio_mayoreo, precio_plomero, precio_distribuidor, tasa_iva, stock_actual, stock_apartado, stock_minimo,
  ubicacion_almacen, clave_sat, unidad_sat, familia, tipo_empaque, piezas_por_empaque, sku_proveedor, activo, creado_en)
select ('a0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'SKU-' || lpad(g::text, 3, '0'), '75000000' || lpad(g::text, 5, '0'),
  'Producto ' || g, case when g % 3 = 0 then 'c0000000-0000-0000-0000-000000000003'::uuid when g % 2 = 0 then 'c0000000-0000-0000-0000-000000000002'::uuid end,
  case when g % 5 = 0 then 'Herramienta' end, 'pieza',
  case when g % 4 = 0 then 10 + g end, case when g % 4 = 1 then 10 + g end, case when g % 4 >= 2 then 10 + g end,
  round((10 + g) * 1.45, 2), round((10 + g) * 1.30, 2), case when g % 2 = 0 then round((10 + g) * 1.25, 2) end, case when g % 3 = 0 then round((10 + g) * 1.20, 2) else 0 end,
  16, (g * 7) % 50, case when g % 6 = 0 then 2 else 0 end, 5, 'A-' || (g % 9), '40141700', 'H87', 'Hidráulica', 'Caja', 10, 'PROV-' || g, g % 13 <> 0, now() - interval '200 days'
from generate_series(1, 40) g;

insert into legado.proveedores (id, nombre_comercial, razon_social, rfc, contacto, contacto_ventas, telefono, dias_credito, saldo_por_pagar)
select ('b0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, case when g <> 2 then 'Proveedor ' || g end, 'Proveedor ' || g || ' SA de CV', 'PRO0101' || g || 'AB1',
  case when g % 2 = 0 then 'Contacto ' || g end, 'Ventas ' || g, '55 000' || g, 30, g * 1000
from generate_series(1, 5) g;

-- 12 clientes: la tarifa y el nombre vienen en columnas distintas
insert into legado.clientes (id, nombre_comercial, nombre, nombre_negocio, razon_social, contacto, contacto_compras, telefono, tipo_cliente,
  tarifa_predeterminada, tarifa_asignada, tipo_precio, limite_credito, saldo_deudor, rfc, regimen_fiscal, codigo_postal, codigo_postal_fiscal, uso_cfdi,
  vendedor_asignado, vendedor, zona, tarjeta_plomero_distinguido, inscrito_programa, codigo_cliente, email, direccion, direccion_entrega, notas, referencias, etapa_embudo, created_at)
select ('d0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
  case when g % 3 = 0 then 'Cliente ' || g end, case when g % 3 = 1 then 'Cliente ' || g end, case when g % 3 = 2 then 'Cliente ' || g end, 'CLIENTE ' || g,
  case when g % 2 = 0 then 'Contacto ' || g end, 'Compras ' || g, '443 100 00' || lpad(g::text, 2, '0'),
  (array['Plomero','Mayorista','Público','Distribuidor'])[1 + g % 4],
  case when g % 4 = 0 then 'publico' end, (array[null, 'Plomero', 'MAYOREO', 'distribuidor'])[1 + g % 4], case when g % 4 = 0 then 'publico' end,
  case when g % 2 = 0 then 20000 else 0 end, case when g % 3 = 0 then 1500 * g else 0 end,
  case when g % 2 = 0 then 'CLI0101' || lpad(g::text, 2, '0') || 'AB1' end, case when g % 2 = 0 then '612' end,
  '58000', case when g % 4 = 0 then '58020' end, 'G01', case when g % 2 = 0 then 'Ana López' end, case when g % 2 = 1 then 'Luis' end,
  'Zona ' || (g % 3), g % 5 = 0, g % 7 = 0, 'CL-' || g, 'cliente' || g || '@correo.mx', 'Calle ' || g, null, 'Nota ' || g, null, 'Cliente', now() - interval '150 days'
from generate_series(1, 12) g;

insert into legado.vendedores (id, nombre, comision_porcentaje, activo, telefono, zona) values
 (1, 'Ana López', 3, true, '443 200 0001', 'Centro'), (2, 'Luis Pérez', 2.5, true, '443 200 0002', 'Norte'), (3, 'Mostrador', 0, true, null, null);
insert into legado.perfiles (id, nombre, rol, telefono, activo, email, password) values
 ('e0000000-0000-0000-0000-000000000001','Miguel Díaz','admin',null,true,'admin@dipepsasasdecv.com.mx','$2a$06$ejemplo'),
 ('e0000000-0000-0000-0000-000000000002','Ana López','ventas',null,true,'ana@dipepsasasdecv.com.mx','$2a$06$ejemplo'),
 ('e0000000-0000-0000-0000-000000000003','Jorge Almacén','almacen',null,true,'almacen@dipepsasasdecv.com.mx','$2a$06$ejemplo'),
 ('e0000000-0000-0000-0000-000000000004','Ex empleado','ventas',null,false,'ex@dipepsasasdecv.com.mx','$2a$06$ejemplo');
insert into legado.perfiles_usuario (id, nombre, rol, pin, activo) values
 (gen_random_uuid(),'Miguel Díaz','admin','1234',true),(gen_random_uuid(),'Ana López','ventas','2468',true);

insert into legado.rutas_entrega (id, folio_ruta, chofer, vehiculo, estado, total_pedidos, total_por_cobrar, total_cobrado, fecha_salida, fecha_cierre, efectivo_inicial_gastos, created_at)
values (1, 'R-001', 'Roberto', 'Nissan NP300', 'cerrada', 2, 3000, 3000, now() - interval '20 days', now() - interval '20 days', 300, now() - interval '20 days'),
       (2, 'R-002', 'Roberto', 'Nissan NP300', 'en_ruta', 1, 1200, 0, now() - interval '1 day', null, 200, now() - interval '1 day');

-- 30 ventas en 3 meses; las primeras 25 con detalle en ventas_detalle, las últimas 5 solo con JSON
insert into legado.ventas (id, folio, folio_venta, fecha, created_at, cliente_id, cliente_nombre, cliente_rfc, metodo_pago, forma_pago, payment_status, estado,
  total, subtotal, iva, descuento_general, anticipo, es_contra_entrega, tipo_entrega, tarifa_aplicada, vendedor_id, vendedor_nombre, ruta_id, cobrado_en_ruta,
  fecha_liquidacion, amount_received, change_given, partidas, items, observaciones)
select g, case when g % 4 <> 0 then 'V-' || lpad(g::text, 4, '0') end, case when g % 4 = 0 then 'NV-' || g end,
  case when g % 5 = 0 then null else now() - (g * 3 || ' days')::interval end, now() - (g * 3 || ' days')::interval,
  case when g % 6 <> 0 then ('d0000000-0000-0000-0000-' || lpad((1 + g % 12)::text, 12, '0'))::uuid end, 'Cliente ' || (1 + g % 12), null,
  (array['Efectivo','Tarjeta','Transferencia','Crédito'])[1 + g % 4], null,
  case when g % 7 = 0 then 'pending' end,
  case when g % 10 = 0 then 'cancelada' when g % 4 = 3 then 'pendiente' else 'completada' end,
  0, 0, 0, case when g % 8 = 0 then 50 else 0 end, case when g % 4 = 3 and g % 2 = 1 then 100 else 0 end,
  g % 9 = 0, case when g % 9 = 0 then 'domicilio' else 'mostrador' end, (array['publico','plomero','mayoreo'])[1 + g % 3],
  1 + g % 3, null, case when g in (3, 6) then 1 when g = 9 then 2 end, g in (3, 6),
  case when g % 4 <> 3 then now() - (g * 3 || ' days')::interval end, case when g % 4 = 0 then 2000 end, case when g % 4 = 0 then 15 end,
  case when g > 25 then jsonb_build_array(jsonb_build_object('producto_id', ('a0000000-0000-0000-0000-' || lpad((g - 20)::text, 12, '0')), 'sku', 'SKU-' || lpad((g - 20)::text, 3, '0'), 'nombre', 'Producto ' || (g - 20), 'cantidad', 2, 'precio_unitario', 100, 'subtotal', 200)) end,
  null, null
from generate_series(1, 30) g;

insert into legado.ventas_detalle (id, venta_id, producto_id, sku, nombre, cantidad, precio_unitario, subtotal, cantidad_surtida)
select row_number() over (), v, ('a0000000-0000-0000-0000-' || lpad((1 + (v * k) % 40)::text, 12, '0'))::uuid, 'SKU-' || lpad((1 + (v * k) % 40)::text, 3, '0'),
  'Producto ' || (1 + (v * k) % 40), k, 50 + k * 10, k * (50 + k * 10), k
from generate_series(1, 25) v, generate_series(1, 4) k;

-- Totales de cada venta = suma de sus partidas (como en el sistema real)
update legado.ventas v set total = d.t, subtotal = round(d.t / 1.16, 2), iva = d.t - round(d.t / 1.16, 2)
from (select venta_id, sum(subtotal) t from legado.ventas_detalle group by venta_id) d where d.venta_id = v.id;
update legado.ventas set total = 200, subtotal = 172.41, iva = 27.59 where id > 25;

insert into legado.cotizaciones (id, folio, cliente_id, cliente_nombre, tarifa_aplicada, partidas, items, subtotal, descuento_general, iva, total, vigencia_dias, vigencia,
  estado, estatus, convertida, vendedor_id, vendedor_nombre, hide_tax, observaciones, created_at)
select ('f0000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'COT-' || g, ('d0000000-0000-0000-0000-' || lpad((1 + g % 12)::text, 12, '0'))::uuid, 'Cliente ' || (1 + g % 12),
  'plomero', case when g % 2 = 0 then jsonb_build_array(jsonb_build_object('id', 'a0000000-0000-0000-0000-000000000001', 'sku', 'SKU-001', 'nombre', 'Producto 1', 'cantidad', 3, 'precio_unitario', 15.5, 'subtotal', 46.5)) end,
  case when g % 2 = 1 then jsonb_build_array(jsonb_build_object('producto_id', 'a0000000-0000-0000-0000-000000000002', 'sku', 'SKU-002', 'nombre', 'Producto 2', 'cantidad', 1, 'precioVenta', 20, 'subtotal', 20, 'valorDescPartida', 10, 'tipoDescPartida', 'porcentaje')) end,
  40, 0, 6.4, case when g % 2 = 0 then 46.5 else 20 end, case when g % 3 = 0 then 15 end, case when g % 3 <> 0 then '30 días' end,
  case when g % 2 = 0 then 'Pendiente' end, case when g % 4 = 0 then 'convertida' when g % 2 = 1 then 'pendiente' end, g % 4 = 0, 1, 'Ana López', true, null, now() - (g || ' days')::interval
from generate_series(1, 8) g;

insert into legado.pedidos (id, folio, cotizacion_id, cliente_id, cliente_nombre, vendedor_id, vendedor_nombre, subtotal, iva, total, estatus, estado_surtido, items, created_at, fecha_surtido, surtido_por)
select gen_random_uuid(), 'PED-' || g, ('f0000000-0000-0000-0000-' || lpad((g * 4)::text, 12, '0'))::uuid, ('d0000000-0000-0000-0000-' || lpad((1 + g)::text, 12, '0')), 'Cliente ' || (1 + g), '1', 'Ana López',
  40, 6.4, 46.5, (array['pendiente_surtido','surtido','remisionado','cancelada'])[g], (array['pendiente','surtido','surtido','cancelado'])[g],
  jsonb_build_array(jsonb_build_object('id', 'a0000000-0000-0000-0000-000000000001', 'sku', 'SKU-001', 'nombre', 'Producto 1', 'cantidad', 3, 'precio_unitario', 15.5, 'subtotal', 46.5)),
  now() - (g || ' days')::interval, case when g in (2, 3) then now() end, case when g in (2, 3) then 'Jorge' end
from generate_series(1, 4) g;

insert into legado.compras (id, folio_compra, folio, proveedor_id, proveedor_nombre, estado, estado_compra, estado_pago, fecha_limite_pago, subtotal, iva, total, partidas,
  numero_factura_proveedor, recibido_por, fecha_recepcion, usuario_registro, created_at)
select gen_random_uuid(), case when g % 2 = 0 then 'OC-' || g end, case when g % 2 = 1 then 'C-' || g end, ('b0000000-0000-0000-0000-' || lpad((1 + g % 5)::text, 12, '0'))::uuid,
  'Proveedor ' || (1 + g % 5), (array['pendiente','recibida','cancelada'])[1 + g % 3], null, case when g % 2 = 0 then 'pagado' else 'pendiente' end, (now() + interval '15 days')::date,
  86.21, 13.79, 100, jsonb_build_array(jsonb_build_object('id', 'a0000000-0000-0000-0000-000000000003', 'sku', 'SKU-003', 'nombre', 'Producto 3', 'cantidad', 10, 'costo_unitario', 10, 'subtotal', 100)),
  'F-' || g, case when g % 3 = 1 then 'Jorge' end, case when g % 3 = 1 then now() end, 'Admin', now() - (g * 5 || ' days')::interval
from generate_series(1, 6) g;

insert into legado.devoluciones (id, folio, venta_id, folio_venta, cliente_nombre, total_devolucion, motivo, partidas, usuario, created_at)
values (gen_random_uuid(), 'DEV-1', 2, 'V-0002', 'Cliente 3', 60, 'Pieza dañada', '[{"sku":"SKU-003","nombre":"Producto 3","cantidad":1,"precio_unitario":60}]', 'admin', now() - interval '4 days');

insert into legado.inventario_historial (id, producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, referencia, usuario, created_at)
select gen_random_uuid(), ('a0000000-0000-0000-0000-' || lpad((1 + g % 40)::text, 12, '0'))::uuid,
  (array['STOCK_INICIAL','COMPRA','SURTIDO_PEDIDO','AJUSTE_SALIDA','DEVOLUCION_VENTA','CANCELACION_REMISION','AJUSTE_EXISTENCIA'])[1 + g % 7],
  1 + g % 5, 10, case when g % 7 in (2, 3) then 10 - (1 + g % 5) else 10 + (1 + g % 5) end, 'REF-' || g, 'admin', now() - (g || ' hours')::interval
from generate_series(1, 60) g;

insert into legado.web_leads (id, nombre_negocio, nombre_contacto, telefono, email, ciudad, origen, estado, created_at)
values (gen_random_uuid(), 'Ferretería Web', 'Juan', '443 555 0000', 'juan@web.mx', 'Morelia', 'web', 'nuevo', now());
insert into legado.web_cotizaciones (id, folio, cliente_id, estado, subtotal, descuento, total, notas_cliente, created_at)
values ('90000000-0000-0000-0000-000000000001', 1, 'd0000000-0000-0000-0000-000000000001', 'nueva', 100, 0, 100, 'Urge', now());
insert into legado.web_cotizaciones_items (id, cotizacion_id, producto_id, cantidad, precio_unitario)
values (gen_random_uuid(), '90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 2, 50);

insert into legado.auditoria_logs (id, tabla, operacion, registro_id, datos_anteriores, datos_nuevos, usuario, created_at)
select gen_random_uuid(), 'productos', 'UPDATE', 'x', '{"a":1}', '{"a":2}', 'admin', now() - (g || ' minutes')::interval from generate_series(1, 20) g;
