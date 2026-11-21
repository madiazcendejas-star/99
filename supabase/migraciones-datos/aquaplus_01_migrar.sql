-- =====================================================================
-- Migración de datos: ERP anterior de Aquaplus (esquema `legado`) → 99 ERP
--
-- Requisitos: el esquema 0001 aplicado y los datos del ERP anterior
-- copiados al esquema `legado` (misma estructura que el original).
--
-- Uso (SQL Editor de Supabase, como administrador del proyecto):
--   select migracion.migrar_aquaplus();            -- primera vez
--   select migracion.migrar_aquaplus(true);        -- repetir el ensayo desde cero
--   select * from migracion.validar_aquaplus();    -- comparar cifras
--
-- No modifica el esquema `legado`: queda como archivo de consulta.
-- =====================================================================

create schema if not exists migracion;
revoke all on schema migracion from public, anon, authenticated;

-- Texto de tarifa del sistema anterior → clave de lista de precios
create or replace function migracion.lista_de(p text)
returns text language sql immutable as $$
  select case
    when p is null or btrim(p) = '' then null
    when lower(p) like '%plomer%' or lower(p) like '%contratist%' then 'plomero'
    when lower(p) like '%distribu%' then 'distribuidor'
    when lower(p) like '%mayor%' then 'mayoreo'
    else 'publico'
  end;
$$;

-- Lee un número de un objeto JSON probando varias claves
create or replace function migracion.num(j jsonb, variadic claves text[])
returns numeric language plpgsql immutable as $$
declare k text;
begin
  foreach k in array claves loop
    if j ? k and jsonb_typeof(j -> k) in ('number', 'string') and (j ->> k) ~ '^-?[0-9]+(\.[0-9]+)?$' then
      return (j ->> k)::numeric;
    end if;
  end loop;
  return null;
end;
$$;

create or replace function migracion.uuid_o_nulo(p text)
returns uuid language sql immutable as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

create or replace function migracion.migrar_aquaplus(p_reiniciar boolean default false)
returns uuid language plpgsql as $$
declare
  e uuid;
  admin_rol uuid;
  t text;
  tablas_bitacora text[] := array['productos','producto_precios','clientes','proveedores','cotizaciones','ventas','venta_pagos',
    'compras','devoluciones','caja_sesiones','caja_movimientos','colaboradores','roles','listas_precio','movimientos_bancarios','pagos_proveedor'];
