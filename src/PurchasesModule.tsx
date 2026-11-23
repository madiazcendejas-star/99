import { useMemo, useState } from "react";
import { TODAY_ISO, TODAY_TEXT } from "./entorno";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Factory,
  FileText,
  Info,
  Mail,
  MessageCircle,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  Printer,
  Search,
  Send,
  ShoppingBasket,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";
import type { InventoryProduct } from "./InventoryModule";
import PurchasePrintView from "./PurchaseDocument";
import type { Kit } from "./KitsModule";

// ---------- Tipos ----------
export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  rfc: string;
  address: string;
  city: string;
  leadTimeDays: number;
  creditDays: number;
  categories: string;
  notes: string;
};

export type PurchaseStatus =
  | "Borrador"
  | "Aprobada"
  | "Enviada"
  | "En recepción"
  | "Recibida"
  | "Recibida parcial"
  | "Cancelada";

export type PurchaseLine = {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitCost: number;
  received?: number;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dateISO: string;
  requiredISO: string;
  status: PurchaseStatus;
  origin: "Manual" | "Stock mínimo" | "Pronóstico" | "Pedido especial";
  /** Compra generada por un pedido especial de cliente (lo recibido se aparta para él) */
  specialOrderId?: string;
  lines: PurchaseLine[];
  notes: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  arrivedAt?: string;
  receivedAt?: string;
  receptionOrderId?: string;
};

// ---------- Datos de ejemplo ----------
export const initialSuppliers: Supplier[] = [
  { id: "PR-01", name: "Distribuidora Amanco", contact: "Héctor Salinas", phone: "55 5321 7700", email: "pedidos@amancodist.mx", rfc: "DAM0904213K1", address: "Calz. Vallejo 1520", city: "Gustavo A. Madero, CDMX", leadTimeDays: 3, creditDays: 30, categories: "PVC hidráulico", notes: "Entrega en almacén sin costo arriba de $8,000." },
  { id: "PR-02", name: "Conexiones del Centro", contact: "Laura Méndez", phone: "55 2210 4580", email: "ventas@conexionescentro.mx", rfc: "CCE1203159A2", address: "Av. Tláhuac 88", city: "Iztapalapa, CDMX", leadTimeDays: 2, creditDays: 15, categories: "Conexiones PVC", notes: "" },
  { id: "PR-03", name: "Hidro Sistemas MX", contact: "Óscar Ruiz", phone: "55 4433 9012", email: "compras@hidrosistemas.mx", rfc: "HSM1510074T6", address: "Blvd. Toluca 410", city: "Naucalpan, Edo. Méx.", leadTimeDays: 5, creditDays: 30, categories: "CPVC", notes: "Pedido mínimo 20 tramos." },
  { id: "PR-04", name: "Rotoplas México", contact: "Daniela Ortiz", phone: "800 506 3000", email: "distribuidores@rotoplas.com.mx", rfc: "ROT9112203P0", address: "Pedregal 24", city: "Miguel Hidalgo, CDMX", leadTimeDays: 7, creditDays: 45, categories: "Almacenamiento", notes: "Flete incluido por tarima completa." },
  { id: "PR-05", name: "Truper", contact: "Ricardo Lara", phone: "55 5089 1000", email: "mayoreo@truper.com", rfc: "TRU7704253H9", address: "Parque Industrial Jilotepec", city: "Jilotepec, Edo. Méx.", leadTimeDays: 4, creditDays: 30, categories: "Accesorios, adhesivos", notes: "" },
  { id: "PR-06", name: "IUSA Distribución", contact: "Marco Aguilar", phone: "55 5118 2300", email: "pedidos@iusa.com.mx", rfc: "IUS8506118B3", address: "Km 109 Carr. Panamericana", city: "Pasteje, Edo. Méx.", leadTimeDays: 6, creditDays: 30, categories: "Mangueras", notes: "Rollos de 50 m." },
  { id: "PR-07", name: "Urrea Distribución", contact: "Sergio Pineda", phone: "33 3208 7000", email: "ventas@urrea.com", rfc: "URR6609014Q2", address: "Periférico Sur 7999", city: "Tlaquepaque, Jal.", leadTimeDays: 8, creditDays: 30, categories: "Válvulas", notes: "Envío por paquetería." },
];

const line = (sku: string, name: string, unit: string, quantity: number, unitCost: number, received?: number): PurchaseLine => ({
  sku,
  name,
  unit,
  quantity,
  unitCost,
  received,
});

export const initialPurchases: PurchaseOrder[] = [
  {
    id: "OC-0039",
    supplierId: "PR-04",
    supplierName: "Rotoplas México",
    date: "6 nov 2026",
    dateISO: "2026-11-06",
    requiredISO: "2026-11-15",
    status: "Enviada",
    origin: "Pedido especial",
    specialOrderId: "PE-0001",
    lines: [line("ESP-0001-1", "Tinaco tricapa 2,500 L · color beige", "pieza", 1, 5200)],
    notes: "Pedido especial PE-0001 de Constructora MZ.",
    createdBy: "Carlos Mendoza",
    approvedBy: "Carlos Mendoza",
    approvedAt: "6 nov 2026 · 10:35",
    sentAt: "6 nov 2026 · 10:40",
  },
  {
    id: "OC-0038",
    supplierId: "PR-07",
    supplierName: "Urrea Distribución",
    date: "2 nov 2026",
    dateISO: "2026-11-02",
    requiredISO: "2026-11-10",
    status: "Recibida",
    origin: "Pedido especial",
    specialOrderId: "PE-0002",
    lines: [line("ESP-0002-1", 'Válvula esfera latón 1 1/2" · Urrea, rosca NPT', "pieza", 6, 352, 6)],
    notes: "Pedido especial PE-0002 de Instalaciones Ríos.",
    createdBy: "Ana López",
    approvedBy: "Carlos Mendoza",
    approvedAt: "2 nov 2026 · 13:05",
    sentAt: "2 nov 2026 · 13:10",
    arrivedAt: "10 nov 2026 · 11:00",
    receivedAt: "10 nov 2026 · 11:30",
    receptionOrderId: "RE-0009",
  },
  {
    id: "OC-0042",
    supplierId: "PR-02",
    supplierName: "Conexiones del Centro",
    date: "18 nov 2026",
    dateISO: "2026-11-18",
    requiredISO: "2026-11-20",
    status: "Borrador",
    origin: "Pronóstico",
    lines: [line("PVC-COD-100", 'Codo PVC hidráulico 1" 90°', "pieza", 300, 11.4)],
    notes: "Reponer antes de la temporada alta.",
    createdBy: "Carlos Mendoza",
  },
  {
    id: "OC-0041",
    supplierId: "PR-01",
    supplierName: "Distribuidora Amanco",
    date: "17 nov 2026",
    dateISO: "2026-11-17",
    requiredISO: "2026-11-20",
    status: "Enviada",
    origin: "Stock mínimo",
    lines: [line("PVC-TUB-100", 'Tubo PVC hidráulico 1" x 6 m', "tramo", 60, 214.2)],
    notes: "Confirmar entrega por la mañana.",
    createdBy: "Carlos Mendoza",
    approvedBy: "Carlos Mendoza",
    approvedAt: "17 nov 2026 · 10:05",
    sentAt: "17 nov 2026 · 10:20",
  },
  {
    id: "OC-0040",
    supplierId: "PR-04",
    supplierName: "Rotoplas México",
    date: "10 nov 2026",
    dateISO: "2026-11-10",
    requiredISO: "2026-11-17",
    status: "Recibida",
    origin: "Manual",
    lines: [line("ROT-TIN-1100", "Tinaco tricapa 1,100 L", "pieza", 6, 2740, 6)],
    notes: "",
    createdBy: "Carlos Mendoza",
    approvedBy: "Carlos Mendoza",
    approvedAt: "10 nov 2026 · 09:30",
    sentAt: "10 nov 2026 · 09:45",
    arrivedAt: "13 nov 2026 · 11:10",
    receivedAt: "13 nov 2026 · 12:00",
    receptionOrderId: "RE-0010",
  },
];

