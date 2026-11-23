-- Lista de las ventas "entregadas" del sistema anterior para confirmar con caja si ya se cobraron.
-- Se corre en aquaplus-99-ensayo. El resultado se puede descargar (Export → CSV) para revisarlo.
select coalesce(v.folio, v.folio_venta) as folio,
       to_char(coalesce(v.fecha, v.created_at) at time zone 'America/Mexico_City', 'YYYY-MM-DD') as fecha,
       coalesce(v.cliente_razon_social, v.cliente_nombre, v.cliente) as cliente,
       v.total, coalesce(v.metodo_pago, v.forma_pago) as forma_pago,
       r.folio_ruta as ruta, r.chofer, v.vendedor_nombre as vendedor,
       v.fecha_liquidacion is not null as liquidada_en_caja, coalesce(v.cobrado_en_ruta, false) as cobrada_en_ruta,
       n.estado as estado_en_99
from legado.ventas v
left join legado.rutas_entrega r on r.id = v.ruta_id
left join ventas n on n.legacy_id = v.id::text
where lower(coalesce(v.estado, '')) like 'entreg%'
order by coalesce(v.fecha, v.created_at);

-- Cuando sepan cuáles YA están cobradas, anótalas así (una línea por folio) y vuelve a correr el paso 3:
-- insert into migracion.ventas_cobradas_confirmadas (folio) values ('NV-000001'), ('NV-000002');
