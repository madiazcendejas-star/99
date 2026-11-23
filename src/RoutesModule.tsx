import { useMemo, useState } from "react";
import { TODAY_ISO, TODAY_TEXT, TOMORROW_ISO } from "./entorno";
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Banknote,
  Calculator,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  HandCoins,
  Lightbulb,
  MapPin,
  Navigation,
  PackageCheck,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Route,
  Sparkles,
  Trash2,
  TriangleAlert,
  Truck,
  Undo2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type { Order } from "./OrdersModule";
import { pendingAmount, type PayMethod, type Sale } from "./SalesModule";
import { staff } from "./staff";
import RoutePrintView from "./RouteDocument";

export type RoutePlanStatus = "Programada" | "En reparto" | "Cerrada";
export type StopStatus = "Pendiente" | "Entregada" | "No entregada";
export type CollectMethod = "Efectivo" | "Transferencia" | "Tarjeta" | "Crédito (sin cobro)";
export type RouteStop = {
  orderId: string;
  customer: string;
  address: string;
  city: string;
  zone: string;
  sequence: number;
  status: StopStatus;
  amountDue: number;
  collected?: number;
  collectMethod?: CollectMethod;
  receivedBy?: string;
  deliveredAt?: string;
  salePaid?: boolean;
  failReason?: string;
  resolution?: "Reprogramada" | "Cancelada";
  /** Cobro menor a lo pendiente de la nota: motivo y faltante */
  shortReason?: string;
  shortAmount?: number;
};
export type RouteExpense = { id: string; concept: string; amount: number; receipt: boolean };
export type RoutePlan = {
  id: string;
  date: string;
  dateISO: string;
  departureTime: string;
  driver: string;
  vehicle: string;
  zone: string;
  viatics: number;
  notes: string;
  status: RoutePlanStatus;
  stops: RouteStop[];
  expenses: RouteExpense[];
  cashReturned?: number;
  startedAt?: string;
  closedAt?: string;
  extraordinary?: boolean;
  distanceKm?: number;
  durationMin?: number;
};

// ---------- Geografía: almacén y direcciones de entrega ----------
type Geo = { address: string; city: string; zone: string; lat: number; lng: number };

export const WAREHOUSE = {
  name: "Almacén principal",
  address: "Av. Central 145, Col. Industrial, Azcapotzalco",
  lat: 19.489,
  lng: -99.17,
};

export const destinations: Record<string, Geo> = {
  "Grupo Hidráulico Norte": {
    address: "Av. Ceylán 450, Bodega 12",
    city: "Tlalnepantla, Edo. Méx.",
    zone: "Norte",
    lat: 19.517,
    lng: -99.183,
  },
  "Ferretería López": {
    address: "Av. Central 145, Col. Industrial",
    city: "Azcapotzalco, CDMX",
    zone: "Norte",
    lat: 19.4875,
    lng: -99.1735,
  },
  "Plomería del Centro": {
    address: "República de Uruguay 67, Centro",
    city: "Cuauhtémoc, CDMX",
    zone: "Centro",
    lat: 19.43,
    lng: -99.136,
  },
  "Constructora MZ": {
    address: "Insurgentes Sur 820, Del Valle",
    city: "Benito Juárez, CDMX",
    zone: "Sur",
    lat: 19.385,
    lng: -99.173,
  },
  "Instalaciones Ríos": {
    address: "Calz. de Tlalpan 1830, Churubusco",
    city: "Coyoacán, CDMX",
    zone: "Sur",
    lat: 19.355,
    lng: -99.142,
  },
  "Ferremateriales Tula": {
    address: "Av. Insurgentes 210, Centro",
    city: "Tula de Allende, Hgo.",
    zone: "Foránea",
    lat: 20.054,
    lng: -99.342,
  },
  "Obras del Bajío": {
    address: "Blvd. Bernardo Quintana 302",
    city: "Querétaro, Qro.",
    zone: "Foránea",
    lat: 20.593,
    lng: -100.392,
  },
};

const LOCAL_RADIUS_KM = 8; // radio de agrupación (Configuración › Rutas)
const FORANEA_KM = 40; // más lejos que esto del almacén = ruta foránea
const EXTRAORDINARY_KM = 30; // separación entre entregas que ya no conviene combinar
const ROAD_FACTOR = 1.35; // distancia en línea recta → distancia por calle aproximada

type Point = { lat: number; lng: number };
const distance = (a: Point, b: Point) => {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** Ordena paradas por vecino más cercano desde el almacén y estima km y tiempo (ida y vuelta). */
const planRoute = (orders: Order[]) => {
  const located = orders.filter((order) => destinations[order.customer]);
  const pending = [...located];
  const sequence: Order[] = [];
  let current: Point = WAREHOUSE;
  let km = 0;
  while (pending.length) {
    pending.sort(
      (a, b) => distance(current, destinations[a.customer]) - distance(current, destinations[b.customer]),
    );
    const next = pending.shift()!;
    km += distance(current, destinations[next.customer]);
    current = destinations[next.customer];
    sequence.push(next);
  }
  if (sequence.length) km += distance(current, WAREHOUSE);
  const roadKm = Math.round(km * ROAD_FACTOR);
  const minutes = Math.round((roadKm / (roadKm > 80 ? 60 : 25)) * 60 + sequence.length * 20);
  const unlocated = orders.filter((order) => !destinations[order.customer]);
  let maxGap = 0;
  located.forEach((a, i) =>
    located.slice(i + 1).forEach((b) => {
      maxGap = Math.max(maxGap, distance(destinations[a.customer], destinations[b.customer]));
    }),
  );
  return { sequence: [...sequence, ...unlocated], km: roadKm, minutes, maxGap };
};

const hours = (minutes: number) =>
  minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });



const displayDate = (iso: string) =>
  new Date(`${iso}T12:00:00`)
    .toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "");
const stamp = () => `${TODAY_TEXT} · ${new Date().toTimeString().slice(0, 5)}`;

export const initialRoutePlans: RoutePlan[] = [
  {
    id: "RT-031",
    date: "18 nov 2026",
    dateISO: "2026-11-18",
    departureTime: "08:30",
    driver: "Roberto García",
    vehicle: "Nissan NP300 · R-02",
    zone: "Foránea · Querétaro",
    viatics: 1200,
    notes: "Cargar combustible antes de salir. Regresar comprobantes.",
    status: "En reparto",
    startedAt: "18 nov 2026 · 08:35",
    extraordinary: false,
    distanceKm: 440,
    durationMin: 460,
    expenses: [
      { id: "g-1", concept: "Combustible", amount: 650, receipt: true },
      { id: "g-2", concept: "Casetas", amount: 310, receipt: true },
    ],
    stops: [
      {
        orderId: "OS-0827",
        customer: "Obras del Bajío",
        address: "Blvd. Bernardo Quintana 302",
        city: "Querétaro, Qro.",
        zone: "Foránea",
        sequence: 1,
        status: "Pendiente",
        amountDue: 0,
      },
    ],
  },
];

const statusStyles: Record<RoutePlanStatus, string> = {
  Programada: "bg-[#e8f2ff] text-[#3973a8]",
  "En reparto": "bg-[#fff6df] text-[#9a6b18]",
  Cerrada: "bg-[#eaf6ef] text-[#347652]",
};
const stopStyles: Record<StopStatus, string> = {
  Pendiente: "bg-slate-100 text-slate-500",
  Entregada: "bg-[#eaf6ef] text-[#347652]",
  "No entregada": "bg-[#fff0eb] text-[#c9664f]",
};

