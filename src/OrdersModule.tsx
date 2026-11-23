import { useMemo, useState } from "react";
import { TODAY_TEXT } from "./entorno";
import { useEffect, useRef } from "react";
import PickingPrintView from "./PickingDocument";
import { staff } from "./staff";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eraser,
  FileText,
  Lock,
  MapPin,
  PackageCheck,
  PackageOpen,
  PenLine,
  Plus,
  Printer,
  Route,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Truck,
  UserRound,
  X,
} from "lucide-react";

export type OrderStatus =
  | "Pendiente"
  | "En surtido"
  | "Con faltantes"
  | "Lista"
  | "Liberada a ruta"
  | "Liberada a mostrador"
  | "Asignada a ruta"
  | "Entregada"
  | "Por reacomodar"
  | "Cancelada";

export type OrderItem = {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  aisle: string;
  shelf: string;
  available: number;
  picked: boolean;
  issue: boolean;
  /** Cantidad surtida capturada por el almacenista (sin capturar = undefined) */
  pickedQty?: number;
  /** Reacomodo: la partida ya regresó a su ubicación */
  returned?: boolean;
  /** Recepción de compra: costo unitario pactado en la orden de compra */
  unitCost?: number;
  /** Componente de un kit vendido */
  kitName?: string;
};

export type Order = {
  id: string;
  /** Surtido (salida a cliente) o Recepción (entrada de una compra) */
  kind?: "Surtido" | "Recepción";
  purchaseId?: string;
  source: string;
  customer: string;
  date: string;
  requiredAt: string;
  status: OrderStatus;
  priority: "Alta" | "Normal";
  fulfillment: "Ruta" | "Recoge en mostrador";
  route?: string;
  picker?: string;
  notes: string;
  items: OrderItem[];
  signedBy?: string;
  signedAt?: string;
  signature?: string;
  printedAt?: string;
  releasedAt?: string;
  rescheduledFrom?: string;
  /** Entrega en mostrador: quién recibió y cuándo */
  receivedBy?: string;
  deliveredAt?: string;
  cancelReason?: string;
  returnedAt?: string;
};

