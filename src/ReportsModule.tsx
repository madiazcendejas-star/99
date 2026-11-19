import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ChartColumn,
  CircleCheck,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileText,
  HandCoins,
  Info,
  Landmark,
  PackageCheck,
  PackageOpen,
  Pencil,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { Customer } from "./CustomersModule";
import type { InventoryProduct, StockMovement } from "./InventoryModule";
import type { Order } from "./OrdersModule";
import type { RoutePlan } from "./RoutesModule";
import type { CashSession } from "./CashModule";
import type { SaleReturn } from "./ReturnsModule";
import { pendingAmount, type Sale } from "./SalesModule";
import { company } from "./QuoteDocument";
import { purchaseTotals, type PurchaseOrder } from "./PurchasesModule";

/** Foto del dinero disponible (desde Caja → Bancos) */
export type Treasury = { cash: number; accounts: { name: string; books: number; confirmed: number }[] };

// ---------- Tipos ----------
type QuoteReport = { id: string; client: string; amount: number; status: string; owner: string; issuedAt?: string };
type ReportTab = "Resumen" | "Resultados" | "Ventas" | "Inventario" | "Operación";
export type PeriodKey = "Hoy" | "7 días" | "Este mes" | "Mes anterior" | "Rango";
export type FixedExpense = { id: string; concept: string; monthly: number };

export const defaultFixedExpenses: FixedExpense[] = [
  { id: "fx-2", concept: "Renta del local", monthly: 15000 },
  { id: "fx-3", concept: "Luz, agua e internet", monthly: 3800 },
  { id: "fx-4", concept: "Mantenimiento de vehículos", monthly: 5500 },
  { id: "fx-5", concept: "Gastos administrativos", monthly: 2700 },
];

// ---------- Fechas ----------
const TODAY_ISO = "2026-11-18";
/** Inicio de los datos detallados del sistema; antes se usa el histórico de ventas */
const DETAIL_FROM = "2026-11-16";
const MONTHS: Record<string, string> = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12" };
const isoOf = (text?: string) => {
  const match = text?.match(/(\d{1,2}) (\w{3}) (\d{4})/);
  return match ? `${match[3]}-${MONTHS[match[2]] ?? "01"}-${match[1].padStart(2, "0")}` : "";
};
const shift = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000) + 1;
const shortLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
const longLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).getDay();

type Range = { from: string; to: string; label: string };
const HISTORY_FROM = "2026-09-01";
const rangeOf = (period: PeriodKey, custom?: { from: string; to: string }): { current: Range; previous: Range } => {
  if (period === "Rango" && custom) {
    const length = daysBetween(custom.from, custom.to);
    const prevTo = shift(custom.from, -1);
    const prevFrom = shift(custom.from, -length);
    const label = custom.from === custom.to ? longLabel(custom.from) : `${shortLabel(custom.from)} – ${shortLabel(custom.to)} ${custom.to.slice(0, 4)}`;
    return {
      current: { from: custom.from, to: custom.to, label },
      previous: {
        from: prevFrom,
        to: prevTo,
        label: length === 1 ? `el día anterior` : `${length} días anteriores (${shortLabel(prevFrom)} – ${shortLabel(prevTo)})`,
      },
    };
  }
  if (period === "Hoy")
    return { current: { from: TODAY_ISO, to: TODAY_ISO, label: longLabel(TODAY_ISO) }, previous: { from: shift(TODAY_ISO, -1), to: shift(TODAY_ISO, -1), label: "ayer" } };
  if (period === "7 días")
    return {
      current: { from: shift(TODAY_ISO, -6), to: TODAY_ISO, label: `${shortLabel(shift(TODAY_ISO, -6))} – ${shortLabel(TODAY_ISO)}` },
      previous: { from: shift(TODAY_ISO, -13), to: shift(TODAY_ISO, -7), label: "7 días anteriores" },
    };
  if (period === "Este mes")
    return {
      current: { from: "2026-11-01", to: TODAY_ISO, label: `1 – ${shortLabel(TODAY_ISO)} 2026` },
      previous: { from: "2026-10-01", to: "2026-10-18", label: "mismos días de octubre" },
    };
  return { current: { from: "2026-10-01", to: "2026-10-31", label: "octubre 2026" }, previous: { from: "2026-09-01", to: "2026-09-30", label: "septiembre" } };
};

// ---------- Histórico (antes del 16 nov el detalle no existe en el prototipo) ----------
type Day = {
  iso: string;
  revenue: number;
  returns: number;
  cost: number;
  tickets: number;
  methods: Record<string, number>;
  categories: Record<string, number>;
  routeExpenses: number;
  cashExpenses: number;
  shrinkage: number;
  commissions: number;
  bankFees: number;
  /** Lo efectivamente cobrado de las ventas del día (neto de reembolsos) */
  collected: number;
  /** Costo de la parte cobrada */
  collectedCost: number;
};
const CATEGORY_MIX: [string, number][] = [
  ["PVC hidráulico", 0.31],
  ["CPVC", 0.16],
  ["Conexiones PVC", 0.15],
  ["Almacenamiento", 0.14],
  ["Válvulas", 0.09],
  ["Accesorios", 0.07],
  ["Mangueras", 0.05],
  ["Adhesivos", 0.03],
];
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const HISTORY: Record<string, Day> = (() => {
  const rand = seeded(9917);
  const result: Record<string, Day> = {};
  for (let iso = "2026-09-01"; iso < DETAIL_FROM; iso = shift(iso, 1)) {
    const wd = weekday(iso);
    const base = wd === 0 ? 0 : wd === 6 ? 18000 : 28000;
    const growth = 1 + (daysBetween("2026-09-01", iso) / 76) * 0.08;
    const revenue = wd === 0 ? 0 : Math.round(base * growth * (0.82 + rand() * 0.36));
    const costRatio = 0.66 + rand() * 0.04;
    const returns = rand() < 0.12 ? Math.round(revenue * 0.02) : 0;
    const net = revenue - returns;
    const cash = 0.36 + rand() * 0.08;
    const card = 0.3 + rand() * 0.06;
    result[iso] = {
      iso,
      revenue,
      returns,
      cost: Math.round(net * costRatio),
      tickets: wd === 0 ? 0 : Math.round(revenue / (1900 + rand() * 1100)),
      methods: { Efectivo: net * cash, Tarjeta: net * card, Transferencia: net * (1 - cash - card) * 0.7, Crédito: net * (1 - cash - card) * 0.3 },
      categories: Object.fromEntries(CATEGORY_MIX.map(([name, share]) => [name, net * share * (0.85 + rand() * 0.3)])),
      routeExpenses: wd === 0 ? 0 : Math.round(450 + rand() * 600),
      cashExpenses: wd === 0 ? 0 : Math.round(rand() * 220),
      shrinkage: rand() < 0.08 ? Math.round(150 + rand() * 500) : 0,
      commissions: Math.round(net * 0.008),
      bankFees: Math.round(net * card * 0.03),
      collected: net,
      collectedCost: Math.round(net * costRatio),
    };
  }
  return result;
})();

// ---------- Utilidades ----------
const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const money2 = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const pct = (value: number) => `${value.toFixed(1)}%`;
const change = (now: number, before: number) => (before ? ((now - before) / Math.abs(before)) * 100 : now ? 100 : 0);
const emptyDay = (iso: string): Day => ({ iso, revenue: 0, returns: 0, cost: 0, tickets: 0, methods: {}, categories: {}, routeExpenses: 0, cashExpenses: 0, shrinkage: 0, commissions: 0, bankFees: 0, collected: 0, collectedCost: 0 });
const add = (record: Record<string, number>, key: string, value: number) => (record[key] = (record[key] || 0) + value);