/** Unidades vendidas por semana (últimas 8 semanas, de la más antigua a la más reciente).
 *  En producción se calcula con las ventas y entregas registradas en el sistema. */
export const salesHistory: Record<string, number[]> = {
  "PVC-COD-100": [95, 110, 102, 120, 115, 130, 125, 140],
  "PVC-TUB-100": [28, 32, 30, 35, 31, 36, 34, 38],
  "CPVC-TUB-075": [14, 16, 12, 18, 15, 17, 19, 20],
  "ROT-TIN-1100": [3, 2, 4, 3, 3, 5, 4, 4],
  "ACC-TEF-012": [60, 72, 65, 70, 80, 75, 78, 85],
  "MAN-REF-020": [40, 35, 45, 38, 42, 50, 44, 48],
  "VAL-ESF-050": [10, 12, 9, 14, 11, 13, 12, 15],
  "PEG-PVC-250": [8, 9, 7, 10, 9, 11, 10, 12],
  // Kits vendidos por semana: su demanda se reparte a cada componente
  "KIT-TIN-1100": [1, 2, 1, 2, 2, 3, 2, 3],
  "KIT-REP-HID": [4, 5, 3, 6, 5, 6, 7, 8],
  "KIT-JAR-020": [2, 1, 2, 2, 3, 2, 3, 4],
};

// ---------- Utilidades ----------
const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const displayDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
export const purchaseTotals = (po: PurchaseOrder) => {
  const subtotal = po.lines.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  return { subtotal, tax: subtotal * 0.16, total: subtotal * 1.16 };
};
const openStatuses: PurchaseStatus[] = ["Borrador", "Aprobada", "Enviada", "En recepción"];
const onOrderStatuses: PurchaseStatus[] = ["Aprobada", "Enviada", "En recepción"];

const statusStyles: Record<PurchaseStatus, string> = {
  Borrador: "bg-slate-100 text-slate-600",
  Aprobada: "bg-[#e8f2ff] text-[#3973a8]",
  Enviada: "bg-[#f0ecff] text-[#6b57a8]",
  "En recepción": "bg-[#fff6df] text-[#9a6b18]",
  Recibida: "bg-[#eaf6ef] text-[#347652]",
  "Recibida parcial": "bg-[#fff0eb] text-[#c9664f]",
  Cancelada: "bg-slate-100 text-slate-400",
};

type Tab = "Órdenes" | "Sugerencias" | "Proveedores";
type ListFilter = "Todas" | "Abiertas" | PurchaseStatus;
type Draft = { supplierId: string; requiredISO: string; notes: string; origin: PurchaseOrder["origin"]; lines: PurchaseLine[] };

