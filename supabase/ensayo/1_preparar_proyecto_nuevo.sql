-- ENSAYO · PASO 1 de 3 · Preparar el proyecto nuevo de Supabase (99 ERP para Aquaplus)
-- Pega TODO este archivo en SQL Editor → New query del proyecto NUEVO y pulsa Run.

-- =====================================================================
-- 99 ERP · Esquema inicial (multiempresa)
-- Cada dato pertenece a una empresa (empresa_id). Las políticas RLS
-- permiten ver y cambiar solo los datos de las empresas donde el usuario
-- es colaborador activo. Sin sesión (rol anon) no se puede leer nada;
-- la única excepción es registrar prospectos desde la página web.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists app;

-- ---------------------------------------------------------------------
-- Empresas, roles y colaboradores
-- ---------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre_comercial text not null,
  razon_social text,
  rfc text,
  regimen_fiscal text,
  telefono text,
  correo text,
  sitio_web text,
  calle text,
  ciudad text,
  estado text,
  codigo_postal text,
  sucursal text default 'Sucursal principal',
  almacen text default 'Almacén principal',
  logo_url text,
  -- Políticas del negocio (apartados, devoluciones, kits, bloqueo, etc.)
  politicas jsonb not null default '{}'::jsonb,
  plan text not null default 'prueba',
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  permisos text[] not null default '{}',
  descuento_maximo numeric not null default 0,
  bloqueado boolean not null default false,
  unique (empresa_id, nombre)
);

create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  -- Usuario de Supabase Auth (vacío si no entra al sistema)
  user_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  puesto text,
  area text,
  rol_id uuid references public.roles(id),
  correo text,
  telefono text,
  pin_hash text,
  tiene_pin boolean not null default false,
  fecha_ingreso date,
  estado text not null default 'Activo' check (estado in ('Activo', 'Baja')),
  sueldo numeric not null default 0,
  periodicidad text not null default 'Quincenal' check (periodicidad in ('Semanal', 'Quincenal', 'Mensual')),
  seguro_social boolean not null default true,
  comision_pct numeric not null default 0,
  meta_mensual numeric not null default 0,
  banco text,
  contacto_emergencia text,
  notas text,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, user_id)
);

-- ---------------------------------------------------------------------
-- Funciones de acceso (security definer: no dependen de RLS)
-- ---------------------------------------------------------------------
create or replace function app.es_miembro(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from colaboradores c
    where c.empresa_id = p_empresa and c.user_id = auth.uid() and c.estado = 'Activo'
  );
$$;

create or replace function app.tiene_permiso(p_empresa uuid, p_permiso text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from colaboradores c join roles r on r.id = c.rol_id
    where c.empresa_id = p_empresa and c.user_id = auth.uid() and c.estado = 'Activo'
      and (r.nombre = 'Administrador' or p_permiso = any (r.permisos))
  );
$$;

create or replace function app.es_admin(p_empresa uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from colaboradores c join roles r on r.id = c.rol_id
    where c.empresa_id = p_empresa and c.user_id = auth.uid() and c.estado = 'Activo' and r.nombre = 'Administrador'
  );
$$;

-- Validar el PIN de un colaborador (cambio rápido de usuario / autorizaciones)
create or replace function public.validar_pin(p_colaborador uuid, p_pin text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from colaboradores c
    where c.id = p_colaborador and c.estado = 'Activo' and c.pin_hash is not null
      and c.pin_hash = crypt(p_pin, c.pin_hash)
      and app.es_miembro(c.empresa_id)
  );
$$;

create or replace function public.asignar_pin(p_colaborador uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_pin !~ '^\d{4}$' then raise exception 'El PIN debe tener 4 dígitos'; end if;
  update colaboradores set pin_hash = crypt(p_pin, gen_salt('bf')), tiene_pin = true
  where id = p_colaborador
    and (user_id = auth.uid() or app.es_admin(empresa_id));
  if not found then raise exception 'Sin permiso para cambiar este PIN'; end if;
end;
$$;

-- Folios consecutivos por empresa y serie (V-0001, C-0001, OC-0001…)
create table public.folios (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  serie text not null,
  ultimo integer not null default 0,
  primary key (empresa_id, serie)
);

create or replace function public.siguiente_folio(p_empresa uuid, p_serie text)
returns text language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not app.es_miembro(p_empresa) then raise exception 'Sin acceso a la empresa'; end if;
  insert into folios (empresa_id, serie, ultimo) values (p_empresa, p_serie, 1)
  on conflict (empresa_id, serie) do update set ultimo = folios.ultimo + 1
  returning ultimo into n;
  return p_serie || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- Catálogos: categorías, listas de precios, productos, kits
-- ---------------------------------------------------------------------
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  unique (empresa_id, nombre)
);