begin
  select id into e from empresas where politicas ->> 'origen' = 'aquaplus-erp';
  if e is not null and not p_reiniciar then
    raise exception 'Aquaplus ya fue migrada (empresa %). Usa migrar_aquaplus(true) para repetir el ensayo desde cero.', e;
  end if;
  -- Durante la migración no se recalculan existencias ni se llena la bitácora
  alter table inventario_movimientos disable trigger aplicar_movimiento;
  foreach t in array tablas_bitacora loop
    execute format('alter table public.%I disable trigger bitacora', t);
  end loop;

  if e is not null then
    delete from empresas where id = e;   -- ensayo repetido: borra en cascada todo lo de esa empresa
  end if;

  -- 1. Empresa (de configuracion_empresa) con sus roles y listas de precios
  insert into empresas (nombre_comercial, razon_social, rfc, regimen_fiscal, calle, telefono, correo, logo_url, politicas)
  select coalesce(nullif(c.nombre_comercial, ''), 'Aquaplus'), c.razon_social, c.rfc, c.regimen_fiscal, c.direccion, c.telefono, c.correo, c.logo_url,
         jsonb_build_object('origen', 'aquaplus-erp', 'migrada_en', now())
  from (select * from legado.configuracion_empresa order by id limit 1) c
  returning id into e;
  if e is null then
    insert into empresas (nombre_comercial, politicas) values ('Aquaplus', jsonb_build_object('origen', 'aquaplus-erp', 'migrada_en', now())) returning id into e;
  end if;
  admin_rol := app.preparar_empresa(e);
  insert into listas_precio (empresa_id, clave, nombre, orden) values (e, 'plomero', 'Plomero', 2), (e, 'distribuidor', 'Distribuidor', 3);

  -- 2. Colaboradores: perfiles (usuarios) + vendedores, unidos por nombre
  insert into colaboradores (empresa_id, nombre, puesto, area, rol_id, correo, telefono, estado, comision_pct, legacy_id)
  select e, p.nombre,
         case p.rol when 'admin' then 'Administrador' when 'almacen' then 'Almacén' else 'Ventas' end,
         case p.rol when 'admin' then 'Administración' when 'almacen' then 'Almacén' else 'Ventas' end,
         (select id from roles r where r.empresa_id = e and r.nombre = case p.rol when 'admin' then 'Administrador' when 'almacen' then 'Almacenista' else 'Vendedor' end),
         lower(p.email), p.telefono, case when coalesce(p.activo, true) then 'Activo' else 'Baja' end,
         coalesce(v.comision_porcentaje, 0), 'perfil:' || p.id
  from legado.perfiles p
  left join legado.vendedores v on lower(btrim(v.nombre)) = lower(btrim(p.nombre));

  insert into colaboradores (empresa_id, nombre, puesto, area, rol_id, telefono, estado, comision_pct, legacy_id, notas)
  select e, v.nombre, 'Vendedor', 'Ventas', (select id from roles r where r.empresa_id = e and r.nombre = 'Sin acceso'),
         v.telefono, case when coalesce(v.activo, true) then 'Activo' else 'Baja' end, coalesce(v.comision_porcentaje, 0), 'vendedor:' || v.id,
         nullif('Zona ' || coalesce(v.zona, ''), 'Zona ')
  from legado.vendedores v
  where not exists (select 1 from legado.perfiles p where lower(btrim(p.nombre)) = lower(btrim(v.nombre)));

  -- Los vendedores unidos a un perfil también guardan su id de vendedor
  update colaboradores c set notas = concat_ws(' · ', c.notas, 'vendedor:' || v.id)
  from legado.vendedores v
  where c.empresa_id = e and c.legacy_id like 'perfil:%' and lower(btrim(v.nombre)) = lower(btrim(c.nombre));

  -- PIN del sistema anterior (texto) → cifrado
  update colaboradores c set pin_hash = extensions.crypt(pu.pin, extensions.gen_salt('bf')), tiene_pin = true
  from legado.perfiles_usuario pu
  where c.empresa_id = e and pu.pin ~ '^\d{4}$' and coalesce(pu.activo, true) and lower(btrim(pu.nombre)) = lower(btrim(c.nombre));

  -- 3. Categorías y proveedores
  insert into categorias (empresa_id, nombre)
  select distinct e, btrim(coalesce(nullif(p.categoria, ''), c.nombre))
  from legado.productos p left join legado.categorias c on c.id = p.categoria_id
  where coalesce(nullif(p.categoria, ''), c.nombre) is not null
  on conflict do nothing;

  insert into proveedores (id, empresa_id, codigo, nombre_comercial, razon_social, rfc, contacto, telefono, correo, dias_credito, legacy_id, creado_en)
  select p.id, e, p.codigo_proveedor, coalesce(nullif(p.nombre_comercial, ''), p.razon_social, 'Proveedor sin nombre'), p.razon_social, p.rfc,
         coalesce(nullif(p.contacto, ''), p.contacto_ventas), p.telefono, p.email, coalesce(p.dias_credito, 0), p.id::text, coalesce(p.created_at, now())
  from legado.proveedores p;

  -- 4. Productos (mismo id que en el sistema anterior) y precios por lista
  insert into productos (id, empresa_id, sku, codigo_barras, nombre, descripcion, categoria_id, familia, unidad_base, unidad_venta,
    existencia, apartado, stock_minimo, costo, precio_publico, tasa_iva, clave_sat, unidad_sat, objeto_impuesto, pasillo, sku_proveedor,
    empaque, piezas_por_empaque, activo, legacy_id, creado_en, actualizado_en)
  select p.id, e, coalesce(nullif(btrim(p.sku), ''), 'SIN-SKU-' || left(p.id::text, 8)), p.codigo_barras, p.nombre, p.descripcion,
         (select k.id from categorias k where k.empresa_id = e and k.nombre = btrim(coalesce(nullif(p.categoria, ''), lc.nombre))),
         p.familia, coalesce(p.unidad_medida, 'pieza'), coalesce(p.unidad_medida, 'pieza'),
         coalesce(p.stock_actual, 0), coalesce(p.stock_apartado, 0), coalesce(p.stock_minimo, 0),
         coalesce(nullif(p.costo_compra, 0), nullif(p.costo_unitario, 0), p.costo, 0), coalesce(p.precio_publico, 0),
         coalesce(p.tasa_iva, 16), p.clave_sat, p.unidad_sat, coalesce(p.objeto_impuesto, '02'), p.ubicacion_almacen, p.sku_proveedor,
         p.tipo_empaque, p.piezas_por_empaque, coalesce(p.activo, true), p.id::text, coalesce(p.creado_en, now()), coalesce(p.actualizado_en, now())
  from legado.productos p left join legado.categorias lc on lc.id = p.categoria_id;

  insert into producto_precios (empresa_id, producto_id, lista_id, precio)
  select e, p.id, l.id, x.precio
  from legado.productos p
  cross join lateral (values ('mayoreo', p.precio_mayoreo), ('plomero', p.precio_plomero), ('distribuidor', p.precio_distribuidor)) x(clave, precio)
  join listas_precio l on l.empresa_id = e and l.clave = x.clave
  where x.precio > 0;

  -- 5. Clientes (mismo id)
  insert into clientes (id, empresa_id, codigo, nombre, contacto, telefono, correo, tipo, lista_precio_id, direccion, direccion_entrega, zona,
    vendedor_id, limite_credito, saldo_inicial, razon_social, rfc, regimen_fiscal, uso_cfdi, cp_fiscal, programa_plomero, etapa_embudo, notas, legacy_id, creado_en)
  select c.id, e, c.codigo_cliente,
         coalesce(nullif(c.nombre_comercial, ''), nullif(c.nombre_negocio, ''), nullif(c.nombre, ''), c.razon_social, 'Cliente sin nombre'),
         coalesce(nullif(c.contacto, ''), nullif(c.contacto_compras, ''), c.encargado_compras), c.telefono, c.email,
         case when lower(coalesce(c.tipo_cliente, '')) similar to '%(plomer|contratist)%' then 'Contratista'
              when lower(coalesce(c.tipo_cliente, '')) similar to '%(mayor|distribu)%' then 'Mayorista' else 'Mostrador' end,
         (select l.id from listas_precio l where l.empresa_id = e
            and l.clave = coalesce(migracion.lista_de(c.tarifa_asignada), migracion.lista_de(c.tarifa_predeterminada), migracion.lista_de(c.tipo_precio), 'publico')),
         c.direccion, c.direccion_entrega, c.zona,
         (select k.id from colaboradores k where k.empresa_id = e and lower(btrim(k.nombre)) = lower(btrim(coalesce(nullif(c.vendedor_asignado, ''), c.vendedor))) limit 1),
         coalesce(c.limite_credito, 0), coalesce(c.saldo_deudor, 0), c.razon_social, c.rfc, c.regimen_fiscal, c.uso_cfdi,
         coalesce(nullif(c.codigo_postal_fiscal, ''), c.codigo_postal),
         coalesce(c.tarjeta_plomero_distinguido, false) or coalesce(c.inscrito_programa, false), c.etapa_embudo,
         nullif(concat_ws(E'\n', c.notas, c.referencias), ''), c.id::text, coalesce(c.created_at, now())
  from legado.clientes c;

  -- 6. Rutas
  insert into rutas (empresa_id, folio, chofer, vehiculo, estado, fecha_salida, fecha_cierre, efectivo_inicial, efectivo_entregado, notas, legacy_id, creado_en)
  select e, coalesce(nullif(r.folio_ruta, ''), 'R-' || r.id) ||
           case when count(*) over (partition by coalesce(nullif(r.folio_ruta, ''), 'R-' || r.id)) > 1 then '-' || left(r.id::text, 6) else '' end, r.chofer, r.vehiculo,
         case when lower(coalesce(r.estado, '')) like '%cerr%' or lower(coalesce(r.estado, '')) like '%liquid%' then 'Cerrada'
              when lower(coalesce(r.estado, '')) like '%ruta%' then 'En ruta' else 'Planeada' end,
         r.fecha_salida, r.fecha_cierre, coalesce(r.efectivo_inicial_gastos, 0), r.total_cobrado,
         nullif(concat_ws(E'\n', r.observaciones, 'Por cobrar: ' || r.total_por_cobrar, 'Cobrado: ' || r.total_cobrado), ''), r.id::text, coalesce(r.created_at, now())
  from legado.rutas_entrega r;

  -- 7. Cotizaciones (mismo id) con sus partidas
  insert into cotizaciones (id, empresa_id, folio, cliente_id, cliente_datos, lista_precio, vendedor_id, subtotal, descuento_monto, iva, total,
    vigencia_dias, vence_el, estado, oculta_iva, notas, creado_por, legacy_id, creado_en)
  select q.id, e, coalesce(nullif(q.folio, ''), 'COT-' || left(q.id::text, 8)) ||
           case when count(*) over (partition by coalesce(nullif(q.folio, ''), 'COT-' || left(q.id::text, 8))) > 1 then '-' || left(q.id::text, 6) else '' end,
         (select c.id from clientes c where c.id = q.cliente_id and c.empresa_id = e),
         jsonb_strip_nulls(jsonb_build_object('nombre', coalesce(q.cliente_nombre, q.cliente), 'razon_social', q.cliente_razon_social, 'rfc', q.cliente_rfc,
           'telefono', q.cliente_telefono, 'direccion', q.cliente_direccion, 'codigo', q.cliente_codigo)),
         initcap(coalesce(migracion.lista_de(q.tarifa_aplicada), 'publico')),
         (select k.id from colaboradores k where k.empresa_id = e and (k.legacy_id = 'vendedor:' || q.vendedor_id or k.notas like '%vendedor:' || q.vendedor_id || '%') limit 1),
         coalesce(q.subtotal, 0), coalesce(q.descuento_general, 0), coalesce(q.iva, 0), coalesce(q.total, 0),
         coalesce(q.vigencia_dias, nullif(substring(q.vigencia from '\d+'), '')::int),
         (coalesce(q.created_at, now()) + make_interval(days => coalesce(q.vigencia_dias, nullif(substring(q.vigencia from '\d+'), '')::int, 7)))::date,
         case when coalesce(q.convertida, false) or lower(coalesce(q.estatus, q.estado, '')) like 'convert%' then 'Aceptada'
              when lower(coalesce(q.estatus, q.estado, '')) like 'cancel%' or lower(coalesce(q.estatus, q.estado, '')) like 'rechaz%' then 'Rechazada'
              else 'Enviada' end,
         coalesce(q.hide_tax, false), q.observaciones, coalesce(q.usuario_registro, q.vendedor_nombre), q.id::text, coalesce(q.created_at, now())
  from legado.cotizaciones q;

  insert into cotizacion_partidas (empresa_id, cotizacion_id, producto_id, sku, nombre, cantidad, unidad, precio_unitario, descuento, importe)
  select e, q.id, (select p.id from productos p where p.empresa_id = e and p.id = migracion.uuid_o_nulo(coalesce(i ->> 'producto_id', i ->> 'id'))),
         i ->> 'sku', coalesce(i ->> 'nombre', 'Partida'), coalesce(migracion.num(i, 'cantidad'), 1), i ->> 'unidad_medida',
         coalesce(migracion.num(i, 'precio_unitario', 'precioVenta', 'precio'), 0),
         case when coalesce(migracion.num(i, 'valorDescPartida'), 0) > 0
              then jsonb_build_object('type', case when i ->> 'tipoDescPartida' = 'porcentaje' then '%' else '$' end, 'value', migracion.num(i, 'valorDescPartida')) end,
         coalesce(migracion.num(i, 'subtotal', 'importe'), coalesce(migracion.num(i, 'cantidad'), 1) * coalesce(migracion.num(i, 'precio_unitario', 'precioVenta', 'precio'), 0))
  from legado.cotizaciones q
  cross join lateral jsonb_array_elements(case when jsonb_typeof(coalesce(q.partidas, q.items)) = 'array' then coalesce(q.partidas, q.items) else '[]'::jsonb end) i;

  -- Cotizaciones que llegaron de la página web
  insert into cotizaciones (empresa_id, folio, cliente_id, subtotal, descuento_monto, total, estado, notas, legacy_id, creado_en)
  select e, 'WEB-' || coalesce(w.folio::text, left(w.id::text, 8)), (select c.id from clientes c where c.id = w.cliente_id and c.empresa_id = e),
         coalesce(w.subtotal, 0), coalesce(w.descuento, 0), coalesce(w.total, 0), 'Borrador',
         nullif(concat_ws(E'\n', 'Cliente: ' || w.notas_cliente, 'Interno: ' || w.notas_internas), ''), 'web:' || w.id, coalesce(w.created_at, now())
  from legado.web_cotizaciones w;
  insert into cotizacion_partidas (empresa_id, cotizacion_id, producto_id, sku, nombre, cantidad, precio_unitario, importe)
  select e, q.id, p.id, p.sku, coalesce(p.nombre, 'Producto'), wi.cantidad, coalesce(wi.precio_unitario, 0), wi.cantidad * coalesce(wi.precio_unitario, 0)
  from legado.web_cotizaciones_items wi
  join cotizaciones q on q.empresa_id = e and q.legacy_id = 'web:' || wi.cotizacion_id
  left join productos p on p.empresa_id = e and p.id = wi.producto_id;

  -- 8. Ventas (el id del sistema anterior es numérico: queda en legacy_id)
  insert into ventas (empresa_id, folio, fecha, cliente_id, cliente_datos, vendedor_id, lista_precio, tipo, entrega, estado, subtotal, descuento_monto,
    iva, total, anticipo, ruta_id, oculta_iva, notas, creado_por, legacy_id, creado_en)
  select e,
         coalesce(nullif(v.folio, ''), nullif(v.folio_venta, ''), 'V-' || v.id) ||
           case when count(*) over (partition by coalesce(nullif(v.folio, ''), nullif(v.folio_venta, ''), 'V-' || v.id)) > 1 then '-' || v.id else '' end,
         coalesce(v.fecha, v.created_at, now()),
         (select c.id from clientes c where c.id = v.cliente_id and c.empresa_id = e),
         jsonb_strip_nulls(jsonb_build_object('nombre', coalesce(v.cliente_nombre, v.cliente), 'razon_social', v.cliente_razon_social, 'rfc', v.cliente_rfc,
           'telefono', v.cliente_telefono, 'direccion', coalesce(v.direccion_entrega, v.cliente_direccion), 'codigo', v.cliente_codigo)),
         (select k.id from colaboradores k where k.empresa_id = e and (k.legacy_id = 'vendedor:' || v.vendedor_id or k.notas like '%vendedor:' || v.vendedor_id || '%') limit 1),
         initcap(coalesce(migracion.lista_de(coalesce(v.tarifa_aplicada, v.tipo_tarifa, v.tipo_precio)), 'publico')),
         case when v.ruta_id is not null or coalesce(v.es_contra_entrega, false) then 'Pedido' else 'Mostrador' end,
         case when coalesce(v.es_contra_entrega, false) then 'Contra entrega'
              when lower(coalesce(v.tipo_entrega, '')) like '%domicil%' or v.ruta_id is not null then 'A domicilio' else 'Mostrador' end,
         case when lower(coalesce(v.estado, '')) like 'cancel%' or lower(coalesce(v.estado_surtido, '')) like 'cancel%' or lower(coalesce(v.payment_status, '')) like 'cancel%' then 'Cancelada'
              when lower(coalesce(v.estado, '')) in ('completada', 'pagada', 'pagado', 'liquidada', 'liquidado', 'entregada', 'cobrada')
                or lower(coalesce(v.payment_status, '')) in ('paid', 'pagado', 'pagada', 'completed')
                or v.fecha_liquidacion is not null or coalesce(v.cobrado_en_ruta, false) then 'Pagada'
              when lower(coalesce(v.estado, '')) like 'pend%' or lower(coalesce(v.payment_status, '')) like 'pend%'
                or lower(coalesce(v.metodo_pago, v.forma_pago, '')) like '%cr_dito%' or coalesce(v.es_contra_entrega, false) then 'Pendiente'
              else 'Pagada' end,
         coalesce(v.subtotal, 0), coalesce(v.descuento_general, 0), coalesce(v.iva, 0), coalesce(v.total, 0), coalesce(v.anticipo, 0),
         (select r.id from rutas r where r.empresa_id = e and r.legacy_id = v.ruta_id::text),
         coalesce(v.hide_tax, false), nullif(concat_ws(E'\n', v.observaciones, v.referencia), ''), coalesce(v.usuario_registro, v.vendedor_nombre),
         v.id::text, coalesce(v.created_at, v.fecha, now())
  from legado.ventas v;

  -- Partidas: ventas_detalle es la fuente principal; si una venta no tiene detalle, se usan sus JSON
  insert into venta_partidas (empresa_id, venta_id, producto_id, sku, nombre, cantidad, cantidad_surtida, unidad, precio_unitario, costo_unitario, importe)
  select e, n.id, p.id, coalesce(d.sku, p.sku), coalesce(d.nombre, p.nombre, 'Partida'), coalesce(d.cantidad, 1), coalesce(d.cantidad_surtida, d.cantidad, 0),
         p.unidad_venta, coalesce(d.precio_unitario, 0), p.costo, coalesce(d.subtotal, coalesce(d.cantidad, 1) * coalesce(d.precio_unitario, 0))
  from legado.ventas_detalle d
  join ventas n on n.empresa_id = e and n.legacy_id = d.venta_id::text
  left join productos p on p.empresa_id = e and p.id = d.producto_id;

  insert into venta_partidas (empresa_id, venta_id, producto_id, sku, nombre, cantidad, cantidad_surtida, unidad, precio_unitario, costo_unitario, importe)
  select e, n.id, p.id, coalesce(i ->> 'sku', p.sku), coalesce(i ->> 'nombre', p.nombre, 'Partida'), coalesce(migracion.num(i, 'cantidad'), 1),
         coalesce(migracion.num(i, 'cantidad_surtida', 'cantidad'), 0), coalesce(i ->> 'unidad_medida', p.unidad_venta),
         coalesce(migracion.num(i, 'precio_unitario', 'precioVenta', 'precio'), 0), p.costo,
         coalesce(migracion.num(i, 'subtotal', 'importe'), coalesce(migracion.num(i, 'cantidad'), 1) * coalesce(migracion.num(i, 'precio_unitario', 'precioVenta', 'precio'), 0))
  from legado.ventas v
  join ventas n on n.empresa_id = e and n.legacy_id = v.id::text
  cross join lateral jsonb_array_elements(case when jsonb_typeof(coalesce(v.partidas, v.items)) = 'array' then coalesce(v.partidas, v.items) else '[]'::jsonb end) i
  left join productos p on p.empresa_id = e and p.id = migracion.uuid_o_nulo(coalesce(i ->> 'producto_id', i ->> 'id'))
  where not exists (select 1 from legado.ventas_detalle d where d.venta_id = v.id);

  -- Pagos: las ventas pagadas quedan cobradas por su total; las pendientes, por su anticipo
  insert into venta_pagos (empresa_id, venta_id, cliente_id, metodo, monto, recibido, cambio, referencia, recibido_por, creado_en)
  select e, n.id, n.cliente_id,
         case when lower(coalesce(v.metodo_pago, v.forma_pago, v.payment_type, v.metodo_cobro_ruta, '')) like '%tarj%' then 'Tarjeta'
              when lower(coalesce(v.metodo_pago, v.forma_pago, v.payment_type, v.metodo_cobro_ruta, '')) like '%transf%' then 'Transferencia'
              when lower(coalesce(v.metodo_pago, v.forma_pago, v.payment_type, v.metodo_cobro_ruta, '')) like '%cheq%' then 'Cheque'
              else 'Efectivo' end,
         case when n.estado = 'Pagada' then n.total else n.anticipo end,
         v.amount_received, v.change_given, v.comprobante_pago_chofer, v.liquidado_por,
         coalesce(v.fecha_liquidacion, v.fecha, v.created_at, now())
  from legado.ventas v
  join ventas n on n.empresa_id = e and n.legacy_id = v.id::text
  where (n.estado = 'Pagada' and n.total > 0) or (n.estado = 'Pendiente' and n.anticipo > 0);

  -- Paradas de ruta: las ventas que salieron en cada ruta
  insert into ruta_paradas (empresa_id, ruta_id, venta_id, orden, estado, cobrado, metodo_cobro)
  select e, n.ruta_id, n.id, row_number() over (partition by n.ruta_id order by n.fecha),
         case when n.estado = 'Pagada' then 'Entregada' else 'Pendiente' end,
         case when coalesce(v.cobrado_en_ruta, false) then n.total end, v.metodo_cobro_ruta
  from ventas n join legado.ventas v on v.id::text = n.legacy_id
  where n.empresa_id = e and n.ruta_id is not null;

  -- 9. Pedidos → órdenes de surtido (ligadas a su cotización)
  insert into ordenes_surtido (empresa_id, folio, tipo, cotizacion_id, cliente_datos, total, estado, entrega, partidas, surtido_por, entregado_en, legacy_id, creado_en)
  select e, coalesce(nullif(pd.folio, ''), 'PED-' || left(pd.id::text, 8)) ||
           case when count(*) over (partition by coalesce(nullif(pd.folio, ''), 'PED-' || left(pd.id::text, 8))) > 1 then '-' || left(pd.id::text, 6) else '' end, 'Surtido',
         (select q.id from cotizaciones q where q.empresa_id = e and q.id = pd.cotizacion_id),
         jsonb_strip_nulls(jsonb_build_object('nombre', pd.cliente_nombre, 'razon_social', pd.cliente_razon_social, 'rfc', pd.cliente_rfc,
           'telefono', pd.cliente_telefono, 'direccion', pd.cliente_direccion, 'codigo', pd.cliente_codigo, 'cliente_id', pd.cliente_id)),
         coalesce(pd.total, 0),
         case when lower(coalesce(pd.estatus, pd.estado_surtido, '')) like 'cancel%' then 'Cancelada'
              when lower(coalesce(pd.estatus, '')) like 'remision%' or lower(coalesce(pd.estatus, '')) like 'entreg%' then 'Entregada'
              when lower(coalesce(pd.estatus, pd.estado_surtido, '')) like 'surtid%' then 'Lista'
              else 'Por surtir' end,
         'A domicilio', coalesce(pd.items, '[]'::jsonb), pd.surtido_por, pd.fecha_surtido, pd.id::text, coalesce(pd.created_at, now())
  from legado.pedidos pd;

  -- 10. Compras con sus partidas
  insert into compras (empresa_id, folio, proveedor_id, proveedor_nombre, estado, factura_proveedor, subtotal, iva, total, fecha_compra, fecha_recepcion,
    recibido_por, estado_pago, fecha_limite_pago, notas, creado_por, legacy_id, creado_en)
  select e,
         coalesce(nullif(c.folio_compra, ''), nullif(c.folio, ''), 'OC-' || left(c.id::text, 8)) ||
           case when count(*) over (partition by coalesce(nullif(c.folio_compra, ''), nullif(c.folio, ''), 'OC-' || left(c.id::text, 8))) > 1 then '-' || left(c.id::text, 4) else '' end,
         (select p.id from proveedores p where p.empresa_id = e and p.id = c.proveedor_id),
         coalesce(c.proveedor_nombre, c.proveedor),
         case when lower(coalesce(c.estado_compra, c.estado, '')) like 'recib%' then 'Recibida'
              when lower(coalesce(c.estado_compra, c.estado, '')) like 'cancel%' then 'Cancelada'
              when lower(coalesce(c.estado_compra, c.estado, '')) like 'borr%' then 'Borrador'
              else 'Enviada' end,
         c.numero_factura_proveedor, coalesce(c.subtotal, 0), coalesce(c.iva, 0), coalesce(c.total, 0),
         coalesce(c.fecha_compra, c.created_at, now()), c.fecha_recepcion, c.recibido_por,
         case when lower(coalesce(c.estado_pago, '')) like 'pagad%' then 'Pagada' when lower(coalesce(c.estado_pago, '')) like 'parc%' then 'Parcial' else 'Por pagar' end,
         c.fecha_limite_pago, nullif(concat_ws(E'\n', c.notas, c.observaciones, c.observaciones_recepcion), ''), c.usuario_registro, c.id::text, coalesce(c.created_at, now())
  from legado.compras c;

  insert into compra_partidas (empresa_id, compra_id, producto_id, sku, nombre, cantidad, cantidad_recibida, costo_unitario, importe)
  select e, n.id, p.id, coalesce(i ->> 'sku', p.sku), coalesce(i ->> 'nombre', p.nombre, 'Partida'), coalesce(migracion.num(i, 'cantidad'), 1),
         case when n.estado = 'Recibida' then coalesce(migracion.num(i, 'cantidad_recibida', 'cantidad'), 0) else 0 end,
         coalesce(migracion.num(i, 'costo_unitario', 'costo', 'precio_unitario'), 0),
         coalesce(migracion.num(i, 'subtotal', 'importe'), coalesce(migracion.num(i, 'cantidad'), 1) * coalesce(migracion.num(i, 'costo_unitario', 'costo'), 0))
  from legado.compras c
  join compras n on n.empresa_id = e and n.legacy_id = c.id::text
  cross join lateral jsonb_array_elements(case when jsonb_typeof(c.partidas) = 'array' then c.partidas else '[]'::jsonb end) i
  left join productos p on p.empresa_id = e and p.id = migracion.uuid_o_nulo(coalesce(i ->> 'producto_id', i ->> 'id'));

  -- 11. Devoluciones
  insert into devoluciones (empresa_id, folio, venta_id, cliente_id, motivo, resolucion, total, partidas, creado_por, legacy_id, creado_en)
  select e, coalesce(nullif(d.folio, ''), 'DEV-' || left(d.id::text, 8)) ||
           case when count(*) over (partition by coalesce(nullif(d.folio, ''), 'DEV-' || left(d.id::text, 8))) > 1 then '-' || left(d.id::text, 6) else '' end, n.id, n.cliente_id, d.motivo, 'Registrada en el sistema anterior',
         coalesce(d.total_devolucion, 0), coalesce(d.partidas, '[]'::jsonb), d.usuario, d.id::text, coalesce(d.created_at, now())
  from legado.devoluciones d
  left join ventas n on n.empresa_id = e and n.legacy_id = d.venta_id::text;

  -- 12. Kardex histórico (sin volver a mover existencias: ya vienen en productos)
  insert into inventario_movimientos (empresa_id, producto_id, tipo, cantidad, existencia_anterior, existencia_nueva, referencia, usuario, creado_en)
  select e, h.producto_id,
         case upper(coalesce(h.tipo_movimiento, ''))
           when 'COMPRA' then 'Entrada' when 'SURTIDO_PEDIDO' then 'Venta' when 'STOCK_INICIAL' then 'Inventario inicial'
           when 'DEVOLUCION_VENTA' then 'Devolución' when 'CANCELACION_REMISION' then 'Cancelación'
           else 'Ajuste' end,
         coalesce(h.stock_nuevo - h.stock_anterior,
                  case when upper(coalesce(h.tipo_movimiento, '')) in ('SURTIDO_PEDIDO', 'AJUSTE_SALIDA') then -abs(h.cantidad) else h.cantidad end, 0),
         h.stock_anterior, h.stock_nuevo, h.referencia, h.usuario, coalesce(h.created_at, now())
  from legado.inventario_historial h
  where exists (select 1 from productos p where p.id = h.producto_id and p.empresa_id = e);

  -- 13. Prospectos de la página web
  insert into prospectos (empresa_id, nombre_negocio, nombre_contacto, telefono, correo, ciudad, origen, estado, notas, legacy_id, creado_en)
  select e, w.nombre_negocio, w.nombre_contacto, w.telefono, w.email, w.ciudad, coalesce(w.origen, 'web'), initcap(coalesce(w.estado, 'Nuevo')), w.notas,
         w.id::text, coalesce(w.created_at, now())
  from legado.web_leads w;

  -- 14. Bitácora histórica (auditoría del sistema anterior)
  insert into bitacora (empresa_id, tabla, operacion, registro_id, antes, despues, usuario, usuario_nombre, creado_en)
  select e, 'anterior:' || a.tabla, a.operacion, a.registro_id, a.datos_anteriores, a.datos_nuevos, null, a.usuario, coalesce(a.created_at, now())
  from legado.auditoria_logs a;

  -- Folios: que las ventas, cotizaciones y compras nuevas sigan después de las migradas
  insert into folios (empresa_id, serie, ultimo)
  select e, s.serie, coalesce(max(nullif(substring(s.folio from '^' || s.serie || '-(\d+)$'), '')::int), 0)
  from (select 'V' serie, folio from ventas where empresa_id = e
        union all select 'COT', folio from cotizaciones where empresa_id = e
        union all select 'OC', folio from compras where empresa_id = e
        union all select 'DEV', folio from devoluciones where empresa_id = e) s
  group by s.serie;

  alter table inventario_movimientos enable trigger aplicar_movimiento;
  foreach t in array tablas_bitacora loop
    execute format('alter table public.%I enable trigger bitacora', t);
  end loop;
  return e;
exception when others then
  -- La función corre en una sola transacción: si algo falla, no queda nada a medias
  raise;
end;
$$;
