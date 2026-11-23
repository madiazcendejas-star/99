-- =====================================================================
-- Validación de la migración de Aquaplus: compara el sistema anterior
-- (esquema `legado`) contra 99 ERP. Cada fila dice si cuadra.
--   select * from migracion.validar_aquaplus();
-- =====================================================================
create or replace function migracion.validar_aquaplus()
returns table (revision text, sistema_anterior numeric, erp_99 numeric, cuadra boolean, nota text)
language plpgsql as $$
declare e uuid;
begin
  select id into e from empresas where politicas ->> 'origen' = 'aquaplus-erp';
  if e is null then raise exception 'Todavía no se ha migrado Aquaplus'; end if;

  return query
  with c(revision, a, b, nota) as (
    select 'Productos', (select count(*) from legado.productos)::numeric, (select count(*) from productos where empresa_id = e)::numeric, null::text
    union all select 'Existencia total (piezas)', (select coalesce(sum(stock_actual), 0) from legado.productos), (select sum(existencia) from productos where empresa_id = e), null
    union all select 'Valor del inventario a costo',
      (select round(coalesce(sum(coalesce(stock_actual, 0) * coalesce(nullif(costo_compra, 0), nullif(costo_unitario, 0), costo, 0)), 0), 2) from legado.productos),
      (select round(sum(existencia * costo), 2) from productos where empresa_id = e), null
    union all select 'Precios por lista capturados',
      (select count(*) filter (where precio_mayoreo > 0) + count(*) filter (where precio_plomero > 0) + count(*) filter (where precio_distribuidor > 0) from legado.productos),
      (select count(*) from producto_precios where empresa_id = e), null
    union all select 'Clientes', (select count(*) from legado.clientes), (select count(*) from clientes where empresa_id = e), null
    union all select 'Saldo por cobrar de clientes (saldo_deudor)', (select coalesce(sum(saldo_deudor), 0) from legado.clientes), (select sum(saldo_inicial) from clientes where empresa_id = e), null
    union all select 'Proveedores', (select count(*) from legado.proveedores), (select count(*) from proveedores where empresa_id = e), null
    union all select 'Colaboradores (perfiles + vendedores sin perfil)',
      (select count(*) from legado.perfiles) + (select count(*) from legado.vendedores v where not exists (select 1 from legado.perfiles p where lower(btrim(p.nombre)) = lower(btrim(v.nombre)))),
      (select count(*) from colaboradores where empresa_id = e), null
    union all select 'Cotizaciones (incluye las de la web)', (select count(*) from legado.cotizaciones) + (select count(*) from legado.web_cotizaciones), (select count(*) from cotizaciones where empresa_id = e), null
    union all select 'Ventas', (select count(*) from legado.ventas), (select count(*) from ventas where empresa_id = e), null
    union all select 'Importe total de ventas', (select coalesce(sum(total), 0) from legado.ventas), (select sum(total) from ventas where empresa_id = e), null
    union all select 'Partidas de venta', (select count(*) from legado.ventas_detalle)
        + (select coalesce(sum(jsonb_array_length(coalesce(v.partidas, v.items))), 0) from legado.ventas v
           where jsonb_typeof(coalesce(v.partidas, v.items)) = 'array' and not exists (select 1 from legado.ventas_detalle d where d.venta_id = v.id)),
      (select count(*) from venta_partidas where empresa_id = e), null
    union all select 'Importe pendiente por entregar (backorder, no cobrado)',
      (select round(coalesce(sum(coalesce(migracion.num(x, 'subtotal', 'importe'), migracion.num(x, 'cantidad') * migracion.num(x, 'precio_unitario', 'precioVenta', 'precio'), 0)), 0), 2)
       from legado.ventas lv cross join lateral jsonb_array_elements(case when jsonb_typeof(lv.partidas_backorder) = 'array' then lv.partidas_backorder else '[]'::jsonb end) x),
      (select round(coalesce(sum(coalesce(migracion.num(x, 'subtotal', 'importe'), migracion.num(x, 'cantidad') * migracion.num(x, 'precio_unitario', 'precioVenta', 'precio'), 0)), 0), 2)
       from ventas v cross join lateral jsonb_array_elements(coalesce(v.pendiente_entrega, '[]'::jsonb)) x where v.empresa_id = e),
      'Lo que faltó surtir: queda guardado en cada venta'
    union all select 'Ventas sin partidas', 0, (select count(*) from ventas v where v.empresa_id = e and not exists (select 1 from venta_partidas p where p.venta_id = v.id)), 'Revisar si es mayor a 0'
    union all select 'Ventas cuyo total no coincide con sus partidas (> $1)', 0,
      (select count(*) from ventas v where v.empresa_id = e and abs(v.total + v.descuento_monto - (select coalesce(sum(importe), 0) from venta_partidas p where p.venta_id = v.id)) > 1),
      'Diferencias que ya venían del sistema anterior'
    union all select 'Pedidos → órdenes de surtido', (select count(*) from legado.pedidos), (select count(*) from ordenes_surtido where empresa_id = e), null
    union all select 'Compras', (select count(*) from legado.compras), (select count(*) from compras where empresa_id = e), null
    union all select 'Importe total de compras', (select coalesce(sum(total), 0) from legado.compras), (select sum(total) from compras where empresa_id = e), null
    union all select 'Rutas', (select count(*) from legado.rutas_entrega), (select count(*) from rutas where empresa_id = e), null
    union all select 'Devoluciones', (select count(*) from legado.devoluciones), (select count(*) from devoluciones where empresa_id = e), null
    union all select 'Movimientos de kardex', (select count(*) from legado.inventario_historial), (select count(*) from inventario_movimientos where empresa_id = e), 'Se omiten los de productos que ya no existen'
    union all select 'Prospectos web', (select count(*) from legado.web_leads), (select count(*) from prospectos where empresa_id = e), null
    union all select 'Bitácora histórica', (select count(*) from legado.auditoria_logs), (select count(*) from bitacora where empresa_id = e and tabla like 'anterior:%'), null
  )
  select c.revision, c.a, c.b, (c.a = c.b), c.nota from c

  union all
  -- Ventas por mes (importe), para comparar contra los reportes del sistema anterior
  select 'Ventas ' || to_char(m.mes, 'YYYY-MM'), m.a, m.b, m.a = m.b, null
  from (
    select la.mes, la.a, coalesce(nu.b, 0) b
    from (select date_trunc('month', coalesce(v.fecha, v.created_at)) mes, sum(v.total) a from legado.ventas v group by 1) la
    left join (select date_trunc('month', n.fecha) mes, sum(n.total) b from ventas n where n.empresa_id = e group by 1) nu on nu.mes = la.mes
  ) m

  union all
  -- Cómo se interpretó cada estado del sistema anterior (para confirmarlo con el negocio)
  select 'Estado anterior «' || coalesce(v.estado, '∅') || ' / ' || coalesce(v.payment_status, '∅') || '» → ' || n.estado,
         count(*)::numeric, sum(n.total), null, 'Confirmar que la interpretación es correcta'
  from legado.ventas v join ventas n on n.empresa_id = e and n.legacy_id = v.id::text
  group by v.estado, v.payment_status, n.estado

  union all
  select 'Ventas «entregada» por confirmar cobro', count(*)::numeric, sum(n.total), null,
         'Revisar con caja; las cobradas se anotan en migracion.ventas_cobradas_confirmadas'
  from legado.ventas v join ventas n on n.empresa_id = e and n.legacy_id = v.id::text
  where lower(coalesce(v.estado, '')) like 'entreg%' and n.estado = 'Pendiente'

  union all
  select 'Pedidos remisionados sin venta en el sistema anterior', count(*)::numeric, sum(o.total), null,
         'Se migraron como órdenes entregadas; confirmar si deben contar como ventas'
  from ordenes_surtido o where o.empresa_id = e and o.estado = 'Entregada';
end;
$$;