create table public.listas_precio (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  clave text not null,               -- publico, mayoreo, plomero, distribuidor…
  nombre text not null,
  orden integer not null default 0,
  es_publico boolean not null default false,
  unique (empresa_id, clave)
);

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text,
  nombre_comercial text not null,
  razon_social text,
  rfc text,
  contacto text,
  telefono text,
  correo text,
  dias_credito integer not null default 0,
  notas text,
  legacy_id text,
  creado_en timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  sku text not null,
  codigo_barras text,
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.categorias(id),
  familia text,
  marca text,
  unidad_base text not null default 'pieza',
  unidad_venta text not null default 'pieza',
  conversion numeric not null default 1,
  existencia numeric not null default 0,
  apartado numeric not null default 0,
  stock_minimo numeric not null default 0,
  stock_maximo numeric not null default 0,
  costo numeric not null default 0,
  precio_publico numeric not null default 0,
  tasa_iva numeric not null default 16,
  clave_sat text,
  unidad_sat text,
  objeto_impuesto text default '02',
  pasillo text,
  estante text,
  proveedor_id uuid references public.proveedores(id),
  sku_proveedor text,
  empaque text,
  piezas_por_empaque numeric,
  activo boolean not null default true,
  legacy_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (empresa_id, sku)
);
create index on public.productos (empresa_id, codigo_barras);

-- Precio por lista (el público vive en productos.precio_publico)
create table public.producto_precios (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  lista_id uuid not null references public.listas_precio(id) on delete cascade,
  precio numeric not null check (precio >= 0),
  primary key (producto_id, lista_id)
);

create table public.kits (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  sku text not null,
  nombre text not null,
  tipo text not null default 'Virtual' check (tipo in ('Virtual', 'Fijo')),
  precio_publico numeric not null default 0,
  activo boolean not null default true,
  unique (empresa_id, sku)
);

create table public.kit_componentes (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  kit_id uuid not null references public.kits(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  cantidad numeric not null check (cantidad > 0),
  primary key (kit_id, producto_id)
);

-- Kardex: cada movimiento actualiza la existencia del producto (trigger abajo)
create table public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  producto_id uuid not null references public.productos(id),
  tipo text not null,                -- Entrada, Venta, Ajuste, Devolución, Merma, Apartado, Liberación…
  cantidad numeric not null,         -- positiva entra, negativa sale
  existencia_anterior numeric,
  existencia_nueva numeric,
  afecta_apartado boolean not null default false,
  referencia text,
  usuario text,
  creado_en timestamptz not null default now()
);
create index on public.inventario_movimientos (empresa_id, producto_id, creado_en);

create or replace function app.aplicar_movimiento()
returns trigger language plpgsql as $$
declare actual numeric;
begin
  if new.afecta_apartado then
    update productos set apartado = greatest(0, apartado + new.cantidad), actualizado_en = now()
    where id = new.producto_id and empresa_id = new.empresa_id
    returning existencia into actual;
    new.existencia_anterior := actual;
    new.existencia_nueva := actual;
  else
    select existencia into actual from productos
    where id = new.producto_id and empresa_id = new.empresa_id for update;
    if actual is null then raise exception 'El producto no pertenece a la empresa'; end if;
    new.existencia_anterior := actual;
    new.existencia_nueva := actual + new.cantidad;
    update productos set existencia = new.existencia_nueva, actualizado_en = now() where id = new.producto_id;
  end if;
  return new;
end;
$$;
create trigger aplicar_movimiento before insert on public.inventario_movimientos
for each row execute function app.aplicar_movimiento();

-- ---------------------------------------------------------------------
-- Clientes y cuentas por cobrar
-- ---------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text,
  nombre text not null,
  contacto text,
  telefono text,
  correo text,
  tipo text not null default 'Mostrador',
  lista_precio_id uuid references public.listas_precio(id),
  canal text,
  direccion text,
  direccion_entrega text,
  ciudad text,
  zona text,
  vendedor_id uuid references public.colaboradores(id),
  dias_credito integer not null default 0,
  limite_credito numeric not null default 0,
  saldo_inicial numeric not null default 0,   -- saldo por cobrar migrado del sistema anterior
  saldo_a_favor numeric not null default 0,
  razon_social text,
  rfc text,
  regimen_fiscal text,
  uso_cfdi text,
  cp_fiscal text,
  programa_plomero boolean not null default false,
  etapa_embudo text,
  notas text,
  legacy_id text,
  creado_en timestamptz not null default now()
);
create index on public.clientes (empresa_id, nombre);

create table public.monedero_movimientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  tipo text not null,                -- Anticipo, Devolución, Apartado cancelado, Uso en venta…
  monto numeric not null,            -- positivo abona, negativo usa
  referencia text,
  metodo text,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Cotizaciones y ventas
-- ---------------------------------------------------------------------
create table public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  cliente_id uuid references public.clientes(id),
  cliente_datos jsonb,               -- copia de nombre, RFC, teléfono y dirección al cotizar
  lista_precio text,
  vendedor_id uuid references public.colaboradores(id),
  subtotal numeric not null default 0,
  descuento jsonb,
  descuento_monto numeric not null default 0,
  iva numeric not null default 0,
  total numeric not null default 0,
  vigencia_dias integer,
  vence_el date,
  estado text not null default 'Borrador',
  oculta_iva boolean not null default false,
  notas text,
  venta_id uuid,
  creado_por text,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, folio)
);