type Totals = ReturnType<typeof totalsOf>;
function totalsOf(days: Day[], fixed: FixedExpense[], payrollMonthly = 0) {
  const sum = (key: keyof Day) => days.reduce((s, d) => s + (d[key] as number), 0);
  const revenue = sum("revenue");
  const returns = sum("returns");
  const netSales = revenue - returns;
  const cost = sum("cost");
  const collected = sum("collected");
  const collectedCost = sum("collectedCost");
  const uncollected = netSales - collected;
  /** La utilidad se calcula sobre lo cobrado */
  const gross = collected - collectedCost;
  const accrualGross = netSales - cost;
  const fixedMonthly = fixed.reduce((s, f) => s + f.monthly, 0);
  const fixedProrated = (fixedMonthly / 30) * days.length;
  const routeExpenses = sum("routeExpenses");
  const cashExpenses = sum("cashExpenses");
  const shrinkage = sum("shrinkage");
  const payroll = (payrollMonthly / 30) * days.length;
  const commissions = sum("commissions");
  const bankFees = sum("bankFees");
  const expenses = payroll + commissions + bankFees + fixedProrated + routeExpenses + cashExpenses + shrinkage;
  const net = gross - expenses;
  const tickets = sum("tickets");
  const methods: Record<string, number> = {};
  const categories: Record<string, number> = {};
  days.forEach((d) => {
    Object.entries(d.methods).forEach(([k, v]) => add(methods, k, v));
    Object.entries(d.categories).forEach(([k, v]) => add(categories, k, v));
  });
  return {
    revenue,
    returns,
    netSales,
    cost,
    collected,
    collectedCost,
    uncollected,
    collectedShare: netSales ? (collected / netSales) * 100 : 0,
    accrualGross,
    gross,
    grossMargin: collected ? (gross / collected) * 100 : 0,
    fixedProrated,
    fixedMonthly,
    payroll,
    payrollMonthly,
    commissions,
    bankFees,
    routeExpenses,
    cashExpenses,
    shrinkage,
    expenses,
    net,
    netMargin: collected ? (net / collected) * 100 : 0,
    tickets,
    averageTicket: tickets ? netSales / tickets : 0,
    methods,
    categories,
    days: days.length,
  };
}

