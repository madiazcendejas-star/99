// Carga los datos reales de la empresa desde Supabase y los convierte a los tipos de la app.
import type { Collaborator, Area } from "./CollaboratorsModule";
import type { CompanyConfig, Policies, PriceList } from "./config";
import { initialPolicies } from "./config";
import type { Customer, CustomerType } from "./CustomersModule";
import { fechaTexto } from "./entorno";
import type { InventoryProduct } from "./InventoryModule";
import type { PurchaseOrder, PurchaseStatus, Supplier } from "./PurchasesModule";
import { ALL_PERMISSIONS, type PermissionKey, type Role } from "./RolesModule";
import type { PayMethod, Sale } from "./SalesModule";
import { pendingAmount } from "./SalesModule";
import { rpc, select } from "./supabase";

type Row = Record<string, any>;

export type QuoteData = {
  id: string;
  client: string;
  contact: string;
  amount: number;
  items: number;
  date: string;
  issuedAt: string;
  expiresAt: string;
  validUntil: string;
  status: "Borrador" | "Enviada" | "Aceptada" | "Vencida";
  owner: string;
  phone?: string;
  priceList?: string;
  lines: { sku: string; name: string; quantity: number; unit: string; unitPrice: number; total: number }[];
  subtotal?: number;
  tax?: number;
  notes?: string;
  discountAmount?: number;
};