export default function PurchasesModule({
  purchases,
  suppliers,
  products,
  userName,
  onAddPurchase,
  onUpdatePurchase,
  onSendToWarehouse,
  onSaveSupplier,
  onToast,
  onOpen,
  initialSelectedId,
  initialFilter,
  specialPending = [],
  onSpecialToPurchase,
  kits = [],
  canApprove = true,
}: {
  canApprove?: boolean;
  kits?: Kit[];
  initialSelectedId?: string;
  initialFilter?: "Abiertas";
  specialPending?: { id: string; client: string; supplierName: string; total: number; promiseISO: string; items: { name: string; quantity: number; unit: string }[] }[];
  onSpecialToPurchase?: (id: string) => void;
  purchases: PurchaseOrder[];
  suppliers: Supplier[];
  products: InventoryProduct[];
  userName: string;
  onAddPurchase: (po: PurchaseOrder) => void;
  onUpdatePurchase: (po: PurchaseOrder) => void;
  onSendToWarehouse: (po: PurchaseOrder) => void;
  onSaveSupplier: (supplier: Supplier) => void;
  onToast: (message: string) => void;
  onOpen?: (nav: string, focus: { query?: string; selectedId?: string }) => void;
}) {
  const [tab, setTab] = useState<Tab>("Órdenes");
  const [filter, setFilter] = useState<ListFilter>(initialFilter ?? "Todas");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<Supplier | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);

  const selected = purchases.find((po) => po.id === selectedId) || null;
  const printing = purchases.find((po) => po.id === printId) || null;
  const supplierOf = (id: string) => suppliers.find((supplier) => supplier.id === id);

  /** Cantidad ya pedida y en camino por SKU */
  const onOrder = useMemo(() => {
    const result: Record<string, number> = {};
    purchases
      .filter((po) => onOrderStatuses.includes(po.status) && !po.specialOrderId)
      .forEach((po) =>
        po.lines.forEach((item) => {
          result[item.sku] = (result[item.sku] || 0) + item.quantity - (item.received || 0);
        }),
      );
    return result;
  }, [purchases]);

  const nextId = () =>
    `OC-${String(Math.max(...purchases.map((po) => Number(po.id.replace("OC-", ""))), 0) + 1).padStart(4, "0")}`;

  const startDraft = (supplierId = "", lines: PurchaseLine[] = [], origin: PurchaseOrder["origin"] = "Manual") => {
    const supplier = supplierOf(supplierId);
    setEditingId(null);
    setDraft({
      supplierId,
      requiredISO: addDays(TODAY_ISO, supplier?.leadTimeDays ?? 3),
      notes: "",
      origin,
      lines,
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    const supplier = supplierOf(draft.supplierId)!;
    if (editingId) {
      const original = purchases.find((po) => po.id === editingId)!;
      onUpdatePurchase({ ...original, supplierId: supplier.id, supplierName: supplier.name, requiredISO: draft.requiredISO, notes: draft.notes, lines: draft.lines });
      onToast(`${editingId} actualizada`);
      setSelectedId(editingId);
    } else {
      const po: PurchaseOrder = {
        id: nextId(),
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: displayDate(TODAY_ISO),
        dateISO: TODAY_ISO,
        requiredISO: draft.requiredISO,
        status: "Borrador",
        origin: draft.origin,
        lines: draft.lines,
        notes: draft.notes,
        createdBy: userName,
      };
      onAddPurchase(po);
      onToast(`Orden de compra ${po.id} creada como borrador`);
      setTab("Órdenes");
      setSelectedId(po.id);
    }
    setDraft(null);
    setEditingId(null);
  };

  if (selected && !draft) {
    return (
      <>
        <PurchaseDetail
          po={selected}
          supplier={supplierOf(selected.supplierId)}
          userName={userName}
          onBack={() => setSelectedId(null)}
          onUpdate={onUpdatePurchase}
          onSendToWarehouse={onSendToWarehouse}
          onEdit={() => {
            setEditingId(selected.id);
            setDraft({ supplierId: selected.supplierId, requiredISO: selected.requiredISO, notes: selected.notes, origin: selected.origin, lines: selected.lines });
          }}
          onPrint={() => setPrintId(selected.id)}
          onToast={onToast}
          canApprove={canApprove}
          onOpen={onOpen}
        />
        {printing && <PurchasePrintView po={printing} supplier={supplierOf(printing.supplierId)} onClose={() => setPrintId(null)} />}
      </>
    );
  }

  const openPurchases = purchases.filter((po) => openStatuses.includes(po.status));
  const monthTotal = purchases
    .filter((po) => po.status !== "Cancelada" && po.dateISO.startsWith("2026-11"))
    .reduce((sum, po) => sum + purchaseTotals(po).total, 0);
  const lowStockCount = products.filter((p) => p.status === "Activo" && p.stock - p.reserved <= p.minimumStock).length;

  const visible = purchases
    .filter((po) => (filter === "Todas" ? true : filter === "Abiertas" ? openStatuses.includes(po.status) : po.status === filter))
    .filter((po) => `${po.id} ${po.supplierName} ${po.lines.map((l) => `${l.sku} ${l.name}`).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.id.localeCompare(a.id));

  const kpis = [
    { label: "Órdenes abiertas", value: String(openPurchases.length), detail: money(openPurchases.reduce((s, po) => s + purchaseTotals(po).total, 0)) + " comprometido", icon: ShoppingBasket, action: () => { setTab("Órdenes"); setFilter("Abiertas"); } },
    { label: "Por aprobar", value: String(purchases.filter((po) => po.status === "Borrador").length), detail: "Borradores pendientes de autorizar", icon: ClipboardCheck, action: () => { setTab("Órdenes"); setFilter("Borrador"); } },
    { label: "En camino", value: String(purchases.filter((po) => po.status === "Enviada").length), detail: "Pedidas al proveedor", icon: Truck, action: () => { setTab("Órdenes"); setFilter("Enviada"); } },
    { label: "Productos por reponer", value: String(lowStockCount), detail: "En stock mínimo o debajo", icon: Sparkles, action: () => setTab("Sugerencias") },
  ];

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Abastecimiento <ChevronRight size={13} /> <span className="text-slate-700">Compras</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Compras</h1>
          <p className="mt-2 text-sm text-slate-500">Planea, autoriza y recibe la mercancía de tus proveedores.</p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setSupplierForm(emptySupplier(suppliers))}>
            <Factory size={16} /> Nuevo proveedor
          </button>
          <button className="primary-button" onClick={() => startDraft()}>
            <Plus size={17} /> Nueva orden de compra
          </button>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, detail, icon: Icon, action }) => (
          <button key={label} className="stat-card stat-card--link" onClick={action}>
            <div className="flex items-start justify-between">
              <div className="stat-icon">
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <ArrowUpRight size={16} className="stat-go" />
            </div>
            <div className="mt-5">
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
              <p className="stat-detail mt-2 text-xs text-slate-400">{detail}</p>
            </div>
          </button>
        ))}
      </section>

      <nav className="mt-7 flex gap-1 border-b border-slate-200">
        {(["Órdenes", "Sugerencias", "Proveedores"] as Tab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`relative px-5 py-3 text-xs font-semibold transition ${tab === item ? "text-[#285e56]" : "text-slate-400 hover:text-slate-600"}`}
          >
            {item === "Órdenes" ? "Órdenes de compra" : item === "Sugerencias" ? "Sugerencias de compra" : "Proveedores"}
            {item === "Sugerencias" && lowStockCount > 0 && (
              <span className="ml-1.5 rounded-full bg-[#fff0eb] px-1.5 py-0.5 text-[9px] text-[#c9664f]">{lowStockCount}</span>
            )}
            {tab === item && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2f7468]" />}
          </button>
        ))}
      </nav>

      {tab === "Órdenes" && (
        <section className="panel mt-6 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
            <div className="flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {(["Todas", "Abiertas", "Borrador", "Aprobada", "Enviada", "En recepción", "Recibida", "Recibida parcial"] as ListFilter[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`shrink-0 rounded-lg px-3 py-2 ${filter === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#2f7468]"
                placeholder="Buscar folio, proveedor o producto..."
              />
            </div>
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Orden / proveedor</th>
                <th className="py-3.5">Fechas</th>
                <th className="py-3.5">Partidas</th>
                <th className="py-3.5">Total</th>
                <th className="py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((po) => {
                const totals = purchaseTotals(po);
                return (
                  <tr key={po.id} className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]">
                    <td className="px-5 py-4">
                      <button className="flex items-center gap-3 text-left" onClick={() => setSelectedId(po.id)}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                          <ShoppingBasket size={17} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {po.id}
                            {po.origin !== "Manual" && (
                              <span className="ml-2 rounded bg-[#f2f8f6] px-1.5 py-0.5 text-[8px] font-semibold text-[#2f7468]">{po.origin}</span>
                            )}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">{po.supplierName}</p>
                        </div>
                      </button>
                    </td>
                    <td className="py-4 text-slate-600">
                      {po.date}
                      <p className="mt-1 text-[10px] text-slate-400">Requerida {displayDate(po.requiredISO)}</p>
                    </td>
                    <td className="py-4 text-slate-600">
                      {po.lines.length} {po.lines.length === 1 ? "producto" : "productos"}
                      <p className="mt-1 max-w-56 truncate text-[10px] text-slate-400">{po.lines.map((l) => l.name).join(", ")}</p>
                    </td>
                    <td className="py-4 font-semibold">{money(totals.total)}</td>
                    <td className="py-4">
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[po.status]}`}>{po.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]" onClick={() => setPrintId(po.id)} title="Imprimir orden de compra">
                          <Printer size={15} />
                        </button>
                        <button className="link-button ml-1" onClick={() => setSelectedId(po.id)}>
                          Abrir <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-400">No hay órdenes de compra en este filtro.</p>}
        </section>
      )}

      {tab === "Sugerencias" && specialPending.length > 0 && (
        <section className="panel mt-6 overflow-hidden border-[#d9d0f5]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#f7f5ff] px-5 py-3.5">
            <div>
              <p className="text-sm font-semibold text-[#4f3f8a]">Pedidos especiales por pedir</p>
              <p className="text-[10px] text-[#6b57a8]">Clientes que ya dejaron anticipo. Lo que llegue se aparta para ellos.</p>
            </div>
            <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-[#6b57a8]">{specialPending.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {specialPending.map((sp) => (
              <div key={sp.id} className="flex items-center gap-4 px-5 py-3 text-xs">
                <div className="flex-1">
                  <p className="font-semibold">
                    {sp.id} · {sp.client}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {sp.items.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")} · {sp.supplierName} · promesa {displayDate(sp.promiseISO)}
                  </p>
                </div>
                <button className="primary-button min-h-9" onClick={() => onSpecialToPurchase?.(sp.id)}>
                  <ShoppingBasket size={14} /> Generar orden de compra
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "Sugerencias" && (
        <Suggestions kits={kits} products={products} suppliers={suppliers} onOrder={onOrder} onCreate={(supplierId, lines, origin) => startDraft(supplierId, lines, origin)} />
      )}

      {tab === "Proveedores" && (
        <section className="panel mt-6 overflow-hidden">
          <div className="panel-header border-b border-slate-100">
            <div>
              <p className="eyebrow">Directorio</p>
              <h2 className="panel-title">Proveedores</h2>
            </div>
            <button className="primary-button" onClick={() => setSupplierForm(emptySupplier(suppliers))}>
              <Plus size={16} /> Nuevo proveedor
            </button>
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Proveedor</th>
                <th className="py-3.5">Contacto</th>
                <th className="py-3.5">Entrega</th>
                <th className="py-3.5">Productos</th>
                <th className="py-3.5">Comprado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => {
                const productCount = products.filter((p) => p.supplier === supplier.name).length;
                const bought = purchases.filter((po) => po.supplierId === supplier.id && po.status !== "Cancelada").reduce((s, po) => s + purchaseTotals(po).total, 0);
                return (
                  <tr key={supplier.id} className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                          <Building2 size={17} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{supplier.name}</p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {supplier.id} · {supplier.categories || "Sin categoría"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="text-slate-700">{supplier.contact}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{supplier.phone} · {supplier.email}</p>
                    </td>
                    <td className="py-4 text-slate-600">
                      {supplier.leadTimeDays} días
                      <p className="mt-1 text-[10px] text-slate-400">{supplier.creditDays ? `Crédito ${supplier.creditDays} días` : "Contado"}</p>
                    </td>
                    <td className="py-4 text-slate-600">{productCount}</td>
                    <td className="py-4 font-semibold">{money(bought)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]" onClick={() => setSupplierForm(supplier)} title="Editar proveedor">
                          <Pencil size={14} />
                        </button>
                        <button className="link-button ml-1" onClick={() => startDraft(supplier.id)}>
                          Comprar <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {draft && (
        <PurchaseForm
          draft={draft}
          editingId={editingId}
          suppliers={suppliers}
          products={products}
          onChange={setDraft}
          onClose={() => {
            setDraft(null);
            setEditingId(null);
          }}
          onSave={saveDraft}
          onNewSupplier={() => setSupplierForm(emptySupplier(suppliers))}
        />
      )}
      {supplierForm && (
        <SupplierModal
          supplier={supplierForm}
          isNew={!suppliers.some((s) => s.id === supplierForm.id)}
          onClose={() => setSupplierForm(null)}
          onSave={(supplier) => {
            onSaveSupplier(supplier);
            onToast(`Proveedor ${supplier.name} guardado`);
            setSupplierForm(null);
            if (draft && !draft.supplierId) setDraft({ ...draft, supplierId: supplier.id, requiredISO: addDays(TODAY_ISO, supplier.leadTimeDays) });
          }}
        />
      )}
      {printing && <PurchasePrintView po={printing} supplier={supplierOf(printing.supplierId)} onClose={() => setPrintId(null)} />}
    </>
  );
}

const emptySupplier = (suppliers: Supplier[]): Supplier => ({
  id: `PR-${String(suppliers.length + 1).padStart(2, "0")}`,
  name: "",
  contact: "",
  phone: "",
  email: "",
  rfc: "",
  address: "",
  city: "",
  leadTimeDays: 3,
  creditDays: 30,
  categories: "",
  notes: "",
});

// ---------- Sugerencias de compra ----------
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 70},${22 - ((value - min) / Math.max(1, max - min)) * 18}`)
    .join(" ");
  return (
    <svg viewBox="0 0 70 24" className="h-6 w-[70px]">
      <polyline points={points} fill="none" stroke="#2f7468" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type SuggestionRow = {
  product: InventoryProduct;
  supplier?: Supplier;
  available: number;
  incoming: number;
  weekly: number;
  trend: number;
  history: number[];
  coverage: number;
  suggested: number;
  reason: string;
};

function Suggestions({
  products,
  suppliers,
  onOrder,
  onCreate,
  kits = [],
}: {
  kits?: Kit[];
  products: InventoryProduct[];
  suppliers: Supplier[];
  onOrder: Record<string, number>;
  onCreate: (supplierId: string, lines: PurchaseLine[], origin: PurchaseOrder["origin"]) => void;
}) {
  const [mode, setMode] = useState<"Pronóstico" | "Stock mínimo">("Pronóstico");
  const [weeks, setWeeks] = useState(4);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const rows: SuggestionRow[] = products
    .filter((product) => product.status === "Activo")
    .map((product) => {
      const supplier = suppliers.find((s) => s.name === product.supplier);
      const available = product.stock - product.reserved;
      const incoming = onOrder[product.sku] || 0;
      const direct = salesHistory[product.sku] || [0, 0, 0, 0, 0, 0, 0, 0];
      // Demanda de kits que llevan este producto
      const kitUses = kits.flatMap((kit) => kit.components.filter((c) => c.sku === product.sku).map((c) => ({ kit, qty: c.quantity })));
      const history = direct.map((value, week) => value + kitUses.reduce((sum, { kit, qty }) => sum + (salesHistory[kit.sku]?.[week] ?? 0) * qty, 0));
      const kitWeekly = kitUses.reduce((sum, { kit, qty }) => sum + ((salesHistory[kit.sku] || []).slice(-4).reduce((s, v) => s + v, 0) / 4) * qty, 0);
      const recent = history.slice(-4);
      const previous = history.slice(0, 4);
      const weekly = recent.reduce((s, v) => s + v, 0) / recent.length;
      const prevAvg = previous.reduce((s, v) => s + v, 0) / previous.length;
      const trend = prevAvg ? ((weekly - prevAvg) / prevAvg) * 100 : 0;
      const leadWeeks = (supplier?.leadTimeDays ?? 7) / 7;
      const coverage = weekly ? Math.max(0, available + incoming) / weekly : 99;
      let suggested = 0;
      let reason = "";
      if (mode === "Pronóstico") {
        const need = weekly * (weeks + leadWeeks + 1);
        suggested = Math.max(0, Math.ceil(need - Math.max(0, available) - incoming));
        reason = `${Math.round(weekly)}/sem${kitWeekly ? ` (${Math.round(kitWeekly)} por kits)` : ""} × (${weeks} sem + ${supplier?.leadTimeDays ?? 7} días de entrega + 1 sem de seguridad) = ${Math.ceil(need)} − ${Math.max(0, available)} disponible${incoming ? ` − ${incoming} en camino` : ""}`;
      } else {
        const low = available <= product.minimumStock;
        suggested = low ? Math.max(0, Math.ceil(product.maximumStock - available - incoming)) : 0;
        reason = low
          ? `Máximo ${product.maximumStock} − ${available} disponible${incoming ? ` − ${incoming} en camino` : ""}`
          : `Arriba del mínimo (${product.minimumStock})`;
      }
      return { product, supplier, available, incoming, weekly, trend, history, coverage, suggested, reason };
    });

  const visibleRows = rows.filter((row) => showAll || row.suggested > 0);
  const qtyOf = (row: SuggestionRow) => (overrides[row.product.sku] !== undefined ? Number(overrides[row.product.sku]) || 0 : row.suggested);
  const groups = Object.entries(
    visibleRows.reduce<Record<string, SuggestionRow[]>>((acc, row) => {
      const key = row.supplier?.id || "sin";
      acc[key] = [...(acc[key] || []), row];
      return acc;
    }, {}),
  );

  return (
    <div className="mt-6 space-y-5">
      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["Pronóstico", "Stock mínimo"] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMode(item);
                  setOverrides({});
                }}
                className={`rounded-lg px-4 py-2 ${mode === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
              >
                {item === "Pronóstico" ? "Por pronóstico de ventas" : "Por stock mínimo"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {mode === "Pronóstico" && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Cubrir
                <select
                  value={weeks}
                  onChange={(e) => {
                    setWeeks(Number(e.target.value));
                    setOverrides({});
                  }}
                  className="form-input h-9 w-48"
                >
                  <option value={1}>1 semana</option>
                  <option value={2}>2 semanas</option>
                  <option value={4}>4 semanas (1 mes)</option>
                  <option value={8}>8 semanas (2 meses)</option>
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-[#2f7468]" />
              Mostrar productos sin sugerencia
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f2f8f6] p-3.5 text-[11px] leading-relaxed text-[#285e56]">
          <Info size={15} className="mt-0.5 shrink-0" />
          {mode === "Pronóstico" ? (
            <span>
              <strong>Cómo se calcula:</strong> venta semanal promedio de las últimas 4 semanas × (semanas a cubrir + tiempo de
              entrega del proveedor + 1 semana de seguridad), menos lo disponible y lo que ya viene en camino. Ejemplo: si vendes
              5,000 codos por semana y quieres cubrir 4 semanas, te sugiere alrededor de 20,000 más lo necesario para aguantar
              mientras llega el pedido.
            </span>
          ) : (
            <span>
              <strong>Cómo se calcula:</strong> para cada producto en su stock mínimo o debajo, se sugiere lo necesario para
              llegar a su stock máximo, descontando lo que ya viene en camino.
            </span>
          )}
        </div>
      </section>

      {groups.map(([key, groupRows]) => {
        const supplier = groupRows[0].supplier;
        const chosen = groupRows.filter((row) => !excluded.includes(row.product.sku) && qtyOf(row) > 0);
        const subtotal = chosen.reduce((sum, row) => sum + qtyOf(row) * row.product.cost, 0);
        return (
          <section key={key} className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                  <Factory size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{supplier?.name || "Productos sin proveedor asignado"}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {supplier ? `Entrega en ${supplier.leadTimeDays} días · ${supplier.creditDays ? `crédito ${supplier.creditDays} días` : "contado"}` : "Asigna un proveedor en Inventario para poder comprar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs text-slate-500">
                  {chosen.length} {chosen.length === 1 ? "producto" : "productos"} · <strong className="text-slate-800">{money(subtotal * 1.16)}</strong> con IVA
                </p>
                <button
                  className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!supplier || chosen.length === 0}
                  onClick={() =>
                    supplier &&
                    onCreate(
                      supplier.id,
                      chosen.map((row) => ({ sku: row.product.sku, name: row.product.name, unit: row.product.saleUnit, quantity: qtyOf(row), unitCost: row.product.cost })),
                      mode,
                    )
                  }
                >
                  <ShoppingBasket size={15} /> Crear orden de compra
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[28px_minmax(0,1.6fr)_96px_80px_90px_90px_110px] gap-3 bg-[#fafcfb] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              <span />
              <span>Producto</span>
              <span>{mode === "Pronóstico" ? "Venta / semana" : "Mín · Máx"}</span>
              <span className="text-right">Disponible</span>
              <span className="text-right">En camino</span>
              <span className="text-right">Cobertura</span>
              <span className="text-right">A pedir</span>
            </div>
            <div className="divide-y divide-slate-100">
              {groupRows.map((row) => {
                const included = !excluded.includes(row.product.sku);
                return (
                  <div key={row.product.sku} className={`grid grid-cols-[28px_minmax(0,1.6fr)_96px_80px_90px_90px_110px] items-center gap-3 px-5 py-3 text-xs ${included ? "" : "opacity-50"}`}>
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={() => setExcluded((items) => (included ? [...items, row.product.sku] : items.filter((s) => s !== row.product.sku)))}
                      className="size-4 accent-[#2f7468]"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.product.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400" title={row.reason}>
                        {row.product.sku} · {row.reason}
                      </p>
                    </div>
                    {mode === "Pronóstico" ? (
                      <div>
                        <Sparkline values={row.history} />
                        <p className="flex items-center gap-1 text-[10px] text-slate-500">
                          <strong className="text-slate-700">{Math.round(row.weekly)}</strong>
                          <span className={`flex items-center ${row.trend >= 0 ? "text-[#347652]" : "text-[#c9664f]"}`}>
                            {row.trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(Math.round(row.trend))}%
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-500">
                        {row.product.minimumStock} · {row.product.maximumStock}
                      </p>
                    )}
                    <p className={`text-right font-semibold ${row.available <= row.product.minimumStock ? "text-[#c9664f]" : ""}`}>
                      {row.available}
                    </p>
                    <p className="text-right text-slate-500">{row.incoming || "—"}</p>
                    <p className={`text-right ${row.coverage < 2 ? "font-semibold text-[#c9664f]" : "text-slate-500"}`}>
                      {row.weekly ? `${row.coverage.toFixed(1)} sem` : "—"}
                    </p>
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        min={0}
                        value={overrides[row.product.sku] ?? String(row.suggested)}
                        onChange={(e) => setOverrides((o) => ({ ...o, [row.product.sku]: e.target.value }))}
                        className="h-9 w-[72px] rounded-lg border border-slate-200 bg-white text-center text-sm font-bold outline-none focus:border-[#2f7468]"
                      />
                      <span className="w-8 text-[10px] text-slate-400">{row.product.saleUnit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {groups.length === 0 && (
        <section className="panel grid place-items-center px-5 py-14 text-center">
          <CircleCheck size={22} className="text-[#2f7468]" />
          <p className="mt-3 text-sm font-semibold">No hay compras sugeridas</p>
          <p className="mt-1 text-xs text-slate-400">Tu inventario cubre el periodo seleccionado.</p>
        </section>
      )}
    </div>
  );
}

// ---------- Formulario de orden de compra ----------
function PurchaseForm({
  draft,
  editingId,
  suppliers,
  products,
  onChange,
  onClose,
  onSave,
  onNewSupplier,
}: {
  draft: Draft;
  editingId: string | null;
  suppliers: Supplier[];
  products: InventoryProduct[];
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onSave: () => void;
  onNewSupplier: () => void;
}) {
  const [onlySupplier, setOnlySupplier] = useState(true);
  const [pick, setPick] = useState("");
  const supplier = suppliers.find((s) => s.id === draft.supplierId);
  const options = products.filter(
    (p) => p.status === "Activo" && (!onlySupplier || !supplier || p.supplier === supplier.name) && !draft.lines.some((l) => l.sku === p.sku),
  );
  const subtotal = draft.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const setLine = (sku: string, changes: Partial<PurchaseLine>) =>
    onChange({ ...draft, lines: draft.lines.map((l) => (l.sku === sku ? { ...l, ...changes } : l)) });
  const valid = supplier && draft.lines.length > 0 && draft.lines.every((l) => l.quantity > 0);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">{editingId ? `Editar ${editingId}` : "Nueva orden de compra"}</p>
            <h2 className="mt-1 text-xl font-semibold">{supplier ? supplier.name : "Selecciona un proveedor"}</h2>
            {draft.origin !== "Manual" && <p className="mt-1 text-xs text-[#2f7468]">Generada desde sugerencia por {draft.origin.toLowerCase()}</p>}
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <label className="form-label">
              <span className="flex items-center justify-between">
                Proveedor *
                <button type="button" className="text-[10px] font-semibold text-[#2f7468]" onClick={onNewSupplier}>
                  + Nuevo proveedor
                </button>
              </span>
              <select
                value={draft.supplierId}
                onChange={(e) => {
                  const next = suppliers.find((s) => s.id === e.target.value);
                  onChange({ ...draft, supplierId: e.target.value, requiredISO: addDays(TODAY_ISO, next?.leadTimeDays ?? 3) });
                }}
                className="form-input"
              >
                <option value="">Selecciona</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Fecha requerida
              <input type="date" value={draft.requiredISO} min={TODAY_ISO} onChange={(e) => onChange({ ...draft, requiredISO: e.target.value })} className="form-input" />
            </label>
          </div>
          {supplier && (
            <p className="flex items-center gap-2 text-[11px] text-slate-500">
              <CalendarClock size={13} /> Tiempo de entrega {supplier.leadTimeDays} días · {supplier.creditDays ? `crédito ${supplier.creditDays} días` : "contado"}
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_110px_120px_110px_32px] gap-3 bg-[#fafcfb] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Producto</span>
              <span className="text-center">Cantidad</span>
              <span className="text-right">Costo unitario</span>
              <span className="text-right">Importe</span>
              <span />
            </div>
            {draft.lines.map((item) => (
              <div key={item.sku} className="grid grid-cols-[minmax(0,1fr)_110px_120px_110px_32px] items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-[10px] text-slate-400">{item.sku}</p>
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} value={item.quantity} onChange={(e) => setLine(item.sku, { quantity: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-slate-200 text-center font-semibold outline-none focus:border-[#2f7468]" />
                  <span className="text-[10px] text-slate-400">{item.unit}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                  <input type="number" min={0} step="0.01" value={item.unitCost} onChange={(e) => setLine(item.sku, { unitCost: Number(e.target.value) })} className="h-9 w-full rounded-lg border border-slate-200 pl-5 pr-2 text-right outline-none focus:border-[#2f7468]" />
                </div>
                <p className="text-right font-semibold">{money(item.quantity * item.unitCost)}</p>
                <button className="text-slate-300 hover:text-[#c9664f]" onClick={() => onChange({ ...draft, lines: draft.lines.filter((l) => l.sku !== item.sku) })}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-slate-100 bg-[#fafcfb] px-4 py-3">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="form-input h-9 flex-1 bg-white">
                <option value="">Agregar producto...</option>
                {options.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} · disp. {p.stock - p.reserved} {p.saleUnit}
                  </option>
                ))}
              </select>
              <button
                className="secondary-button flex min-h-9 items-center gap-1 bg-white disabled:opacity-40"
                disabled={!pick}
                onClick={() => {
                  const p = products.find((item) => item.sku === pick)!;
                  onChange({ ...draft, lines: [...draft.lines, { sku: p.sku, name: p.name, unit: p.saleUnit, quantity: Math.max(1, p.maximumStock - (p.stock - p.reserved)), unitCost: p.cost }] });
                  setPick("");
                }}
              >
                <Plus size={13} /> Agregar
              </button>
              {supplier && (
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <input type="checkbox" checked={onlySupplier} onChange={(e) => setOnlySupplier(e.target.checked)} className="accent-[#2f7468]" />
                  Solo de este proveedor
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_220px] gap-5">
            <label className="form-label">
              Notas para el proveedor
              <textarea value={draft.notes} onChange={(e) => onChange({ ...draft, notes: e.target.value })} className="min-h-20 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]" placeholder="Condiciones de entrega, horario de recepción..." />
            </label>
            <div className="space-y-1.5 self-end text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IVA 16%</span>
                <span>{money(subtotal * 0.16)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{money(subtotal * 1.16)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] px-6 py-4">
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button disabled:cursor-not-allowed disabled:opacity-40" disabled={!valid} onClick={onSave}>
            <Check size={16} /> {editingId ? "Guardar cambios" : "Guardar borrador"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Detalle de orden de compra ----------
function PurchaseDetail({
  po,
  supplier,
  userName,
  onBack,
  onUpdate,
  onSendToWarehouse,
  onEdit,
  onPrint,
  onToast,
  onOpen,
  canApprove = true,
}: {
  canApprove?: boolean;
  po: PurchaseOrder;
  supplier?: Supplier;
  userName: string;
  onBack: () => void;
  onUpdate: (po: PurchaseOrder) => void;
  onSendToWarehouse: (po: PurchaseOrder) => void;
  onEdit: () => void;
  onPrint: () => void;
  onToast: (message: string) => void;
  onOpen?: (nav: string, focus: { query?: string; selectedId?: string }) => void;
}) {
  const totals = purchaseTotals(po);
  const stamp = () => `${TODAY_TEXT} · ${new Date().toTimeString().slice(0, 5)}`;
  const steps: { label: string; done: boolean }[] = [
    { label: "Borrador", done: true },
    { label: "Aprobada", done: !!po.approvedAt },
    { label: "Enviada al proveedor", done: !!po.sentAt },
    { label: "En recepción", done: !!po.arrivedAt },
    { label: po.status === "Recibida parcial" ? "Recibida parcial" : "Recibida", done: !!po.receivedAt },
  ];
  const current = steps.findIndex((s) => !s.done);
  const received = po.lines.some((l) => l.received !== undefined);

  const timeline = [
    { label: `Creada por ${po.createdBy}`, when: po.date },
    po.approvedAt && { label: `Aprobada por ${po.approvedBy}`, when: po.approvedAt },
    po.sentAt && { label: "Enviada al proveedor", when: po.sentAt },
    po.arrivedAt && { label: `Llegó a almacén · recepción ${po.receptionOrderId}`, when: po.arrivedAt },
    po.receivedAt && { label: po.status === "Recibida parcial" ? "Recibida con diferencias" : "Recibida completa", when: po.receivedAt },
    po.status === "Cancelada" && { label: "Cancelada", when: "" },
  ].filter(Boolean) as { label: string; when: string }[];

  const message = `Hola ${supplier?.contact || ""}, le compartimos la orden de compra ${po.id} por ${money(totals.total)}. Fecha requerida: ${displayDate(po.requiredISO)}.`;

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#2f7468]" onClick={onBack}>
            <ArrowLeft size={15} /> Volver a compras
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Orden de compra {po.id}</h1>
            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[po.status]}`}>{po.status}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {po.supplierName} · creada {po.date} · requerida {displayDate(po.requiredISO)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button flex items-center gap-2 bg-white" onClick={onPrint}>
            <Printer size={16} /> Imprimir
          </button>
          {po.status === "Borrador" && (
            <>
              <button className="secondary-button flex items-center gap-2 bg-white" onClick={onEdit}>
                <Pencil size={15} /> Editar
              </button>
              <button
                className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canApprove}
                title={canApprove ? "" : "Tu rol no puede aprobar órdenes de compra"}
                onClick={() => {
                  onUpdate({ ...po, status: "Aprobada", approvedBy: userName, approvedAt: stamp() });
                  onToast(`${po.id} aprobada`);
                }}
              >
                <Check size={16} /> Aprobar
              </button>
            </>
          )}
          {po.status === "Aprobada" && (
            <button
              className="primary-button"
              onClick={() => {
                onUpdate({ ...po, status: "Enviada", sentAt: stamp() });
                onToast(`${po.id} marcada como enviada a ${po.supplierName}`);
              }}
            >
              <Send size={16} /> Marcar como enviada
            </button>
          )}
          {po.status === "Enviada" && (
            <button className="primary-button" onClick={() => onSendToWarehouse(po)}>
              <PackageOpen size={16} /> Llegó · enviar a almacén
            </button>
          )}
          {po.status === "Recibida parcial" && (
            <>
              <button
                className="secondary-button flex items-center gap-2 bg-white"
                onClick={() => {
                  onUpdate({ ...po, status: "Recibida", notes: `${po.notes ? `${po.notes} · ` : ""}Cerrada con faltante` });
                  onToast(`${po.id} cerrada con faltante`);
                }}
              >
                <Check size={15} /> Cerrar con faltante
              </button>
              <button className="primary-button" onClick={() => onSendToWarehouse(po)}>
                <PackageOpen size={16} /> Llegó el faltante · enviar a almacén
              </button>
            </>
          )}
          {po.receptionOrderId && po.status === "En recepción" && (
            <button className="primary-button" onClick={() => onOpen?.("Órdenes", { selectedId: po.receptionOrderId })}>
              Ver recepción {po.receptionOrderId} <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </section>

      {po.status !== "Cancelada" && (
        <ol className="mt-6 grid grid-cols-5 gap-2">
          {steps.map((step, index) => (
            <li
              key={step.label}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-semibold ${
                step.done ? "border-[#cfe3dd] bg-[#f2f8f6] text-[#2f7468]" : index === current ? "border-[#2f7468] bg-white shadow-sm" : "border-slate-200 bg-white/60 text-slate-400"
              }`}
            >
              <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[9px] ${step.done ? "bg-[#2f7468] text-white" : index === current ? "bg-[#b8f34a] text-[#183b36]" : "bg-slate-100"}`}>
                {step.done ? <Check size={11} /> : index + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>
      )}

      {po.status === "Aprobada" && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <Info size={15} className="text-[#2f7468]" />
          <span className="flex-1">Envía la orden al proveedor por correo o WhatsApp y márcala como enviada.</span>
          <a className="link-button" href={`mailto:${supplier?.email}?subject=${encodeURIComponent(`Orden de compra ${po.id}`)}&body=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
            <Mail size={13} /> Correo
          </a>
          <a className="link-button" href={`https://wa.me/52${(supplier?.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={13} /> WhatsApp
          </a>
        </div>
      )}
      {po.status === "En recepción" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#f0d9a3] bg-[#fffaf0] px-4 py-3 text-xs text-[#8a651e]">
          <PackageCheck size={15} />
          Almacén está recibiendo la mercancía en la orden {po.receptionOrderId}. El inventario se actualiza cuando la recepción se firma.
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_340px]">
        <section className="panel overflow-hidden">
          <div className="panel-header border-b border-slate-100">
            <div>
              <p className="eyebrow">Partidas</p>
              <h2 className="panel-title">{po.lines.length} {po.lines.length === 1 ? "producto" : "productos"}</h2>
            </div>
            {po.origin !== "Manual" && <span className="rounded-lg bg-[#f2f8f6] px-2.5 py-1 text-[10px] font-semibold text-[#2f7468]">Sugerida por {po.origin.toLowerCase()}</span>}
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fafcfb] text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Producto</th>
                <th className="py-3 text-center">Pedido</th>
                {received && <th className="py-3 text-center">Recibido</th>}
                <th className="py-3 text-right">Costo</th>
                <th className="px-5 py-3 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.lines.map((item) => (
                <tr key={item.sku}>
                  <td className="px-5 py-3">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.sku}</p>
                  </td>
                  <td className="py-3 text-center">
                    {item.quantity} {item.unit}
                  </td>
                  {received && (
                    <td className={`py-3 text-center font-semibold ${(item.received ?? 0) < item.quantity ? "text-[#c9664f]" : "text-[#347652]"}`}>
                      {item.received ?? 0}
                    </td>
                  )}
                  <td className="py-3 text-right">{money(item.unitCost)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{money(item.quantity * item.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto max-w-xs space-y-1.5 p-5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>IVA 16%</span>
              <span>{money(totals.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </section>
        <div className="space-y-5">
          <section className="panel p-5">
            <p className="eyebrow">Proveedor</p>
            <p className="mt-3 text-sm font-semibold">{po.supplierName}</p>
            {supplier && (
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <p>{supplier.contact}</p>
                <p>
                  {supplier.phone} · {supplier.email}
                </p>
                <p>
                  Entrega {supplier.leadTimeDays} días · {supplier.creditDays ? `crédito ${supplier.creditDays} días` : "contado"}
                </p>
              </div>
            )}
          </section>
          <section className="panel p-5">
            <p className="eyebrow">Historial</p>
            <ol className="mt-3 space-y-3">
              {timeline.map((item, index) => (
                <li key={index} className="flex gap-3 text-xs">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-[#2f7468]" />
                  <div className="flex-1">
                    <p className="font-semibold">{item.label}</p>
                    {item.when && <p className="text-[10px] text-slate-400">{item.when}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {po.notes && (
            <section className="panel p-5">
              <p className="eyebrow">Notas</p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{po.notes}</p>
            </section>
          )}
          {["Borrador", "Aprobada"].includes(po.status) && (
            <button
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-[#c9664f]"
              onClick={() => {
                onUpdate({ ...po, status: "Cancelada" });
                onToast(`${po.id} cancelada`);
              }}
            >
              Cancelar orden de compra
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Alta / edición de proveedor ----------
function SupplierModal({
  supplier,
  isNew,
  onClose,
  onSave,
}: {
  supplier: Supplier;
  isNew: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
}) {
  const [form, setForm] = useState<Supplier>(supplier);
  const set = <K extends keyof Supplier>(key: K, value: Supplier[K]) => setForm((f) => ({ ...f, [key]: value }));
  const field = (label: string, key: keyof Supplier, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="form-label">
      {label}
      <input
        value={form[key] as string | number}
        onChange={(e) => set(key, (props.type === "number" ? Number(e.target.value) : e.target.value) as never)}
        className="form-input"
        {...props}
      />
    </label>
  );
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <form
        className="mx-auto my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">Directorio de proveedores</p>
            <h2 className="mt-1 text-xl font-semibold">{isNew ? "Nuevo proveedor" : form.name}</h2>
          </div>
          <button type="button" className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6">
          <div className="col-span-2">{field("Razón social o nombre *", "name", { required: true })}</div>
          {field("Contacto *", "contact", { required: true })}
          {field("RFC", "rfc")}
          {field("Teléfono *", "phone", { required: true })}
          {field("Correo", "email", { type: "email" })}
          <div className="col-span-2">{field("Dirección", "address")}</div>
          {field("Ciudad", "city")}
          {field("Categorías que surte", "categories", { placeholder: "Ej. PVC, conexiones" })}
          {field("Tiempo de entrega (días)", "leadTimeDays", { type: "number", min: 0 })}
          {field("Días de crédito", "creditDays", { type: "number", min: 0 })}
          <label className="form-label col-span-2">
            Notas
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-16 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]" placeholder="Pedido mínimo, condiciones de flete..." />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] px-6 py-4">
          <button type="button" className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            <Check size={16} /> Guardar proveedor
          </button>
        </div>
      </form>
    </div>
  );
}