export default function ReportsModule({
  sales,
  products,
  orders,
  routes,
  customers,
  quotes,
  returns = [],
  cashSessions = [],
  movements = [],
  payrollMonthly = 0,
  commissionRates = {},
  bankFees = {},
  fixedExpenses = defaultFixedExpenses,
  onFixedExpenses,
  onNavigate,
  onToast,
  canSeeProfit = true,
  treasury,
  purchases = [],
}: {
  treasury?: Treasury;
  purchases?: PurchaseOrder[];
  /** Permiso del rol para ver costos, utilidades y estado de resultados */
  canSeeProfit?: boolean;
  sales: Sale[];
  products: InventoryProduct[];
  orders: Order[];
  routes: RoutePlan[];
  customers: Customer[];
  quotes: QuoteReport[];
  returns?: SaleReturn[];
  cashSessions?: CashSession[];
  movements?: StockMovement[];
  /** Costo mensual de la plantilla (sueldos + carga social), desde Colaboradores */
  payrollMonthly?: number;
  /** % de comisión por vendedor */
  commissionRates?: Record<string, number>;
  /** Comisiones de terminal bancaria por día (desde Caja → Bancos) */
  bankFees?: Record<string, number>;
  fixedExpenses?: FixedExpense[];
  onFixedExpenses?: (items: FixedExpense[]) => void;
  onNavigate?: (nav: string, focus?: { status?: string; query?: string; selectedId?: string }) => void;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<ReportTab>("Resumen");
  const [period, setPeriod] = useState<PeriodKey>("Este mes");
  const [custom, setCustom] = useState({ from: "2026-10-01", to: "2026-10-15" });
  const [editingFixed, setEditingFixed] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const { current, previous } = rangeOf(period, custom);
  const hasPrev = previous.from >= HISTORY_FROM;
  const cmp = (a: number, b: number) => (hasPrev ? change(a, b) : undefined);
  const setCustomDate = (key: "from" | "to", value: string) => {
    if (!value) return;
    const clamped = value < HISTORY_FROM ? HISTORY_FROM : value > TODAY_ISO ? TODAY_ISO : value;
    setCustom((c) => {
      const next = { ...c, [key]: clamped };
      if (next.from > next.to) key === "from" ? (next.to = next.from) : (next.from = next.to);
      return next;
    });
  };

  const productOf = (sku: string) => products.find((p) => p.sku === sku);

  /** Un registro por día: histórico + operación real del sistema (ventas, devoluciones, rutas, caja, mermas) */
  const dayMap = useMemo(() => {
    const map: Record<string, Day> = {};
    const get = (iso: string) => (map[iso] ??= HISTORY[iso] ? JSON.parse(JSON.stringify(HISTORY[iso])) : emptyDay(iso));
    sales
      .filter((sale) => sale.status !== "Cancelada")
      .forEach((sale) => {
        const day = get(isoOf(sale.date));
        day.revenue += sale.amount;
        day.tickets += 1;
        if (sale.status === "Pagada") day.commissions += (sale.amount * (commissionRates[sale.seller] ?? 0)) / 100;
        const lines = sale.lines || [];
        const linesTotal = lines.reduce((s, l) => s + l.total, 0) || 1;
        // Lo cobrado: total − saldo pendiente − lo que se descontó por devoluciones
        const collected = Math.max(0, sale.amount - pendingAmount(sale) - (sale.creditedAmount ?? 0));
        const share = sale.amount ? Math.min(1, collected / sale.amount) : 0;
        day.collected += collected;
        lines.forEach((line) => {
          const product = productOf(line.sku);
          const componentsCost = line.components?.reduce((sum, c) => sum + c.quantity * (productOf(c.sku)?.cost ?? 0), 0);
          const lineCost = line.quantity * (componentsCost ?? line.unitCost ?? product?.cost ?? line.unitPrice * 0.72);
          day.cost += lineCost;
          day.collectedCost += lineCost * share;
          add(day.categories, line.components || line.sku.startsWith("KIT-") ? "Kits" : product?.category ?? "Pedidos especiales", sale.amount * (line.total / linesTotal));
        });
        const parts = sale.payments ?? [{ method: sale.payment, amount: sale.amount }];
        parts.forEach((part) => {
          const method = part.method === "Por definir" ? "Crédito" : part.method === "Contra entrega" ? (sale.status === "Pagada" ? "Efectivo" : "Crédito") : part.method;
          add(day.methods, method, part.amount);
        });
      });
    returns.forEach((ret) => {
      const day = get(isoOf(ret.date));
      day.returns += ret.total;
      // Lo reembolsado (efectivo, tarjeta o saldo a favor) sale de lo cobrado
      const refundShare = ret.total ? (ret.refundAmount ?? 0) / ret.total : 0;
      day.collected -= ret.refundAmount ?? 0;
      ret.lines.forEach((line) => {
        const cost = productOf(line.sku)?.cost ?? line.unitPrice * 0.72;
        // El costo de lo devuelto sale del costo de venta; si viene dañado, se reconoce como merma
        day.cost -= line.quantity * cost;
        day.collectedCost -= line.quantity * cost * refundShare;
        if (line.condition === "Dañado") day.shrinkage += line.quantity * cost;
      });
    });
    routes.forEach((route) => {
      const iso = route.dateISO || isoOf(route.date);
      if (iso < DETAIL_FROM) return;
      get(iso).routeExpenses += route.expenses.reduce((s, e) => s + e.amount, 0);
    });
    cashSessions.forEach((session) => {
      if (session.dateISO < DETAIL_FROM) return;
      get(session.dateISO).cashExpenses += session.movements.filter((m) => m.kind === "Gasto").reduce((s, m) => s + m.amount, 0);
    });
    Object.entries(bankFees).forEach(([iso, fee]) => {
      if (iso >= DETAIL_FROM) get(iso).bankFees += fee;
    });
    movements
      .filter((m) => m.kind === "Merma" && !m.reference.startsWith("Devolución"))
      .forEach((m) => {
        const iso = isoOf(m.date);
        if (iso >= DETAIL_FROM) get(iso).shrinkage += Math.abs(m.qty) * (productOf(m.sku)?.cost ?? 0);
      });
    return map;
  }, [sales, returns, routes, cashSessions, movements, products, commissionRates, bankFees]);

  const daysOf = (range: Range) => {
    const list: Day[] = [];
    for (let iso = range.from; iso <= range.to; iso = shift(iso, 1)) list.push(dayMap[iso] ?? (HISTORY[iso] ? HISTORY[iso] : emptyDay(iso)));
    return list;
  };
  const currentDays = daysOf(current);
  const now = totalsOf(currentDays, fixedExpenses, payrollMonthly);
  const before = totalsOf(daysOf(previous), fixedExpenses, payrollMonthly);
  const chartDays = period === "Hoy" ? daysOf({ from: shift(TODAY_ISO, -6), to: TODAY_ISO, label: "" }) : currentDays;
  const periodSales = sales.filter((sale) => {
    const iso = isoOf(sale.date);
    return iso >= current.from && iso <= current.to;
  });
  const pendingBalance = sales.reduce((sum, sale) => sum + pendingAmount(sale), 0);

  /** Posición al día: dinero disponible, pedidos por entregar y compras por recibir */
  const position = useMemo(() => {
    const saleOf = (o: Order) => {
      const match = o.source.match(/Venta (V-\d+)/);
      return sales.find((s) => (match ? s.id === match[1] : s.orderId === o.id));
    };
    const READY = ["Lista", "Liberada a ruta", "Liberada a mostrador", "Asignada a ruta"];
    const counted = new Set<string>();
    const toDeliver = { ready: 0, readyCount: 0, picking: 0, pickingCount: 0, paidValue: 0, paidCount: 0 };
    orders
      .filter((o) => (o.kind ?? "Surtido") === "Surtido" && !["Entregada", "Cancelada", "Por reacomodar"].includes(o.status))
      .forEach((o) => {
        const sale = saleOf(o);
        if (!sale || sale.status === "Cancelada") return;
        const due = pendingAmount(sale);
        if (due > 0) counted.add(sale.id);
        if (due <= 0) {
          toDeliver.paidValue += sale.amount;
          toDeliver.paidCount += 1;
        } else if (READY.includes(o.status)) {
          toDeliver.ready += due;
          toDeliver.readyCount += 1;
        } else {
          toDeliver.picking += due;
          toDeliver.pickingCount += 1;
        }
      });
    const onOrder = purchases.filter((po) => ["Aprobada", "Enviada", "En recepción"].includes(po.status));
    const drafts = purchases.filter((po) => po.status === "Borrador");
    const banks = (treasury?.accounts ?? []).reduce((s, a) => s + a.books, 0);
    const banksConfirmed = (treasury?.accounts ?? []).reduce((s, a) => s + a.confirmed, 0);
    return {
      ...toDeliver,
      toDeliverTotal: toDeliver.ready + toDeliver.picking,
      /** Saldo por cobrar de ventas ya entregadas (o sin orden de surtido abierta) */
      receivableDelivered: sales.filter((s) => !counted.has(s.id)).reduce((sum, s) => sum + pendingAmount(s), 0),
      poValue: onOrder.reduce((s, po) => s + purchaseTotals(po).total, 0),
      poCount: onOrder.length,
      poInTransit: onOrder.filter((po) => po.status !== "Aprobada").reduce((s, po) => s + purchaseTotals(po).total, 0),
      draftValue: drafts.reduce((s, po) => s + purchaseTotals(po).total, 0),
      draftCount: drafts.length,
      cash: treasury?.cash ?? 0,
      banks,
      banksConfirmed,
      accounts: treasury?.accounts ?? [],
    };
  }, [orders, sales, purchases, treasury]);

  const exportReport = () => {
    const rows = [
      ["Indicador", current.label, previous.label],
      ["Ventas", now.revenue, before.revenue],
      ["Devoluciones", now.returns, before.returns],
      ["Ventas netas (totales)", now.netSales, before.netSales],
      ["Ventas por cobrar", now.uncollected, before.uncollected],
      ["Ventas cobradas", now.collected, before.collected],
      ["Costo de lo cobrado", now.collectedCost, before.collectedCost],
      ["Utilidad bruta", now.gross, before.gross],
      ["Gastos de operación", now.expenses, before.expenses],
      ["Utilidad neta", now.net, before.net],
    ].map((row) => row.map((cell) => (typeof cell === "number" ? cell.toFixed(2) : cell)));
    const csv = rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `estado_resultados_${period.toLowerCase().replace(/ /g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onToast(`Estado de resultados (${period.toLowerCase()}) exportado`);
  };

  return (
    <>
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Analítica <span className="mx-1">/</span> <span className="text-slate-700">Reportes</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Reportes</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays size={14} /> {current.label} · {hasPrev ? `comparado con ${previous.label}` : "sin datos previos para comparar"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold" role="group" aria-label="Periodo del reporte">
            {(["Hoy", "7 días", "Este mes", "Mes anterior", "Rango"] as PeriodKey[]).map((item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`rounded-lg px-3.5 py-2 transition ${period === item ? "bg-[#2f7468] text-white shadow-sm" : "text-slate-500 hover:text-[#2f7468]"}`}
              >
                {item === "7 días" ? "Últimos 7 días" : item === "Rango" ? "Rango de fechas" : item}
              </button>
            ))}
          </div>
          {canSeeProfit && (
            <>
              <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setPrintOpen(true)} title="Imprimir estado de resultados" aria-label="Imprimir estado de resultados">
                <Printer size={15} />
              </button>
              <button className="primary-button" onClick={exportReport}>
                <Download size={16} /> CSV
              </button>
            </>
          )}
        </div>
      </section>

      {period === "Rango" && (
        <section className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="form-label">
            Desde
            <input type="date" value={custom.from} min={HISTORY_FROM} max={TODAY_ISO} onChange={(e) => setCustomDate("from", e.target.value)} className="form-input h-10 w-44" aria-label="Fecha inicial" />
          </label>
          <label className="form-label">
            Hasta
            <input type="date" value={custom.to} min={HISTORY_FROM} max={TODAY_ISO} onChange={(e) => setCustomDate("to", e.target.value)} className="form-input h-10 w-44" aria-label="Fecha final" />
          </label>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              ["1 – 15 oct", "2026-10-01", "2026-10-15"],
              ["16 – 31 oct", "2026-10-16", "2026-10-31"],
              ["Septiembre", "2026-09-01", "2026-09-30"],
              ["Últimos 30 días", shift(TODAY_ISO, -29), TODAY_ISO],
            ].map(([label, from, to]) => (
              <button
                key={label}
                onClick={() => setCustom({ from, to })}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${custom.from === from && custom.to === to ? "border-[#2f7468] bg-[#edf4f2] text-[#285e56]" : "border-slate-200 text-slate-500 hover:border-[#2f7468]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="ml-auto pb-1.5 text-[11px] text-slate-500">
            {daysBetween(custom.from, custom.to)} {daysBetween(custom.from, custom.to) === 1 ? "día" : "días"} · se compara con {previous.label}
          </p>
        </section>
      )}

      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Tipos de reporte">
        {(["Resumen", "Resultados", "Ventas", "Inventario", "Operación"] as ReportTab[]).filter((item) => canSeeProfit || (item !== "Resultados" && item !== "Inventario")).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`relative shrink-0 px-5 py-3 text-xs font-semibold transition ${tab === item ? "text-[#285e56]" : "text-slate-400 hover:text-slate-600"}`}
          >
            {item === "Resultados" ? "Estado de resultados" : item}
            {tab === item && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2f7468]" />}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "Resumen" && (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resultados de {current.label}</p>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Kpi label="Ventas totales" value={money(now.netSales)} trend={cmp(now.netSales, before.netSales)} detail={`${now.tickets} tickets · cobradas y por cobrar`} icon={Receipt} onClick={() => setTab("Ventas")} />
              <Kpi label="Ventas cobradas" value={money(now.collected)} trend={cmp(now.collected, before.collected)} detail={`${pct(now.collectedShare)} de lo vendido · faltan ${money(now.uncollected)}`} icon={CircleDollarSign} onClick={() => setTab("Ventas")} />
              {canSeeProfit ? (
                <>
                  <Kpi label="Utilidad bruta" value={money(now.gross)} trend={cmp(now.gross, before.gross)} detail={`Margen ${pct(now.grossMargin)} · cobrado − costo`} icon={TrendingUp} onClick={() => setTab("Resultados")} />
                  <Kpi label="Utilidad neta" value={money(now.net)} trend={cmp(now.net, before.net)} detail={`Margen ${pct(now.netMargin)} · − gastos ${money(now.expenses)}`} icon={Wallet} onClick={() => setTab("Resultados")} />
                </>
              ) : (
                <>
                  <Kpi label="Ticket promedio" value={money(now.averageTicket)} trend={cmp(now.averageTicket, before.averageTicket)} detail="Ventas totales ÷ tickets" icon={ShoppingBag} onClick={() => setTab("Ventas")} />
                  <Kpi label="Devoluciones" value={money(now.returns)} detail="En el periodo" icon={TrendingDown} onClick={() => onNavigate?.("Ventas")} />
                </>
              )}
            </section>

            <p className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Posición al {longLabel(TODAY_ISO)}</p>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Kpi
                label="Saldo en bancos y caja"
                value={money(position.banks + position.cash)}
                detail={`Bancos ${money(position.banks)} · efectivo ${money(position.cash)}`}
                icon={Landmark}
                onClick={() => onNavigate?.("Caja", { status: "Bancos" })}
              />
              <Kpi label="Cuentas por cobrar" value={money(pendingBalance)} detail={`Entregado ${money(position.receivableDelivered)} · por entregar ${money(position.toDeliverTotal)}`} icon={HandCoins} onClick={() => onNavigate?.("Ventas", { status: "Pendiente" })} />
              <Kpi
                label="Pedidos por entregar"
                value={money(position.toDeliverTotal)}
                detail={`Surtidos ${money(position.ready)} · en surtido ${money(position.picking)}`}
                icon={PackageOpen}
                onClick={() => onNavigate?.("Órdenes", { status: "Listas para salida" })}
              />
              <Kpi
                label="OC por recibir"
                value={money(position.poValue)}
                detail={`${position.poCount} ${position.poCount === 1 ? "orden" : "órdenes"} · ${money(position.poInTransit)} ya en camino`}
                icon={ShoppingCart}
                onClick={() => onNavigate?.("Compras", { status: "Abiertas" })}
              />
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              <TrendChart showProfit={canSeeProfit} days={chartDays} highlight={period === "Hoy" ? TODAY_ISO : undefined} title={canSeeProfit ? (period === "Hoy" ? "Ventas y utilidad bruta · últimos 7 días" : "Ventas y utilidad bruta por día") : "Ventas por día"} />
              <CategoryPanel categories={now.categories} total={now.netSales} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="panel p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow">Dinero disponible hoy</p>
                    <h2 className="panel-title">{money(position.banks + position.cash)}</h2>
                  </div>
                  <button className="link-button" onClick={() => onNavigate?.("Caja", { status: "Bancos" })}>
                    Ver bancos
                  </button>
                </div>
                <div className="mt-4 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500">Efectivo en caja (turno abierto)</span>
                    <strong>{money2(position.cash)}</strong>
                  </div>
                  {position.accounts.map((a) => (
                    <div key={a.name} className="flex items-center justify-between py-2.5">
                      <span className="text-slate-500">
                        {a.name}
                        {Math.abs(a.books - a.confirmed) >= 0.01 && <span className="ml-2 text-[10px] text-slate-400">confirmado {money(a.confirmed)}</span>}
                      </span>
                      <strong>{money2(a.books)}</strong>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-slate-400">El saldo de cada cuenta incluye movimientos por confirmar (cobros con tarjeta, transferencias y depósitos de cortes).</p>
              </section>
              <section className="panel p-5">
                <p className="eyebrow">Lo que viene</p>
                <h2 className="panel-title">Entradas y salidas comprometidas</h2>
                <div className="mt-4 divide-y divide-slate-100 text-xs">
                  {[
                    { label: "Por cobrar de lo ya entregado", hint: "Ventas a crédito o entregadas con saldo", value: position.receivableDelivered, go: () => onNavigate?.("Ventas", { status: "Pendiente" }) },
                    { label: "Pedidos surtidos por entregar", hint: `${position.readyCount} ${position.readyCount === 1 ? "pedido listo" : "pedidos listos"} o en ruta, sin cobrar`, value: position.ready, go: () => onNavigate?.("Órdenes", { status: "Listas para salida" }) },
                    { label: "Pedidos en surtido", hint: `${position.pickingCount} ${position.pickingCount === 1 ? "pedido confirmado" : "pedidos confirmados"} en almacén, sin cobrar`, value: position.picking, go: () => onNavigate?.("Órdenes", { status: "Por surtir" }) },
                    { label: "OC por recibir", hint: `${position.poCount} aprobadas o en camino${position.draftCount ? ` · ${position.draftCount} ${position.draftCount === 1 ? "borrador" : "borradores"} por ${money(position.draftValue)}` : ""}`, value: -position.poValue, go: () => onNavigate?.("Compras", { status: "Abiertas" }) },
                  ].map((row) => (
                    <button key={row.label} className="flex w-full items-center justify-between py-2.5 text-left hover:opacity-80" onClick={row.go}>
                      <span>
                        <span className="block font-semibold text-slate-600">{row.label}</span>
                        <span className="text-[10px] text-slate-400">{row.hint}</span>
                      </span>
                      <strong className={row.value < 0 ? "text-[#c9664f]" : "text-[#347652]"}>
                        {row.value < 0 ? "−" : "+"}
                        {money2(Math.abs(row.value))}
                      </strong>
                    </button>
                  ))}
                  <div className="flex items-center justify-between pt-3 text-sm">
                    <span className="font-bold">Dinero proyectado</span>
                    <strong>{money2(position.banks + position.cash + position.receivableDelivered + position.toDeliverTotal - position.poValue)}</strong>
                  </div>
                </div>
                {position.paidCount > 0 && (
                  <p className="mt-3 text-[10px] text-slate-400">
                    Además hay {position.paidCount} {position.paidCount === 1 ? "pedido ya cobrado" : "pedidos ya cobrados"} pendientes de entregar por {money(position.paidValue)} (no suman porque el dinero ya entró).
                  </p>
                )}
              </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {canSeeProfit && <section className="panel p-5">
                <p className="eyebrow">Resultado del periodo</p>
                <h2 className="panel-title">De ventas a utilidad</h2>
                <div className="mt-5 space-y-2.5 text-xs">
                  {[
                    ["Ventas totales", now.netSales, "#cfe3dd"],
                    ["Por cobrar (aún no es dinero)", -now.uncollected, "#e5e7eb"],
                    ["Ventas cobradas", now.collected, "#2f7468"],
                    ["Costo de lo cobrado", -now.collectedCost, "#a8c6be"],
                    ["Utilidad bruta", now.gross, "#73a697"],
                    ["Gastos de operación", -now.expenses, "#e5b9ad"],
                    ["Utilidad neta", now.net, now.net >= 0 ? "#b8f34a" : "#e5785f"],
                  ].map(([label, value, color]) => (
                    <div key={label as string}>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{label as string}</span>
                        <strong className={(value as number) < 0 ? "text-[#c9664f]" : ""}>{money(value as number)}</strong>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(value as number) / Math.max(1, now.netSales)) * 100)}%`, backgroundColor: color as string }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>}
              <section className="panel overflow-hidden">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Clientes</p>
                    <h2 className="panel-title">Mayor venta del periodo</h2>
                  </div>
                  <Users size={17} className="text-slate-300" />
                </div>
                <div className="divide-y divide-slate-100 px-5">
                  {Object.entries(
                    periodSales.filter((s) => s.status !== "Cancelada" && s.client !== "Público general").reduce<Record<string, number>>((acc, s) => {
                      acc[s.client] = (acc[s.client] || 0) + s.amount;
                      return acc;
                    }, {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([client, amount], index) => (
                      <button key={client} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80" onClick={() => onNavigate?.("Clientes", { query: client })}>
                        <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-500">{index + 1}</span>
                        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{client}</p>
                        <p className="text-xs font-semibold">{money(amount)}</p>
                      </button>
                    ))}
                  {periodSales.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sin ventas detalladas en el periodo.</p>}
                </div>
              </section>
              <section className="panel overflow-hidden">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Atención</p>
                    <h2 className="panel-title">Alertas del negocio</h2>
                  </div>
                  <TriangleAlert size={17} className="text-[#c9664f]" />
                </div>
                <div className="space-y-3 px-5 pb-5">
                  <AlertRow title={`${products.filter((p) => p.stock - p.reserved <= p.minimumStock).length} productos con stock bajo`} detail="Ver sugerencias de compra" tone="red" onClick={() => onNavigate?.("Compras")} />
                  {now.netMargin < 5 && <AlertRow title={`Margen neto de ${pct(now.netMargin)}`} detail="Revisa gastos y precios en el estado de resultados" tone="yellow" onClick={() => setTab("Resultados")} />}
                  <AlertRow title={money(pendingBalance)} detail="Saldo pendiente por recuperar" tone="blue" onClick={() => onNavigate?.("Ventas", { status: "Pendiente" })} />
                </div>
              </section>
            </div>
          </>
        )}

        {tab === "Resultados" && (
          <ResultsStatement now={now} before={before} periodLabel={current.label} previousLabel={previous.label} fixedExpenses={fixedExpenses} onEditFixed={() => setEditingFixed(true)} />
        )}

        {tab === "Ventas" && (
          <SalesReport
            now={now}
            before={before}
            sales={periodSales}
            quotes={quotes.filter((q) => !q.issuedAt || (q.issuedAt >= current.from && q.issuedAt <= current.to))}
            chartDays={chartDays}
            period={period}
            onOpenSale={(id) => onNavigate?.("Ventas", { selectedId: id })}
            cmp={cmp}
            canSeeProfit={canSeeProfit}
            onNavigate={onNavigate}
          />
        )}
        {tab === "Inventario" && <InventoryReport products={products} onNavigate={onNavigate} />}
        {tab === "Operación" && <OperationsReport orders={orders} routes={routes} onNavigate={onNavigate} />}
      </div>

      <p className="mt-5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
        <RefreshCw size={11} /> Datos al {longLabel(TODAY_ISO)} · operaciones anteriores al 16 nov provienen del histórico de ventas
      </p>

      {editingFixed && (
        <FixedExpensesModal
          items={fixedExpenses}
          onClose={() => setEditingFixed(false)}
          onSave={(items) => {
            onFixedExpenses?.(items);
            setEditingFixed(false);
            onToast("Gastos fijos actualizados");
          }}
        />
      )}
      {printOpen && <ResultsPrintView now={now} before={before} periodLabel={current.label} previousLabel={previous.label} fixedExpenses={fixedExpenses} onClose={() => setPrintOpen(false)} />}
    </>
  );
}

