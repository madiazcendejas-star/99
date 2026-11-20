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
  compra_id uuid,
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
create or replace function public.crear_empresa(p_nombre text, p_nombre_admin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e uuid; admin_rol uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para crear una empresa'; end if;
  insert into empresas (nombre_comercial) values (p_nombre) returning id into e;
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
  insert into colaboradores (empresa_id, user_id, nombre, puesto, area, rol_id, correo)
  select e, auth.uid(), p_nombre_admin, 'Administrador', 'Administración', admin_rol, u.email
  from auth.users u where u.id = auth.uid();
  return e;
end;
$$;
revoke execute on function public.crear_empresa(text, text) from anon, public;
grant execute on function public.crear_empresa(text, text) to authenticated;