const seedOrders: Order[] = [
  {
    id: "OS-0832",
    source: "Venta V-1841",
    customer: "Ferremateriales Tula",
    date: "17 nov 2026 · 12:45",
    requiredAt: "19 nov, 10:00",
    status: "Liberada a ruta",
    priority: "Normal",
    fulfillment: "Ruta",
    route: "Por asignar",
    picker: "Luis Ortega",
    notes: "Entregar en bodega trasera. Cobrar contra entrega.",
    signedBy: "Luis Ortega",
    signedAt: "17 nov 2026 · 16:10",
    releasedAt: "17 nov 2026 · 16:15",
    items: [
      {
        id: "i-15",
        sku: "PVC-TUB-100",
        name: 'Tubo PVC hidráulico 1" x 6 m',
        quantity: 15,
        unit: "tramos",
        aisle: "A",
        shelf: "02",
        available: 38,
        picked: true,
        issue: false,
      },
      {
        id: "i-16",
        sku: "ROT-TIN-1100",
        name: "Tinaco tricapa 1,100 L",
        quantity: 2,
        unit: "piezas",
        aisle: "P",
        shelf: "01",
        available: 7,
        picked: true,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0831",
    source: "Venta V-1846",
    customer: "Plomería del Centro",
    date: "18 nov 2026 · 10:20",
    requiredAt: "Hoy, 13:00",
    status: "En surtido",
    priority: "Alta",
    fulfillment: "Ruta",
    route: "Ruta 03 · Norte",
    picker: "Luis Ortega",
    notes: "Confirmar CPVC antes de cargar. Entregar primero en ruta.",
    items: [
      {
        id: "i-1",
        sku: "CPVC-TUB-075",
        name: 'Tubo CPVC 3/4" x 3 m',
        quantity: 6,
        unit: "tramos",
        aisle: "C",
        shelf: "04",
        available: 16,
        picked: true,
        issue: false,
      },
      {
        id: "i-2",
        sku: "PVC-COD-100",
        name: 'Codo PVC hidráulico 1" 90°',
        quantity: 20,
        unit: "piezas",
        aisle: "A",
        shelf: "06",
        available: 124,
        picked: true,
        issue: false,
      },
      {
        id: "i-3",
        sku: "PEG-PVC-250",
        name: "Pegamento PVC azul 250 ml",
        quantity: 4,
        unit: "piezas",
        aisle: "F",
        shelf: "02",
        available: 31,
        picked: false,
        issue: false,
      },
      {
        id: "i-4",
        sku: "ACC-TEF-012",
        name: "Cinta teflón alta densidad 12 mm",
        quantity: 12,
        unit: "piezas",
        aisle: "F",
        shelf: "08",
        available: 240,
        picked: false,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0830",
    source: "Venta V-1845",
    customer: "Instalaciones Ríos",
    date: "18 nov 2026 · 09:38",
    requiredAt: "Hoy, 12:30",
    status: "Pendiente",
    priority: "Normal",
    fulfillment: "Recoge en mostrador",
    notes: "Cliente recoge en mostrador. Avisar al finalizar.",
    items: [
      {
        id: "i-5",
        sku: "PVC-TUB-100",
        name: 'Tubo PVC hidráulico 1" x 6 m',
        quantity: 4,
        unit: "tramos",
        aisle: "A",
        shelf: "02",
        available: 38,
        picked: false,
        issue: false,
      },
      {
        id: "i-6",
        sku: "VAL-ESF-050",
        name: 'Válvula esfera latón 1/2"',
        quantity: 8,
        unit: "piezas",
        aisle: "D",
        shelf: "03",
        available: 42,
        picked: false,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0829",
    source: "Venta V-1844",
    customer: "Ferretería López",
    date: "17 nov 2026 · 17:08",
    requiredAt: "Hoy, 11:30",
    status: "Con faltantes",
    priority: "Alta",
    fulfillment: "Ruta",
    route: "Ruta 02 · Centro",
    picker: "Mario Vega",
    notes: "Pedido mayorista. Mantener cajas cerradas.",
    items: [
      {
        id: "i-7",
        sku: "MAN-REF-020",
        name: 'Manguera reforzada 1/2"',
        quantity: 20,
        unit: "metros",
        aisle: "B",
        shelf: "04",
        available: 8,
        picked: false,
        issue: true,
        pickedQty: 8,
      },
      {
        id: "i-8",
        sku: "ACC-TEF-012",
        name: "Cinta teflón alta densidad 12 mm",
        quantity: 40,
        unit: "piezas",
        aisle: "F",
        shelf: "08",
        available: 240,
        picked: true,
        issue: false,
      },
      {
        id: "i-9",
        sku: "PVC-COD-100",
        name: 'Codo PVC hidráulico 1" 90°',
        quantity: 60,
        unit: "piezas",
        aisle: "A",
        shelf: "06",
        available: 124,
        picked: true,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0828",
    source: "Venta V-1842",
    customer: "Grupo Hidráulico Norte",
    date: "17 nov 2026 · 13:16",
    requiredAt: "Hoy, 10:00",
    status: "Liberada a ruta",
    priority: "Normal",
    fulfillment: "Ruta",
    route: "Por asignar",
    picker: "Luis Ortega",
    notes: "Carga completa validada.",
    signedBy: "Luis Ortega",
    signedAt: "17 nov 2026 · 15:40",
    releasedAt: "17 nov 2026 · 15:45",
    items: [
      {
        id: "i-10",
        sku: "ROT-TIN-1100",
        name: "Tinaco tricapa 1,100 L",
        quantity: 2,
        unit: "piezas",
        aisle: "P",
        shelf: "01",
        available: 7,
        picked: true,
        issue: false,
      },
      {
        id: "i-11",
        sku: "PVC-TUB-100",
        name: 'Tubo PVC hidráulico 1" x 6 m',
        quantity: 10,
        unit: "tramos",
        aisle: "A",
        shelf: "02",
        available: 38,
        picked: true,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0827",
    source: "Venta V-1840",
    customer: "Obras del Bajío",
    date: "16 nov 2026 · 15:42",
    requiredAt: "17 nov, 09:00",
    status: "Asignada a ruta",
    priority: "Normal",
    fulfillment: "Ruta",
    route: "Ruta 01 · Foránea",
    picker: "Mario Vega",
    signedBy: "Mario Vega",
    signedAt: "16 nov 2026 · 17:10",
    releasedAt: "16 nov 2026 · 17:20",
    notes: "Documentación dentro del paquete 1 de 3.",
    items: [
      {
        id: "i-12",
        sku: "PVC-TUB-100",
        name: 'Tubo PVC hidráulico 1" x 6 m',
        quantity: 12,
        unit: "tramos",
        aisle: "A",
        shelf: "02",
        available: 38,
        picked: true,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0826",
    source: "Venta V-1839",
    customer: "Ferretería López",
    date: "16 nov 2026 · 13:20",
    requiredAt: "Hoy, 15:00",
    status: "Liberada a ruta",
    priority: "Normal",
    fulfillment: "Ruta",
    route: "Por asignar",
    picker: "Luis Ortega",
    signedBy: "Luis Ortega",
    signedAt: "17 nov 2026 · 09:20",
    releasedAt: "17 nov 2026 · 09:30",
    notes: "Pedido validado y empacado en 4 cajas.",
    items: [
      {
        id: "i-13",
        sku: "PVC-COD-100",
        name: 'Codo PVC hidráulico 1" 90°',
        quantity: 40,
        unit: "piezas",
        aisle: "A",
        shelf: "06",
        available: 124,
        picked: true,
        issue: false,
      },
    ],
  },
  {
    id: "OS-0825",
    source: "Venta V-1838",
    customer: "Constructora MZ",
    date: "16 nov 2026 · 12:05",
    requiredAt: "Hoy, 16:30",
    status: "Lista",
    priority: "Alta",
    fulfillment: "Ruta",
    picker: "Mario Vega",
    signedBy: "Mario Vega",
    signedAt: "18 nov 2026 · 09:05",
    notes: "Acceso a obra por puerta de proveedores.",
    items: [
      {
        id: "i-14",
        sku: "CPVC-TUB-075",
        name: 'Tubo CPVC 3/4" x 3 m',
        quantity: 8,
        unit: "tramos",
        aisle: "C",
        shelf: "04",
        available: 16,
        picked: true,
        issue: false,
      },
    ],
  },
];

export type OrderFilter = "Todas" | "Por surtir" | "Listas para salida" | "Recepciones" | OrderStatus;
export const isReception = (order: Order) => order.kind === "Recepción";
export const receptionLabel = (status: OrderStatus) =>
  status === "Pendiente" ? "Por recibir" : status === "En surtido" ? "Recibiendo" : status === "Lista" ? "Recibida" : status;
export const toPickStatuses: OrderStatus[] = ["Pendiente", "En surtido"];
const readyStatuses: OrderStatus[] = ["Lista", "Liberada a ruta", "Liberada a mostrador"];
const editableStatuses: OrderStatus[] = ["Pendiente", "En surtido", "Con faltantes"];
const isCaptured = (item: OrderItem) => item.pickedQty !== undefined && item.pickedQty !== null;
type LineState = "Pendiente" | "Completa" | "Parcial" | "Sin surtir";
const lineState = (item: OrderItem): LineState =>
  !isCaptured(item)
    ? "Pendiente"
    : (item.pickedQty as number) >= item.quantity
      ? "Completa"
      : (item.pickedQty as number) > 0
        ? "Parcial"
        : "Sin surtir";

// Las partidas ya surtidas en los datos de ejemplo traen su cantidad capturada
export const initialOrders: Order[] = seedOrders.map((order) => ({
  ...order,
  items: order.items.map((item) => ({
    ...item,
    pickedQty: item.pickedQty ?? (item.picked ? item.quantity : undefined),
  })),
}));

const statusStyles: Record<OrderStatus, string> = {
  Pendiente: "bg-slate-100 text-slate-600",
  "En surtido": "bg-[#e8f2ff] text-[#3973a8]",
  "Con faltantes": "bg-[#fff0eb] text-[#c9664f]",
  Lista: "bg-[#eaf6ef] text-[#347652]",
  "Liberada a ruta": "bg-[#e3f1ee] text-[#2f7468]",
  "Liberada a mostrador": "bg-[#eef7e0] text-[#4a6b12]",
  "Por reacomodar": "bg-[#fff6df] text-[#9a6b18]",
  "Asignada a ruta": "bg-[#f0ecff] text-[#6b57a8]",
  Entregada: "bg-[#eaf6ef] text-[#347652]",
  Cancelada: "bg-slate-100 text-slate-400",
};

export default function OrdersModule({
  orders,
  onUpdate,
  onAdd,
  onToast,
  initialQuery = "",
  initialStatus = "Todas",
  initialSelectedId,
  onNavigate,
}: {
  orders: Order[];
  onUpdate: (order: Order) => void;
  onAdd: (order: Order) => void;
  onToast: (message: string) => void;
  initialQuery?: string;
  initialStatus?: OrderFilter;
  initialSelectedId?: string;
  onNavigate?: (nav: string, focus?: { selectedId?: string }) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<OrderFilter>(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [newOpen, setNewOpen] = useState(false);

  const matchesFilter = (order: Order, filter: OrderFilter) =>
    filter === "Todas" ||
    (filter === "Recepciones"
      ? isReception(order)
      : !isReception(order) &&
    (filter === "Por surtir"
      ? toPickStatuses.includes(order.status)
      : filter === "Listas para salida"
        ? readyStatuses.includes(order.status)
        : order.status === filter));

  const selected = orders.find((order) => order.id === selectedId) || null;
  const allPicking = orders.filter((order) => !isReception(order));
  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesFilter(order, status) &&
          `${order.id} ${order.source} ${order.customer} ${order.route || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [orders, query, status],
  );

  if (selected?.status === "Por reacomodar") {
    return (
      <ReturnView
        order={selected}
        onBack={() => setSelectedId(null)}
        onUpdate={onUpdate}
        onToast={onToast}
      />
    );
  }

  if (selected && isReception(selected)) {
    return (
      <ReceptionView
        order={selected}
        onBack={() => setSelectedId(null)}
        onUpdate={onUpdate}
        onToast={onToast}
        onNavigate={onNavigate}
      />
    );
  }

  if (selected) {
    return (
      <PickingView
        order={selected}
        onBack={() => setSelectedId(null)}
        onUpdate={onUpdate}
        onToast={onToast}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Operación <ChevronRight size={13} /> <span className="text-slate-700">Órdenes</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">
            Órdenes de surtido
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Coordina la reserva, el picking y la salida de cada pedido.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="secondary-button flex items-center gap-2 bg-white"
            onClick={() => onToast("Resumen de órdenes enviado a impresión")}
          >
            <Printer size={16} /> <span className="hidden sm:inline">Imprimir resumen</span>
          </button>
          <button className="primary-button" onClick={() => setNewOpen(true)}>
            <Plus size={17} /> Nueva orden
          </button>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(() => { const orders = allPicking; return [
          {
            label: "Por surtir",
            value: String(orders.filter((order) => toPickStatuses.includes(order.status)).length),
            detail: `${
              orders.filter(
                (order) => toPickStatuses.includes(order.status) && order.priority === "Alta",
              ).length
            } con prioridad alta`,
            icon: ClipboardList,
            filter: "Por surtir" as OrderFilter,
          },
          {
            label: "En proceso",
            value: String(orders.filter((order) => order.status === "En surtido").length),
            detail: "Picking activo",
            icon: Boxes,
            filter: "En surtido" as OrderFilter,
          },
          {
            label: "Con faltantes",
            value: String(orders.filter((order) => order.status === "Con faltantes").length),
            detail: "Requieren atención",
            icon: TriangleAlert,
            filter: "Con faltantes" as OrderFilter,
          },
          {
            label: "Listas para salida",
            value: String(orders.filter((order) => readyStatuses.includes(order.status)).length),
            detail: "Firmadas o liberadas a ruta",
            icon: PackageCheck,
            filter: "Listas para salida" as OrderFilter,
          },
        ]; })().map(({ label, value, detail, icon: Icon, filter }) => (
          <button
            key={label}
            className="stat-card stat-card--link"
            onClick={() => {
              setStatus(filter);
              setQuery("");
            }}
          >
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

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(
              [
                "Todas",
                "Por surtir",
                "En surtido",
                "Con faltantes",
                "Listas para salida",
                "Liberada a ruta",
                "Liberada a mostrador",
                "Por reacomodar",
                "Recepciones",
              ] as const
            ).map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`shrink-0 rounded-lg px-3 py-2 ${
                    status === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"
                  }`}
                >
                  {item}
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {orders.filter((order) => matchesFilter(order, item)).length}
                  </span>
                </button>
              ),
            )}
          </div>
          <div className="ml-auto flex w-full gap-2 lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#2f7468]"
                placeholder="Buscar orden, venta, cliente o ruta..."
              />
            </div>
            <button
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              onClick={() => onToast("Filtros de órdenes actualizados")}
              aria-label="Más filtros"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Orden / cliente</th>
                <th className="py-3.5">Entrega</th>
                <th className="py-3.5">Avance</th>
                <th className="py-3.5">Responsable</th>
                <th className="py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const picked = order.items.filter(isCaptured).length;
                const progress = Math.round((picked / Math.max(1, order.items.length)) * 100);
                return (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]"
                  >
                    <td className="px-5 py-4">
                      <button
                        className="flex items-center gap-3 text-left"
                        onClick={() => setSelectedId(order.id)}
                      >
                        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${isReception(order) ? "bg-[#fff6df] text-[#9a6b18]" : "bg-[#edf4f2] text-[#2f7468]"}`}>
                          {isReception(order) ? <PackageOpen size={17} /> : <ClipboardCheck size={17} />}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {order.id}
                            {isReception(order) && (
                              <span className="ml-2 rounded bg-[#fff6df] px-1.5 py-0.5 text-[8px] font-semibold text-[#9a6b18]">
                                Entrada de compra
                              </span>
                            )}
                            {order.priority === "Alta" && (
                              <span className="ml-2 rounded bg-[#fff0eb] px-1.5 py-0.5 text-[8px] font-semibold text-[#c9664f]">
                                Prioridad alta
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {order.customer} · {order.source}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="py-4">
                      <p className="font-medium">{order.requiredAt}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {order.fulfillment}
                        {order.route ? ` · ${order.route}` : ""}
                      </p>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#2f7468]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{progress}%</span>
                      </div>
                      <p className="mt-1.5 text-[9px] text-slate-400">
                        {picked} de {order.items.length} partidas
                      </p>
                    </td>
                    <td className="py-4 text-slate-500">{order.picker || "Sin asignar"}</td>
                    <td className="py-4">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status]}`}
                      >
                        {isReception(order) ? receptionLabel(order.status) : order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="link-button" onClick={() => setSelectedId(order.id)}>
                        {isReception(order)
                          ? order.status === "Lista"
                            ? "Ver recepción"
                            : order.status === "Pendiente"
                              ? "Recibir mercancía"
                              : "Continuar recepción"
                          : order.status === "Pendiente"
                          ? "Comenzar surtido"
                          : editableStatuses.includes(order.status)
                            ? "Continuar surtido"
                            : order.status === "Lista"
                              ? "Liberar"
                              : order.status === "Liberada a mostrador"
                                ? "Entregar"
                              : order.status === "Por reacomodar"
                                ? "Reacomodar"
                                : "Ver picking"}
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="grid place-items-center px-5 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <ClipboardList size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold">No encontramos órdenes</p>
            <p className="mt-1 text-xs text-slate-400">Cambia la búsqueda o crea una nueva.</p>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Mostrando {filtered.length} de {orders.length} órdenes
        </div>
      </section>

      {newOpen && (
        <NewOrderModal
          orders={orders}
          onClose={() => setNewOpen(false)}
          onCreate={(order) => {
            onAdd(order);
            setNewOpen(false);
            onToast(`Orden ${order.id} creada y stock reservado`);
          }}
        />
      )}
    </>
  );
}

/** Almacenistas: vienen de Colaboradores */
const pickersList = () => staff.pickers;

const lineStyles: Record<LineState, { badge: string; row: string; dot: string }> = {
  Pendiente: { badge: "bg-slate-100 text-slate-500", row: "", dot: "border-slate-200 bg-white text-slate-400" },
  Completa: { badge: "bg-[#eaf6ef] text-[#347652]", row: "bg-[#f7fbf8]", dot: "border-[#2f7468] bg-[#2f7468] text-white" },
  Parcial: { badge: "bg-[#fff6df] text-[#9a6b18]", row: "bg-[#fffcf3]", dot: "border-[#e2b553] bg-[#fff6df] text-[#9a6b18]" },
  "Sin surtir": { badge: "bg-[#fff0eb] text-[#c9664f]", row: "bg-[#fff8f5]", dot: "border-[#e5785f] bg-[#fff0eb] text-[#c9664f]" },
};

const stamp = () => `${TODAY_TEXT} · ${new Date().toTimeString().slice(0, 5)}`;

function PickingView({
  order,
  onBack,
  onUpdate,
  onToast,
  onNavigate,
}: {
  order: Order;
  onBack: () => void;
  onUpdate: (order: Order) => void;
  onToast: (message: string) => void;
  onNavigate?: (nav: string, focus?: { selectedId?: string }) => void;
}) {
  const [signOpen, setSignOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const editable = editableStatuses.includes(order.status);
  const signed = Boolean(order.signedBy);
  const released = ["Liberada a ruta", "Asignada a ruta", "Liberada a mostrador", "Entregada"].includes(order.status);
  const [handOver, setHandOver] = useState(false);
  const items = [...order.items].sort((a, b) =>
    `${a.aisle}-${a.shelf}`.localeCompare(`${b.aisle}-${b.shelf}`),
  );
  const captured = order.items.filter(isCaptured).length;
  const allCaptured = captured === order.items.length && order.items.length > 0;
  const counts = order.items.reduce(
    (acc, item) => ({ ...acc, [lineState(item)]: acc[lineState(item)] + 1 }),
    { Pendiente: 0, Completa: 0, Parcial: 0, "Sin surtir": 0 } as Record<LineState, number>,
  );
  const requestedUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const pickedUnits = order.items.reduce((sum, item) => sum + (item.pickedQty ?? 0), 0);
  const fillRate = Math.round((pickedUnits / Math.max(1, requestedUnits)) * 100);
  const shortages = counts.Parcial + counts["Sin surtir"];

  const setQty = (itemId: string, value: number | undefined) => {
    const nextItems = order.items.map((item) => {
      if (item.id !== itemId) return item;
      const pickedQty =
        value === undefined || Number.isNaN(value)
          ? undefined
          : Math.max(0, Math.min(item.quantity, value));
      return {
        ...item,
        pickedQty,
        picked: pickedQty === item.quantity,
        issue: pickedQty !== undefined && pickedQty < item.quantity,
      };
    });
    onUpdate({ ...order, items: nextItems, status: "En surtido", picker: order.picker || "Luis Ortega" });
  };

  const fillAll = () => {
    onUpdate({
      ...order,
      status: "En surtido",
      picker: order.picker || "Luis Ortega",
      items: order.items.map((item) =>
        isCaptured(item) ? item : { ...item, pickedQty: item.quantity, picked: true, issue: false },
      ),
    });
  };

  const sign = (picker: string, signature: string) => {
    onUpdate({
      ...order,
      status: "Lista",
      picker,
      signedBy: picker,
      signedAt: stamp(),
      signature,
    });
    setSignOpen(false);
    onToast(`Surtido de ${order.id} firmado por ${picker}`);
  };

  const reopen = () => {
    onUpdate({
      ...order,
      status: "En surtido",
      signedBy: undefined,
      signedAt: undefined,
      signature: undefined,
      printedAt: undefined,
    });
    onToast(`${order.id} reabierta para corregir el surtido`);
  };

  const release = () => {
    if (order.fulfillment === "Ruta") {
      onUpdate({ ...order, status: "Liberada a ruta", route: "Por asignar", releasedAt: stamp() });
      onToast(`${order.id} liberada: ya aparece en Rutas para armar la hoja de ruta`);
    } else {
      onUpdate({ ...order, status: "Liberada a mostrador", releasedAt: stamp() });
      onToast(`${order.id} liberada a mostrador: lista para entregar al cliente`);
    }
  };

  const openPrint = () => {
    setPrintOpen(true);
    if (!order.printedAt) onUpdate({ ...order, printedAt: stamp() });
  };

  const steps = [
    { label: "Surtir partidas", done: allCaptured || signed },
    { label: "Firmar", done: signed },
    { label: "Imprimir picking", done: Boolean(order.printedAt) || released },
    { label: order.fulfillment === "Ruta" ? "Liberar a ruta" : "Liberar a mostrador", done: released },
  ];
  const currentStep = steps.findIndex((step) => !step.done);

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button
            className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#2f7468]"
            onClick={onBack}
          >
            <ArrowLeft size={15} /> Volver a órdenes
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-[32px]">
              Orden {order.id}
            </h1>
            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status]}`}>
              {order.status}
            </span>
            {order.priority === "Alta" && (
              <span className="rounded-lg bg-[#fff0eb] px-2.5 py-1 text-[10px] font-semibold text-[#c9664f]">
                Prioridad alta
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {order.customer} · {order.source} · Creada {order.date}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="secondary-button flex items-center gap-2 bg-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!signed}
            title={signed ? "Imprimir hoja de picking" : "Disponible cuando el surtido esté firmado"}
            onClick={openPrint}
          >
            <Printer size={16} /> Imprimir picking
          </button>
          {editable && (
            <button
              className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!allCaptured}
              title={allCaptured ? "" : "Captura la cantidad surtida de todas las partidas"}
              onClick={() => setSignOpen(true)}
            >
              <PenLine size={16} /> Terminar y firmar
            </button>
          )}
          {order.status === "Lista" && (
            <button className="primary-button" onClick={release}>
              {order.fulfillment === "Ruta" ? <Truck size={16} /> : <PackageCheck size={16} />}
              {order.fulfillment === "Ruta" ? "Liberar a ruta" : "Liberar a mostrador"}
            </button>
          )}
          {order.status === "Liberada a mostrador" && (
            <button className="primary-button" onClick={() => setHandOver(true)}>
              <PackageCheck size={16} /> Entregar al cliente
            </button>
          )}
        </div>
      </section>

      {/* Pasos del proceso */}
      <ol className="mt-6 grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              step.done
                ? "border-[#cfe3dd] bg-[#f2f8f6] text-[#2f7468]"
                : index === currentStep
                  ? "border-[#2f7468] bg-white text-[#162523] shadow-sm"
                  : "border-slate-200 bg-white/60 text-slate-400"
            }`}
          >
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] ${
                step.done
                  ? "bg-[#2f7468] text-white"
                  : index === currentStep
                    ? "bg-[#b8f34a] text-[#183b36]"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {step.done ? <Check size={12} /> : index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      {released && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#cfe3dd] bg-[#f2f8f6] px-4 py-3 text-xs text-[#285e56]">
          <Lock size={15} />
          <span className="flex-1">
            <strong>
              {order.status === "Entregada"
                ? `Entregada${order.receivedBy ? ` a ${order.receivedBy}` : ""}${order.deliveredAt ? ` el ${order.deliveredAt}` : ""}`
                : order.status === "Liberada a mostrador"
                  ? `Liberada a mostrador${order.releasedAt ? ` el ${order.releasedAt}` : ""}: el material espera al cliente en mostrador`
                  : `Orden liberada a ruta${order.releasedAt ? ` el ${order.releasedAt}` : ""}`}
              .
            </strong>{" "}
            El surtido está cerrado y ya no se puede modificar.
          </span>
          {order.fulfillment === "Ruta" && onNavigate && (
            <button className="link-button" onClick={() => onNavigate("Rutas")}>
              Ir a Rutas <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      )}
      {order.status === "Lista" && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <Lock size={15} className="text-[#2f7468]" />
          <span className="flex-1">
            Surtido firmado por <strong className="text-slate-700">{order.signedBy}</strong> el{" "}
            {order.signedAt}. Imprime la hoja y libérala{" "}
            {order.fulfillment === "Ruta" ? "a ruta" : "a mostrador para entregarla al cliente"}.
          </span>
          <button className="text-[11px] font-semibold text-slate-400 hover:text-[#c9664f]" onClick={reopen}>
            Corregir surtido
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_340px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div>
              <p className="eyebrow">Lista de picking · ordenada por ubicación</p>
              <h2 className="mt-1 text-lg font-semibold">Partidas a surtir</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-[#2f7468]">
                {captured}/{order.items.length} capturadas
              </p>
              {editable && !allCaptured && (
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-500 hover:border-[#2f7468] hover:text-[#2f7468]"
                  onClick={fillAll}
                >
                  Surtir todo completo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[32px_58px_minmax(0,1fr)_184px_84px] gap-4 border-b border-slate-100 bg-[#fafcfb] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>#</span>
            <span>Ubicación</span>
            <span>Producto</span>
            <span>Surtido / solicitado</span>
            <span className="text-right">Estado</span>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const state = lineState(item);
              const styles = lineStyles[state];
              const lowStock = item.available < item.quantity;
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[32px_58px_minmax(0,1fr)_184px_84px] items-center gap-4 px-5 py-4 ${styles.row}`}
                >
                  <span className={`grid size-8 place-items-center rounded-lg border text-xs font-semibold ${styles.dot}`}>
                    {state === "Completa" ? <Check size={15} /> : index + 1}
                  </span>
                  <div className="rounded-lg bg-[#edf4f2] px-2 py-1.5 text-center">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5c8f85]">Pasillo</p>
                    <p className="text-sm font-bold text-[#2f7468]">
                      {item.aisle}-{item.shelf}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                    {item.kitName && (
                      <p className="mt-0.5 inline-block rounded bg-[#eef7e0] px-1.5 py-0.5 text-[9px] font-semibold text-[#4a6b12]">Componente de {item.kitName}</p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">
                      {item.sku} ·{" "}
                      <span className={lowStock ? "font-semibold text-[#c9664f]" : ""}>
                        Existencia {item.available} {item.unit}
                        {lowStock ? " (insuficiente)" : ""}
                      </span>
                    </p>
                  </div>
                  <div>
                    <div
                      className={`flex h-12 items-center rounded-xl border-2 bg-white transition ${
                        editable ? "focus-within:border-[#2f7468] focus-within:ring-4 focus-within:ring-[#2f7468]/10" : "opacity-80"
                      } ${state === "Pendiente" ? "border-slate-200" : state === "Completa" ? "border-[#9cc8bc]" : state === "Parcial" ? "border-[#ecd08f]" : "border-[#f0b4a5]"}`}
                    >
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={item.quantity}
                        step="any"
                        value={item.pickedQty ?? ""}
                        placeholder="_"
                        disabled={!editable}
                        onChange={(event) =>
                          setQty(item.id, event.target.value === "" ? undefined : Number(event.target.value))
                        }
                        onFocus={(event) => event.target.select()}
                        aria-label={`Cantidad surtida de ${item.name}`}
                        className="h-full w-[72px] bg-transparent text-center text-lg font-bold text-[#162523] outline-none placeholder:text-slate-300 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="whitespace-nowrap pr-3 text-sm font-semibold text-slate-400">
                        / {item.quantity} <span className="text-[10px] font-medium">{item.unit}</span>
                      </span>
                    </div>
                    {editable && (
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          className="flex-1 rounded-md bg-[#edf4f2] py-1 text-[10px] font-semibold text-[#2f7468] hover:bg-[#dcebe7]"
                          onClick={() => setQty(item.id, item.quantity)}
                        >
                          Completo
                        </button>
                        <button
                          className="flex-1 rounded-md bg-[#fff0eb] py-1 text-[10px] font-semibold text-[#c9664f] hover:bg-[#ffe4da]"
                          onClick={() => setQty(item.id, 0)}
                        >
                          No hay (0)
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ${styles.badge}`}>
                      {state}
                    </span>
                    {state === "Parcial" && (
                      <p className="mt-1 text-[9px] text-[#9a6b18]">
                        Faltan {item.quantity - (item.pickedQty ?? 0)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {editable && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-[#fafcfb] px-5 py-3 text-[11px] text-slate-500">
              <TriangleAlert size={13} className="text-slate-400" />
              Escribe la cantidad que realmente surtiste. Si no hay producto, deja la partida en
              <strong className="text-slate-700">0</strong>.
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="panel p-5">
            <p className="eyebrow">Resumen del surtido</p>
            <div className="mt-4">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-semibold tracking-tight">{fillRate}%</p>
                <p className="text-[10px] text-slate-400">
                  {pickedUnits} de {requestedUnits} unidades
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#2f7468] transition-all" style={{ width: `${fillRate}%` }} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="Completas" value={String(counts.Completa)} />
              <Metric label="Parciales" value={String(counts.Parcial)} danger={counts.Parcial > 0} />
              <Metric label="Sin surtir" value={String(counts["Sin surtir"])} danger={counts["Sin surtir"] > 0} />
              <Metric label="Por capturar" value={String(counts.Pendiente)} />
            </div>
            {allCaptured && shortages > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#fff6df] p-3 text-[10px] leading-relaxed text-[#8a651e]">
                <TriangleAlert size={14} className="shrink-0" />
                {shortages} {shortages === 1 ? "partida se entregará incompleta" : "partidas se entregarán incompletas"}. Quedará registrado en la hoja de picking.
              </div>
            )}
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Firma del responsable</p>
            {signed ? (
              <div className="mt-3">
                <div className="grid h-24 place-items-center rounded-xl border border-slate-200 bg-[#fafcfb]">
                  {order.signature ? (
                    <img src={order.signature} alt={`Firma de ${order.signedBy}`} className="max-h-20" />
                  ) : (
                    <span className="font-serif text-2xl italic text-[#183b36]">{order.signedBy}</span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold">{order.signedBy}</p>
                <p className="text-[10px] text-slate-400">Responsable de picking · {order.signedAt}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Al capturar todas las partidas, el responsable firma para cerrar el surtido. Después se
                habilita la impresión y la liberación.
              </p>
            )}
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Información de salida</p>
            <div className="mt-4 space-y-4">
              <Info icon={Clock3} label="Fecha requerida" value={order.requiredAt} />
              <Info
                icon={order.fulfillment === "Ruta" ? Route : PackageCheck}
                label="Tipo de entrega"
                value={order.fulfillment}
              />
              {order.route && <Info icon={Truck} label="Ruta" value={order.route} />}
              <Info icon={UserRound} label="Responsable de picking" value={order.picker || "Sin asignar"} />
            </div>
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Notas de la orden</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">{order.notes}</p>
          </section>
        </div>
      </div>

      {handOver && (
        <HandOverModal
          order={order}
          onClose={() => setHandOver(false)}
          onConfirm={(receivedBy) => {
            onUpdate({ ...order, status: "Entregada", receivedBy, deliveredAt: stamp() });
            setHandOver(false);
            onToast(`${order.id} entregada en mostrador a ${receivedBy}`);
          }}
        />
      )}
      {signOpen && (
        <SignatureModal
          order={order}
          shortages={shortages}
          defaultPicker={order.picker || pickersList()[0]}
          onClose={() => setSignOpen(false)}
          onSign={sign}
        />
      )}
      {printOpen && <PickingPrintView order={order} onClose={() => setPrintOpen(false)} />}
    </>
  );
}

function ReturnView({
  order,
  onBack,
  onUpdate,
  onToast,
}: {
  order: Order;
  onBack: () => void;
  onUpdate: (order: Order) => void;
  onToast: (message: string) => void;
}) {
  const items = [...order.items].sort((a, b) =>
    `${a.aisle}-${a.shelf}`.localeCompare(`${b.aisle}-${b.shelf}`),
  );
  const done = order.items.filter((item) => item.returned || !(item.pickedQty ?? item.quantity)).length;
  const allDone = done === order.items.length;
  const toggle = (id: string) =>
    onUpdate({
      ...order,
      items: order.items.map((item) => (item.id === id ? { ...item, returned: !item.returned } : item)),
    });
  const confirm = () => {
    onUpdate({ ...order, status: "Cancelada", returnedAt: stamp() });
    onToast(`${order.id}: material reacomodado y orden cancelada`);
    onBack();
  };

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button
            className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#2f7468]"
            onClick={onBack}
          >
            <ArrowLeft size={15} /> Volver a órdenes
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-[32px]">
              Reacomodo · {order.id}
            </h1>
            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status]}`}>
              {order.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {order.customer} · {order.source}
          </p>
        </div>
        <button className="primary-button disabled:cursor-not-allowed disabled:opacity-40" disabled={!allDone} onClick={confirm}>
          <Check size={16} /> Confirmar reacomodo
        </button>
      </section>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#f0d9a3] bg-[#fffaf0] px-4 py-3 text-xs text-[#8a651e]">
        <TriangleAlert size={15} className="mt-0.5 shrink-0" />
        <span>
          <strong>Pedido cancelado en ruta.</strong> {order.cancelReason}. Regresa cada partida a su ubicación y
          márcala como reacomodada. Al confirmar, la orden queda cancelada y se libera el stock apartado.
        </span>
      </div>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <p className="eyebrow">Material a regresar · ordenado por ubicación</p>
            <h2 className="mt-1 text-lg font-semibold">Partidas a reacomodar</h2>
          </div>
          <p className="text-xs font-semibold text-[#2f7468]">
            {done}/{order.items.length} reacomodadas
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item, index) => {
            const qty = item.pickedQty ?? item.quantity;
            const nothing = qty === 0;
            const ok = item.returned || nothing;
            return (
              <div key={item.id} className={`flex items-center gap-4 px-5 py-4 ${ok ? "bg-[#f7fbf8]" : ""}`}>
                <span className={`grid size-8 place-items-center rounded-lg border text-xs font-semibold ${ok ? "border-[#2f7468] bg-[#2f7468] text-white" : "border-slate-200 text-slate-400"}`}>
                  {ok ? <Check size={15} /> : index + 1}
                </span>
                <div className="w-[58px] rounded-lg bg-[#edf4f2] px-2 py-1.5 text-center">
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5c8f85]">Pasillo</p>
                  <p className="text-sm font-bold text-[#2f7468]">
                    {item.aisle}-{item.shelf}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{item.sku}</p>
                </div>
                <p className="w-32 text-right text-lg font-bold">
                  {qty} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                </p>
                <button
                  disabled={nothing}
                  onClick={() => toggle(item.id)}
                  className={`w-36 rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition disabled:opacity-60 ${
                    ok ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500 hover:border-[#2f7468]"
                  }`}
                >
                  {nothing ? "No se surtió" : ok ? "✓ Reacomodada" : "Marcar reacomodada"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SignatureModal({
  order,
  shortages,
  defaultPicker,
  onClose,
  onSign,
  mode = "picking",
}: {
  mode?: "picking" | "reception";
  order: Order;
  shortages: number;
  defaultPicker: string;
  onClose: () => void;
  onSign: (picker: string, signature: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pickers = pickersList();
  const [picker, setPicker] = useState(pickers.includes(defaultPicker) ? defaultPicker : pickers[0]);
  const [hasInk, setHasInk] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#183b36";
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const element = canvas.current!;
    const rect = element.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * element.width,
      y: ((event.clientY - rect.top) / rect.height) * element.height,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    setHasInk(true);
  };

  const clear = () => {
    const element = canvas.current;
    element?.getContext("2d")?.clearRect(0, 0, element.width, element.height);
    setHasInk(false);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#102521]/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">{mode === "reception" ? "Cerrar recepción" : "Cerrar surtido"}</p>
            <h2 className="mt-1 text-xl font-semibold">Firma del responsable · {order.id}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {order.customer} · {order.items.length} partidas
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <label className="form-label">
            {mode === "reception" ? "Responsable de recepción" : "Responsable de picking"}
            <select value={picker} onChange={(event) => setPicker(event.target.value)} className="form-input">
              {pickers.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="form-label">
            <span className="flex items-center justify-between">
              Firma
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-[#2f7468]"
                onClick={clear}
              >
                <Eraser size={12} /> Limpiar
              </button>
            </span>
            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-[#fafcfb]">
              <canvas
                ref={canvas}
                width={880}
                height={260}
                className="block h-[150px] w-full cursor-crosshair touch-none"
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={() => (drawing.current = false)}
                onPointerLeave={() => (drawing.current = false)}
              />
              {!hasInk && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-slate-300">
                  Firma aquí con el mouse o el dedo
                </span>
              )}
              <span className="pointer-events-none absolute inset-x-8 bottom-8 border-b border-slate-300" />
            </div>
          </div>
          {shortages > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff6df] p-3 text-[11px] text-[#8a651e]">
              <TriangleAlert size={14} className="shrink-0" />
              {shortages} {shortages === 1 ? "partida queda incompleta" : "partidas quedan incompletas"} y se
              registrará así {mode === "reception" ? "en la orden de compra (recepción parcial)" : "en la hoja de picking"}.
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-4 accent-[#2f7468]"
            />
            {mode === "reception"
              ? "Confirmo que las cantidades capturadas corresponden al material recibido y revisado físicamente."
              : "Confirmo que las cantidades capturadas corresponden al material surtido físicamente."}
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasInk || !confirmed}
            onClick={() => onSign(picker, canvas.current!.toDataURL("image/png"))}
          >
            <PenLine size={15} /> {mode === "reception" ? "Firmar y dar entrada" : "Firmar y cerrar surtido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewOrderModal({
  orders,
  onClose,
  onCreate,
}: {
  orders: Order[];
  onClose: () => void;
  onCreate: (order: Order) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState<Order["priority"]>("Normal");
  const [fulfillment, setFulfillment] = useState<Order["fulfillment"]>("Ruta");
  const [requiredAt, setRequiredAt] = useState("Hoy, 17:00");
  const [notes, setNotes] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextNumber = Math.max(...orders.filter((order) => order.id.startsWith("OS-")).map((order) => Number(order.id.replace("OS-", "")))) + 1;
    onCreate({
      id: `OS-${String(nextNumber).padStart(4, "0")}`,
      source: source || "Captura manual",
      customer,
      date: "18 nov 2026 · 12:18",
      requiredAt,
      status: "Pendiente",
      priority,
      fulfillment,
      route: fulfillment === "Ruta" ? "Por asignar" : undefined,
      notes: notes || "Sin instrucciones adicionales.",
      items: [
        {
          id: `new-${Date.now()}`,
          sku: "ACC-TEF-012",
          name: "Cinta teflón alta densidad 12 mm",
          quantity: 12,
          unit: "piezas",
          aisle: "F",
          shelf: "08",
          available: 240,
          picked: false,
          issue: false,
        },
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Almacén</p>
            <h2 className="mt-1 text-xl font-semibold">Nueva orden de surtido</h2>
            <p className="mt-1 text-xs text-slate-400">
              Crea una orden desde una venta o captura operativa.
            </p>
          </div>
          <button
            className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="form-label">
            Cliente *
            <input
              required
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              className="form-input"
              placeholder="Nombre o razón social"
            />
          </label>
          <label className="form-label">
            Documento origen
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="form-input"
              placeholder="Ej. Venta V-1848"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-label">
              Prioridad
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Order["priority"])}
                className="form-input"
              >
                <option>Normal</option>
                <option>Alta</option>
              </select>
            </label>
            <label className="form-label">
              Entrega
              <select
                value={fulfillment}
                onChange={(event) => setFulfillment(event.target.value as Order["fulfillment"])}
                className="form-input"
              >
                <option>Ruta</option>
                <option>Recoge en mostrador</option>
              </select>
            </label>
          </div>
          <label className="form-label">
            Fecha requerida
            <input
              value={requiredAt}
              onChange={(event) => setRequiredAt(event.target.value)}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Instrucciones
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
              placeholder="Notas de surtido o entrega..."
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              <Check size={16} /> Crear y reservar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1 text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#f6f8f7] p-3">
      <p className="text-[9px] text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${danger ? "text-[#c9664f]" : ""}`}>{value}</p>
    </div>
  );
}

// ---------- Recepción de mercancía (entrada de compras) ----------
function ReceptionView({
  order,
  onBack,
  onUpdate,
  onToast,
  onNavigate,
}: {
  order: Order;
  onBack: () => void;
  onUpdate: (order: Order) => void;
  onToast: (message: string) => void;
  onNavigate?: (nav: string, focus?: { selectedId?: string }) => void;
}) {
  const [signOpen, setSignOpen] = useState(false);
  const editable = order.status === "Pendiente" || order.status === "En surtido";
  const done = order.status === "Lista";
  const captured = order.items.filter(isCaptured).length;
  const allCaptured = captured === order.items.length && order.items.length > 0;
  const shortages = order.items.filter((item) => isCaptured(item) && (item.pickedQty as number) < item.quantity).length;
  const units = order.items.reduce((s, i) => s + i.quantity, 0);
  const receivedUnits = order.items.reduce((s, i) => s + (i.pickedQty ?? 0), 0);
  const value = order.items.reduce((s, i) => s + (i.pickedQty ?? 0) * (i.unitCost ?? 0), 0);
  const money = (v: number) => v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const setQty = (itemId: string, value: number | undefined) =>
    onUpdate({
      ...order,
      status: "En surtido",
      picker: order.picker || "Luis Ortega",
      items: order.items.map((item) => {
        if (item.id !== itemId) return item;
        const pickedQty = value === undefined || Number.isNaN(value) ? undefined : Math.max(0, Math.min(item.quantity, value));
        return { ...item, pickedQty, picked: pickedQty === item.quantity, issue: pickedQty !== undefined && pickedQty < item.quantity };
      }),
    });

  const steps = [
    { label: "Mercancía en almacén", done: true },
    { label: "Contar y revisar", done: allCaptured || done },
    { label: "Firmar recepción", done },
    { label: "Entrada a inventario", done },
  ];
  const currentStep = steps.findIndex((step) => !step.done);

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#2f7468]" onClick={onBack}>
            <ArrowLeft size={15} /> Volver a órdenes
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-[32px]">Recepción {order.id}</h1>
            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status]}`}>{receptionLabel(order.status)}</span>
            <span className="rounded-lg bg-[#fff6df] px-2.5 py-1 text-[10px] font-semibold text-[#9a6b18]">Entrada de compra</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {order.customer} · {order.source} · Llegó {order.date}
          </p>
        </div>
        <div className="flex gap-2">
          {order.purchaseId && onNavigate && (
            <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => onNavigate("Compras", { selectedId: order.purchaseId })}>
              <FileText size={15} /> Ver {order.purchaseId}
            </button>
          )}
          {editable && (
            <button
              className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!allCaptured}
              title={allCaptured ? "" : "Captura la cantidad recibida de todas las partidas"}
              onClick={() => setSignOpen(true)}
            >
              <PenLine size={16} /> Terminar y firmar
            </button>
          )}
        </div>
      </section>

      <ol className="mt-6 grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              step.done ? "border-[#cfe3dd] bg-[#f2f8f6] text-[#2f7468]" : index === currentStep ? "border-[#2f7468] bg-white text-[#162523] shadow-sm" : "border-slate-200 bg-white/60 text-slate-400"
            }`}
          >
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] ${step.done ? "bg-[#2f7468] text-white" : index === currentStep ? "bg-[#b8f34a] text-[#183b36]" : "bg-slate-100 text-slate-400"}`}>
              {step.done ? <Check size={12} /> : index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      {done && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#cfe3dd] bg-[#f2f8f6] px-4 py-3 text-xs text-[#285e56]">
          <Lock size={15} />
          <span className="flex-1">
            <strong>Recepción firmada por {order.signedBy} el {order.signedAt}.</strong> Se dio entrada a inventario por {receivedUnits} unidades y la orden
            de compra {order.purchaseId} quedó {shortages ? "recibida parcialmente" : "recibida completa"}.
          </span>
          {onNavigate && (
            <button className="link-button" onClick={() => onNavigate("Inventario")}>
              Ver inventario <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
            <div>
              <p className="eyebrow">Cuenta lo que llegó contra la orden de compra</p>
              <h2 className="mt-1 text-lg font-semibold">Partidas a recibir</h2>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-[#2f7468]">
                {captured}/{order.items.length} capturadas
              </p>
              {editable && !allCaptured && (
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-500 hover:border-[#2f7468] hover:text-[#2f7468]"
                  onClick={() =>
                    onUpdate({
                      ...order,
                      status: "En surtido",
                      picker: order.picker || "Luis Ortega",
                      items: order.items.map((item) => (isCaptured(item) ? item : { ...item, pickedQty: item.quantity, picked: true, issue: false })),
                    })
                  }
                >
                  Todo llegó completo
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[32px_64px_minmax(0,1fr)_190px_90px] gap-4 border-b border-slate-100 bg-[#fafcfb] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            <span>#</span>
            <span>Ubicación</span>
            <span>Producto</span>
            <span>Recibido / pedido</span>
            <span className="text-right">Estado</span>
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((item, index) => {
              const state = lineState(item);
              const styles = lineStyles[state];
              const label = state === "Completa" ? "Completa" : state === "Parcial" ? "Incompleta" : state === "Sin surtir" ? "No llegó" : "Por contar";
              return (
                <div key={item.id} className={`grid grid-cols-[32px_64px_minmax(0,1fr)_190px_90px] items-center gap-4 px-5 py-4 ${styles.row}`}>
                  <span className={`grid size-8 place-items-center rounded-lg border text-xs font-semibold ${styles.dot}`}>
                    {state === "Completa" ? <Check size={15} /> : index + 1}
                  </span>
                  <div className="rounded-lg bg-[#edf4f2] px-2 py-1.5 text-center">
                    <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5c8f85]">Acomodar</p>
                    <p className="text-sm font-bold text-[#2f7468]">
                      {item.aisle}-{item.shelf}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {item.sku} · Existencia actual {item.available} {item.unit}
                      {item.unitCost ? ` · Costo ${money(item.unitCost)}` : ""}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        disabled={!editable}
                        value={item.pickedQty ?? ""}
                        placeholder="_"
                        onChange={(e) => setQty(item.id, e.target.value === "" ? undefined : Number(e.target.value))}
                        className="h-10 w-[72px] rounded-lg border-2 border-slate-200 bg-white text-center text-base font-bold outline-none focus:border-[#2f7468] disabled:bg-slate-50 disabled:text-slate-500"
                      />
                      <span className="text-sm font-semibold text-slate-400">/ {item.quantity}</span>
                      <span className="text-[10px] text-slate-400">{item.unit}</span>
                    </div>
                    {editable && (
                      <div className="mt-1.5 flex gap-2 text-[10px] font-semibold">
                        <button className="text-[#2f7468] hover:underline" onClick={() => setQty(item.id, item.quantity)}>
                          Completo
                        </button>
                        <button className="text-slate-400 hover:text-[#c9664f]" onClick={() => setQty(item.id, 0)}>
                          No llegó (0)
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={`justify-self-end rounded-lg px-2 py-1 text-[10px] font-semibold ${styles.badge}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </section>
        <div className="space-y-5">
          <section className="panel p-5">
            <p className="eyebrow">Resumen</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="Unidades pedidas" value={String(units)} />
              <Metric label="Recibidas" value={String(receivedUnits)} danger={allCaptured && receivedUnits < units} />
              <Metric label="Partidas incompletas" value={String(shortages)} danger={shortages > 0} />
              <Metric label="Valor recibido" value={money(value)} />
            </div>
          </section>
          <section className="panel p-5 text-xs leading-relaxed text-slate-500">
            <p className="eyebrow">Qué pasa al firmar</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-4">
              <li>Se suma al inventario lo recibido y se registra en el kardex como entrada.</li>
              <li>El costo del producto se actualiza con el promedio ponderado.</li>
              <li>La orden de compra pasa a Recibida o Recibida parcial.</li>
            </ul>
          </section>
        </div>
      </div>

      {signOpen && (
        <SignatureModal
          mode="reception"
          order={order}
          shortages={shortages}
          defaultPicker={order.picker || "Luis Ortega"}
          onClose={() => setSignOpen(false)}
          onSign={(picker, signature) => {
            onUpdate({ ...order, status: "Lista", picker, signedBy: picker, signedAt: stamp(), signature });
            setSignOpen(false);
            onToast(`Recepción ${order.id} firmada: inventario actualizado`);
          }}
        />
      )}
    </>
  );
}

/** Entrega en mostrador: quién recibe el material */
export function HandOverModal({ order, onClose, onConfirm }: { order: Order; onClose: () => void; onConfirm: (receivedBy: string) => void }) {
  const [name, setName] = useState(order.customer === "Público general" ? "" : order.customer);
  const short = order.items.filter((item) => item.pickedQty !== undefined && item.pickedQty < item.quantity);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">Entrega en mostrador</p>
            <h2 className="mt-1 text-xl font-semibold">Orden {order.id}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {order.customer} · {order.source}
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <span className="min-w-0 truncate">
                  {item.name}
                  {item.kitName && <span className="block text-[9px] text-[#4a6b12]">{item.kitName}</span>}
                </span>
                <strong className={item.pickedQty !== undefined && item.pickedQty < item.quantity ? "text-[#c9664f]" : ""}>
                  {item.pickedQty ?? item.quantity}/{item.quantity} {item.unit}
                </strong>
              </div>
            ))}
          </div>
          {short.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-[#fff6df] p-3 text-[11px] text-[#8a651e]">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              Se entrega incompleto ({short.length} {short.length === 1 ? "partida" : "partidas"}). Si la venta ya está pagada, registra la devolución del faltante en Ventas.
            </p>
          )}
          <label className="form-label">
            Recibió (nombre) *
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Nombre de quien recoge" />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button disabled:opacity-40" disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>
            <PackageCheck size={15} /> Confirmar entrega
          </button>
        </div>
      </div>
    </div>
  );
}