export const liquidation = (route: RoutePlan) => {
  const delivered = route.stops.filter((stop) => stop.status === "Entregada");
  const cash = delivered
    .filter((stop) => stop.collectMethod === "Efectivo")
    .reduce((sum, stop) => sum + (stop.collected || 0), 0);
  const other = delivered
    .filter((stop) => stop.collectMethod && stop.collectMethod !== "Efectivo")
    .reduce((sum, stop) => sum + (stop.collected || 0), 0);
  const expected = route.stops.reduce((sum, stop) => sum + stop.amountDue, 0);
  const withReceipt = route.expenses.filter((e) => e.receipt).reduce((s, e) => s + e.amount, 0);
  const withoutReceipt = route.expenses.filter((e) => !e.receipt).reduce((s, e) => s + e.amount, 0);
  const mustDeliver = route.viatics + cash - withReceipt;
  const difference =
    route.cashReturned === undefined ? undefined : route.cashReturned - mustDeliver;
  return { cash, other, expected, withReceipt, withoutReceipt, mustDeliver, difference };
};

const saleIdOf = (order?: Order) => order?.source.match(/V-\d+/)?.[0];

type ListFilter = "Todas" | "Activas" | "Programada" | "En reparto" | "Cerrada";

export default function RoutesModule({
  orders,
  routes,
  sales,
  onAddRoute,
  onUpdateRoute,
  onUpdateOrder,
  onUpdateSale,
  onToast,
}: {
  orders: Order[];
  routes: RoutePlan[];
  sales: Sale[];
  onAddRoute: (route: RoutePlan) => void;
  onUpdateRoute: (route: RoutePlan) => void;
  onUpdateOrder: (order: Order) => void;
  onUpdateSale: (id: string, changes: Partial<Sale>) => void;
  onToast: (message: string) => void;
}) {
  const [view, setView] = useState<"list" | "builder">("list");
  const [filter, setFilter] = useState<ListFilter>("Todas");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [driver, setDriver] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [dateISO, setDateISO] = useState(TODAY_ISO);
  const [departureTime, setDepartureTime] = useState("14:30");
  const [viatics, setViatics] = useState("");
  const [notes, setNotes] = useState("");

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || null;
  const eligibleOrders = orders.filter(
    (order) => order.status === "Liberada a ruta" && order.fulfillment === "Ruta",
  );
  const counterOrders = orders.filter(
    (order) => order.fulfillment === "Recoge en mostrador" && order.status !== "Entregada",
  );
  const notReadyOrders = orders.filter(
    (order) =>
      order.fulfillment === "Ruta" &&
      ["Pendiente", "En surtido", "Con faltantes", "Lista"].includes(order.status),
  );

  const dueFor = (order: Order) => {
    const sale = sales.find((item) => item.id === saleIdOf(order));
    return sale ? pendingAmount(sale) : 0;
  };

  // ---------- Sugerencias inteligentes por cercanía ----------
  const suggestions = useMemo(() => {
    const located = eligibleOrders.filter((order) => destinations[order.customer]);
    const fromWarehouse = (order: Order) => distance(WAREHOUSE, destinations[order.customer]);
    const local = located.filter((order) => fromWarehouse(order) <= FORANEA_KM);
    const foraneas = located.filter((order) => fromWarehouse(order) > FORANEA_KM);
    const remaining = [...local].sort((a, b) => fromWarehouse(a) - fromWarehouse(b));
    const clusters: Order[][] = [];
    while (remaining.length) {
      const seed = remaining.shift()!;
      const cluster = [seed];
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (distance(destinations[seed.customer], destinations[remaining[i].customer]) <= LOCAL_RADIUS_KM) {
          cluster.push(remaining[i]);
          remaining.splice(i, 1);
        }
      }
      clusters.push(cluster);
    }
    clusters.sort((a, b) => b.length - a.length);
    const result = [
      ...clusters.map((cluster, index) => ({
        key: `local-${index}`,
        kind: "local" as const,
        orders: cluster,
        plan: planRoute(cluster),
        date: TODAY_ISO,
      })),
      ...foraneas.map((order) => ({
        key: `foranea-${order.id}`,
        kind: "foranea" as const,
        orders: [order],
        plan: planRoute([order]),
        date: TOMORROW_ISO,
      })),
    ];
    const unlocated = eligibleOrders.filter((order) => !destinations[order.customer]);
    if (unlocated.length)
      result.push({
        key: "sin-ubicacion",
        kind: "sin" as never,
        orders: unlocated,
        plan: planRoute(unlocated),
        date: TODAY_ISO,
      });
    return result;
  }, [eligibleOrders]);

  const selectedObjects = selectedOrders
    .map((id) => eligibleOrders.find((order) => order.id === id))
    .filter(Boolean) as Order[];
  const plan = planRoute(selectedObjects);
  const mixesForanea =
    selectedObjects.some(
      (order) => destinations[order.customer] && distance(WAREHOUSE, destinations[order.customer]) > FORANEA_KM,
    ) && selectedObjects.length > 1;
  const extraordinary = plan.maxGap > EXTRAORDINARY_KM || mixesForanea;
  const farthestPair = (() => {
    let pair: [Order, Order] | null = null;
    let max = 0;
    selectedObjects.forEach((a, i) =>
      selectedObjects.slice(i + 1).forEach((b) => {
        const ga = destinations[a.customer];
        const gb = destinations[b.customer];
        if (ga && gb && distance(ga, gb) > max) {
          max = distance(ga, gb);
          pair = [a, b];
        }
      }),
    );
    return pair as [Order, Order] | null;
  })();
  const zonesLabel = [
    ...new Set(
      plan.sequence.map((order) => destinations[order.customer]?.city.split(",")[0] || "Sin ubicación"),
    ),
  ].join(" · ");

  const toggleOrder = (orderId: string) =>
    setSelectedOrders((items) =>
      items.includes(orderId) ? items.filter((id) => id !== orderId) : [...items, orderId],
    );

  const buildRoute = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedObjects.length === 0) return;
    const nextNumber = Math.max(...routes.map((route) => Number(route.id.replace("RT-", ""))), 31) + 1;
    const id = `RT-${String(nextNumber).padStart(3, "0")}`;
    const route: RoutePlan = {
      id,
      date: displayDate(dateISO),
      dateISO,
      departureTime,
      driver,
      vehicle,
      zone: zonesLabel,
      viatics: Number(viatics),
      notes,
      status: "Programada",
      extraordinary,
      distanceKm: plan.km,
      durationMin: plan.minutes,
      expenses: [],
      stops: plan.sequence.map((order, index) => {
        const geo = destinations[order.customer];
        return {
          orderId: order.id,
          customer: order.customer,
          address: geo?.address || "Dirección por confirmar",
          city: geo?.city || "",
          zone: geo?.zone || "Sin zona",
          sequence: index + 1,
          status: "Pendiente" as const,
          amountDue: dueFor(order),
        };
      }),
    };
    onAddRoute(route);
    plan.sequence.forEach((order) =>
      onUpdateOrder({ ...order, status: "Asignada a ruta", route: `${id} · ${route.zone}` }),
    );
    setView("list");
    setSelectedOrders([]);
    setDriver("");
    setVehicle("");
    setViatics("");
    setNotes("");
    setDateISO(TODAY_ISO);
    onToast(`Hoja de ruta ${id} creada con ${route.stops.length} entregas`);
  };

  if (selectedRoute) {
    return (
      <RouteSheet
        route={selectedRoute}
        orders={orders}
        sales={sales}
        onBack={() => setSelectedRouteId(null)}
        onUpdate={onUpdateRoute}
        onUpdateOrder={onUpdateOrder}
        onUpdateSale={onUpdateSale}
        onToast={onToast}
      />
    );
  }

  if (view === "builder") {
    return (
      <div>
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <button
              className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#2f7468]"
              onClick={() => setView("list")}
            >
              <ArrowLeft size={15} /> Volver a rutas
            </button>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[36px]">Armar hoja de ruta</h1>
            <p className="mt-2 text-sm text-slate-500">
              Solo aparecen órdenes surtidas, firmadas y liberadas a ruta.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#eaf6ef] px-4 py-3 text-xs font-semibold text-[#347652]">
            <PackageCheck size={16} /> {eligibleOrders.length} órdenes liberadas a ruta
          </span>
        </section>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_400px]">
          <div className="space-y-5">
            {suggestions.length > 0 && (
              <section className="panel overflow-hidden">
                <div className="flex items-start gap-3 border-b border-slate-100 bg-[#f2f8f6] p-5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#2f7468] shadow-sm">
                    <Sparkles size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Sugerencias según las direcciones de entrega</p>
                    <p className="mt-1 text-xs text-slate-500">
                      99 agrupa los pedidos que están a menos de {LOCAL_RADIUS_KM} km entre sí, ordena las
                      paradas desde el almacén y separa las entregas foráneas en días distintos.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 p-5 md:grid-cols-2">
                  {suggestions.map((suggestion, index) => {
                    const ids = suggestion.orders.map((order) => order.id);
                    const active =
                      ids.length === selectedOrders.length && ids.every((id) => selectedOrders.includes(id));
                    const foranea = suggestion.kind === "foranea";
                    const noGeo = (suggestion.kind as string) === "sin";
                    const city = destinations[suggestion.orders[0].customer]?.city;
                    return (
                      <button
                        key={suggestion.key}
                        onClick={() => {
                          setSelectedOrders(active ? [] : ids);
                          if (!active) setDateISO(suggestion.date);
                        }}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active ? "border-[#2f7468] bg-[#edf4f2]" : "border-slate-200 hover:border-[#82aaa2]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`grid size-9 place-items-center rounded-xl ${
                              foranea ? "bg-[#fff6df] text-[#9a6b18]" : "bg-white text-[#2f7468]"
                            }`}
                          >
                            {foranea ? <Truck size={16} /> : <Navigation size={16} />}
                          </span>
                          <span
                            className={`rounded-md px-2 py-1 text-[9px] font-semibold ${
                              foranea
                                ? "bg-[#fff6df] text-[#9a6b18]"
                                : noGeo
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-[#eaf6ef] text-[#347652]"
                            }`}
                          >
                            {foranea ? "Programar otro día" : noGeo ? "Revisar dirección" : index === 0 ? "Recomendada hoy" : "Hoy"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold">
                          {foranea
                            ? `Ruta foránea · ${city}`
                            : noGeo
                              ? "Sin ubicación registrada"
                              : `Zona ${[...new Set(suggestion.orders.map((o) => destinations[o.customer].zone))].join(" + ")}`}
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                          {suggestion.plan.sequence.map((order) => order.customer).join(" → ")}
                        </p>
                        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500">
                          <span>{suggestion.orders.length} {suggestion.orders.length === 1 ? "parada" : "paradas"}</span>
                          {!noGeo && <span>~{suggestion.plan.km} km</span>}
                          {!noGeo && <span>~{hours(suggestion.plan.minutes)}</span>}
                        </p>
                        <p className="mt-2 flex items-start gap-1 text-[10px] font-semibold text-[#2f7468]">
                          <Lightbulb size={12} className="mt-px shrink-0" />
                          {foranea
                            ? `A ${Math.round(distance(WAREHOUSE, destinations[suggestion.orders[0].customer]))} km del almacén: no combinar con entregas locales.`
                            : noGeo
                              ? "Confirma la dirección del cliente para poder optimizar."
                              : "Paradas cercanas entre sí: ahorra traslados."}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="panel overflow-hidden">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Órdenes liberadas a ruta</p>
                  <h2 className="panel-title">Selecciona las entregas</h2>
                </div>
                <span className="text-xs text-slate-400">{selectedOrders.length} seleccionadas</span>
              </div>
              <div className="divide-y divide-slate-100">
                {eligibleOrders.map((order) => {
                  const geo = destinations[order.customer];
                  const selected = selectedOrders.includes(order.id);
                  const km = geo ? Math.round(distance(WAREHOUSE, geo) * ROAD_FACTOR) : null;
                  const due = dueFor(order);
                  return (
                    <button
                      key={order.id}
                      onClick={() => toggleOrder(order.id)}
                      className={`flex w-full items-start gap-4 p-5 text-left transition ${
                        selected ? "bg-[#f7fbfa]" : "hover:bg-[#fafcfb]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border ${
                          selected ? "border-[#2f7468] bg-[#2f7468] text-white" : "border-slate-200 text-transparent"
                        }`}
                      >
                        <Check size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{order.customer}</p>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{order.id}</span>
                          {order.priority === "Alta" && (
                            <span className="rounded bg-[#fff0eb] px-1.5 py-0.5 text-[9px] font-semibold text-[#c9664f]">
                              Prioridad alta
                            </span>
                          )}
                          {order.rescheduledFrom && (
                            <span className="rounded bg-[#fff6df] px-1.5 py-0.5 text-[9px] font-semibold text-[#9a6b18]">
                              Reprogramada de {order.rescheduledFrom}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                          <MapPin size={13} className="mt-0.5 shrink-0" />
                          {geo ? `${geo.address}, ${geo.city}` : "Dirección por confirmar"}
                        </p>
                        <p className="mt-2 text-[10px] text-slate-400">
                          {order.items.length} partidas · Requerida {order.requiredAt}
                          {km !== null && ` · ~${km} km del almacén`}
                          {due > 0 && ` · Cobrar ${money(due)}`}
                        </p>
                      </div>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${
                          geo?.zone === "Foránea" ? "bg-[#fff6df] text-[#9a6b18]" : "bg-[#edf4f2] text-[#2f7468]"
                        }`}
                      >
                        {geo?.zone || "Sin zona"}
                      </span>
                    </button>
                  );
                })}
                {eligibleOrders.length === 0 && (
                  <div className="grid place-items-center px-5 py-14 text-center">
                    <PackageCheck size={22} className="text-slate-300" />
                    <p className="mt-3 text-sm font-semibold">No hay órdenes liberadas a ruta</p>
                    <p className="mt-1 text-xs text-slate-400">
                      En Órdenes, surte y firma una orden con envío a domicilio y dale "Liberar a ruta".
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#f0ded9] bg-[#fff8f5] p-5">
              <div className="flex items-start gap-3">
                <X size={17} className="mt-0.5 shrink-0 text-[#c9664f]" />
                <div>
                  <p className="text-sm font-semibold">Órdenes no disponibles</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {counterOrders.length} órdenes son de entrega en mostrador y {notReadyOrders.length} aún no
                    se surten, firman o liberan a ruta.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <form className="h-fit space-y-5 xl:sticky xl:top-24" onSubmit={buildRoute}>
            <section className="panel overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <p className="eyebrow">Ruta propuesta</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {selectedObjects.length ? zonesLabel : "Selecciona entregas"}
                </h2>
                {selectedObjects.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {selectedObjects.length} paradas · ~{plan.km} km · ~{hours(plan.minutes)} (ida y vuelta)
                  </p>
                )}
              </div>
              <RouteMap orders={selectedObjects.length ? plan.sequence : eligibleOrders} highlight={selectedObjects.length > 0} />
              {selectedObjects.length > 0 && (
                <ol className="space-y-2 px-5 pb-4">
                  {plan.sequence.map((order, index) => (
                    <li key={order.id} className="flex items-center gap-2.5 text-xs">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#2f7468] text-[9px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{order.customer}</span>
                      <span className="text-[10px] text-slate-400">{destinations[order.customer]?.city.split(",")[0]}</span>
                    </li>
                  ))}
                </ol>
              )}
              {extraordinary && farthestPair && (
                <div className="mx-5 mb-5 flex items-start gap-2 rounded-xl bg-[#fff6df] p-3 text-[11px] leading-relaxed text-[#8a651e]">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>Ruta extraordinaria.</strong> {destinations[farthestPair[0].customer].city.split(",")[0]} y{" "}
                    {destinations[farthestPair[1].customer].city.split(",")[0]} están a{" "}
                    {Math.round(distance(destinations[farthestPair[0].customer], destinations[farthestPair[1].customer]))} km
                    entre sí. Se recomienda programarlas en días distintos; si decides combinarlas, anota el motivo
                    para el chofer.
                  </span>
                </div>
              )}
            </section>

            <section className="panel overflow-hidden">
              <div className="border-b border-slate-100 p-5">
                <p className="eyebrow">Datos de salida</p>
                <h2 className="mt-1 text-lg font-semibold">Hoja de ruta</h2>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <label className="form-label">
                    Chofer *
                    <select required value={driver} onChange={(e) => setDriver(e.target.value)} className="form-input">
                      <option value="">Selecciona</option>
                      {staff.drivers.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label">
                    Camioneta *
                    <select required value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="form-input">
                      <option value="">Selecciona</option>
                      <option>Nissan NP300 · R-02</option>
                      <option>Ford Transit · R-03</option>
                      <option>Ram 700 · R-04</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="form-label">
                    Fecha de salida *
                    <input required type="date" value={dateISO} min={TODAY_ISO} onChange={(e) => setDateISO(e.target.value)} className="form-input" />
                  </label>
                  <label className="form-label">
                    Hora de salida *
                    <input required type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className="form-input" />
                  </label>
                </div>
                <label className="form-label">
                  Viáticos entregados al chofer *
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="50"
                      value={viatics}
                      onChange={(e) => setViatics(e.target.value)}
                      className="form-input pl-7"
                      placeholder="0.00"
                    />
                  </div>
                  <span className="font-normal text-slate-400">Efectivo para combustible, casetas y alimentos.</span>
                </label>
                <label className="form-label">
                  Notas para el chofer
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-20 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
                    placeholder={extraordinary ? "Motivo de la ruta extraordinaria e indicaciones..." : "Indicaciones de entrega..."}
                  />
                </label>
              </div>
              <div className="border-t border-slate-100 bg-[#fafcfb] p-5">
                <div className="mb-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Por cobrar en ruta</span>
                  <strong>{money(selectedObjects.reduce((sum, order) => sum + dueFor(order), 0))}</strong>
                </div>
                <button
                  type="submit"
                  disabled={selectedOrders.length === 0}
                  className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Route size={16} /> Crear hoja de ruta
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>
    );
  }

  // ---------- Listado de hojas de ruta ----------
  const todayRoutes = routes.filter((route) => route.dateISO === TODAY_ISO);
  const activeRoutes = routes.filter((route) => route.status !== "Cerrada");
  const pendingStops = activeRoutes.reduce(
    (sum, route) => sum + route.stops.filter((stop) => stop.status === "Pendiente").length,
    0,
  );
  const visibleRoutes = routes.filter((route) =>
    filter === "Todas"
      ? true
      : filter === "Activas"
        ? route.status !== "Cerrada"
        : route.status === filter,
  );

  const kpis = [
    {
      label: "Rutas de hoy",
      value: String(todayRoutes.length),
      detail: `${todayRoutes.filter((route) => route.status === "En reparto").length} en reparto`,
      icon: Route,
      action: () => setFilter("Todas"),
    },
    {
      label: "Entregas programadas",
      value: String(pendingStops),
      detail: "Pendientes en rutas activas",
      icon: MapPin,
      action: () => setFilter("Activas"),
    },
    {
      label: "Órdenes liberadas",
      value: String(eligibleOrders.length),
      detail: "Listas para armar ruta",
      icon: PackageCheck,
      action: () => setView("builder"),
    },
    {
      label: "Viáticos entregados",
      value: money(todayRoutes.reduce((sum, route) => sum + route.viatics, 0)),
      detail: `${routes.filter((route) => route.status === "En reparto").length} rutas por liquidar`,
      icon: WalletCards,
      action: () => setFilter("En reparto"),
    },
  ];

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Logística <ChevronRight size={13} /> <span className="text-slate-700">Rutas</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Rutas</h1>
          <p className="mt-2 text-sm text-slate-500">Agrupa entregas, controla salidas, cobros y viáticos.</p>
        </div>
        <button className="primary-button" onClick={() => setView("builder")}>
          <Plus size={17} /> Armar hoja de ruta
        </button>
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

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Operación logística</p>
            <h2 className="panel-title">Hojas de ruta</h2>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["Todas", "Activas", "Programada", "En reparto", "Cerrada"] as ListFilter[]).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3 py-2 ${filter === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
              >
                {item === "Programada" ? "Programadas" : item === "Cerrada" ? "Cerradas" : item}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleRoutes.map((route) => {
            const done = route.stops.filter((stop) => stop.status !== "Pendiente").length;
            const progress = Math.round((done / Math.max(1, route.stops.length)) * 100);
            const totals = liquidation(route);
            return (
              <button
                key={route.id}
                className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-[#fafcfb]"
                onClick={() => setSelectedRouteId(route.id)}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                  <Truck size={19} />
                </span>
                <div className="w-52 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{route.id}</p>
                    <span className={`rounded-lg px-2 py-1 text-[9px] font-semibold ${statusStyles[route.status]}`}>
                      {route.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-slate-400">
                    {route.zone} · {route.date}
                  </p>
                </div>
                <div className="w-40">
                  <p className="text-xs font-semibold">{route.driver}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{route.vehicle}</p>
                </div>
                <div className="w-28">
                  <p className="text-xs font-semibold">
                    {route.stops.length} {route.stops.length === 1 ? "entrega" : "entregas"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">Salida {route.departureTime} h</p>
                </div>
                <div className="min-w-28 flex-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Avance</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#2f7468]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="w-28 text-right">
                  <p className="text-[9px] text-slate-400">{route.status === "Cerrada" ? "Entregó" : "Viáticos"}</p>
                  <p className="mt-1 text-xs font-semibold">
                    {money(route.status === "Cerrada" ? route.cashReturned ?? totals.mustDeliver : route.viatics)}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            );
          })}
          {visibleRoutes.length === 0 && (
            <p className="px-5 py-12 text-center text-xs text-slate-400">No hay hojas de ruta en este filtro.</p>
          )}
        </div>
      </section>
    </>
  );
}

// ---------- Mapa esquemático ----------
function RouteMap({ orders, highlight }: { orders: Order[]; highlight: boolean }) {
  const points = orders
    .map((order) => ({ order, geo: destinations[order.customer] }))
    .filter((item) => item.geo);
  const all: Point[] = [WAREHOUSE, ...points.map((item) => item.geo)];
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const pad = 0.02;
  const [minLat, maxLat] = [Math.min(...lats) - pad, Math.max(...lats) + pad];
  const [minLng, maxLng] = [Math.min(...lngs) - pad, Math.max(...lngs) + pad];
  const W = 360;
  const H = 170;
  const scale = Math.min((W - 40) / (maxLng - minLng), (H - 30) / (maxLat - minLat));
  const offX = (W - (maxLng - minLng) * scale) / 2;
  const offY = (H - (maxLat - minLat) * scale) / 2;
  const xy = (p: Point) => ({ x: offX + (p.lng - minLng) * scale, y: offY + (maxLat - p.lat) * scale });
  const wh = xy(WAREHOUSE);
  const path = [wh, ...points.map((item) => xy(item.geo)), wh].map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div className="px-5 py-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-[#f3f7f6]" role="img" aria-label="Mapa esquemático de la ruta">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e3ebe9" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" rx="12" />
        {highlight && points.length > 0 && (
          <polyline points={path} fill="none" stroke="#2f7468" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        )}
        {points.map((item, index) => {
          const p = xy(item.geo);
          return (
            <g key={item.order.id}>
              <circle cx={p.x} cy={p.y} r={highlight ? 9 : 6} fill={highlight ? "#2f7468" : "#9fbcb5"} stroke="white" strokeWidth="2" />
              {highlight && (
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="white">
                  {index + 1}
                </text>
              )}
              <text x={p.x + 12} y={p.y + 3} fontSize="8.5" fill="#52615f">
                {item.geo.city.split(",")[0]}
              </text>
            </g>
          );
        })}
        <rect x={wh.x - 7} y={wh.y - 7} width="14" height="14" rx="3" fill="#183b36" stroke="#b8f34a" strokeWidth="2" />
        <text x={wh.x + 11} y={wh.y + 12} fontSize="8.5" fontWeight="700" fill="#183b36">
          Almacén
        </text>
      </svg>
    </div>
  );
}

// ---------- Detalle de hoja de ruta ----------
function RouteSheet({
  route,
  orders,
  sales,
  onBack,
  onUpdate,
  onUpdateOrder,
  onUpdateSale,
  onToast,
}: {
  route: RoutePlan;
  orders: Order[];
  sales: Sale[];
  onBack: () => void;
  onUpdate: (route: RoutePlan) => void;
  onUpdateOrder: (order: Order) => void;
  onUpdateSale: (id: string, changes: Partial<Sale>) => void;
  onToast: (message: string) => void;
}) {
  const [deliverStop, setDeliverStop] = useState<string | null>(null);
  const [failStop, setFailStop] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [expense, setExpense] = useState({ concept: "Combustible", amount: "", receipt: true });

  const live = route.status === "En reparto";
  const closed = route.status === "Cerrada";
  const totals = liquidation(route);
  const resolvedCount = route.stops.filter((stop) => stop.status !== "Pendiente").length;
  const orderOf = (stop: RouteStop) => orders.find((order) => order.id === stop.orderId);

  const updateStop = (orderId: string, changes: Partial<RouteStop>) =>
    onUpdate({
      ...route,
      stops: route.stops.map((stop) => (stop.orderId === orderId ? { ...stop, ...changes } : stop)),
    });

  const registerDelivery = (stop: RouteStop, data: { collected: number; method: CollectMethod; receivedBy: string; shortReason?: string }) => {
    const order = orderOf(stop);
    const sale = sales.find((item) => item.id === saleIdOf(order));
    const liveDue = sale && sale.status === "Pendiente" ? pendingAmount(sale) : sale ? 0 : stop.amountDue;
    const paysSale =
      !!sale &&
      sale.status === "Pendiente" &&
      data.method !== "Crédito (sin cobro)" &&
      data.collected >= pendingAmount(sale) - 0.009;
    if (order) onUpdateOrder({ ...order, status: "Entregada", releasedAt: order.releasedAt });
    // Cobro parcial: se abona a la venta y queda pendiente la diferencia
    if (sale && !paysSale && sale.status === "Pendiente" && data.method !== "Crédito (sin cobro)" && data.collected > 0)
      onUpdateSale(sale.id, { partialPaid: (sale.partialPaid ?? 0) + data.collected });
    if (paysSale && sale)
      onUpdateSale(
        sale.id,
        sale.payments
          ? {
              status: "Pagada",
              // La parte "contra entrega" queda registrada con la forma en que realmente cobró el chofer
              payments: sale.payments.map((part) =>
                part.method === "Contra entrega" ? { ...part, method: data.method as PayMethod } : part,
              ),
            }
          : { status: "Pagada", payment: data.method as Sale["payment"] },
      );
    updateStop(stop.orderId, {
      status: "Entregada",
      collected: data.method === "Crédito (sin cobro)" ? 0 : data.collected,
      collectMethod: data.method,
      receivedBy: data.receivedBy,
      deliveredAt: stamp(),
      salePaid: paysSale,
      failReason: undefined,
      shortReason: data.shortReason,
      shortAmount: data.shortReason ? Math.max(0, liveDue - (data.method === "Crédito (sin cobro)" ? 0 : data.collected)) : undefined,
    });
    setDeliverStop(null);
    onToast(
      `${stop.customer}: entrega registrada${data.collected ? ` · cobrado ${money(data.collected)}` : ""}${
        data.shortReason ? ` · faltan ${money(Math.max(0, liveDue - data.collected))} (${data.shortReason})` : ""
      }`,
    );
  };

  const markFailed = (stop: RouteStop, reason: string) => {
    updateStop(stop.orderId, { status: "No entregada", failReason: reason });
    setFailStop(null);
    onToast(`${stop.customer}: marcada como no entregada`);
  };

  const undo = (stop: RouteStop) => {
    const order = orderOf(stop);
    if (stop.status === "Entregada" && order) onUpdateOrder({ ...order, status: "Asignada a ruta" });
    if (stop.salePaid) {
      const id = saleIdOf(order);
      if (id) onUpdateSale(id, { status: "Pendiente" });
    } else if (stop.collected) {
      const sale = sales.find((item) => item.id === saleIdOf(order));
      if (sale?.partialPaid) onUpdateSale(sale.id, { partialPaid: Math.max(0, sale.partialPaid - stop.collected) });
    }
    updateStop(stop.orderId, {
      status: "Pendiente",
      collected: undefined,
      collectMethod: undefined,
      receivedBy: undefined,
      deliveredAt: undefined,
      salePaid: undefined,
      failReason: undefined,
      shortReason: undefined,
      shortAmount: undefined,
    });
  };

  const addExpense = () => {
    const amount = Number(expense.amount);
    if (!amount) return;
    onUpdate({
      ...route,
      expenses: [...route.expenses, { id: `g-${Date.now()}`, concept: expense.concept, amount, receipt: expense.receipt }],
    });
    setExpense({ concept: expense.concept, amount: "", receipt: true });
  };

  const closeRoute = (
    decisions: Record<string, { action: "Reprogramar" | "Cancelar"; reason: string }>,
    cashReturned: number,
  ) => {
    const stops = route.stops.map((stop) => {
      if (stop.status === "Entregada") return stop;
      const decision = decisions[stop.orderId];
      const order = orderOf(stop);
      if (order && decision.action === "Reprogramar") {
        onUpdateOrder({
          ...order,
          status: "Liberada a ruta",
          route: "Por asignar",
          rescheduledFrom: route.id,
          notes: `${order.notes} · No entregada en ${route.id}: ${decision.reason}.`,
        });
      }
      if (order && decision.action === "Cancelar") {
        onUpdateOrder({
          ...order,
          status: "Por reacomodar",
          cancelReason: `${decision.reason} (ruta ${route.id})`,
          items: order.items.map((item) => ({ ...item, returned: false })),
        });
        const saleId = saleIdOf(order);
        if (saleId) onUpdateSale(saleId, { status: "Cancelada" });
      }
      return {
        ...stop,
        status: "No entregada" as const,
        failReason: decision.reason,
        resolution: decision.action === "Reprogramar" ? ("Reprogramada" as const) : ("Cancelada" as const),
      };
    });
    onUpdate({ ...route, stops, status: "Cerrada", closedAt: stamp(), cashReturned });
    setCloseOpen(false);
    const rescheduled = Object.values(decisions).filter((d) => d.action === "Reprogramar").length;
    const cancelled = Object.values(decisions).filter((d) => d.action === "Cancelar").length;
    onToast(
      `Corte de ${route.id} registrado${rescheduled ? ` · ${rescheduled} reprogramada(s)` : ""}${
        cancelled ? ` · ${cancelled} cancelada(s) a reacomodo` : ""
      }`,
    );
  };

  const deliverTarget = route.stops.find((stop) => stop.orderId === deliverStop);
  const failTarget = route.stops.find((stop) => stop.orderId === failStop);

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button
            className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#2f7468]"
            onClick={onBack}
          >
            <ArrowLeft size={15} /> Volver a rutas
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Hoja de ruta {route.id}</h1>
            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[route.status]}`}>
              {route.status}
            </span>
            {route.extraordinary && (
              <span className="rounded-lg bg-[#fff6df] px-2.5 py-1 text-[10px] font-semibold text-[#9a6b18]">
                Extraordinaria
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {route.zone} · {route.date} · Salida {route.departureTime} h
            {route.distanceKm ? ` · ~${route.distanceKm} km` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setPrintOpen(true)}>
            <Printer size={16} /> Imprimir hoja de ruta
          </button>
          {route.status === "Programada" && (
            <button
              className="primary-button"
              onClick={() => {
                onUpdate({ ...route, status: "En reparto", startedAt: stamp() });
                onToast(`${route.id} salió del almacén`);
              }}
            >
              <Navigation size={16} /> Iniciar ruta
            </button>
          )}
          {live && (
            <button className="primary-button" onClick={() => setCloseOpen(true)}>
              <Calculator size={16} /> Hacer corte de ruta
            </button>
          )}
        </div>
      </section>

      {closed && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#cfe3dd] bg-[#f2f8f6] px-4 py-3 text-xs text-[#285e56]">
          <CircleCheck size={15} />
          <span>
            <strong>Ruta cerrada el {route.closedAt}.</strong> El corte quedó registrado y ya no se puede modificar.
          </span>
        </div>
      )}
      {route.status === "Programada" && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          <Clock3 size={15} className="text-[#2f7468]" />
          Imprime la hoja para el chofer y presiona <strong className="text-slate-700">Iniciar ruta</strong> al salir del
          almacén para registrar entregas, cobros y gastos.
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <p className="eyebrow">Secuencia optimizada</p>
              <h2 className="mt-1 text-lg font-semibold">Paradas de entrega</h2>
            </div>
            <span className="text-xs text-slate-400">
              {resolvedCount}/{route.stops.length} registradas
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {route.stops.map((stop, index) => {
              const order = orderOf(stop);
              return (
                <div key={stop.orderId} className="flex gap-4 p-5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold ${
                        stop.status === "Entregada"
                          ? "bg-[#2f7468] text-white"
                          : stop.status === "No entregada"
                            ? "bg-[#fff0eb] text-[#c9664f]"
                            : "bg-[#edf4f2] text-[#2f7468]"
                      }`}
                    >
                      {stop.status === "Entregada" ? <Check size={16} /> : stop.status === "No entregada" ? <X size={16} /> : stop.sequence}
                    </span>
                    {index < route.stops.length - 1 && <span className="mt-2 h-full min-h-8 w-px bg-slate-200" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{stop.customer}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Orden {stop.orderId} · {order?.items.length ?? "—"} partidas · {stop.city || stop.zone}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${stopStyles[stop.status]}`}>
                          {stop.resolution ? `${stop.status} · ${stop.resolution}` : stop.status}
                        </span>
                        <p className="mt-1.5 text-[10px] text-slate-400">
                          {stop.amountDue > 0 ? `Por cobrar ${money(stop.amountDue)}` : "Sin cobro (pagado o crédito)"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-[#2f7468]" />
                      {stop.address}
                      {stop.city ? `, ${stop.city}` : ""}
                    </p>

                    {stop.status === "Entregada" && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[#f6faf8] px-3 py-2.5 text-[11px] text-slate-600">
                        <span>
                          <strong className="text-[#347652]">Entregada</strong> {stop.deliveredAt?.split("· ")[1]} h
                        </span>
                        <span>Recibió: {stop.receivedBy}</span>
                        <span>
                          Cobrado: <strong>{money(stop.collected || 0)}</strong> · {stop.collectMethod}
                        </span>
                        {stop.shortReason && (
                          <span className="w-full text-[#a95845]">
                            Cobró {money(stop.shortAmount ?? 0)} menos de lo pendiente · motivo: {stop.shortReason}
                          </span>
                        )}
                      </div>
                    )}
                    {stop.status === "No entregada" && (
                      <div className="mt-3 rounded-xl bg-[#fff8f5] px-3 py-2.5 text-[11px] text-[#a95845]">
                        Motivo: {stop.failReason}
                        {stop.resolution && ` · Orden ${stop.resolution.toLowerCase()}`}
                      </div>
                    )}

                    {live && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stop.status === "Pendiente" ? (
                          <>
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f7468] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#285f56]"
                              onClick={() => setDeliverStop(stop.orderId)}
                            >
                              <HandCoins size={13} /> Registrar entrega
                            </button>
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-500 hover:border-[#e5785f] hover:text-[#c9664f]"
                              onClick={() => setFailStop(stop.orderId)}
                            >
                              <Ban size={13} /> No entregada
                            </button>
                          </>
                        ) : (
                          <button
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-[#2f7468]"
                            onClick={() => undo(stop)}
                          >
                            <Undo2 size={13} /> Deshacer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl bg-[#183b36] p-5 text-white shadow-[0_15px_40px_rgba(20,55,49,0.14)]">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b8f34a]">Liquidación del chofer</p>
              <Calculator size={16} className="text-white/40" />
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-white/60">Viáticos entregados</dt>
                <dd>{money(route.viatics)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/60">+ Cobrado en efectivo</dt>
                <dd>{money(totals.cash)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/60">− Gastos comprobados</dt>
                <dd>{money(totals.withReceipt)}</dd>
              </div>
              <div className="flex items-end justify-between border-t border-white/15 pt-3">
                <dt className="font-semibold">Debe entregar</dt>
                <dd className="text-2xl font-semibold tracking-tight text-[#b8f34a]">{money(totals.mustDeliver)}</dd>
              </div>
            </dl>
            <div className="mt-3 space-y-1 text-[10px] text-white/45">
              <p>Cobrado por transferencia / tarjeta: {money(totals.other)} (no entra al efectivo)</p>
              {totals.withoutReceipt > 0 && (
                <p>Gastos sin comprobante: {money(totals.withoutReceipt)} (no se descuentan)</p>
              )}
              <p>
                Cobranza: {money(totals.cash + totals.other)} de {money(totals.expected)} esperado
              </p>
            </div>
            <label className="mt-4 block text-[10px] font-semibold text-white/70">
              Efectivo recibido del chofer
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  disabled={closed}
                  value={route.cashReturned ?? ""}
                  onChange={(e) =>
                    onUpdate({ ...route, cashReturned: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  className="h-10 w-full rounded-xl border border-white/15 bg-white/10 pl-7 pr-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[#b8f34a] disabled:opacity-70"
                  placeholder={totals.mustDeliver.toFixed(2)}
                />
              </div>
            </label>
            {totals.difference !== undefined && (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                  Math.abs(totals.difference) < 0.5
                    ? "bg-[#b8f34a]/15 text-[#b8f34a]"
                    : totals.difference < 0
                      ? "bg-[#e5785f]/20 text-[#ffb3a1]"
                      : "bg-white/10 text-white"
                }`}
              >
                {Math.abs(totals.difference) < 0.5
                  ? "✓ La cuenta cuadra"
                  : totals.difference < 0
                    ? `Faltante: ${money(Math.abs(totals.difference))}`
                    : `Sobrante: ${money(totals.difference)}`}
              </p>
            )}
          </section>

          <section className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Gastos del chofer</p>
              <span className="text-xs font-semibold">
                {money(route.expenses.reduce((sum, item) => sum + item.amount, 0))}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {route.expenses.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2">
                  <Receipt size={14} className={item.receipt ? "text-[#2f7468]" : "text-slate-300"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{item.concept}</p>
                    <p className="text-[9px] text-slate-400">{item.receipt ? "Con comprobante" : "Sin comprobante"}</p>
                  </div>
                  <p className="text-xs font-semibold">{money(item.amount)}</p>
                  {!closed && (
                    <button
                      className="text-slate-300 hover:text-[#c9664f]"
                      onClick={() => onUpdate({ ...route, expenses: route.expenses.filter((e) => e.id !== item.id) })}
                      aria-label={`Eliminar ${item.concept}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {route.expenses.length === 0 && <p className="py-2 text-xs text-slate-400">Sin gastos registrados.</p>}
            </div>
            {!closed && (
              <div className="mt-3 space-y-2 rounded-xl bg-[#f6f8f7] p-3">
                <div className="grid grid-cols-[1fr_96px] gap-2">
                  <select
                    value={expense.concept}
                    onChange={(e) => setExpense({ ...expense, concept: e.target.value })}
                    className="form-input h-9 bg-white"
                  >
                    {["Combustible", "Casetas", "Alimentos", "Estacionamiento", "Maniobras", "Otro"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={expense.amount}
                    onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addExpense()}
                    className="form-input h-9 bg-white"
                    placeholder="$ monto"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={expense.receipt}
                      onChange={(e) => setExpense({ ...expense, receipt: e.target.checked })}
                      className="accent-[#2f7468]"
                    />
                    Tiene comprobante
                  </label>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg bg-[#2f7468] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                    disabled={!Number(expense.amount)}
                    onClick={addExpense}
                  >
                    <Plus size={12} /> Agregar
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="panel p-5">
            <p className="eyebrow">Responsable y vehículo</p>
            <div className="mt-4 space-y-4">
              <Info icon={UserRound} label="Chofer" value={route.driver} />
              <Info icon={Truck} label="Vehículo" value={route.vehicle} />
              <Info
                icon={Clock3}
                label="Salida"
                value={route.startedAt ? `Salió ${route.startedAt}` : `${route.date} · ${route.departureTime} h`}
              />
              {route.durationMin && <Info icon={Banknote} label="Recorrido estimado" value={`~${route.distanceKm} km · ~${hours(route.durationMin)}`} />}
            </div>
          </section>
          <section className="panel p-5">
            <p className="eyebrow">Notas al chofer</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">{route.notes || "Sin indicaciones adicionales."}</p>
          </section>
        </div>
      </div>

      {deliverTarget && (
        <DeliveryModal
          stop={deliverTarget}
          sale={sales.find((item) => item.id === saleIdOf(orderOf(deliverTarget)))}
          onClose={() => setDeliverStop(null)} onConfirm={(data) => registerDelivery(deliverTarget, data)} />
      )}
      {failTarget && (
        <FailModal stop={failTarget} onClose={() => setFailStop(null)} onConfirm={(reason) => markFailed(failTarget, reason)} />
      )}
      {closeOpen && (
        <CloseRouteModal route={route} mustDeliver={totals.mustDeliver} onClose={() => setCloseOpen(false)} onConfirm={closeRoute} />
      )}
      {printOpen && <RoutePrintView route={route} orders={orders} onClose={() => setPrintOpen(false)} />}
    </>
  );
}

function ModalShell({
  eyebrow,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#102521]/65 p-4 backdrop-blur-sm">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-hidden rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto p-6">{children}</div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">{footer}</div>
      </div>
    </div>
  );
}

const shortReasons = [
  "Cliente con crédito autorizado: paga después",
  "Pago parcial acordado con el cliente",
  "Faltó material en la entrega",
  "Rechazó parte del material (dañado o equivocado)",
  "Descuento autorizado por gerencia",
  "Otro",
];

function DeliveryModal({
  stop,
  sale,
  onClose,
  onConfirm,
}: {
  stop: RouteStop;
  sale?: Sale;
  onClose: () => void;
  onConfirm: (data: { collected: number; method: CollectMethod; receivedBy: string; shortReason?: string }) => void;
}) {
  // Lo pendiente se toma de la venta en este momento (si cambió desde que se armó la ruta, manda la venta)
  const due = sale && sale.status === "Pendiente" ? pendingAmount(sale) : sale ? 0 : stop.amountDue;
  const [collected, setCollected] = useState(due ? String(due) : "0");
  const [method, setMethod] = useState<CollectMethod>(due ? "Efectivo" : "Crédito (sin cobro)");
  const [receivedBy, setReceivedBy] = useState("");
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const charged = method === "Crédito (sin cobro)" ? 0 : Number(collected) || 0;
  const short = Math.max(0, Math.round((due - charged) * 100) / 100);
  const over = Math.max(0, Math.round((charged - due) * 100) / 100);
  const needsReason = due > 0 && short > 0.009;
  const finalReason = reason === "Otro" ? other.trim() : reason;
  const noteTotal = sale?.amount ?? due;
  const paidBefore = Math.max(0, Math.round((noteTotal - due - (sale?.returnedAmount ?? 0)) * 100) / 100);
  const confirm = (shortReason?: string) =>
    onConfirm({ collected: method === "Crédito (sin cobro)" ? 0 : charged, method, receivedBy: receivedBy.trim(), shortReason });

  if (asking) {
    return (
      <ModalShell
        eyebrow="Cobro menor a la nota"
        title={`¿Por qué se cobran ${money(short)} menos?`}
        subtitle={`${stop.customer} · nota ${sale?.id ?? stop.orderId} · debía cobrar ${money(due)} y se cobra ${money(charged)}${method === "Crédito (sin cobro)" ? " (crédito)" : ""}`}
        onClose={onClose}
        footer={
          <>
            <button className="secondary-button bg-white" onClick={() => setAsking(false)}>
              Corregir monto
            </button>
            <button className="primary-button disabled:opacity-40" disabled={!finalReason} onClick={() => confirm(finalReason)}>
              <Check size={15} /> Confirmar con este motivo
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="flex items-start gap-2 rounded-xl bg-[#fff6df] p-3 text-[11px] text-[#8a651e]">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            El chofer está cobrando menos de lo que indica la nota. Indica el motivo; los {money(short)} quedarán pendientes de cobro en la venta.
          </p>
          {shortReasons.map((item) => (
            <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs ${reason === item ? "border-[#2f7468] bg-[#f2f8f6]" : "border-slate-200"}`}>
              <input type="radio" checked={reason === item} onChange={() => setReason(item)} className="accent-[#2f7468]" />
              {item}
            </label>
          ))}
          {reason === "Otro" && <input autoFocus value={other} onChange={(e) => setOther(e.target.value)} className="form-input" placeholder="Describe el motivo" />}
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      eyebrow="Registrar entrega"
      title={stop.customer}
      subtitle={`Orden ${stop.orderId} · ${due ? `por cobrar ${money(due)}` : "sin saldo por cobrar"}`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button disabled:opacity-40"
            disabled={!receivedBy.trim()}
            onClick={() => (needsReason ? setAsking(true) : confirm())}
          >
            <Check size={15} /> Confirmar entrega
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-[#fafcfb] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Nota de venta</p>
              <p className="mt-0.5 text-sm font-semibold">{sale ? `${sale.id} · ${sale.items} artículos` : `Orden ${stop.orderId}`}</p>
            </div>
            <p className="text-right">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total de la nota</span>
              <span className="text-xl font-bold">{money(noteTotal)}</span>
            </p>
          </div>
          <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs">
            {paidBefore > 0 && (
              <div className="flex justify-between text-slate-500">
                <dt>Pagado previamente</dt>
                <dd>−{money(paidBefore)}</dd>
              </div>
            )}
            {(sale?.returnedAmount ?? 0) > 0 && (
              <div className="flex justify-between text-slate-500">
                <dt>Devoluciones</dt>
                <dd>−{money(sale!.returnedAmount!)}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-[#183b36]">
              <dt>Debe cobrar el chofer</dt>
              <dd>{money(due)}</dd>
            </div>
          </dl>
        </div>
        <div className="form-label">
          Forma de cobro
          <div className="grid grid-cols-2 gap-2">
            {(["Efectivo", "Transferencia", "Tarjeta", "Crédito (sin cobro)"] as CollectMethod[]).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMethod(item);
                  if (item === "Crédito (sin cobro)") setCollected("0");
                  else if (!Number(collected)) setCollected(String(due));
                }}
                className={`rounded-xl border px-3 py-2.5 text-[11px] font-semibold ${
                  method === item ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {method !== "Crédito (sin cobro)" && (
          <label className="form-label">
            Cantidad cobrada
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <input type="number" min="0" step="0.5" value={collected} onChange={(e) => setCollected(e.target.value)} className="form-input pl-7 text-base font-semibold" />
            </div>
            {needsReason && (
              <span className="font-semibold text-[#c9664f]">Cobra {money(short)} menos que la nota: al confirmar se te pedirá el motivo.</span>
            )}
            {over > 0 && <span className="font-normal text-[#3973a8]">Cobra {money(over)} más de lo pendiente: entrega cambio al cliente.</span>}
          </label>
        )}
        {method === "Crédito (sin cobro)" && needsReason && (
          <p className="text-[11px] font-semibold text-[#c9664f]">No se cobra nada de {money(due)} pendientes: al confirmar se te pedirá el motivo.</p>
        )}
        <label className="form-label">
          Recibió (nombre) *
          <input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className="form-input" placeholder="Nombre de quien recibe" />
        </label>
      </div>
    </ModalShell>
  );
}

const failReasons = ["Cliente ausente / cerrado", "Rechazó el material", "Dirección incorrecta", "No alcanzó el tiempo", "Falta de pago", "Otro"];

function FailModal({ stop, onClose, onConfirm }: { stop: RouteStop; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(failReasons[0]);
  const [other, setOther] = useState("");
  return (
    <ModalShell
      eyebrow="Entrega no realizada"
      title={stop.customer}
      subtitle={`Orden ${stop.orderId}. Al hacer el corte decidirás si se reprograma o se cancela.`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" onClick={() => onConfirm(reason === "Otro" ? other || "Otro" : reason)}>
            <Ban size={15} /> Marcar no entregada
          </button>
        </>
      }
    >
      <div className="space-y-2">
        {failReasons.map((item) => (
          <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs ${reason === item ? "border-[#2f7468] bg-[#f2f8f6]" : "border-slate-200"}`}>
            <input type="radio" checked={reason === item} onChange={() => setReason(item)} className="accent-[#2f7468]" />
            {item}
          </label>
        ))}
        {reason === "Otro" && (
          <input value={other} onChange={(e) => setOther(e.target.value)} className="form-input" placeholder="Describe el motivo" />
        )}
      </div>
    </ModalShell>
  );
}