export type DatosEmpresa = {
  empresaId: string;
  usuarioId: string;
  company: CompanyConfig;
  policies: Policies;
  roles: Role[];
  collaborators: Collaborator[];
  products: InventoryProduct[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  quotes: QuoteData[];
  purchases: PurchaseOrder[];
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const hora = (ts?: string) => (ts ? new Date(ts).toTimeString().slice(0, 5) : "");
const isoLocal = (ts?: string) => {
  if (!ts) return "";
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const metodo = (m?: string): PayMethod => {
  const t = (m ?? "").toLowerCase();
  if (t.includes("tarj")) return "Tarjeta";
  if (t.includes("transf")) return "Transferencia";
  if (t.includes("saldo")) return "Saldo a favor";
  if (t.includes("antic")) return "Anticipo";
  return "Efectivo";
};

const area = (puesto?: string, areaTxt?: string): Area => {
  const t = `${areaTxt ?? ""} ${puesto ?? ""}`.toLowerCase();
  if (t.includes("almac")) return "Almacén";
  if (t.includes("caja")) return "Caja";
  if (t.includes("chofer") || t.includes("reparto")) return "Reparto";
  if (t.includes("admin")) return "Administración";
  return "Ventas";
};

const compraEstado = (e?: string): PurchaseStatus => {
  const t = (e ?? "").toLowerCase();
  if (t.startsWith("recib")) return "Recibida";
  if (t.startsWith("cancel")) return "Cancelada";
  if (t.startsWith("borr")) return "Borrador";
  if (t.startsWith("aprob")) return "Aprobada";
  return "Enviada";
};

/** Primer acceso: vincula al usuario con su colaborador (por correo) y carga todo */
export async function cargarEmpresa(userId: string): Promise<DatosEmpresa> {
  await rpc("reclamar_acceso").catch(() => 0);

  const [yo] = await select<Row>("colaboradores", `select=id,empresa_id,nombre&user_id=eq.${userId}&estado=eq.Activo`);
  if (!yo) throw new Error("Tu usuario todavía no está dado de alta como colaborador de ninguna empresa. Pide al administrador que te registre con este correo.");
  const e = yo.empresa_id as string;
  const porEmpresa = `empresa_id=eq.${e}`;

  const [empresas, roles, colabs, listas, categorias, proveedores, productos, clientes, ventas, cotizaciones, compras] = await Promise.all([
    select<Row>("empresas", `select=*&id=eq.${e}`),
    select<Row>("roles", `select=*&${porEmpresa}`),
    select<Row>("colaboradores_directorio", `select=*&${porEmpresa}`),
    select<Row>("listas_precio", `select=*&${porEmpresa}&order=orden`),
    select<Row>("categorias", `select=id,nombre&${porEmpresa}`),
    select<Row>("proveedores", `select=*&${porEmpresa}&order=nombre_comercial`),
    select<Row>("productos", `select=*,producto_precios(precio,lista_id)&${porEmpresa}&order=nombre`),
    select<Row>("clientes", `select=*&${porEmpresa}&order=nombre`),
    select<Row>("ventas", `select=*,venta_partidas(*),venta_pagos(*)&${porEmpresa}&order=fecha.desc`),
    select<Row>("cotizaciones", `select=*,cotizacion_partidas(*)&${porEmpresa}&order=creado_en.desc`),
    select<Row>("compras", `select=*,compra_partidas(*)&${porEmpresa}&order=fecha_compra.desc`),
  ]);
  const emp = empresas[0] ?? {};

  // ---- Empresa y políticas
  const priceLists: PriceList[] = listas.map((l) => ({ id: l.clave, name: l.nombre }));
  const company: CompanyConfig = {
    commercialName: emp.nombre_comercial ?? "",
    legalName: emp.razon_social ?? "",
    rfc: emp.rfc ?? "",
    taxRegime: emp.regimen_fiscal ?? "",
    phone: emp.telefono ?? "",
    email: emp.correo ?? "",
    website: emp.sitio_web ?? "",
    street: emp.calle ?? "",
    city: emp.ciudad ?? "",
    state: emp.estado ?? "",
    postalCode: emp.codigo_postal ?? "",
    branch: emp.sucursal ?? "Sucursal principal",
    warehouse: emp.almacen ?? "Almacén principal",
    logo: emp.logo_url ?? "",
  };
  const guardadas = (emp.politicas ?? {}) as Partial<Policies>;
  const policies: Policies = { ...initialPolicies, ...guardadas, priceLists: priceLists.length ? priceLists : initialPolicies.priceLists };

  // ---- Roles y colaboradores
  const roleName = new Map(roles.map((r) => [r.id, r.nombre as string]));
  const appRoles: Role[] = roles.map((r) => ({
    id: r.id,
    name: r.nombre,
    description: r.nombre === "Administrador" ? "Acceso total al sistema. No se puede modificar." : "",
    locked: !!r.bloqueado,
    permissions: (r.nombre === "Administrador" ? ALL_PERMISSIONS : (r.permisos ?? [])) as PermissionKey[],
    maxDiscount: num(r.descuento_maximo),
  }));
  const collaborators: Collaborator[] = colabs.map((c) => ({
    id: c.id,
    name: c.nombre,
    position: c.puesto ?? "",
    area: area(c.puesto, c.area),
    role: roleName.get(c.rol_id) ?? "Sin acceso",
    phone: c.telefono ?? "",
    email: c.correo ?? "",
    startISO: c.fecha_ingreso ?? "",
    status: c.estado === "Baja" ? "Baja" : "Activo",
    salary: num(c.sueldo),
    frequency: c.periodicidad ?? "Quincenal",
    socialSecurity: c.seguro_social ?? false,
    commissionRate: num(c.comision_pct),
    monthlyGoal: num(c.meta_mensual),
    bank: c.banco ?? "",
    emergencyContact: "",
    notes: "",
  }));
  const colabName = new Map(colabs.map((c) => [c.id, c.nombre as string]));

  // ---- Catálogos
  const listaClave = new Map(listas.map((l) => [l.id, l.clave as string]));
  const catName = new Map(categorias.map((c) => [c.id, c.nombre as string]));
  const provName = new Map(proveedores.map((p) => [p.id, p.nombre_comercial as string]));
  const products: InventoryProduct[] = productos.map((p) => {
    const prices: Record<string, number> = {};
    (p.producto_precios ?? []).forEach((pp: Row) => {
      const clave = listaClave.get(pp.lista_id);
      if (clave) prices[clave] = num(pp.precio);
    });
    const retail = num(p.precio_publico);
    return {
      id: p.id,
      sku: p.sku,
      barcode: p.codigo_barras ?? "",
      name: p.nombre,
      category: catName.get(p.categoria_id) ?? "Sin categoría",
      brand: p.marca ?? "",
      description: p.descripcion ?? "",
      baseUnit: p.unidad_base ?? "pieza",
      saleUnit: p.unidad_venta ?? "pieza",
      conversion: num(p.conversion) || 1,
      stock: num(p.existencia),
      reserved: num(p.apartado),
      minimumStock: num(p.stock_minimo),
      maximumStock: num(p.stock_maximo),
      cost: num(p.costo),
      retailPrice: retail,
      wholesalePrice: prices.mayoreo || retail,
      contractorPrice: prices.plomero || retail,
      tax: num(p.tasa_iva),
      aisle: p.pasillo ?? "",
      shelf: p.estante ?? "",
      supplier: provName.get(p.proveedor_id) ?? "",
      status: p.activo === false ? "Inactivo" : "Activo",
      prices,
      satKey: p.clave_sat ?? "",
      satUnit: p.unidad_sat ?? "",
      family: p.familia ?? "",
      supplierSku: p.sku_proveedor ?? "",
      packaging: p.empaque ?? "",
      piecesPerPack: p.piezas_por_empaque ? num(p.piezas_por_empaque) : undefined,
    };
  });
  const suppliers: Supplier[] = proveedores.map((p) => ({
    id: p.id,
    name: p.nombre_comercial,
    contact: p.contacto ?? "",
    phone: p.telefono ?? "",
    email: p.correo ?? "",
    rfc: p.rfc ?? "",
    address: "",
    city: "",
    leadTimeDays: 3,
    creditDays: num(p.dias_credito),
    categories: "",
    notes: p.notas ?? "",
  }));

  // ---- Ventas
  const clienteById = new Map(clientes.map((c) => [c.id, c]));
  const sales: Sale[] = ventas.map((v) => {
    const pagos = (v.venta_pagos ?? []) as Row[];
    const partidas = (v.venta_partidas ?? []) as Row[];
    const nombre = clienteById.get(v.cliente_id)?.nombre ?? v.cliente_datos?.nombre ?? "Público general";
    const pagado = pagos.reduce((s, p) => s + num(p.monto), 0);
    const payments = pagos.map((p) => ({ method: metodo(p.metodo), amount: num(p.monto) }));
    const estado = v.estado as Sale["status"];
    return {
      id: v.folio,
      client: nombre,
      amount: num(v.total),
      items: partidas.reduce((s, p) => s + num(p.cantidad), 0),
      date: fechaTexto(isoLocal(v.fecha)),
      time: hora(v.fecha),
      status: estado,
      payment: estado === "Pendiente" ? (v.entrega === "Contra entrega" ? "Contra entrega" : "Por definir") : payments.length > 1 ? "Mixto" : (payments[0]?.method ?? "Efectivo"),
      payments: payments.length > 1 ? payments : undefined,
      lines: partidas.map((p) => ({
        sku: p.sku ?? "",
        name: p.nombre,
        quantity: num(p.cantidad),
        unit: p.unidad ?? "pieza",
        unitPrice: num(p.precio_unitario),
        total: num(p.importe),
        unitCost: p.costo_unitario === null ? undefined : num(p.costo_unitario),
      })),
      partialPaid: estado === "Pendiente" && pagado > 0 ? pagado : undefined,
      discountAmount: num(v.descuento_monto) || undefined,
      seller: colabName.get(v.vendedor_id) ?? v.creado_por ?? "",
      type: v.tipo === "Pedido" ? "Pedido" : "Mostrador",
    } as Sale;
  });

  // ---- Clientes (saldo y compras calculados de sus ventas)
  const ventasPorCliente = new Map<string, Sale[]>();
  ventas.forEach((v, i) => {
    if (!v.cliente_id) return;
    ventasPorCliente.set(v.cliente_id, [...(ventasPorCliente.get(v.cliente_id) ?? []), sales[i]]);
  });
  const customers: Customer[] = clientes.map((c) => {
    const propias = (ventasPorCliente.get(c.id) ?? []).filter((s) => s.status !== "Cancelada");
    const saldo = propias.reduce((s, v) => s + pendingAmount(v), 0) + num(c.saldo_inicial);
    const tipo: CustomerType = c.tipo === "Mayorista" || c.tipo === "Contratista" ? c.tipo : "Mostrador";
    return {
      id: c.id,
      businessName: c.nombre,
      contactName: c.contacto ?? "",
      rfc: c.rfc ?? "",
      type: tipo,
      status: saldo > 0 ? "Con saldo" : "Activo",
      phone: c.telefono ?? "",
      email: c.correo ?? "",
      address: c.direccion ?? "",
      city: c.ciudad ?? c.zona ?? "",
      creditDays: num(c.dias_credito),
      creditLimit: num(c.limite_credito),
      balance: saldo,
      totalPurchases: propias.reduce((s, v) => s + v.amount, 0),
      orders: propias.length,
      lastPurchase: propias[0]?.date ?? "—",
      channel: "Mostrador",
      notes: c.notas ?? "",
      creditBalance: num(c.saldo_a_favor) || undefined,
      priceList: listaClave.get(c.lista_precio_id),
      legalName: c.razon_social ?? undefined,
      taxRegime: c.regimen_fiscal ?? undefined,
      cfdiUse: c.uso_cfdi ?? undefined,
      fiscalZip: c.cp_fiscal ?? undefined,
      plumberProgram: !!c.programa_plomero,
      zone: c.zona ?? undefined,
      salesRep: colabName.get(c.vendedor_id),
    };
  });

  // ---- Cotizaciones
  const quotes: QuoteData[] = cotizaciones.map((q) => {
    const issued = isoLocal(q.creado_en);
    const expires = q.vence_el ?? issued;
    const partidas = (q.cotizacion_partidas ?? []) as Row[];
    const nombre = clienteById.get(q.cliente_id)?.nombre ?? q.cliente_datos?.nombre ?? "Cliente";
    return {
      id: q.folio,
      client: nombre,
      contact: clienteById.get(q.cliente_id)?.contacto ?? "",
      amount: num(q.total),
      items: partidas.length,
      date: fechaTexto(issued),
      issuedAt: issued,
      expiresAt: expires,
      validUntil: fechaTexto(expires),
      status: q.estado === "Aceptada" || q.estado === "Borrador" ? q.estado : q.estado === "Rechazada" ? "Vencida" : "Enviada",
      owner: colabName.get(q.vendedor_id) ?? q.creado_por ?? "",
      phone: q.cliente_datos?.telefono,
      priceList: q.lista_precio ?? undefined,
      lines: partidas.map((p) => ({ sku: p.sku ?? "", name: p.nombre, quantity: num(p.cantidad), unit: p.unidad ?? "pieza", unitPrice: num(p.precio_unitario), total: num(p.importe) })),
      subtotal: num(q.subtotal),
      tax: num(q.iva),
      notes: q.notas ?? undefined,
      discountAmount: num(q.descuento_monto) || undefined,
    };
  });

  // ---- Compras
  const purchases: PurchaseOrder[] = compras.map((c) => {
    const iso = isoLocal(c.fecha_compra);
    return {
      id: c.folio,
      supplierId: c.proveedor_id ?? "",
      supplierName: provName.get(c.proveedor_id) ?? c.proveedor_nombre ?? "",
      date: fechaTexto(iso),
      dateISO: iso,
      requiredISO: c.fecha_limite_pago ?? iso,
      status: compraEstado(c.estado),
      origin: "Manual",
      lines: ((c.compra_partidas ?? []) as Row[]).map((p) => ({
        sku: p.sku ?? "",
        name: p.nombre,
        unit: "pieza",
        quantity: num(p.cantidad),
        unitCost: num(p.costo_unitario),
        received: num(p.cantidad_recibida) || undefined,
      })),
      notes: c.notas ?? "",
      createdBy: c.creado_por ?? "",
      receivedAt: c.fecha_recepcion ? fechaTexto(isoLocal(c.fecha_recepcion)) : undefined,
    };
  });

  return { empresaId: e, usuarioId: yo.id, company, policies, roles: appRoles, collaborators, products, customers, suppliers, sales, quotes, purchases };
}