create table public.cotizacion_partidas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  producto_id uuid references public.productos(id),
  sku text,
  nombre text not null,
  cantidad numeric not null,
  unidad text,
  precio_unitario numeric not null,
  descuento jsonb,
  importe numeric not null
);

create table public.caja_sesiones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  abierta_por text,
  fondo_inicial numeric not null default 0,
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  cerrada_por text,
  efectivo_contado numeric,
  diferencia numeric,
  conteo jsonb,
  notas text,
  unique (empresa_id, folio)
);

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  fecha timestamptz not null default now(),
  cliente_id uuid references public.clientes(id),
  cliente_datos jsonb,
  vendedor_id uuid references public.colaboradores(id),
  lista_precio text,
  tipo text not null default 'Mostrador',
  entrega text not null default 'Mostrador',      -- Mostrador, A domicilio, Contra entrega
  estado text not null default 'Pagada' check (estado in ('Pagada', 'Pendiente', 'Cancelada')),
  subtotal numeric not null default 0,
  descuento jsonb,
  descuento_monto numeric not null default 0,
  iva numeric not null default 0,
  total numeric not null default 0,
  anticipo numeric not null default 0,
  cotizacion_id uuid references public.cotizaciones(id),
  caja_sesion_id uuid references public.caja_sesiones(id),
  ruta_id uuid,
  oculta_iva boolean not null default false,
  -- Partidas que faltó surtir (backorder): no se cobraron y quedan por entregar
  pendiente_entrega jsonb,
  notas text,
  creado_por text,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, folio)
);
create index on public.ventas (empresa_id, fecha);

create table public.venta_partidas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venta_id uuid not null references public.ventas(id) on delete cascade,
  producto_id uuid references public.productos(id),
  sku text,
  nombre text not null,
  cantidad numeric not null,
  cantidad_surtida numeric not null default 0,
  unidad text,
  precio_unitario numeric not null,
  costo_unitario numeric,
  descuento jsonb,
  importe numeric not null,
  componentes jsonb                  -- piezas de un kit
);

create table public.venta_pagos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venta_id uuid references public.ventas(id) on delete cascade,
  cliente_id uuid references public.clientes(id),
  metodo text not null,              -- Efectivo, Tarjeta, Transferencia, Saldo a favor…
  monto numeric not null,
  recibido numeric,
  cambio numeric,
  referencia text,
  caja_sesion_id uuid references public.caja_sesiones(id),
  recibido_por text,
  creado_en timestamptz not null default now()
);

create table public.caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  caja_sesion_id uuid not null references public.caja_sesiones(id) on delete cascade,
  tipo text not null,                -- Retiro, Gasto, Ingreso, Viáticos de ruta…
  metodo text,                       -- vacío = efectivo
  monto numeric not null,
  concepto text,
  usuario text,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Surtido y rutas
-- ---------------------------------------------------------------------
create table public.rutas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  chofer text,
  vehiculo text,
  estado text not null default 'Planeada',
  fecha_salida timestamptz,
  fecha_cierre timestamptz,
  efectivo_inicial numeric not null default 0,
  efectivo_entregado numeric,
  gastos jsonb,
  notas text,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, folio)
);
alter table public.ventas add constraint ventas_ruta_fk foreign key (ruta_id) references public.rutas(id);

create table public.ruta_paradas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ruta_id uuid not null references public.rutas(id) on delete cascade,
  venta_id uuid references public.ventas(id),
  orden integer not null default 0,
  estado text not null default 'Pendiente',
  cobrado numeric,
  metodo_cobro text,
  motivo_faltante text,
  monto_faltante numeric,
  entregado_en timestamptz
);

create table public.ordenes_surtido (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  tipo text not null default 'Surtido' check (tipo in ('Surtido', 'Recepción')),
  venta_id uuid references public.ventas(id),
  cotizacion_id uuid references public.cotizaciones(id),
  compra_id uuid,
  cliente_datos jsonb,
  total numeric not null default 0,
  estado text not null default 'Por surtir',
  entrega text,
  partidas jsonb not null default '[]'::jsonb,
  surtido_por text,
  entregado_a text,
  entregado_en timestamptz,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, folio)
);

-- ---------------------------------------------------------------------
-- Compras y cuentas por pagar
-- ---------------------------------------------------------------------
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  proveedor_id uuid references public.proveedores(id),
  proveedor_nombre text,
  estado text not null default 'Borrador',
  origen text,
  factura_proveedor text,
  subtotal numeric not null default 0,
  iva numeric not null default 0,
  total numeric not null default 0,
  fecha_compra timestamptz not null default now(),
  fecha_recepcion timestamptz,
  recibido_por text,
  estado_pago text not null default 'Por pagar' check (estado_pago in ('Por pagar', 'Parcial', 'Pagada')),
  fecha_limite_pago date,
  notas text,
  creado_por text,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, folio)
);
alter table public.ordenes_surtido add constraint ordenes_compra_fk foreign key (compra_id) references public.compras(id);

