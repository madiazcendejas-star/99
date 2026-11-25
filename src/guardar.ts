// Guarda en Supabase los cambios que se hacen en la app (modo conectado).
// En modo demostración todas las funciones no hacen nada.
import type { Collaborator } from "./CollaboratorsModule";
import type { CompanyConfig, Policies } from "./config";
import type { Customer } from "./CustomersModule";
import { LIVE, esUuid } from "./entorno";
import type { InventoryProduct } from "./InventoryModule";
import type { Supplier } from "./PurchasesModule";
import type { Role } from "./RolesModule";
import { insert, remove, rpc, select, update } from "./supabase";

type Row = Record<string, any>;

/** Datos de la empresa con sesión, para traducir nombres de la app a ids de la base */
const ctx = {
  empresaId: "",
  listas: new Map<string, string>(), // clave → id
  categorias: new Map<string, string>(), // nombre → id
  proveedores: new Map<string, string>(), // nombre → id
  roles: new Map<string, string>(), // nombre → id
};

export async function prepararGuardado(empresaId: string) {
  if (!LIVE) return;
  ctx.empresaId = empresaId;
  const f = `empresa_id=eq.${empresaId}`;
  const [listas, categorias, proveedores, roles] = await Promise.all([
    select<Row>("listas_precio", `select=id,clave&${f}`),
    select<Row>("categorias", `select=id,nombre&${f}`),
    select<Row>("proveedores", `select=id,nombre_comercial&${f}`),
    select<Row>("roles", `select=id,nombre&${f}`),
  ]);
  ctx.listas = new Map(listas.map((l) => [l.clave, l.id]));
  ctx.categorias = new Map(categorias.map((c) => [c.nombre.toLowerCase(), c.id]));
  ctx.proveedores = new Map(proveedores.map((p) => [p.nombre_comercial.toLowerCase(), p.id]));
  ctx.roles = new Map(roles.map((r) => [r.nombre, r.id]));
}

const nul = (v: unknown) => (v === "" || v === undefined ? null : v);

async function categoriaId(nombre?: string) {
  const n = (nombre ?? "").trim();
  if (!n || n === "Sin categoría") return null;
  const hit = ctx.categorias.get(n.toLowerCase());
  if (hit) return hit;
  const [row] = await insert<Row>("categorias", { empresa_id: ctx.empresaId, nombre: n }, { upsertOn: "empresa_id,nombre" });
  ctx.categorias.set(n.toLowerCase(), row.id);
  return row.id as string;
}

const proveedorId = (nombre?: string) => (nombre ? (ctx.proveedores.get(nombre.toLowerCase()) ?? null) : null);

// ------------------------------------------------------------------ Productos
const productoFila = async (p: InventoryProduct) => ({
  id: p.id,
  empresa_id: ctx.empresaId,
  sku: p.sku,
  codigo_barras: nul(p.barcode),
  nombre: p.name,
  descripcion: nul(p.description),
  categoria_id: await categoriaId(p.category),
  familia: nul(p.family),
  marca: nul(p.brand),
  unidad_base: p.baseUnit || "pieza",
  unidad_venta: p.saleUnit || "pieza",
  conversion: p.conversion || 1,
  stock_minimo: p.minimumStock || 0,
  stock_maximo: p.maximumStock || 0,
  costo: p.cost || 0,
  precio_publico: p.retailPrice || 0,
  tasa_iva: p.tax ?? 16,
  clave_sat: nul(p.satKey),
  unidad_sat: nul(p.satUnit),
  pasillo: nul(p.aisle),
  estante: nul(p.shelf),
  proveedor_id: proveedorId(p.supplier),
  sku_proveedor: nul(p.supplierSku),
  empaque: nul(p.packaging),
  piezas_por_empaque: p.piecesPerPack || null,
  activo: p.status !== "Inactivo",
  actualizado_en: new Date().toISOString(),
});