function CloseRouteModal({
  route,
  mustDeliver,
  onClose,
  onConfirm,
}: {
  route: RoutePlan;
  mustDeliver: number;
  onClose: () => void;
  onConfirm: (decisions: Record<string, { action: "Reprogramar" | "Cancelar"; reason: string }>, cashReturned: number) => void;
}) {
  const unresolved = route.stops.filter((stop) => stop.status !== "Entregada");
  const [decisions, setDecisions] = useState<Record<string, { action: "Reprogramar" | "Cancelar"; reason: string }>>(
    Object.fromEntries(
      unresolved.map((stop) => [stop.orderId, { action: "Reprogramar" as const, reason: stop.failReason || "No alcanzó el tiempo" }]),
    ),
  );
  const [cash, setCash] = useState(route.cashReturned !== undefined ? String(route.cashReturned) : "");
  const difference = cash === "" ? undefined : Number(cash) - mustDeliver;
  return (
    <ModalShell
      wide
      eyebrow="Corte de ruta"
      title={`Cerrar ${route.id}`}
      subtitle={`${route.driver} · ${route.stops.length - unresolved.length} de ${route.stops.length} entregas realizadas`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Seguir en reparto
          </button>
          <button className="primary-button disabled:opacity-40" disabled={cash === ""} onClick={() => onConfirm(decisions, Number(cash))}>
            <Check size={15} /> Confirmar corte
          </button>
        </>
      }
    >
      {unresolved.length > 0 && (
        <div>
          <p className="text-sm font-semibold">¿Qué hacemos con las órdenes no entregadas?</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Reprogramar la regresa a "Liberada a ruta" para una nueva hoja. Cancelar cancela la venta y manda la orden a
            reacomodo en almacén.
          </p>
          <div className="mt-3 space-y-3">
            {unresolved.map((stop) => {
              const decision = decisions[stop.orderId];
              const set = (changes: Partial<typeof decision>) =>
                setDecisions((items) => ({ ...items, [stop.orderId]: { ...items[stop.orderId], ...changes } }));
              return (
                <div key={stop.orderId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{stop.customer}</p>
                      <p className="text-[10px] text-slate-400">
                        {stop.orderId} · {stop.status === "Pendiente" ? "Sin registrar" : `Motivo: ${stop.failReason}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => set({ action: "Reprogramar" })}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-semibold ${
                        decision.action === "Reprogramar" ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <RotateCcw size={13} /> Reprogramar entrega
                    </button>
                    <button
                      onClick={() => set({ action: "Cancelar" })}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-semibold ${
                        decision.action === "Cancelar" ? "border-[#e5785f] bg-[#fff0eb] text-[#c9664f]" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <Ban size={13} /> Cancelar orden
                    </button>
                  </div>
                  <select value={decision.reason} onChange={(e) => set({ reason: e.target.value })} className="form-input mt-2 h-9">
                    {[...new Set([decision.reason, ...failReasons])].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className={`${unresolved.length ? "mt-5 border-t border-slate-100 pt-5" : ""}`}>
        <p className="text-sm font-semibold">Balance del chofer</p>
        <div className="mt-3 grid grid-cols-2 items-end gap-3">
          <div className="rounded-xl bg-[#f6f8f7] p-3">
            <p className="text-[10px] text-slate-500">Debe entregar</p>
            <p className="mt-1 text-lg font-semibold">{money(mustDeliver)}</p>
          </div>
          <label className="form-label">
            Efectivo recibido *
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <input type="number" min="0" step="0.5" value={cash} onChange={(e) => setCash(e.target.value)} className="form-input pl-7 text-base font-semibold" />
            </div>
          </label>
        </div>
        {difference !== undefined && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
              Math.abs(difference) < 0.5 ? "bg-[#eaf6ef] text-[#347652]" : difference < 0 ? "bg-[#fff0eb] text-[#c9664f]" : "bg-[#e8f2ff] text-[#3973a8]"
            }`}
          >
            {Math.abs(difference) < 0.5
              ? "✓ La cuenta cuadra"
              : difference < 0
                ? `Faltante de ${money(Math.abs(difference))}: quedará registrado en el corte`
                : `Sobrante de ${money(difference)}`}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
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