create table public.compra_partidas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  compra_id uuid not null references public.compras(id) on delete cascade,
  producto_id uuid references public.productos(id),
  sku text,
  nombre text not null,
  cantidad numeric not null,
  cantidad_recibida numeric not null default 0,
  costo_unitario numeric not null,
  importe numeric not null
);

create table public.pagos_proveedor (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  proveedor_id uuid not null references public.proveedores(id),
  compra_id uuid references public.compras(id),
  monto numeric not null,
  metodo text,
  referencia text,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Devoluciones, bancos, prospectos
-- ---------------------------------------------------------------------
create table public.devoluciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folio text not null,
  venta_id uuid references public.ventas(id),
  cliente_id uuid references public.clientes(id),
  motivo text,
  resolucion text,                   -- Reembolso, Saldo a favor, Descuento al saldo
  total numeric not null default 0,
  reembolso numeric not null default 0,
  aplicado_saldo numeric not null default 0,
  autorizado_por text,
  partidas jsonb not null default '[]'::jsonb,
  creado_por text,
  legacy_id text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, folio)
);

create table public.cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  banco text not null,
  terminacion text,
  alias text,
  saldo_inicial numeric not null default 0,
  activa boolean not null default true
);

create table public.terminales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  cuenta_id uuid references public.cuentas_bancarias(id),
  comision_pct numeric not null default 0,
  comision_con_iva boolean not null default true,
  predeterminada boolean not null default false
);

create table public.movimientos_bancarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cuenta_id uuid not null references public.cuentas_bancarias(id),
  tipo text not null,
  concepto text,
  bruto numeric not null,
  comision numeric not null default 0,
  neto numeric not null,
  estado text not null default 'Por confirmar' check (estado in ('Por confirmar', 'Confirmado')),
  referencia text,
  origen text,                       -- venta, depósito de corte, nómina, manual…
  origen_id uuid,
  fecha timestamptz not null default now()
);

-- Prospectos (formulario de la página web: se puede registrar sin sesión)
create table public.prospectos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre_negocio text,
  nombre_contacto text,
  telefono text,
  correo text,
  ciudad text,
  origen text not null default 'web',
  estado text not null default 'Nuevo',
  notas text,
  legacy_id text,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Bitácora de auditoría
-- ---------------------------------------------------------------------
create table public.bitacora (
  id bigint generated always as identity primary key,
  empresa_id uuid references public.empresas(id) on delete cascade,
  tabla text not null,
  operacion text not null,
  registro_id text,
  antes jsonb,
  despues jsonb,
  usuario uuid default auth.uid(),
  usuario_nombre text,
  creado_en timestamptz not null default now()
);
create index on public.bitacora (empresa_id, creado_en);

