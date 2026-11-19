import { useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Check,
  CircleDollarSign,
  Clock3,
  CreditCard,
  MessageCircle,
  PackageCheck,
  PackagePlus,
  Plus,
  Printer,
  ShoppingBasket,
  Trash2,
  TriangleAlert,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import type { Customer } from "./CustomersModule";
import type { InventoryProduct } from "./InventoryModule";
import type { Supplier } from "./PurchasesModule";
import CustomerPicker from "./CustomerPicker";

// ---------- Políticas ----------
export const MIN_DEPOSIT = 0.5;
export const PICKUP_DAYS = 7;
const TODAY_ISO = "2026-11-18";

// ---------- Tipos ----------
export type SpecialStatus = "Por pedir" | "Pedido al proveedor" | "Recibido" | "Avisado" | "Entregado" | "Cancelado";
export type DepositMethod = "Efectivo" | "Tarjeta" | "Transferencia";
export type SpecialItem = {
  sku: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
  inCatalog: boolean;
};
export type SpecialOrder = {
  id: string;
  client: string;
  phone: string;
  dateISO: string;
  createdAt: string;
  createdBy: string;
  supplierId: string;
  supplierName: string;
  items: SpecialItem[];
  total: number;
  deposit: number;
  depositMethod: DepositMethod;
  promiseISO: string;
  status: SpecialStatus;
  notes: string;
  purchaseId?: string;
  orderedAt?: string;
  receivedISO?: string;
  receivedAt?: string;
  notifiedAt?: string;
  notifiedISO?: string;
  deliveredAt?: string;
  saleId?: string;
  cancelledAt?: string;
  cancelReason?: string;
};

export const initialSpecialOrders: SpecialOrder[] = [
  {
    id: "PE-0003",
    client: "Plomería del Centro",
    phone: "55 4120 7788",
    dateISO: "2026-11-18",
    createdAt: "18 nov 2026 · 11:05",
    createdBy: "Carlos Mendoza",
    supplierId: "PR-03",
    supplierName: "Hidro Sistemas MX",
    items: [{ sku: "CPVC-TUB-075", name: 'Tubo CPVC 3/4" x 3 m', spec: "Sin existencia suficiente", quantity: 40, unit: "tramo", unitPrice: 174, unitCost: 118, inCatalog: true }],
    total: 6960,
    deposit: 3480,
    depositMethod: "Tarjeta",
    promiseISO: "2026-11-23",
    status: "Por pedir",
    notes: "Obra Narvarte, entregar en mostrador.",
  },
  {
    id: "PE-0002",
    client: "Instalaciones Ríos",
    phone: "55 3348 1290",
    dateISO: "2026-11-02",
    createdAt: "02 nov 2026 · 12:40",
    createdBy: "Ana López",
    supplierId: "PR-07",
    supplierName: "Urrea Distribución",
    items: [{ sku: "ESP-0002-1", name: 'Válvula esfera latón 1 1/2"', spec: "Urrea, rosca NPT", quantity: 6, unit: "pieza", unitPrice: 485, unitCost: 352, inCatalog: false }],
    total: 2910,
    deposit: 1455,
    depositMethod: "Efectivo",
    promiseISO: "2026-11-10",
    status: "Avisado",
    notes: "",
    purchaseId: "OC-0038",
    orderedAt: "02 nov 2026 · 13:10",
    receivedISO: "2026-11-10",
    receivedAt: "10 nov 2026 · 11:30",
    notifiedAt: "10 nov 2026 · 11:45",
    notifiedISO: "2026-11-10",
  },
  {
    id: "PE-0001",
    client: "Constructora MZ",
    phone: "55 2290 4410",
    dateISO: "2026-11-06",
    createdAt: "06 nov 2026 · 10:15",
    createdBy: "Carlos Mendoza",
    supplierId: "PR-04",
    supplierName: "Rotoplas México",
    items: [{ sku: "ESP-0001-1", name: "Tinaco tricapa 2,500 L", spec: "Color beige", quantity: 1, unit: "pieza", unitPrice: 6890, unitCost: 5200, inCatalog: false }],
    total: 6890,
    deposit: 3445,
    depositMethod: "Transferencia",
    promiseISO: "2026-11-16",
    status: "Pedido al proveedor",
    notes: "Avisar a Ing. Martínez.",
    purchaseId: "OC-0039",
    orderedAt: "06 nov 2026 · 10:40",
  },
];

// ---------- Utilidades ----------
const round = (value: number) => Math.round(value * 100) / 100;
export const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
export const displayDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const diffDays = (fromISO: string, toISO = TODAY_ISO) =>
  Math.round((new Date(`${toISO}T12:00:00`).getTime() - new Date(`${fromISO}T12:00:00`).getTime()) / 86_400_000);

export const balanceOf = (order: SpecialOrder) => round(order.total - order.deposit);
export const isLate = (order: SpecialOrder) => order.status === "Pedido al proveedor" && order.promiseISO < TODAY_ISO;
export const pickupDaysLeft = (order: SpecialOrder) =>
  order.notifiedISO || order.receivedISO ? PICKUP_DAYS - diffDays((order.notifiedISO || order.receivedISO)!) : PICKUP_DAYS;
export const isUncollected = (order: SpecialOrder) =>
  ["Recibido", "Avisado"].includes(order.status) && pickupDaysLeft(order) < 0;
export const activeStatuses: SpecialStatus[] = ["Por pedir", "Pedido al proveedor", "Recibido", "Avisado"];

const statusStyles: Record<SpecialStatus, string> = {
  "Por pedir": "bg-slate-100 text-slate-600",
  "Pedido al proveedor": "bg-[#f0ecff] text-[#6b57a8]",
  Recibido: "bg-[#eaf6ef] text-[#347652]",
  Avisado: "bg-[#e3f1ee] text-[#2f7468]",
  Entregado: "bg-[#eaf6ef] text-[#347652]",
  Cancelado: "bg-slate-100 text-slate-400",
};

const methodIcons: Record<string, typeof Banknote> = {
  Efectivo: Banknote,
  Tarjeta: CreditCard,
  Transferencia: CircleDollarSign,
  "Saldo a favor": Wallet,
};

export type NewSpecialOrder = Omit<SpecialOrder, "id" | "createdAt" | "createdBy" | "dateISO" | "status">;

// ---------- Alta de pedido especial ----------
export function SpecialOrderModal({
  customers,
  suppliers,
  inventory,
  initialSku,
  cashOpen,
  onClose,
  onCreate,
}: {
  customers: Customer[];
  suppliers: Supplier[];
  inventory: InventoryProduct[];
  initialSku?: string;
  cashOpen: boolean;
  onClose: () => void;
  onCreate: (order: NewSpecialOrder) => void;
}) {
  const initialProduct = inventory.find((p) => p.sku === initialSku);
  const initialSupplier = suppliers.find((s) => s.name === initialProduct?.supplier);
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [supplierId, setSupplierId] = useState(initialSupplier?.id ?? "");
  const [items, setItems] = useState<SpecialItem[]>(
    initialProduct
      ? [
          {
            sku: initialProduct.sku,
            name: initialProduct.name,
            spec: `Disponible ${Math.max(0, initialProduct.stock - initialProduct.reserved)} ${initialProduct.saleUnit}`,
            quantity: 1,
            unit: initialProduct.saleUnit,
            unitPrice: initialProduct.retailPrice,
            unitCost: initialProduct.cost,
            inCatalog: true,
          },
        ]
      : [],
  );
  const [pick, setPick] = useState("");
  const [free, setFree] = useState({ name: "", spec: "", quantity: "1", unit: "pieza", unitPrice: "", unitCost: "" });
  const [deposit, setDeposit] = useState("");
  const [method, setMethod] = useState<DepositMethod>(cashOpen ? "Efectivo" : "Tarjeta");
  const [notes, setNotes] = useState("");

  const supplier = suppliers.find((s) => s.id === supplierId);
  const customer = customers.find((c) => c.businessName.toLowerCase() === client.trim().toLowerCase());
  const total = round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const minDeposit = round(total * MIN_DEPOSIT);
  const depositValue = deposit === "" ? minDeposit : Number(deposit) || 0;
  const promiseISO = addDays(TODAY_ISO, (supplier?.leadTimeDays ?? 7) + 1);
  const errors = [
    !client.trim() && "Captura el cliente",
    !customer && !phone.trim() && "Captura un teléfono para avisarle",
    !supplier && "Elige el proveedor",
    items.length === 0 && "Agrega al menos un producto",
    depositValue < minDeposit - 0.009 && `El anticipo mínimo es ${money(minDeposit)} (50 %)`,
    depositValue > total + 0.009 && "El anticipo no puede ser mayor al total",
    method === "Efectivo" && !cashOpen && "Abre la caja para cobrar en efectivo",
  ].filter(Boolean) as string[];
  const setItem = (index: number, changes: Partial<SpecialItem>) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...changes } : item)));

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">Pedido especial · anticipo mínimo 50 % · no reembolsable</p>
            <h2 className="mt-1 text-xl font-semibold">Nuevo pedido especial</h2>
            <p className="mt-1 text-xs text-slate-400">Para productos que no manejas o que no tienen existencia suficiente.</p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <div className="grid grid-cols-[1fr_170px] gap-3">
              <label className="form-label">
                Cliente *
                <CustomerPicker value={client} onChange={setClient} customers={customers} placeholder="Cliente registrado o nombre" />
              </label>
              <label className="form-label">
                Teléfono {customer ? "" : "*"}
                <input value={customer ? customer.phone : phone} disabled={Boolean(customer)} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="Para avisarle" />
              </label>
            </div>
            <label className="form-label">
              Proveedor *
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="form-input">
                <option value="">Selecciona</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · entrega en {s.leadTimeDays} días
                  </option>
                ))}
              </select>
            </label>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1fr)_80px_100px_100px_90px_28px] gap-2 bg-[#fafcfb] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Producto</span>
                <span className="text-center">Cant.</span>
                <span className="text-right">Precio venta</span>
                <span className="text-right">Costo est.</span>
                <span className="text-right">Importe</span>
                <span />
              </div>
              {items.map((item, index) => (
                <div key={item.sku} className="grid grid-cols-[minmax(0,1fr)_80px_100px_100px_90px_28px] items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold leading-snug">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.inCatalog ? item.sku : "Fuera de catálogo"}
                      {item.spec ? ` · ${item.spec}` : ""}
                    </p>
                  </div>
                  <input type="number" min={1} value={item.quantity} onChange={(e) => setItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-9 rounded-lg border border-slate-200 text-center font-semibold outline-none focus:border-[#2f7468]" />
                  <input type="number" min={0} value={item.unitPrice} onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) || 0 })} className="h-9 rounded-lg border border-slate-200 px-2 text-right outline-none focus:border-[#2f7468]" />
                  <input type="number" min={0} value={item.unitCost} onChange={(e) => setItem(index, { unitCost: Number(e.target.value) || 0 })} className="h-9 rounded-lg border border-slate-200 px-2 text-right text-slate-500 outline-none focus:border-[#2f7468]" />
                  <p className="text-right font-semibold">{money(item.quantity * item.unitPrice)}</p>
                  <button className="text-slate-300 hover:text-[#c9664f]" onClick={() => setItems((list) => list.filter((_, i) => i !== index))} aria-label="Quitar producto">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="space-y-2 border-t border-slate-100 bg-[#fafcfb] p-3">
                <div className="flex gap-2">
                  <select value={pick} onChange={(e) => setPick(e.target.value)} className="form-input h-9 flex-1 bg-white text-xs">
                    <option value="">Producto del catálogo...</option>
                    {inventory
                      .filter((p) => p.status === "Activo" && !items.some((i) => i.sku === p.sku))
                      .map((p) => (
                        <option key={p.sku} value={p.sku}>
                          {p.name} · disponible {Math.max(0, p.stock - p.reserved)} {p.saleUnit}
                        </option>
                      ))}
                  </select>
                  <button
                    className="secondary-button flex min-h-9 items-center gap-1 bg-white disabled:opacity-40"
                    disabled={!pick}
                    onClick={() => {
                      const p = inventory.find((item) => item.sku === pick)!;
                      setItems((list) => [
                        ...list,
                        { sku: p.sku, name: p.name, spec: `Disponible ${Math.max(0, p.stock - p.reserved)} ${p.saleUnit}`, quantity: 1, unit: p.saleUnit, unitPrice: p.retailPrice, unitCost: p.cost, inCatalog: true },
                      ]);
                      if (!supplierId) setSupplierId(suppliers.find((s) => s.name === p.supplier)?.id ?? "");
                      setPick("");
                    }}
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>
                <p className="pt-1 text-[10px] font-semibold text-slate-500">O un producto que no manejas:</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={free.name} onChange={(e) => setFree({ ...free, name: e.target.value })} className="form-input h-9 bg-white text-xs" placeholder="Producto fuera de catálogo" />
                  <input value={free.spec} onChange={(e) => setFree({ ...free, spec: e.target.value })} className="form-input h-9 bg-white text-xs" placeholder="Marca, medida, color" />
                </div>
                <div className="grid grid-cols-[70px_90px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                  <input type="number" value={free.quantity} onChange={(e) => setFree({ ...free, quantity: e.target.value })} className="form-input h-9 bg-white px-2 text-center text-xs" aria-label="Cantidad" />
                  <input value={free.unit} onChange={(e) => setFree({ ...free, unit: e.target.value })} className="form-input h-9 bg-white px-2 text-xs" aria-label="Unidad" />
                  <input type="number" value={free.unitPrice} onChange={(e) => setFree({ ...free, unitPrice: e.target.value })} className="form-input h-9 bg-white px-2 text-xs" placeholder="Precio" />
                  <input type="number" value={free.unitCost} onChange={(e) => setFree({ ...free, unitCost: e.target.value })} className="form-input h-9 bg-white px-2 text-xs" placeholder="Costo" />
                  <button
                    className="secondary-button flex min-h-9 items-center gap-1 bg-white px-3 disabled:opacity-40"
                    disabled={!free.name.trim() || !(Number(free.unitPrice) > 0)}
                    onClick={() => {
                      setItems((list) => [
                        ...list,
                        {
                          sku: `ESP-NEW-${list.length + 1}`,
                          name: free.name.trim(),
                          spec: free.spec.trim(),
                          quantity: Math.max(1, Number(free.quantity) || 1),
                          unit: free.unit || "pieza",
                          unitPrice: Number(free.unitPrice) || 0,
                          unitCost: Number(free.unitCost) || 0,
                          inCatalog: false,
                        },
                      ]);
                      setFree({ name: "", spec: "", quantity: "1", unit: "pieza", unitPrice: "", unitCost: "" });
                    }}
                  >
                    <Plus size={13} /> Agregar
                  </button>
                </div>
              </div>
            </div>
            <label className="form-label">
              Notas
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" placeholder="Obra, persona que recoge, detalles del producto" />
            </label>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-[#f6f8f7] p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total del pedido</span>
                <strong className="text-lg">{money(total)}</strong>
              </div>
              <div className="mt-1 flex justify-between text-slate-500">
                <span>Anticipo mínimo (50 %)</span>
                <span>{money(minDeposit)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                <CalendarClock size={14} className="text-[#2f7468]" /> Fecha promesa: <strong>{displayDate(promiseISO)}</strong>
              </div>
            </div>
            <label className="form-label">
              Anticipo que deja
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} className="form-input pl-7 text-lg font-bold" placeholder={minDeposit.toFixed(2)} />
              </div>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Efectivo", "Tarjeta", "Transferencia"] as DepositMethod[]).map((item) => {
                const Icon = methodIcons[item];
                return (
                  <button
                    key={item}
                    onClick={() => setMethod(item)}
                    className={`grid min-h-[60px] place-items-center rounded-xl border p-2 text-[10px] font-semibold ${method === item ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"}`}
                  >
                    <Icon size={16} />
                    {item}
                  </button>
                );
              })}
            </div>
            <div className="rounded-xl border border-[#f0d9a3] bg-[#fffaf0] p-3 text-[10px] leading-relaxed text-[#8a651e]">
              <strong>Condiciones:</strong> el anticipo no es reembolsable si el cliente cancela. Al llegar, el cliente tiene {PICKUP_DAYS} días para recoger y
              liquidar. Los pedidos especiales no admiten devolución.
            </div>
            {errors.length > 0 && <p className="text-[11px] font-medium text-[#c9664f]">{errors[0]}.</p>}
            <button
              className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-40"
              disabled={errors.length > 0}
              onClick={() =>
                onCreate({
                  client: client.trim(),
                  phone: customer?.phone ?? phone.trim(),
                  supplierId: supplier!.id,
                  supplierName: supplier!.name,
                  items,
                  total,
                  deposit: round(depositValue),
                  depositMethod: method,
                  promiseISO,
                  notes: notes.trim(),
                })
              }
            >
              <PackagePlus size={16} /> Registrar y cobrar anticipo {money(depositValue)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Lista y detalle ----------
type SpecialFilter = "Activos" | SpecialStatus | "Atrasados" | "Sin recoger";

export function SpecialOrdersPanel({
  orders,
  customers,
  cashOpen,
  onNew,
  onToPurchase,
  onNotify,
  onDeliver,
  onCancel,
  onPrint,
  onOpenPurchase,
  onOpenSale,
}: {
  orders: SpecialOrder[];
  customers: Customer[];
  cashOpen: boolean;
  onNew: () => void;
  onToPurchase: (id: string) => void;
  onNotify: (id: string) => void;
  onDeliver: (id: string, method: string) => void;
  onCancel: (id: string, reason: string) => void;
  onPrint: (id: string) => void;
  onOpenPurchase: (purchaseId: string) => void;
  onOpenSale: (saleId: string) => void;
}) {
  const [filter, setFilter] = useState<SpecialFilter>("Activos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliverId, setDeliverId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const selected = orders.find((o) => o.id === selectedId) || null;

  const matches = (o: SpecialOrder, f: SpecialFilter) =>
    f === "Activos" ? activeStatuses.includes(o.status) : f === "Atrasados" ? isLate(o) : f === "Sin recoger" ? isUncollected(o) : o.status === f;
  const visible = orders.filter((o) => matches(o, filter));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        {(["Activos", "Por pedir", "Pedido al proveedor", "Atrasados", "Recibido", "Avisado", "Sin recoger", "Entregado", "Cancelado"] as SpecialFilter[]).map((item) => {
          const count = orders.filter((o) => matches(o, item)).length;
          const alert = (item === "Atrasados" || item === "Sin recoger") && count > 0;
          return (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${filter === item ? "bg-[#edf4f2] text-[#285e56]" : alert ? "text-[#c9664f]" : "text-slate-400 hover:text-slate-600"}`}
            >
              {item} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
        <button className="primary-button ml-auto min-h-9" onClick={onNew}>
          <PackagePlus size={15} /> Nuevo pedido especial
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Pedido / cliente</th>
              <th className="py-3.5">Producto</th>
              <th className="py-3.5">Fecha promesa</th>
              <th className="py-3.5 text-right">Total</th>
              <th className="py-3.5 text-right">Anticipo · saldo</th>
              <th className="py-3.5">Estado</th>
              <th className="px-5 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]">
                <td className="px-5 py-4">
                  <button className="flex items-center gap-3 text-left" onClick={() => setSelectedId(o.id)}>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#f0ecff] text-[#6b57a8]">
                      <PackagePlus size={15} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{o.id}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {o.client} · {o.supplierName}
                      </p>
                    </div>
                  </button>
                </td>
                <td className="max-w-56 py-4">
                  <p className="truncate font-medium">{o.items.map((i) => `${i.quantity} ${i.name}`).join(", ")}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{o.items.some((i) => !i.inCatalog) ? "Fuera de catálogo" : "Catálogo sin existencia"}</p>
                </td>
                <td className="py-4">
                  <p className={isLate(o) ? "font-semibold text-[#c9664f]" : "text-slate-600"}>{displayDate(o.promiseISO)}</p>
                  {isLate(o) && <p className="mt-1 text-[10px] font-semibold text-[#c9664f]">Atrasado</p>}
                  {["Recibido", "Avisado"].includes(o.status) && (
                    <p className={`mt-1 text-[10px] font-semibold ${isUncollected(o) ? "text-[#c9664f]" : "text-[#9a6b18]"}`}>
                      {isUncollected(o) ? `Sin recoger · ${-pickupDaysLeft(o)} días de atraso` : `Recoger en ${pickupDaysLeft(o)} días`}
                    </p>
                  )}
                </td>
                <td className="py-4 text-right font-semibold">{money(o.total)}</td>
                <td className="py-4 text-right">
                  <p className="text-[#347652]">{money(o.deposit)}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{o.status === "Entregado" ? "Liquidado" : o.status === "Cancelado" ? "Anticipo retenido" : `Saldo ${money(balanceOf(o))}`}</p>
                </td>
                <td className="py-4">
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[o.status]}`}>{o.status}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <NextAction order={o} onToPurchase={onToPurchase} onNotify={onNotify} onDeliver={() => setDeliverId(o.id)} onOpen={() => setSelectedId(o.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="px-5 py-14 text-center text-xs text-slate-400">No hay pedidos especiales en este filtro.</p>}
      </div>

      {selected && (
        <SpecialDetail
          order={selected}
          onClose={() => setSelectedId(null)}
          onToPurchase={onToPurchase}
          onNotify={onNotify}
          onDeliver={() => setDeliverId(selected.id)}
          onCancel={() => setCancelId(selected.id)}
          onPrint={() => onPrint(selected.id)}
          onOpenPurchase={onOpenPurchase}
          onOpenSale={onOpenSale}
        />
      )}
      {deliverId && (
        <DeliverModal
          order={orders.find((o) => o.id === deliverId)!}
          credit={customers.find((c) => c.businessName === orders.find((o) => o.id === deliverId)?.client)?.creditBalance ?? 0}
          cashOpen={cashOpen}
          onClose={() => setDeliverId(null)}
          onConfirm={(method) => {
            onDeliver(deliverId, method);
            setDeliverId(null);
          }}
        />
      )}
      {cancelId && (
        <CancelModal
          order={orders.find((o) => o.id === cancelId)!}
          onClose={() => setCancelId(null)}
          onConfirm={(reason) => {
            onCancel(cancelId, reason);
            setCancelId(null);
          }}
        />
      )}
    </>
  );
}

function NextAction({
  order,
  onToPurchase,
  onNotify,
  onDeliver,
  onOpen,
}: {
  order: SpecialOrder;
  onToPurchase: (id: string) => void;
  onNotify: (id: string) => void;
  onDeliver: () => void;
  onOpen: () => void;
}) {
  if (order.status === "Por pedir")
    return (
      <button className="link-button" onClick={() => onToPurchase(order.id)}>
        <ShoppingBasket size={13} /> Pedir al proveedor
      </button>
    );
  if (order.status === "Recibido")
    return (
      <button className="link-button" onClick={() => onNotify(order.id)}>
        <MessageCircle size={13} /> Avisar al cliente
      </button>
    );
  if (order.status === "Avisado")
    return (
      <button className="link-button" onClick={onDeliver}>
        <PackageCheck size={13} /> Entregar y cobrar
      </button>
    );
  return (
    <button className="link-button" onClick={onOpen}>
      Ver detalle
    </button>
  );
}

function SpecialDetail({
  order,
  onClose,
  onToPurchase,
  onNotify,
  onDeliver,
  onCancel,
  onPrint,
  onOpenPurchase,
  onOpenSale,
}: {
  order: SpecialOrder;
  onClose: () => void;
  onToPurchase: (id: string) => void;
  onNotify: (id: string) => void;
  onDeliver: () => void;
  onCancel: () => void;
  onPrint: () => void;
  onOpenPurchase: (purchaseId: string) => void;
  onOpenSale: (saleId: string) => void;
}) {
  const steps = [
    { label: "Anticipo cobrado", when: order.createdAt, done: true },
    { label: "Pedido al proveedor", when: order.orderedAt, done: Boolean(order.orderedAt) },
    { label: "Recibido y apartado", when: order.receivedAt, done: Boolean(order.receivedAt) },
    { label: "Cliente avisado", when: order.notifiedAt, done: Boolean(order.notifiedAt) },
    { label: "Entregado y liquidado", when: order.deliveredAt, done: Boolean(order.deliveredAt) },
  ];
  return (
    <>
      <button className="fixed inset-0 z-40 bg-[#102521]/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Cerrar pedido especial" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Pedido especial</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{order.id}</h2>
                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status]}`}>{order.status}</span>
                {isLate(order) && <span className="rounded-lg bg-[#fff0eb] px-2.5 py-1 text-[10px] font-semibold text-[#c9664f]">Atrasado</span>}
                {isUncollected(order) && <span className="rounded-lg bg-[#fff0eb] px-2.5 py-1 text-[10px] font-semibold text-[#c9664f]">Sin recoger</span>}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {order.client} · {order.phone} · proveedor {order.supplierName}
              </p>
            </div>
            <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Total", money(order.total)],
              ["Anticipo", `${money(order.deposit)} · ${order.depositMethod.toLowerCase()}`],
              [order.status === "Cancelado" ? "Retenido" : "Saldo", order.status === "Entregado" ? "Liquidado" : order.status === "Cancelado" ? money(order.deposit) : money(balanceOf(order))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#f6f8f7] p-3">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={onPrint}>
              <Printer size={14} /> Recibo de anticipo
            </button>
            {order.status === "Por pedir" && (
              <button className="primary-button min-h-9" onClick={() => onToPurchase(order.id)}>
                <ShoppingBasket size={14} /> Pedir al proveedor
              </button>
            )}
            {order.status === "Recibido" && (
              <button className="primary-button min-h-9" onClick={() => onNotify(order.id)}>
                <MessageCircle size={14} /> Avisar por WhatsApp
              </button>
            )}
            {["Recibido", "Avisado"].includes(order.status) && (
              <button className={`${order.status === "Avisado" ? "primary-button" : "secondary-button flex items-center gap-1.5 bg-white"} min-h-9`} onClick={onDeliver}>
                <PackageCheck size={14} /> Entregar y cobrar {money(balanceOf(order))}
              </button>
            )}
            {order.purchaseId && (
              <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={() => onOpenPurchase(order.purchaseId!)}>
                {order.purchaseId} <ArrowUpRight size={13} />
              </button>
            )}
            {order.saleId && (
              <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={() => onOpenSale(order.saleId!)}>
                Venta {order.saleId} <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {isUncollected(order) && (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff0eb] p-3 text-[11px] text-[#c9664f]">
              <TriangleAlert size={14} className="shrink-0" />
              Se le avisó el {order.notifiedAt ?? order.receivedAt}. Ya pasaron los {PICKUP_DAYS} días para recoger; contacta al cliente o cancela el pedido (el anticipo se retiene).
            </p>
          )}
          <section>
            <p className="eyebrow">Recorrido</p>
            <ol className="mt-3 space-y-3">
              {steps.map((step) => (
                <li key={step.label} className="flex gap-3 text-xs">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ${step.done ? "bg-[#2f7468] text-white" : "bg-white text-slate-300 ring-1 ring-slate-200"}`}>
                    {step.done ? <Check size={12} /> : <Clock3 size={12} />}
                  </span>
                  <div className="flex-1">
                    <p className={`font-semibold ${step.done ? "" : "text-slate-400"}`}>{step.label}</p>
                    {step.when && <p className="text-[10px] text-slate-400">{step.when}</p>}
                  </div>
                </li>
              ))}
              {order.status === "Cancelado" && (
                <li className="flex gap-3 text-xs">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#fff0eb] text-[#c9664f]">
                    <X size={12} />
                  </span>
                  <div>
                    <p className="font-semibold text-[#c9664f]">Cancelado · anticipo retenido {money(order.deposit)}</p>
                    <p className="text-[10px] text-slate-400">
                      {order.cancelledAt} · {order.cancelReason}
                    </p>
                  </div>
                </li>
              )}
            </ol>
          </section>
          <section>
            <p className="eyebrow">Productos</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
              {order.items.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.inCatalog ? item.sku : "Fuera de catálogo"}
                      {item.spec ? ` · ${item.spec}` : ""} · {item.quantity} {item.unit} × {money(item.unitPrice)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{money(item.quantity * item.unitPrice)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Truck size={13} /> Fecha promesa {displayDate(order.promiseISO)}
            </p>
            {order.notes && <p className="mt-2 text-xs text-slate-500">Notas: {order.notes}</p>}
          </section>
          {activeStatuses.includes(order.status) && (
            <button className="w-full text-center text-xs font-semibold text-slate-400 hover:text-[#c9664f]" onClick={onCancel}>
              Cancelar pedido especial (el anticipo no se devuelve)
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function DeliverModal({
  order,
  credit,
  cashOpen,
  onClose,
  onConfirm,
}: {
  order: SpecialOrder;
  credit: number;
  cashOpen: boolean;
  onClose: () => void;
  onConfirm: (method: string) => void;
}) {
  const due = balanceOf(order);
  const [method, setMethod] = useState(cashOpen ? "Efectivo" : "Tarjeta");
  const [received, setReceived] = useState("");
  const options = [
    { label: "Efectivo", enabled: cashOpen, hint: cashOpen ? "" : "Caja cerrada" },
    { label: "Tarjeta", enabled: true, hint: "" },
    { label: "Transferencia", enabled: true, hint: "" },
    { label: "Saldo a favor", enabled: credit >= due, hint: credit ? `Disponible ${money(credit)}` : "Sin saldo" },
  ];
  const change = Math.max(0, (Number(received) || 0) - due);
  const valid = options.find((o) => o.label === method)?.enabled && (method !== "Efectivo" || (Number(received) || 0) >= due);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Entregar pedido especial {order.id}</p>
            <h2 className="mt-1 text-xl font-semibold">Saldo a cobrar {money(due)}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Total {money(order.total)} − anticipo {money(order.deposit)}
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {options.map(({ label, enabled, hint }) => {
            const Icon = methodIcons[label];
            return (
              <button
                key={label}
                disabled={!enabled}
                title={hint}
                onClick={() => setMethod(label)}
                className={`grid min-h-[68px] place-items-center rounded-xl border p-2 text-[10px] font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-30 ${method === label ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"}`}
              >
                <Icon size={17} />
                {label}
              </button>
            );
          })}
        </div>
        {method === "Efectivo" && (
          <div className="mt-4">
            <label className="form-label">
              Efectivo recibido
              <input type="number" value={received} onChange={(e) => setReceived(e.target.value)} className="form-input" placeholder={money(due)} />
            </label>
            <div className="mt-3 flex justify-between rounded-xl bg-slate-100 p-3 text-xs">
              <span className="text-slate-500">Cambio</span>
              <strong>{money(change)}</strong>
            </div>
          </div>
        )}
        <p className="mt-4 text-[11px] text-slate-500">Se genera la venta con el anticipo aplicado y el material apartado sale del almacén.</p>
        <button className="primary-button mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40" disabled={!valid} onClick={() => onConfirm(method)}>
          <Check size={16} /> Entregar y generar venta
        </button>
      </div>
    </div>
  );
}

function CancelModal({ order, onClose, onConfirm }: { order: SpecialOrder; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <span className="grid size-11 place-items-center rounded-xl bg-[#fff0eb] text-[#c9664f]">
          <TriangleAlert size={19} />
        </span>
        <h2 className="mt-4 text-lg font-semibold">¿Cancelar el pedido especial {order.id}?</h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Según la política, el anticipo de <strong>{money(order.deposit)}</strong> no se devuelve al cliente.
          {["Recibido", "Avisado"].includes(order.status) && " El material apartado se libera y queda disponible para venta."}
          {order.status === "Pedido al proveedor" && ` Revisa con ${order.supplierName} si aún se puede cancelar la orden de compra ${order.purchaseId}.`}
        </p>
        <label className="form-label mt-4">
          Motivo
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="form-input" placeholder="Ej. El cliente ya no lo necesita" />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button className="secondary-button" onClick={onClose}>
            Conservar pedido
          </button>
          <button className="primary-button bg-[#c9664f] disabled:opacity-40" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
            Cancelar y retener anticipo
          </button>
        </div>
      </div>
    </div>
  );
}