// ---------- KPI ----------
function Kpi({
  label,
  value,
  trend,
  detail,
  icon: Icon,
  onClick,
  inverse = false,
}: {
  label: string;
  value: string;
  trend?: number;
  detail: string;
  icon: typeof ChartColumn;
  onClick?: () => void;
  inverse?: boolean;
}) {
  const good = trend === undefined ? true : inverse ? trend <= 0 : trend >= 0;
  return (
    <button className="stat-card stat-card--link" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="stat-icon">
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-semibold ${good ? "bg-[#eaf6ef] text-[#347652]" : "bg-[#fff0eb] text-[#c9664f]"}`}>
              {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trend >= 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
          )}
          <ArrowUpRight size={16} className="stat-go" />
        </div>
      </div>
      <div className="mt-5">
        <p className="stat-label">{label}</p>
        <p className={`stat-value ${value.startsWith("-") ? "text-[#c9664f]" : ""}`}>{value}</p>
        <p className="stat-detail mt-2 text-xs text-slate-400">{detail}</p>
      </div>
    </button>
  );
}

// ---------- Gráfica ----------
function TrendChart({ days, title, highlight, showProfit = true }: { days: Day[]; title: string; highlight?: string; showProfit?: boolean }) {
  const data = days.map((d) => ({ iso: d.iso, sales: d.revenue - d.returns, collected: d.collected, gross: d.collected - d.collectedCost }));
  const max = Math.max(1, ...data.map((d) => d.sales));
  const total = data.reduce((s, d) => s + d.sales, 0);
  const many = data.length > 12;
  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Tendencia</p>
          <h2 className="panel-title">{title}</h2>
          <p className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm bg-[#dce9e6]" /> Ventas totales
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm bg-[#8fbfb2]" /> Cobradas
            </span>
            {showProfit && (
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-[#2f7468]" /> Utilidad bruta
              </span>
            )}
          </p>
        </div>
        <p className="text-xl font-semibold">{money(total)}</p>
      </div>
      <div className={`mt-6 flex h-48 items-end ${many ? "gap-1" : "gap-3"}`}>
        {data.map((d) => (
          <div key={d.iso} className="group flex h-full flex-1 flex-col justify-end">
            <div className="relative flex flex-1 items-end">
              <div className={`relative w-full rounded-t-md ${d.iso === highlight ? "bg-[#b9d8cf]" : "bg-[#dce9e6]"} transition group-hover:bg-[#cfe3dd]`} style={{ height: `${(d.sales / max) * 100}%` }}>
                <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-[#8fbfb2]" style={{ height: d.sales ? `${Math.min(1, Math.max(0, d.collected / d.sales)) * 100}%` : 0 }} />
                {showProfit && <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-[#2f7468]" style={{ height: d.sales ? `${Math.max(0, d.gross / d.sales) * 100}%` : 0 }} />}
              </div>
              <span className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#183b36] px-2 py-1 text-[9px] text-white group-hover:block">
                {shortLabel(d.iso)} · vendido {money(d.sales)}
                <br />
                Cobrado {money(d.collected)}
                {showProfit && (
                  <>
                    <br />
                    Utilidad bruta {money(d.gross)}
                  </>
                )}
              </span>
            </div>
            <span className={`mt-2 text-center text-[8px] ${d.iso === highlight ? "font-bold text-[#2f7468]" : "text-slate-400"}`}>
              {many ? (Number(d.iso.slice(8)) % 3 === 1 ? Number(d.iso.slice(8)) : "") : shortLabel(d.iso)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_COLORS = ["#2f7468", "#73a697", "#a8c6be", "#b8f34a", "#5b8fb9", "#d7b45a", "#e5785f", "#94a3b8", "#cbd5e1"];
function CategoryPanel({ categories, total }: { categories: Record<string, number>; total: number }) {
  const list = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const sum = list.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Distribución</p>
          <h2 className="panel-title">Ventas por categoría</h2>
        </div>
        <span className="text-xs font-semibold">{money(total)}</span>
      </div>
      <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">
        {list.map(([name, value], index) => (
          <div key={name} style={{ width: `${(value / sum) * 100}%`, backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} title={name} />
        ))}
      </div>
      <div className="mt-5 space-y-2.5">
        {list.map(([name, value], index) => (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
            <span className="flex-1 text-slate-500">{name}</span>
            <span className="font-semibold">{money(value)}</span>
            <span className="w-10 text-right text-[10px] text-slate-400">{((value / sum) * 100).toFixed(0)}%</span>
          </div>
        ))}
        {list.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Sin ventas en el periodo.</p>}
      </div>
    </section>
  );
}

// ---------- Estado de resultados ----------
function statementRows(now: Totals, fixedExpenses: FixedExpense[]) {
  return [
    { label: "Ventas", value: now.revenue, level: 0 },
    { label: "(−) Devoluciones", value: -now.returns, level: 1 },
    { label: "Ventas totales (netas)", value: now.netSales, level: 0, strong: true },
    { label: "(−) Ventas por cobrar", value: -now.uncollected, level: 1, hint: "aún no entran como dinero" },
    { label: "Ventas cobradas", value: now.collected, level: 0, strong: true, base: true },
    { label: "(−) Costo de lo cobrado", value: -now.collectedCost, level: 1 },
    { label: "Utilidad bruta", value: now.gross, level: 0, strong: true, margin: now.grossMargin },
    { label: "(−) Nómina (sueldos + carga social)", value: -now.payroll, level: 1, hint: `${money(now.payrollMonthly)} al mes · desde Colaboradores` },
    { label: "(−) Comisiones de venta", value: -now.commissions, level: 1 },
    { label: "(−) Comisiones bancarias (terminal)", value: -now.bankFees, level: 1 },
    ...fixedExpenses.map((f) => ({ label: `(−) ${f.concept}`, value: -(f.monthly / 30) * now.days, level: 1, hint: `${money(f.monthly)} al mes · ${now.days} ${now.days === 1 ? "día" : "días"}` })),
    { label: "(−) Gastos de ruta (combustible, casetas)", value: -now.routeExpenses, level: 1 },
    { label: "(−) Gastos de caja", value: -now.cashExpenses, level: 1 },
    { label: "(−) Mermas", value: -now.shrinkage, level: 1 },
    { label: "Total gastos de operación", value: -now.expenses, level: 0 },
    { label: "Utilidad neta", value: now.net, level: 0, strong: true, margin: now.netMargin, final: true },
  ];
}

function ResultsStatement({
  now,
  before,
  periodLabel,
  previousLabel,
  fixedExpenses,
  onEditFixed,
}: {
  now: Totals;
  before: Totals;
  periodLabel: string;
  previousLabel: string;
  fixedExpenses: FixedExpense[];
  onEditFixed: () => void;
}) {
  const rows = statementRows(now, fixedExpenses);
  const prevRows = statementRows(before, fixedExpenses);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_320px]">
      <section className="panel overflow-hidden">
        <div className="panel-header border-b border-slate-100">
          <div>
            <p className="eyebrow">Estado de resultados</p>
            <h2 className="panel-title">{periodLabel}</h2>
          </div>
          <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={onEditFixed}>
            <Pencil size={13} /> Gastos fijos
          </button>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#fafcfb] text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Concepto</th>
              <th className="py-3 text-right">Periodo</th>
              <th className="py-3 text-right">% cobrado</th>
              <th className="py-3 text-right">{previousLabel}</th>
              <th className="px-5 py-3 text-right">Variación</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const prev = prevRows[index]?.value ?? 0;
              const variation = change(row.value, prev);
              return (
                <tr
                  key={row.label}
                  className={`border-t border-slate-100 ${row.final ? (row.value >= 0 ? "bg-[#eef7e0]" : "bg-[#fff0eb]") : row.strong ? "bg-[#f6f8f7]" : ""}`}
                >
                  <td className={`px-5 py-2.5 ${row.level ? "pl-9 text-slate-500" : ""} ${row.strong ? "font-bold" : ""}`}>
                    {row.label}
                    {"hint" in row && row.hint && <span className="ml-2 text-[9px] text-slate-400">{row.hint}</span>}
                  </td>
                  <td className={`py-2.5 text-right ${row.strong ? "font-bold" : ""} ${row.value < 0 && row.strong ? "text-[#c9664f]" : ""}`}>{money2(row.value)}</td>
                  <td className="py-2.5 text-right text-slate-400">{now.collected ? pct((row.value / now.collected) * 100) : "—"}</td>
                  <td className="py-2.5 text-right text-slate-500">{money(prev)}</td>
                  <td className={`px-5 py-2.5 text-right text-[10px] font-semibold ${variation >= 0 ? "text-[#347652]" : "text-[#c9664f]"}`}>
                    {Math.abs(prev) < 1 ? "—" : `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <div className="space-y-4">
        <section className="panel p-5">
          <p className="eyebrow">Fórmulas</p>
          <dl className="mt-3 space-y-3 text-xs">
            <div>
              <dt className="font-semibold">Utilidad bruta = {money(now.gross)}</dt>
              <dd className="text-slate-500">Ventas cobradas − costo de lo cobrado. Margen bruto {pct(now.grossMargin)}.</dd>
            </div>
            <div>
              <dt className="font-semibold">Ventas cobradas = {money(now.collected)}</dt>
              <dd className="text-slate-500">
                De {money(now.netSales)} vendidos en el periodo ya se cobró el {pct(now.collectedShare)}. Lo que falta ({money(now.uncollected)}) entra a la utilidad cuando se cobre.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Utilidad neta = {money(now.net)}</dt>
              <dd className="text-slate-500">Utilidad bruta − gastos de operación. Margen neto {pct(now.netMargin)}.</dd>
            </div>
          </dl>
        </section>
        <section className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-4 text-[11px] leading-relaxed text-slate-500">
          <Info size={15} className="mt-0.5 shrink-0 text-[#2f7468]" />
          <span>
            La utilidad se calcula <strong>solo sobre lo cobrado</strong>: una venta a crédito o contra entrega aún sin pagar no genera utilidad hasta que se cobra (por la parte cobrada). El <strong>costo</strong> usa el costo promedio de cada producto vendido. La <strong>nómina</strong> sale de Colaboradores ({money(now.payrollMonthly)} al mes con carga social) y
            las <strong>comisiones</strong> del % de cada vendedor sobre lo cobrado. La nómina y los <strong>gastos fijos</strong> ({money(now.fixedMonthly)} al mes) se prorratean por día, por eso un solo día puede verse con utilidad neta negativa aunque el mes sea positivo. Las cifras incluyen IVA, igual que los precios.
          </span>
        </section>
      </div>
    </div>
  );
}

function FixedExpensesModal({ items, onClose, onSave }: { items: FixedExpense[]; onClose: () => void; onSave: (items: FixedExpense[]) => void }) {
  const [list, setList] = useState(items.map((i) => ({ ...i, monthlyText: String(i.monthly) })));
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">Estado de resultados</p>
            <h2 className="mt-1 text-xl font-semibold">Gastos fijos mensuales</h2>
            <p className="mt-1 text-xs text-slate-400">Se prorratean por día según el periodo del reporte.</p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2 p-6">
          {list.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[1fr_140px_28px] items-center gap-2">
              <input value={item.concept} onChange={(e) => setList((l) => l.map((x, i) => (i === index ? { ...x, concept: e.target.value } : x)))} className="form-input h-10" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                <input type="number" min={0} value={item.monthlyText} onChange={(e) => setList((l) => l.map((x, i) => (i === index ? { ...x, monthlyText: e.target.value } : x)))} className="form-input h-10 pl-6 text-right font-semibold" />
              </div>
              <button className="text-slate-300 hover:text-[#c9664f]" onClick={() => setList((l) => l.filter((_, i) => i !== index))} aria-label="Quitar gasto">
                <X size={14} />
              </button>
            </div>
          ))}
          <button className="link-button mt-2" onClick={() => setList((l) => [...l, { id: `fx-${Date.now()}`, concept: "Nuevo gasto", monthly: 0, monthlyText: "" }])}>
            + Agregar gasto fijo
          </button>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-bold">
            <span>Total mensual</span>
            <span>{money2(list.reduce((s, i) => s + (Number(i.monthlyText) || 0), 0))}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" onClick={() => onSave(list.filter((i) => i.concept.trim()).map(({ monthlyText, ...rest }) => ({ ...rest, monthly: Number(monthlyText) || 0 })))}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Ventas ----------
function SalesReport({
  now,
  before,
  sales,
  quotes,
  chartDays,
  period,
  onOpenSale,
  onNavigate,
  cmp,
  canSeeProfit = true,
}: {
  canSeeProfit?: boolean;
  cmp: (a: number, b: number) => number | undefined;
  now: Totals;
  before: Totals;
  sales: Sale[];
  quotes: QuoteReport[];
  chartDays: Day[];
  period: PeriodKey;
  onOpenSale: (id: string) => void;
  onNavigate?: (nav: string, focus?: { status?: string; query?: string }) => void;
}) {
  const accepted = quotes.filter((q) => q.status === "Aceptada").length;
  const methods = Object.entries(now.methods).sort((a, b) => b[1] - a[1]);
  const methodsTotal = methods.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Kpi label="Ventas totales" value={money(now.netSales)} trend={cmp(now.netSales, before.netSales)} detail={`${now.tickets} tickets · devoluciones ${money(now.returns)}`} icon={Receipt} onClick={() => onNavigate?.("Ventas")} />
        <Kpi label="Ventas cobradas" value={money(now.collected)} trend={cmp(now.collected, before.collected)} detail={`${pct(now.collectedShare)} de lo vendido ya es dinero`} icon={CircleDollarSign} onClick={() => onNavigate?.("Ventas", { status: "Pagada" })} />
        <Kpi label="Por cobrar del periodo" value={money(now.uncollected)} detail="Vendido en el periodo y aún sin pagar" icon={HandCoins} onClick={() => onNavigate?.("Ventas", { status: "Pendiente" })} />
        <Kpi label="Ticket promedio" value={money(now.averageTicket)} trend={cmp(now.averageTicket, before.averageTicket)} detail="Ventas totales ÷ tickets" icon={ShoppingBag} onClick={() => onNavigate?.("Ventas")} />
        <Kpi label="Importe cotizado" value={money(quotes.reduce((s, q) => s + q.amount, 0))} detail={`${quotes.length} cotizaciones emitidas`} icon={FileText} onClick={() => onNavigate?.("Cotizaciones")} />
        <Kpi label="Conversión" value={pct((accepted / Math.max(1, quotes.length)) * 100)} detail={`${accepted} aceptadas de ${quotes.length}`} icon={Target} onClick={() => onNavigate?.("Cotizaciones", { status: "Aceptada" })} />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <TrendChart showProfit={canSeeProfit} days={chartDays} highlight={period === "Hoy" ? TODAY_ISO : undefined} title="Ventas por día" />
        <section className="panel p-5">
          <p className="eyebrow">Cobros</p>
          <h2 className="panel-title">Formas de pago</h2>
          <div className="mt-5 space-y-4">
            {methods.map(([name, amount], index) => (
              <div key={name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{name === "Crédito" ? "Crédito / por cobrar" : name}</span>
                  <strong>{money(amount)}</strong>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(amount / methodsTotal) * 100}%`, backgroundColor: CATEGORY_COLORS[index] }} />
                </div>
                <p className="mt-1 text-[9px] text-slate-400">{((amount / methodsTotal) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel mt-6 overflow-hidden">
        <div className="panel-header border-b border-slate-100">
          <div>
            <p className="eyebrow">Desglose</p>
            <h2 className="panel-title">Ventas registradas en el periodo</h2>
          </div>
          <span className="text-xs text-slate-400">{sales.length} documentos</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Documento</th>
              <th className="py-3">Cliente</th>
              <th className="py-3">Fecha</th>
              <th className="py-3">Pago</th>
              <th className="py-3">Estado</th>
              <th className="py-3 text-right">Importe</th>
              <th className="py-3 text-right">Cobrado</th>
              <th className="px-5 py-3 text-right">Por cobrar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-[#fafcfb]">
                <td className="px-5 py-3">
                  <button className="font-semibold text-[#2f7468] hover:underline" onClick={() => onOpenSale(sale.id)}>
                    {sale.id}
                  </button>
                </td>
                <td className="py-3">{sale.client}</td>
                <td className="py-3 text-slate-500">
                  {sale.date} · {sale.time}
                </td>
                <td className="py-3 text-slate-500">{sale.payments ? sale.payments.map((p) => p.method).join(" + ") : sale.payment}</td>
                <td className="py-3 text-slate-500">{sale.status}</td>
                <td className={`py-3 text-right font-semibold ${sale.status === "Cancelada" ? "text-slate-300 line-through" : ""}`}>{money2(sale.amount)}</td>
                <td className="py-3 text-right text-[#347652]">{sale.status === "Cancelada" ? "—" : money2(Math.max(0, sale.amount - pendingAmount(sale) - (sale.creditedAmount ?? 0)))}</td>
                <td className={`px-5 py-3 text-right font-semibold ${pendingAmount(sale) > 0 ? "text-[#c9664f]" : "text-slate-300"}`}>{sale.status === "Cancelada" ? "—" : money2(pendingAmount(sale))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <p className="px-5 py-10 text-center text-xs text-slate-400">
            El detalle por documento está disponible desde el 16 nov; antes de esa fecha el reporte usa el histórico de ventas por día.
          </p>
        )}
      </section>
    </>
  );
}

// ---------- Inventario (foto actual) ----------
function InventoryReport({ products, onNavigate }: { products: InventoryProduct[]; onNavigate?: (nav: string, focus?: { status?: string; query?: string }) => void }) {
  const lowStock = products.filter((p) => p.stock - p.reserved <= p.minimumStock);
  const cost = products.reduce((s, p) => s + p.cost * p.stock, 0);
  const retail = products.reduce((s, p) => s + p.retailPrice * p.stock, 0);
  const byCategory = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.cost * p.stock;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Valor a costo" value={money(cost)} detail={`${products.length} productos`} icon={Boxes} onClick={() => onNavigate?.("Inventario")} />
        <Kpi label="Valor a precio" value={money(retail)} detail="Potencial de venta (mostrador)" icon={CircleDollarSign} onClick={() => onNavigate?.("Inventario")} />
        <Kpi label="Margen potencial" value={money(retail - cost)} detail={`${pct(((retail - cost) / Math.max(1, retail)) * 100)} sobre precio`} icon={TrendingUp} onClick={() => onNavigate?.("Inventario")} />
        <Kpi label="Alertas de stock" value={String(lowStock.length)} detail="En mínimo o por debajo · ver compras" icon={TriangleAlert} onClick={() => onNavigate?.("Inventario", { status: "Bajo stock" })} />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="panel p-5">
          <p className="eyebrow">Valuación a costo</p>
          <h2 className="panel-title">Inventario por categoría</h2>
          <div className="mt-6 space-y-4">
            {byCategory.map(([name, value], index) => (
              <div key={name}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{name}</span>
                  <span>{money(value)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(value / Math.max(1, cost)) * 100}%`, backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel overflow-hidden">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Reposición</p>
              <h2 className="panel-title">Productos con stock bajo</h2>
            </div>
            <span className="rounded-lg bg-[#fff0eb] px-2.5 py-1 text-[10px] font-semibold text-[#c9664f]">{lowStock.length} alertas</span>
          </div>
          <div className="divide-y divide-slate-100 px-5">
            {lowStock.map((p) => (
              <button key={p.id} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80" onClick={() => onNavigate?.("Inventario", { query: p.sku })}>
                <span className="grid size-8 place-items-center rounded-lg bg-[#fff0eb] text-[#c9664f]">
                  <TriangleAlert size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{p.name}</p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {p.sku} · {p.aisle}-{p.shelf}
                  </p>
                </div>
                <p className="text-right text-xs font-semibold text-[#c9664f]">
                  {p.stock - p.reserved} {p.saleUnit}
                  <span className="block text-[9px] font-normal text-slate-400">Mín. {p.minimumStock}</span>
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// ---------- Operación (foto actual) ----------
function OperationsReport({ orders, routes, onNavigate }: { orders: Order[]; routes: RoutePlan[]; onNavigate?: (nav: string, focus?: { status?: string }) => void }) {
  const issues = orders.filter((o) => o.status === "Con faltantes").length;
  const completed = orders.filter((o) => ["Lista", "Liberada a ruta", "Asignada a ruta", "Entregada"].includes(o.status)).length;
  const delivered = routes.reduce((s, r) => s + r.stops.filter((st) => st.status === "Entregada").length, 0);
  const stops = routes.reduce((s, r) => s + r.stops.length, 0);
  const routeCost = routes.reduce((s, r) => s + r.expenses.reduce((x, e) => x + e.amount, 0), 0);
  return (
    <>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Precisión de surtido" value={pct(((orders.length - issues) / Math.max(1, orders.length)) * 100)} detail={`${issues} con faltantes`} icon={ClipboardCheck} onClick={() => onNavigate?.("Órdenes", { status: "Con faltantes" })} />
        <Kpi label="Órdenes completadas" value={String(completed)} detail={`De ${orders.length} órdenes`} icon={PackageCheck} onClick={() => onNavigate?.("Órdenes", { status: "Listas para salida" })} />
        <Kpi label="Entregas realizadas" value={`${delivered}/${stops}`} detail={`${routes.length} hojas de ruta`} icon={Truck} onClick={() => onNavigate?.("Rutas")} />
        <Kpi label="Gastos de ruta" value={money(routeCost)} detail={`${money(routeCost / Math.max(1, routes.length))} por ruta`} icon={Receipt} onClick={() => onNavigate?.("Rutas")} />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <p className="eyebrow">Almacén</p>
          <h2 className="panel-title">Órdenes por estado</h2>
          <div className="mt-6 space-y-4">
            {["Pendiente", "En surtido", "Con faltantes", "Lista", "Liberada a ruta", "Asignada a ruta", "Entregada"].map((status, index) => {
              const count = orders.filter((o) => o.status === status).length;
              return (
                <button key={status} className="block w-full text-left" onClick={() => onNavigate?.("Órdenes", { status })}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{status}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(count / Math.max(1, orders.length)) * 100}%`, backgroundColor: ["#94a3b8", "#5b8fb9", "#e5785f", "#55a875", "#2f7468", "#7766ae", "#183b36"][index] }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <section className="panel p-5">
          <p className="eyebrow">Logística</p>
          <h2 className="panel-title">Rendimiento de rutas</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Hojas de ruta", String(routes.length), Truck],
              ["Paradas totales", String(stops), Target],
              ["Gasto por ruta", money(routeCost / Math.max(1, routes.length)), CircleDollarSign],
              ["Entregas completas", pct((delivered / Math.max(1, stops)) * 100), CircleCheck],
            ].map(([label, value, Icon]) => {
              const I = Icon as typeof Truck;
              return (
                <div key={label as string} className="rounded-xl bg-[#f6f8f7] p-4">
                  <I size={15} className="text-[#2f7468]" />
                  <p className="mt-3 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label as string}</p>
                  <p className="mt-1 text-lg font-semibold">{value as string}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function AlertRow({ title, detail, tone, onClick }: { title: string; detail: string; tone: "red" | "yellow" | "blue"; onClick?: () => void }) {
  const styles = { red: "bg-[#fff0eb] text-[#a95845]", yellow: "bg-[#fff6df] text-[#8a651e]", blue: "bg-[#e8f2ff] text-[#3973a8]" };
  return (
    <button className={`block w-full rounded-xl p-3 text-left transition hover:brightness-95 ${styles[tone]}`} onClick={onClick}>
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-1 text-[9px] opacity-70">{detail}</p>
    </button>
  );
}

// ---------- Impresión del estado de resultados ----------
function ResultsPrintView({
  now,
  before,
  periodLabel,
  previousLabel,
  fixedExpenses,
  onClose,
}: {
  now: Totals;
  before: Totals;
  periodLabel: string;
  previousLabel: string;
  fixedExpenses: FixedExpense[];
  onClose: () => void;
}) {
  const rows = statementRows(now, fixedExpenses);
  const prevRows = statementRows(before, fixedExpenses);
  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Estado de resultados</p>
          <p className="text-[10px] text-white/50">Tamaño carta (8.5 × 11 in) · listo para imprimir o guardar como PDF</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/80 hover:bg-white/10" onClick={onClose}>
            <X size={15} /> Cerrar
          </button>
          <button className="flex min-h-10 items-center gap-2 rounded-xl bg-[#b8f34a] px-4 text-xs font-semibold text-[#183b36] hover:bg-[#c6f76a]" onClick={() => window.print()}>
            <Printer size={15} /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <div className="py-8">
        <article className="print-sheet mx-auto flex flex-col bg-white px-[0.6in] py-[0.55in] text-[#162523] shadow-2xl">
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#183b36] text-lg font-black text-[#b8f34a]">99</span>
              <div>
                <p className="text-[18px] font-bold leading-tight">{company.commercialName}</p>
                <p className="mt-0.5 text-[9.5px] text-slate-500">{company.legalName}</p>
                <p className="text-[9.5px] text-slate-500">RFC {company.rfc}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-bold tracking-[0.12em] text-[#2f7468]">ESTADO DE RESULTADOS</p>
              <p className="text-[10px] font-semibold text-slate-500">Periodo: {periodLabel}</p>
              <p className="text-[10px] text-slate-500">Comparativo: {previousLabel}</p>
            </div>
          </header>
          <div className="mt-5 h-[3px] rounded-full bg-[#2f7468]" />
          <section className="mt-5 grid grid-cols-4 gap-3 text-[10px]">
            {[
              ["Ventas totales", now.netSales],
              ["Ventas cobradas", now.collected],
              ["Utilidad bruta", now.gross],
              ["Utilidad neta", now.net],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-slate-200 p-3">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#2f7468]">{label as string}</p>
                <p className={`mt-1 text-[14px] font-bold ${(value as number) < 0 ? "text-[#c9664f]" : ""}`}>{money(value as number)}</p>
              </div>
            ))}
          </section>
          <table className="mt-5 w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[8.5px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2.5 py-2">Concepto</th>
                <th className="px-2.5 py-2 text-right">Periodo</th>
                <th className="px-2.5 py-2 text-right">% cobrado</th>
                <th className="rounded-r-md px-2.5 py-2 text-right">{previousLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={row.final ? "bg-[#edf4f2] font-bold" : row.strong ? "bg-[#f6f8f7] font-bold" : ""}>
                  <td className={`px-2.5 py-1.5 ${row.level ? "pl-6 text-slate-600" : ""}`}>{row.label}</td>
                  <td className={`px-2.5 py-1.5 text-right ${row.value < 0 && row.strong ? "text-[#c9664f]" : ""}`}>{money2(row.value)}</td>
                  <td className="px-2.5 py-1.5 text-right text-slate-500">{now.collected ? pct((row.value / now.collected) * 100) : "—"}</td>
                  <td className="px-2.5 py-1.5 text-right text-slate-500">{money2(prevRows[index]?.value ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <section className="mt-5 rounded-lg bg-[#f6f8f7] p-3 text-[9px] leading-relaxed text-slate-600">
            <strong>Notas:</strong> utilidad bruta = ventas netas − costo de venta (costo promedio de inventario). Utilidad neta = utilidad bruta − gastos de operación.
            Nómina ({money(now.payrollMonthly)} mensuales, desde Colaboradores) y gastos fijos ({money(now.fixedMonthly)} mensuales) se prorratean por día ({now.days} {now.days === 1 ? "día" : "días"} en el periodo). Importes con IVA incluido.
            Reporte administrativo, no sustituye la contabilidad fiscal.
          </section>
          <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">Elaboró</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">Revisó · Dirección</p>
            </div>
          </section>
          <footer className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
            <span>{company.legalName}</span>
            <span>Generado con 99 ERP · Página 1 de 1</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