create or replace function app.registrar_bitacora()
returns trigger language plpgsql security definer set search_path = public as $$
declare fila jsonb := to_jsonb(coalesce(new, old)) - 'pin_hash';
begin
  insert into bitacora (empresa_id, tabla, operacion, registro_id, antes, despues)
  values (
    (fila ->> 'empresa_id')::uuid,
    tg_table_name,
    tg_op,
    fila ->> 'id',
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'pin_hash' end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'pin_hash' end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'productos', 'producto_precios', 'clientes', 'proveedores', 'cotizaciones', 'ventas', 'venta_pagos',
    'compras', 'devoluciones', 'caja_sesiones', 'caja_movimientos', 'colaboradores', 'roles', 'listas_precio',
    'movimientos_bancarios', 'pagos_proveedor'
  ] loop
    execute format('create trigger bitacora after insert or update or delete on public.%I for each row execute function app.registrar_bitacora()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RLS: protección por empresa en TODAS las tablas
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  -- Tablas de operación: cualquier colaborador activo de la empresa
  foreach t in array array[
    'categorias', 'listas_precio', 'proveedores', 'productos', 'producto_precios', 'kits', 'kit_componentes',
    'inventario_movimientos', 'clientes', 'monedero_movimientos', 'cotizaciones', 'cotizacion_partidas',
    'caja_sesiones', 'ventas', 'venta_partidas', 'venta_pagos', 'caja_movimientos', 'rutas', 'ruta_paradas',
    'ordenes_surtido', 'compras', 'compra_partidas', 'pagos_proveedor', 'devoluciones', 'cuentas_bancarias',
    'terminales', 'movimientos_bancarios', 'prospectos', 'folios'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy miembros on public.%I for all to authenticated using (app.es_miembro(empresa_id)) with check (app.es_miembro(empresa_id))', t);
  end loop;
end $$;

-- El kardex no se edita ni se borra: solo se agregan movimientos
drop policy miembros on public.inventario_movimientos;
create policy leer on public.inventario_movimientos for select to authenticated using (app.es_miembro(empresa_id));
create policy agregar on public.inventario_movimientos for insert to authenticated with check (app.es_miembro(empresa_id));

-- Empresas: los miembros la ven; solo el administrador la edita
alter table public.empresas enable row level security;
create policy ver on public.empresas for select to authenticated using (app.es_miembro(id));
create policy editar on public.empresas for update to authenticated using (app.es_admin(id)) with check (app.es_admin(id));

-- Roles: los miembros los ven; los cambia quien tenga configuracion.roles; el Administrador no se toca
alter table public.roles enable row level security;
create policy ver on public.roles for select to authenticated using (app.es_miembro(empresa_id));
create policy crear on public.roles for insert to authenticated with check (app.tiene_permiso(empresa_id, 'configuracion.roles'));
create policy editar on public.roles for update to authenticated
  using (app.tiene_permiso(empresa_id, 'configuracion.roles') and not bloqueado)
  with check (app.tiene_permiso(empresa_id, 'configuracion.roles') and not bloqueado);
create policy borrar on public.roles for delete to authenticated using (app.tiene_permiso(empresa_id, 'configuracion.roles') and not bloqueado);

-- Colaboradores: todos ven el directorio; los da de alta o edita el administrador
alter table public.colaboradores enable row level security;
create policy ver on public.colaboradores for select to authenticated using (app.es_miembro(empresa_id));
create policy administrar on public.colaboradores for all to authenticated using (app.es_admin(empresa_id)) with check (app.es_admin(empresa_id));

-- Columnas sensibles: el PIN cifrado nunca se lee; sueldo y datos de nómina solo por la vista
revoke select on public.colaboradores from anon, authenticated;
grant select (id, empresa_id, user_id, nombre, puesto, area, rol_id, correo, telefono, tiene_pin, fecha_ingreso, estado,
              comision_pct, meta_mensual, notas, legacy_id, creado_en) on public.colaboradores to authenticated;

-- Directorio con sueldos visibles solo para quien tiene colaboradores.nomina
create view public.colaboradores_directorio as
select id, empresa_id, user_id, nombre, puesto, area, rol_id, correo, telefono, tiene_pin, fecha_ingreso, estado,
       comision_pct, meta_mensual,
       case when app.tiene_permiso(empresa_id, 'colaboradores.nomina') then sueldo end as sueldo,
       case when app.tiene_permiso(empresa_id, 'colaboradores.nomina') then periodicidad end as periodicidad,
       case when app.tiene_permiso(empresa_id, 'colaboradores.nomina') then seguro_social end as seguro_social,
       case when app.tiene_permiso(empresa_id, 'colaboradores.nomina') then banco end as banco
from public.colaboradores
where app.es_miembro(empresa_id);
revoke all on public.colaboradores_directorio from anon;
grant select on public.colaboradores_directorio to authenticated;

-- Bitácora: solo el administrador la consulta; nadie la modifica
alter table public.bitacora enable row level security;
create policy ver on public.bitacora for select to authenticated using (app.es_admin(empresa_id));

-- Página web: registrar prospectos sin sesión (solo insertar, nunca leer)
create policy formulario_web on public.prospectos for insert to anon with check (true);

grant execute on function public.validar_pin(uuid, text), public.asignar_pin(uuid, text), public.siguiente_folio(uuid, text) to authenticated;
revoke execute on function public.validar_pin(uuid, text), public.asignar_pin(uuid, text), public.siguiente_folio(uuid, text) from anon, public;
grant usage on schema app to authenticated, anon;

-- ---------------------------------------------------------------------
-- Alta de empresa (pruebas y clientes nuevos de 99 ERP)
-- Crea la empresa, sus roles base, sus listas de precios y deja al
-- usuario que la crea como Administrador.
-- ---------------------------------------------------------------------
-- Roles base y listas de precios de una empresa nueva
create or replace function app.preparar_empresa(e uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare admin_rol uuid;
begin
  insert into roles (empresa_id, nombre, permisos, descuento_maximo, bloqueado) values
    (e, 'Administrador', '{}', 100, true) returning id into admin_rol;
  insert into roles (empresa_id, nombre, permisos, descuento_maximo) values
    (e, 'Gerente', array['ver.inicio','ver.cotizaciones','ver.ventas','ver.pos','ver.corte','ver.inventario','ver.compras','ver.ordenes','ver.rutas','ver.clientes','ver.colaboradores','ver.reportes','pos.descuentos','ventas.devoluciones','ventas.autorizar','corte.cerrar','compras.aprobar','reportes.utilidades'], 15),
    (e, 'Vendedor', array['ver.inicio','ver.cotizaciones','ver.ventas','ver.pos','ver.inventario','ver.clientes','pos.descuentos'], 5),
    (e, 'Cajero', array['ver.inicio','ver.ventas','ver.pos','ver.corte'], 0),
    (e, 'Almacenista', array['ver.inicio','ver.inventario','ver.ordenes','ver.compras'], 0),
    (e, 'Chofer', array['ver.inicio','ver.rutas'], 0);
  insert into roles (empresa_id, nombre, permisos, bloqueado) values (e, 'Sin acceso', '{}', true);
  insert into listas_precio (empresa_id, clave, nombre, orden, es_publico) values
    (e, 'publico', 'Público', 0, true), (e, 'mayoreo', 'Mayoreo', 1, false);
  return admin_rol;
end;
$$;
revoke execute on function app.preparar_empresa(uuid) from anon, authenticated, public;

create or replace function public.crear_empresa(p_nombre text, p_nombre_admin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; admin_rol uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para crear una empresa'; end if;
  insert into empresas (nombre_comercial) values (p_nombre) returning id into e;
  admin_rol := app.preparar_empresa(e);
  insert into colaboradores (empresa_id, user_id, nombre, puesto, area, rol_id, correo)
  select e, auth.uid(), p_nombre_admin, 'Administrador', 'Administración', admin_rol, u.email
  from auth.users u where u.id = auth.uid();
  return e;
end;
$$;
revoke execute on function public.crear_empresa(text, text) from anon, public;
grant execute on function public.crear_empresa(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Primer acceso de un colaborador ya dado de alta (por ejemplo, migrado):
-- si su correo coincide con el de su cuenta de Supabase Auth, se vincula.
-- ---------------------------------------------------------------------
create or replace function public.reclamar_acceso()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  update colaboradores c set user_id = auth.uid()
  from auth.users u
  where u.id = auth.uid() and c.user_id is null and c.estado = 'Activo'
    and u.email_confirmed_at is not null and lower(c.correo) = lower(u.email)
    and not exists (select 1 from colaboradores x where x.empresa_id = c.empresa_id and x.user_id = auth.uid());
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.reclamar_acceso() from anon, public;
grant execute on function public.reclamar_acceso() to authenticated;

-- Estructura del ERP anterior (solo tablas con datos), generada de information_schema.
create schema if not exists legado;
create table legado.categorias (
  id uuid,
  nombre character varying,
  descripcion text,
  activo boolean,
  creado_en timestamp with time zone
);
create table legado.clientes (
  id uuid,
  nombre_comercial text,
  contacto text,
  telefono text,
  tipo_cliente text,
  tarifa_predeterminada text,
  limite_credito numeric,
  saldo_deudor numeric,
  direccion text,
  notas text,
  created_at timestamp with time zone,
  rfc text,
  razon_social text,
  regimen_fiscal text,
  codigo_postal text,
  uso_cfdi text,
  nombre text,
  codigo_cliente text,
  nombre_negocio text,
  encargado_compras text,
  referencias text,
  tarifa_asignada text,
  vendedor_asignado text,
  tarjeta_plomero_distinguido boolean,
  email text,
  contacto_compras character varying,
  vendedor character varying,
  zona character varying,
  direccion_entrega text,
  inscrito_programa boolean,
  tipo_precio character varying,
  etapa_embudo text,
  codigo_postal_fiscal character varying
);
create table legado.compras (
  id uuid,
  folio_compra text,
  proveedor_id uuid,
  proveedor_nombre text,
  fecha_compra timestamp with time zone,
  fecha_limite_pago date,
  estado_compra text,
  metodo_pago text,
  estado_pago text,
  total numeric,
  notas text,
  created_at timestamp with time zone,
  estado text,
  observaciones text,
  usuario_registro text,
  folio text,
  proveedor text,
  iva numeric,
  numero_factura_proveedor text,
  subtotal numeric,
  partidas jsonb,
  recibido_por character varying,
  observaciones_recepcion text,
  fecha_recepcion timestamp with time zone
);
create table legado.configuracion_empresa (
  id integer,
  nombre_comercial text,
  razon_social text,
  rfc text,
  regimen_fiscal text,
  direccion text,
  telefono text,
  correo text,
  logo_url text,
  updated_at timestamp with time zone
);
create table legado.cotizaciones (
  id uuid,
  folio text,
  cliente_id uuid,
  cliente_codigo text,
  cliente_nombre text,
  tarifa_aplicada text,
  partidas jsonb,
  subtotal numeric,
  descuento_general numeric,
  iva numeric,
  total numeric,
  vigencia_dias integer,
  estado text,
  usuario_registro text,
  observaciones text,
  created_at timestamp with time zone,
  cliente text,
  items jsonb,
  vigencia text,
  vendedor_id integer,
  vendedor_nombre text,
  convertida boolean,
  estatus text,
  cliente_razon_social text,
  cliente_rfc text,
  cliente_telefono text,
  cliente_direccion text,
  hide_tax boolean
);
create table legado.devoluciones (
  id uuid,
  folio text,
  venta_id bigint,
  folio_venta text,
  cliente_nombre text,
  cliente_codigo text,
  total_devolucion numeric,
  motivo text,
  partidas jsonb,
  usuario text,
  created_at timestamp with time zone
);
create table legado.inventario_historial (
  id uuid,
  producto_id uuid,
  tipo_movimiento character varying,
  cantidad numeric,
  stock_anterior numeric,
  stock_nuevo numeric,
  referencia character varying,
  usuario character varying,
  created_at timestamp with time zone
);
create table legado.pedidos (
  id uuid,
  folio character varying,
  cotizacion_id uuid,
  cliente_id text,
  cliente_nombre text,
  cliente_razon_social text,
  cliente_codigo character varying,
  cliente_rfc character varying,
  cliente_telefono character varying,
  cliente_direccion text,
  vendedor_id text,
  vendedor_nombre text,
  subtotal numeric,
  iva numeric,
  total numeric,
  estatus character varying,
  estado_surtido character varying,
  items jsonb,
  created_at timestamp with time zone,
  fecha_surtido timestamp with time zone,
  surtido_por text
);
create table legado.perfiles (
  id uuid,
  nombre text,
  rol text,
  telefono text,
  activo boolean,
  created_at timestamp with time zone,
  email text,
  password text
);
create table legado.perfiles_usuario (
  id uuid,
  nombre text,
  rol text,
  pin text,
  activo boolean,
  created_at timestamp with time zone
);
create table legado.productos (
  id uuid,
  sku text,
  codigo_barras text,
  nombre text,
  descripcion text,
  categoria_id uuid,
  tipo_producto text,
  unidad_medida text,
  costo_compra numeric,
  precio_publico numeric,
  precio_mayoreo numeric,
  tasa_iva numeric,
  stock_actual integer,
  stock_apartado integer,
  stock_minimo integer,
  ubicacion_almacen text,
  activo boolean,
  creado_en timestamp with time zone,
  actualizado_en timestamp with time zone,
  clave_sat text,
  unidad_sat text,
  precio_plomero numeric,
  precio_distribuidor numeric,
  costo_unitario numeric,
  sku_proveedor text,
  categoria text,
  familia text,
  costo numeric,
  tipo_empaque text,
  piezas_por_empaque numeric,
  objeto_impuesto text
);
create table legado.proveedores (
  id uuid,
  nombre_comercial text,
  contacto text,
  telefono text,
  email text,
  dias_credito integer,
  saldo_por_pagar numeric,
  created_at timestamp with time zone,
  codigo_proveedor text,
  rfc text,
  contacto_ventas text,
  razon_social text
);
create table legado.rutas_entrega (
  id bigint,
  created_at timestamp with time zone,
  folio_ruta text,
  chofer text,
  vehiculo text,
  estado text,
  total_pedidos integer,
  total_por_cobrar numeric,
  total_cobrado numeric,
  fecha_salida timestamp with time zone,
  fecha_cierre timestamp with time zone,
  observaciones text,
  efectivo_inicial_gastos numeric
);
create table legado.vendedores (
  id integer,
  nombre text,
  comision_porcentaje numeric,
  activo boolean,
  created_at timestamp with time zone,
  telefono text,
  zona text
);
create table legado.ventas (
  id bigint,
  folio text,
  fecha timestamp with time zone,
  tipo_precio text,
  metodo_pago text,
  total numeric,
  articulos_total integer,
  cliente_id uuid,
  cliente_nombre text,
  tipo_entrega text,
  estado_logistico text,
  chofer_id uuid,
  surtidor_id uuid,
  direccion_entrega text,
  fecha_entrega timestamp with time zone,
  forma_pago text,
  tipo_tarifa text,
  created_at timestamp with time zone,
  cliente_codigo text,
  tarifa_aplicada text,
  descuento_general numeric,
  es_contra_entrega boolean,
  estado text,
  folio_venta text,
  liquidado_por text,
  fecha_liquidacion timestamp with time zone,
  comprobante_pago_chofer text,
  observaciones text,
  usuario_registro text,
  partidas jsonb,
  estado_surtido text,
  surtido_por text,
  fecha_surtido timestamp with time zone,
  ruta_id bigint,
  cobrado_en_ruta boolean,
  metodo_cobro_ruta text,
  partidas_surtidas jsonb,
  partidas_backorder jsonb,
  iva numeric,
  subtotal numeric,
  cliente text,
  referencia text,
  anticipo numeric,
  items jsonb,
  vendedor_id integer,
  vendedor_nombre text,
  cliente_razon_social text,
  cliente_rfc text,
  cliente_telefono text,
  cliente_direccion text,
  hide_tax boolean,
  payment_status character varying,
  payment_type character varying,
  amount_received numeric,
  change_given numeric
);
create table legado.ventas_detalle (
  id bigint,
  venta_id bigint,
  producto_id uuid,
  sku text,
  nombre text,
  cantidad integer,
  precio_unitario numeric,
  subtotal numeric,
  cantidad_surtida integer
);
create table legado.web_leads (
  id uuid,
  nombre_negocio character varying,
  nombre_contacto character varying,
  telefono character varying,
  email character varying,
  ciudad character varying,
  origen character varying,
  estado character varying,
  notas text,
  created_at timestamp with time zone
);
create table legado.web_cotizaciones (
  id uuid,
  folio integer,
  cliente_id uuid,
  lead_id uuid,
  estado character varying,
  subtotal numeric,
  descuento numeric,
  total numeric,
  notas_cliente text,
  notas_internas text,
  created_at timestamp with time zone
);
create table legado.web_cotizaciones_items (
  id uuid,
  cotizacion_id uuid,
  producto_id uuid,
  cantidad integer,
  precio_unitario numeric,
  created_at timestamp with time zone
);
create table legado.auditoria_logs (
  id uuid,
  tabla text,
  operacion text,
  registro_id text,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuario text,
  created_at timestamp with time zone
);
create table legado.crm_whatsapp_templates (
  id uuid,
  title character varying,
  message_body text,
  created_at timestamp with time zone
);
create table legado.facturas (
  id uuid,
  cliente_id uuid,
  folio integer,
  subtotal numeric,
  iva numeric,
  total numeric,
  estado text,
  uuid_fiscal text,
  xml_url text,
  pdf_url text,
  created_at timestamp with time zone
);

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

-- Ventas que el negocio confirmó como YA cobradas (por ejemplo, las "entregadas" del sistema anterior).
-- Se llena a mano antes del cambio definitivo:  insert into migracion.ventas_cobradas_confirmadas values ('NV-142743');
create table if not exists migracion.ventas_cobradas_confirmadas (folio text primary key);

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
              when exists (select 1 from migracion.ventas_cobradas_confirmadas k where k.folio in (v.folio, v.folio_venta)) then 'Pagada'
              when lower(coalesce(v.estado, '')) in ('completada', 'pagada', 'pagado', 'liquidada', 'liquidado', 'cobrada')
                or lower(coalesce(v.payment_status, '')) in ('paid', 'pagado', 'pagada', 'completed')
                or v.fecha_liquidacion is not null or coalesce(v.cobrado_en_ruta, false) then 'Pagada'
              when lower(coalesce(v.estado, '')) like 'entreg%' then 'Pendiente'   -- entregada pero sin liquidar en caja
              when lower(coalesce(v.estado, '')) like 'pend%' or lower(coalesce(v.payment_status, '')) like 'pend%'
                or lower(coalesce(v.metodo_pago, v.forma_pago, '')) like '%cr_dito%' or coalesce(v.es_contra_entrega, false) then 'Pendiente'
              else 'Pagada' end,
         coalesce(v.subtotal, 0), coalesce(v.descuento_general, 0), coalesce(v.iva, 0), coalesce(v.total, 0), coalesce(v.anticipo, 0),
         (select r.id from rutas r where r.empresa_id = e and r.legacy_id = v.ruta_id::text),
         coalesce(v.hide_tax, false), nullif(concat_ws(E'\n', v.observaciones, v.referencia), ''), coalesce(v.usuario_registro, v.vendedor_nombre),
         v.id::text, coalesce(v.created_at, v.fecha, now())
  from legado.ventas v;

  -- Partidas: ventas_detalle es la fuente principal; si una venta no tiene detalle, se usan sus JSON.
  -- En surtidos parciales, ventas_detalle trae lo PEDIDO y partidas_backorder lo que faltó surtir:
  -- la partida queda con lo surtido y cobrado (pedido − pendiente) y lo pendiente se guarda en la venta.
  insert into venta_partidas (empresa_id, venta_id, producto_id, sku, nombre, cantidad, cantidad_surtida, unidad, precio_unitario, costo_unitario, importe)
  select e, n.id, p.id, coalesce(d.sku, p.sku), coalesce(d.nombre, p.nombre, 'Partida'),
         greatest(coalesce(d.cantidad, 1) - coalesce(b.cantidad, 0), 0),
         greatest(coalesce(d.cantidad, 1) - coalesce(b.cantidad, 0), 0),
         p.unidad_venta, coalesce(d.precio_unitario, 0), p.costo,
         round(greatest(coalesce(d.subtotal, coalesce(d.cantidad, 1) * coalesce(d.precio_unitario, 0)) - coalesce(b.importe, 0), 0), 2)
  from legado.ventas_detalle d
  join ventas n on n.empresa_id = e and n.legacy_id = d.venta_id::text
  left join productos p on p.empresa_id = e and p.id = d.producto_id
  left join lateral (
    select sum(coalesce(migracion.num(x, 'cantidad'), 0)) cantidad,
           sum(coalesce(migracion.num(x, 'subtotal', 'importe'), migracion.num(x, 'cantidad') * migracion.num(x, 'precio_unitario', 'precioVenta', 'precio'), 0)) importe
    from legado.ventas lv
    cross join lateral jsonb_array_elements(case when jsonb_typeof(lv.partidas_backorder) = 'array' then lv.partidas_backorder else '[]'::jsonb end) x
    where lv.id = d.venta_id
      and (coalesce(x ->> 'producto_id', x ->> 'id') = d.producto_id::text or (d.producto_id is null and x ->> 'sku' = d.sku))
  ) b on true;

  -- En el sistema anterior lo que faltó surtir se cancelaba: se conserva marcado así
  update ventas n set pendiente_entrega = (select jsonb_agg(x || jsonb_build_object('estado', 'Cancelado en el sistema anterior')) from jsonb_array_elements(lv.partidas_backorder) x)
  from legado.ventas lv
  where n.empresa_id = e and n.legacy_id = lv.id::text
    and jsonb_typeof(lv.partidas_backorder) = 'array' and jsonb_array_length(lv.partidas_backorder) > 0;

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