async function guardarPrecios(products: InventoryProduct[]) {
  const rows = products.flatMap((p) =>
    Object.entries(p.prices ?? {})
      .filter(([clave, precio]) => ctx.listas.has(clave) && precio > 0)
      .map(([clave, precio]) => ({ empresa_id: ctx.empresaId, producto_id: p.id, lista_id: ctx.listas.get(clave), precio })),
  );
  if (rows.length) await insert("producto_precios", rows, { upsertOn: "producto_id,lista_id", minimal: true });
}

/** Alta de productos (uno o muchos, por ejemplo al importar el catálogo). La existencia inicial entra como movimiento de kardex. */
export async function altaProductos(products: InventoryProduct[], usuario: string) {
  if (!LIVE || !products.length) return;
  for (let i = 0; i < products.length; i += 200) {
    const lote = products.slice(i, i + 200);
    await insert("productos", await Promise.all(lote.map(async (p) => ({ ...(await productoFila(p)), existencia: 0 }))));
    await guardarPrecios(lote);
    const iniciales = lote.filter((p) => p.stock > 0);
    if (iniciales.length)
      await insert(
        "inventario_movimientos",
        iniciales.map((p) => ({ empresa_id: ctx.empresaId, producto_id: p.id, tipo: "Inventario inicial", cantidad: p.stock, referencia: "Alta de producto", usuario })),
      );
  }
}

/** Cambios a un producto (la existencia solo cambia con movimientos) */
export async function guardarProducto(p: InventoryProduct) {
  if (!LIVE) return;
  const { id, empresa_id: _e, ...patch } = await productoFila(p);
  await update("productos", `id=eq.${id}`, patch);
  await guardarPrecios([p]);
}

/** Movimiento de inventario: el trigger de la base actualiza la existencia */
export async function movimientoInventario(p: InventoryProduct, tipo: string, cantidad: number, referencia: string, usuario: string, nuevoCosto?: number) {
  if (!LIVE || !cantidad) return;
  await insert("inventario_movimientos", { empresa_id: ctx.empresaId, producto_id: p.id, tipo, cantidad, referencia, usuario });
  if (nuevoCosto !== undefined) await update("productos", `id=eq.${p.id}`, { costo: Math.round(nuevoCosto * 10000) / 10000 });
}

// ------------------------------------------------------------------ Clientes y proveedores
export async function guardarCliente(c: Customer, colaboradores: Collaborator[]) {
  if (!LIVE) return;
  const fila = {
    id: c.id,
    empresa_id: ctx.empresaId,
    nombre: c.businessName,
    contacto: nul(c.contactName),
    telefono: nul(c.phone),
    correo: nul(c.email),
    tipo: c.type,
    lista_precio_id: c.priceList ? (ctx.listas.get(c.priceList) ?? null) : null,
    direccion: nul(c.address),
    ciudad: nul(c.city),
    zona: nul(c.zone),
    vendedor_id: colaboradores.find((k) => k.name === c.salesRep)?.id ?? null,
    dias_credito: c.creditDays || 0,
    limite_credito: c.creditLimit || 0,
    razon_social: nul(c.legalName),
    rfc: nul(c.rfc),
    regimen_fiscal: nul(c.taxRegime),
    uso_cfdi: nul(c.cfdiUse),
    cp_fiscal: nul(c.fiscalZip),
    programa_plomero: !!c.plumberProgram,
    notas: nul(c.notes),
  };
  await insert("clientes", fila, { upsertOn: "id", minimal: true });
}

export async function guardarProveedor(s: Supplier) {
  if (!LIVE) return;
  await insert(
    "proveedores",
    {
      id: s.id,
      empresa_id: ctx.empresaId,
      nombre_comercial: s.name,
      contacto: nul(s.contact),
      telefono: nul(s.phone),
      correo: nul(s.email),
      rfc: nul(s.rfc),
      dias_credito: s.creditDays || 0,
      notas: nul([s.notes, s.address, s.city].filter(Boolean).join(" · ")),
    },
    { upsertOn: "id" },
  );
  ctx.proveedores.set(s.name.toLowerCase(), s.id);
}

// ------------------------------------------------------------------ Empresa, políticas y listas de precios
export async function guardarEmpresa(c: CompanyConfig, p: Policies) {
  if (!LIVE) return;
  const { priceLists, ...politicas } = p;
  await update("empresas", `id=eq.${ctx.empresaId}`, {
    nombre_comercial: c.commercialName,
    razon_social: nul(c.legalName),
    rfc: nul(c.rfc),
    regimen_fiscal: nul(c.taxRegime),
    telefono: nul(c.phone),
    correo: nul(c.email),
    sitio_web: nul(c.website),
    calle: nul(c.street),
    ciudad: nul(c.city),
    estado: nul(c.state),
    codigo_postal: nul(c.postalCode),
    sucursal: nul(c.branch),
    almacen: nul(c.warehouse),
    logo_url: nul(c.logo),
    politicas,
  });
  // Listas de precios: alta y cambio de nombre; las que se quitan dejan a sus clientes en precio de mostrador
  const filas = priceLists.map((l, i) => ({ empresa_id: ctx.empresaId, clave: l.id, nombre: l.name, orden: i, es_publico: i === 0 }));
  const guardadas = await insert<Row>("listas_precio", filas, { upsertOn: "empresa_id,clave" });
  guardadas.forEach((l) => ctx.listas.set(l.clave, l.id));
  const quitar = [...ctx.listas.entries()].filter(([clave]) => !priceLists.some((l) => l.id === clave));
  for (const [clave, id] of quitar) {
    await update("clientes", `lista_precio_id=eq.${id}`, { lista_precio_id: null });
    await remove("listas_precio", `id=eq.${id}`);
    ctx.listas.delete(clave);
  }
}

// ------------------------------------------------------------------ Roles y colaboradores (solo Administrador, lo exige la base)
export async function guardarRol(r: Role) {
  if (!LIVE || r.locked) return;
  const [row] = await insert<Row>(
    "roles",
    { id: esUuid(r.id) ? r.id : undefined, empresa_id: ctx.empresaId, nombre: r.name, permisos: r.permissions, descuento_maximo: r.maxDiscount ?? 0 },
    { upsertOn: "id" },
  );
  ctx.roles.set(r.name, row.id);
}

export async function eliminarRol(r: Role) {
  if (!LIVE || r.locked) return;
  const sinAcceso = ctx.roles.get("Sin acceso");
  if (sinAcceso) await update("colaboradores", `rol_id=eq.${r.id}`, { rol_id: sinAcceso });
  await remove("roles", `id=eq.${r.id}`);
  ctx.roles.delete(r.name);
}

export async function guardarColaborador(c: Collaborator) {
  if (!LIVE) return;
  await insert(
    "colaboradores",
    {
      id: c.id,
      empresa_id: ctx.empresaId,
      nombre: c.name,
      puesto: nul(c.position),
      area: c.area,
      rol_id: ctx.roles.get(c.role) ?? ctx.roles.get("Sin acceso"),
      correo: nul(c.email?.toLowerCase()),
      telefono: nul(c.phone),
      fecha_ingreso: nul(c.startISO),
      estado: c.status,
      sueldo: c.salary || 0,
      periodicidad: c.frequency,
      seguro_social: c.socialSecurity,
      comision_pct: c.commissionRate || 0,
      meta_mensual: c.monthlyGoal || 0,
      banco: nul(c.bank),
      notas: nul(c.notes),
    },
    { upsertOn: "id", minimal: true },
  );
  if (c.pin && /^\d{4}$/.test(c.pin)) await rpc("asignar_pin", { p_colaborador: c.id, p_pin: c.pin });
}
