import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calculator,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  History,
  Landmark,
  Lock,
  LockOpen,
  Plus,
  Printer,
  Receipt,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import type { Sale } from "./SalesModule";
import CashPrintView from "./CashDocument";
import { BanksPanel, type BankAccount, type BankMovement, type Terminal } from "./BanksModule";

// ---------- Tipos ----------
export type CashMovementKind = "Retiro" | "Gasto" | "Ingreso" | "Viáticos de ruta" | "Liquidación de ruta" | "Devolución" | "Anticipo" | "Abono apartado";
export type CashMovement = {
  id: string;
  kind: CashMovementKind;
  amount: number;
  concept: string;
  at: string;
  user: string;
  reference?: string;
  /** Devoluciones: medio por el que se reembolsó (sin valor = efectivo) */
  method?: "Efectivo" | "Tarjeta" | "Transferencia";
};

export type CashSummary = {
  tickets: number;
  cancelled: number;
  salesTotal: number;
  discounts: number;
  byMethod: { Efectivo: number; Tarjeta: number; Transferencia: number; "Contra entrega": number };
  inflows: number;
  outflows: number;
  expectedCash: number;
};

export type CashCount = {
  denominations: Record<string, number>;
  cash: number;
  card: number;
  transfer: number;
};

export type CashSession = {
  id: string;
  register: string;
  cashier: string;
  dateISO: string;
  openedAt: string;
  openingFund: number;
  status: "Abierta" | "Cerrada";
  movements: CashMovement[];
  closedAt?: string;
  closedBy?: string;
  /** Resumen congelado al cerrar el corte */
  summary?: CashSummary;
  counted?: CashCount;
  leftFund?: number;
  deposit?: number;
  notes?: string;
  partialCuts?: string[];
};

export const DENOMINATIONS = [
  { key: "1000", value: 1000, kind: "Billete" },
  { key: "500", value: 500, kind: "Billete" },
  { key: "200", value: 200, kind: "Billete" },
  { key: "100", value: 100, kind: "Billete" },
  { key: "50", value: 50, kind: "Billete" },
  { key: "20", value: 20, kind: "Billete" },
  { key: "10", value: 10, kind: "Moneda" },
  { key: "5", value: 5, kind: "Moneda" },
  { key: "2", value: 2, kind: "Moneda" },
  { key: "1", value: 1, kind: "Moneda" },
  { key: "0.5", value: 0.5, kind: "Moneda" },
] as const;

const outKinds: CashMovementKind[] = ["Retiro", "Gasto", "Viáticos de ruta", "Devolución"];
/** Solo los movimientos en efectivo cambian lo que hay en el cajón */
export const isCash = (m: CashMovement) => !m.method || m.method === "Efectivo";
export const isOutflow = (kind: CashMovementKind) => outKinds.includes(kind);

export const initialCashSessions: CashSession[] = [
  {
    id: "CJ-0012",
    register: "Caja 01",
    cashier: "Carlos Mendoza",
    dateISO: "2026-11-18",
    openedAt: "18 nov 2026 · 08:00",
    openingFund: 2000,
    status: "Abierta",
    movements: [
      { id: "mc-1", kind: "Viáticos de ruta", amount: 1200, concept: "Viáticos ruta RT-031 · Roberto García", at: "08:35", user: "Carlos Mendoza", reference: "RT-031" },
      { id: "mc-2", kind: "Gasto", amount: 90, concept: "Garrafones de agua", at: "10:05", user: "Carlos Mendoza" },
      { id: "mc-3", kind: "Anticipo", amount: 3480, concept: "Anticipo pedido especial PE-0003 · Plomería del Centro", at: "11:05", user: "Carlos Mendoza", reference: "PE-0003", method: "Tarjeta" },
    ],
  },
  {
    id: "CJ-0011",
    register: "Caja 01",
    cashier: "Ana López",
    dateISO: "2026-11-17",
    openedAt: "17 nov 2026 · 08:02",
    openingFund: 2000,
    status: "Cerrada",
    closedAt: "17 nov 2026 · 19:10",
    closedBy: "Ana López",
    movements: [
      { id: "mc-o1", kind: "Retiro", amount: 5000, concept: "Retiro a bóveda", at: "14:00", user: "Ana López" },
    ],
    summary: {
      tickets: 14,
      cancelled: 1,
      salesTotal: 28640,
      discounts: 320,
      byMethod: { Efectivo: 9850, Tarjeta: 12420, Transferencia: 6370, "Contra entrega": 0 },
      inflows: 0,
      outflows: 5000,
      expectedCash: 6850,
    },
    counted: { denominations: {}, cash: 6820, card: 12420, transfer: 6370 },
    leftFund: 2000,
    deposit: 4820,
    notes: "Faltante de $30 por cambio mal entregado; se repone de caja chica.",
  },
  {
    id: "CJ-0010",
    register: "Caja 01",
    cashier: "Carlos Mendoza",
    dateISO: "2026-11-16",
    openedAt: "16 nov 2026 · 08:00",
    openingFund: 2000,
    status: "Cerrada",
    closedAt: "16 nov 2026 · 19:02",
    closedBy: "Carlos Mendoza",
    movements: [],
    summary: {
      tickets: 11,
      cancelled: 0,
      salesTotal: 21960,
      discounts: 0,
      byMethod: { Efectivo: 7410, Tarjeta: 9880, Transferencia: 4670, "Contra entrega": 0 },
      inflows: 0,
      outflows: 0,
      expectedCash: 9410,
    },
    counted: { denominations: {}, cash: 9410, card: 9880, transfer: 4670 },
    leftFund: 2000,
    deposit: 7410,
    notes: "",
  },
];

// ---------- Cálculos ----------
const round = (value: number) => Math.round(value * 100) / 100;
export const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export const salesOfSession = (session: CashSession, sales: Sale[]) => sales.filter((sale) => sale.cashSessionId === session.id);

/** Resumen del turno: ventas por forma de pago y efectivo que debe haber en caja */
export const computeSummary = (session: CashSession, sales: Sale[]): CashSummary => {
  if (session.summary) return session.summary;
  const list = salesOfSession(session, sales);
  const valid = list.filter((sale) => sale.status !== "Cancelada");
  const byMethod = { Efectivo: 0, Tarjeta: 0, Transferencia: 0, "Contra entrega": 0 };
  valid.forEach((sale) => {
    const parts = sale.payments ?? [{ method: sale.payment, amount: sale.amount }];
    parts.forEach((part) => {
      if (part.method in byMethod) byMethod[part.method as keyof typeof byMethod] += part.amount;
    });
  });
  const discounts = valid.reduce(
    (sum, sale) => sum + (sale.discountAmount ?? 0) + (sale.lines || []).reduce((s, l) => s + (l.discountAmount ?? 0), 0),
    0,
  );
  const inflows = session.movements.filter((m) => isCash(m) && !isOutflow(m.kind)).reduce((s, m) => s + m.amount, 0);
  const outflows = session.movements.filter((m) => isCash(m) && isOutflow(m.kind)).reduce((s, m) => s + m.amount, 0);
  // Movimientos con tarjeta o transferencia (anticipos, reembolsos) ajustan lo cobrado por ese medio
  session.movements
    .filter((m) => !isCash(m))
    .forEach((m) => (byMethod[m.method as "Tarjeta" | "Transferencia"] += isOutflow(m.kind) ? -m.amount : m.amount));
  return {
    tickets: valid.length,
    cancelled: list.length - valid.length,
    salesTotal: round(valid.reduce((sum, sale) => sum + sale.amount, 0)),
    discounts: round(discounts),
    byMethod: {
      Efectivo: round(byMethod.Efectivo),
      Tarjeta: round(byMethod.Tarjeta),
      Transferencia: round(byMethod.Transferencia),
      "Contra entrega": round(byMethod["Contra entrega"]),
    },
    inflows: round(inflows),
    outflows: round(outflows),
    expectedCash: round(session.openingFund + byMethod.Efectivo + inflows - outflows),
  };
};

const diffLabel = (diff: number) => (Math.abs(diff) < 0.01 ? "Cuadra" : diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(-diff)}`);
const diffColor = (diff: number) => (Math.abs(diff) < 0.01 ? "text-[#347652]" : diff > 0 ? "text-[#3973a8]" : "text-[#c9664f]");

type Tab = "Resumen" | "Ventas" | "Movimientos" | "Bancos" | "Historial";

export default function CashModule({
  sessions,
  sales,
  userName,
  onAddMovement,
  onClose,
  onOpenSession,
  onPartialCut,
  onNavigate,
  initialTab,
  onToast,
  canClose = true,
  banks,
}: {
  canClose?: boolean;
  banks?: {
    accounts: BankAccount[];
    terminals: Terminal[];
    movements: BankMovement[];
    onConfirm: (id: string, received?: number) => void;
    onManual: (m: BankMovement) => void;
    onDeleteManual: (id: string) => void;
    onSaveConfig: (accounts: BankAccount[], terminals: Terminal[]) => void;
  };
  sessions: CashSession[];
  sales: Sale[];
  userName: string;
  onAddMovement: (movement: Omit<CashMovement, "id" | "at" | "user">) => void;
  onClose: (data: { counted: CashCount; leftFund: number; notes: string }) => void;
  onOpenSession: (fund: number) => void;
  onPartialCut: () => void;
  onNavigate?: (nav: string, focus?: { selectedId?: string }) => void;
  initialTab?: "Bancos";
  onToast: (message: string) => void;
}) {
  const current = sessions.find((session) => session.status === "Abierta") || null;
  const history = sessions.filter((session) => session.status === "Cerrada");
  const [tab, setTab] = useState<Tab>(initialTab ?? (current ? "Resumen" : "Historial"));
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [print, setPrint] = useState<{ id: string; mode: "X" | "Z" } | null>(null);

  const summary = useMemo(() => (current ? computeSummary(current, sales) : null), [current, sales]);
  const currentSales = current ? salesOfSession(current, sales) : [];
  const printing = print ? sessions.find((session) => session.id === print.id) : null;

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Ventas <ChevronRight size={13} /> <span className="text-slate-700">Caja</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Caja</h1>
          <p className="mt-2 text-sm text-slate-500">
            {current ? (
              <>
                {current.register} · {current.cashier} · turno abierto desde {current.openedAt.split("· ")[1]} con fondo de{" "}
                {money(current.openingFund)}
              </>
            ) : (
              "No hay caja abierta. Abre la caja para empezar a vender en el punto de venta. El corte se hace al final del día."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current ? (
            <>
              <button
                className="secondary-button flex items-center gap-2 bg-white"
                onClick={() => {
                  onPartialCut();
                  setPrint({ id: current.id, mode: "X" });
                }}
              >
                <Printer size={15} /> Corte parcial (X)
              </button>
              <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setMovementOpen(true)}>
                <Plus size={15} /> Entrada / salida de efectivo
              </button>
              <button
                className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canClose}
                title={canClose ? "" : "Tu rol no tiene permiso para cerrar el corte"}
                onClick={() => setCloseOpen(true)}
              >
                <Lock size={16} /> Corte del día
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={() => setOpenOpen(true)}>
              <LockOpen size={16} /> Abrir caja
            </button>
          )}
        </div>
      </section>

      {current && summary && (
        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Efectivo esperado en caja", value: money(summary.expectedCash), detail: "Fondo + ventas en efectivo ± movimientos", icon: Wallet, go: "Resumen" as Tab },
            { label: "Ventas del turno", value: money(summary.salesTotal), detail: `${summary.tickets} tickets${summary.cancelled ? ` · ${summary.cancelled} cancelado` : ""}`, icon: Receipt, go: "Ventas" as Tab },
            { label: "Tarjeta y transferencia", value: money(summary.byMethod.Tarjeta + summary.byMethod.Transferencia), detail: `Tarjeta ${money(summary.byMethod.Tarjeta)}`, icon: CreditCard, go: "Resumen" as Tab },
            { label: "Salidas de efectivo", value: money(summary.outflows), detail: `${current.movements.filter((m) => isOutflow(m.kind)).length} retiros, gastos o viáticos`, icon: ArrowUpRight, go: "Movimientos" as Tab },
          ].map(({ label, value, detail, icon: Icon, go }) => (
            <button key={label} className="stat-card stat-card--link" onClick={() => setTab(go)}>
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
      )}

      <nav className="mt-7 flex gap-1 border-b border-slate-200">
        {(["Resumen", "Ventas", "Movimientos", "Bancos", "Historial"] as Tab[])
          .filter((item) => current || item === "Historial" || item === "Bancos")
          .filter((item) => item !== "Bancos" || banks)
          .map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`relative px-5 py-3 text-xs font-semibold transition ${tab === item ? "text-[#285e56]" : "text-slate-400 hover:text-slate-600"}`}
            >
              {item === "Ventas" ? "Ventas del turno" : item === "Movimientos" ? "Movimientos de efectivo" : item === "Historial" ? "Historial de cortes" : item === "Bancos" ? "Bancos" : "Resumen del turno"}
              {tab === item && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2f7468]" />}
            </button>
          ))}
      </nav>

      {tab === "Resumen" && current && summary && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="panel p-6">
            <p className="eyebrow">Cuadre de efectivo</p>
            <h2 className="panel-title mt-1">Lo que debe haber en el cajón</h2>
            <dl className="mt-5 space-y-2.5 text-sm">
              <Row label="Fondo inicial" value={money(current.openingFund)} />
              <Row label="Ventas cobradas en efectivo" value={`+ ${money(summary.byMethod.Efectivo)}`} />
              {current.movements.filter(isCash).map((m) => (
                <Row
                  key={m.id}
                  label={`${m.kind} · ${m.concept}`}
                  value={`${isOutflow(m.kind) ? "−" : "+"} ${money(m.amount)}`}
                  tone={isOutflow(m.kind) ? "out" : "in"}
                  small
                />
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
                <dt>Efectivo esperado</dt>
                <dd>{money(summary.expectedCash)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Ventas por forma de pago</p>
            <h2 className="panel-title mt-1">{money(summary.salesTotal)} vendidos en el turno</h2>
            <div className="mt-5 space-y-3">
              {(
                [
                  ["Efectivo", Banknote, "En el cajón"],
                  ["Tarjeta", CreditCard, "Cuadrar contra vouchers de la terminal"],
                  ["Transferencia", Landmark, "Confirmar en banca en línea"],
                  ["Contra entrega", Coins, "Por cobrar en ruta · no entra a la caja"],
                ] as const
              ).map(([method, Icon, hint]) => {
                const value = summary.byMethod[method];
                const pct = summary.salesTotal ? (value / summary.salesTotal) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="grid size-8 place-items-center rounded-lg bg-[#edf4f2] text-[#2f7468]">
                        <Icon size={15} />
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{method}</p>
                        <p className="text-[10px] text-slate-400">{hint}</p>
                      </div>
                      <p className="text-sm font-semibold">{money(value)}</p>
                    </div>
                    <div className="ml-11 mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#2f7468]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Mini label="Tickets" value={String(summary.tickets)} />
              <Mini label="Ticket promedio" value={money(summary.tickets ? summary.salesTotal / summary.tickets : 0)} />
              <Mini label="Descuentos otorgados" value={money(summary.discounts)} />
            </div>
          </section>
        </div>
      )}

      {tab === "Ventas" && current && (
        <section className="panel mt-6 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Folio</th>
                <th className="py-3.5">Hora</th>
                <th className="py-3.5">Cliente</th>
                <th className="py-3.5">Forma de pago</th>
                <th className="py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-[#fafcfb]">
                  <td className="px-5 py-3.5">
                    <button className="font-semibold text-[#2f7468] hover:underline" onClick={() => onNavigate?.("Ventas", { selectedId: sale.id })}>
                      {sale.id}
                    </button>
                  </td>
                  <td className="py-3.5 text-slate-500">{sale.time}</td>
                  <td className="py-3.5">{sale.client}</td>
                  <td className="py-3.5 text-slate-500">
                    {sale.payments ? sale.payments.map((p) => `${p.method} ${money(p.amount)}`).join(" + ") : sale.payment}
                  </td>
                  <td className={`py-3.5 text-right font-semibold ${sale.status === "Cancelada" ? "text-slate-300 line-through" : ""}`}>{money(sale.amount)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-500">{sale.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {currentSales.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-400">Aún no hay ventas en este turno.</p>}
        </section>
      )}

      {tab === "Movimientos" && current && (
        <section className="panel mt-6 overflow-hidden">
          <div className="panel-header border-b border-slate-100">
            <div>
              <p className="eyebrow">Entradas y salidas que no son ventas</p>
              <h2 className="panel-title">Movimientos de efectivo</h2>
            </div>
            <button className="primary-button" onClick={() => setMovementOpen(true)}>
              <Plus size={15} /> Registrar
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {current.movements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 text-xs">
                <span className={`grid size-9 place-items-center rounded-xl ${isOutflow(m.kind) ? "bg-[#fff0eb] text-[#c9664f]" : "bg-[#eaf6ef] text-[#347652]"}`}>
                  {isOutflow(m.kind) ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{m.concept}</p>
                  <p className="text-[10px] text-slate-400">
                    {m.kind}
                    {!isCash(m) ? ` con ${m.method?.toLowerCase()} (no afecta el efectivo)` : ""} · {m.at} · {m.user}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${isOutflow(m.kind) ? "text-[#c9664f]" : "text-[#347652]"}`}>
                  {isOutflow(m.kind) ? "−" : "+"}
                  {money(m.amount)}
                </p>
              </div>
            ))}
            {current.movements.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-400">Sin movimientos en este turno.</p>}
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">
            Los viáticos que se entregan al iniciar una ruta y el efectivo que regresa el chofer al cerrarla se registran aquí automáticamente.
          </p>
        </section>
      )}

      {tab === "Bancos" && banks && (
        <BanksPanel
          accounts={banks.accounts}
          terminals={banks.terminals}
          movements={banks.movements}
          cashExpected={summary?.expectedCash ?? 0}
          onConfirm={banks.onConfirm}
          onManual={banks.onManual}
          onDeleteManual={banks.onDeleteManual}
          onSaveConfig={banks.onSaveConfig}
          onToast={onToast}
        />
      )}

      {tab === "Historial" && (
        <section className="panel mt-6 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Corte</th>
                <th className="py-3.5">Cajero</th>
                <th className="py-3.5 text-right">Ventas</th>
                <th className="py-3.5 text-right">Efectivo esperado</th>
                <th className="py-3.5 text-right">Contado</th>
                <th className="py-3.5 text-right">Diferencia</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((session) => {
                const s = session.summary!;
                const diff = (session.counted?.cash ?? 0) - s.expectedCash;
                return (
                  <tr key={session.id} className="hover:bg-[#fafcfb]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                          <History size={15} />
                        </span>
                        <div>
                          <p className="font-semibold">{session.id}</p>
                          <p className="text-[10px] text-slate-400">
                            {session.register} · {session.openedAt.split(" · ")[0]} · {session.openedAt.split("· ")[1]}–{session.closedAt?.split("· ")[1]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-600">{session.cashier}</td>
                    <td className="py-3.5 text-right font-semibold">{money(s.salesTotal)}</td>
                    <td className="py-3.5 text-right">{money(s.expectedCash)}</td>
                    <td className="py-3.5 text-right">{money(session.counted?.cash ?? 0)}</td>
                    <td className={`py-3.5 text-right font-semibold ${diffColor(diff)}`}>{diffLabel(diff)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="link-button" onClick={() => setPrint({ id: session.id, mode: "Z" })}>
                        <Printer size={13} /> Imprimir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {movementOpen && current && summary && (
        <MovementModal
          maxCash={summary.expectedCash}
          onClose={() => setMovementOpen(false)}
          onSave={(movement) => {
            onAddMovement(movement);
            setMovementOpen(false);
            onToast(`${movement.kind} de ${money(movement.amount)} registrado`);
          }}
        />
      )}
      {closeOpen && current && summary && (
        <CloseModal
          session={current}
          summary={summary}
          userName={userName}
          onClose={() => setCloseOpen(false)}
          onConfirm={(data) => {
            onClose(data);
            setCloseOpen(false);
            setTab("Historial");
            setPrint({ id: current.id, mode: "Z" });
          }}
        />
      )}
      {openOpen && (
        <OpenModal
          defaultFund={history[0]?.leftFund ?? 2000}
          userName={userName}
          onClose={() => setOpenOpen(false)}
          onOpen={(fund) => {
            onOpenSession(fund);
            setOpenOpen(false);
            setTab("Resumen");
          }}
        />
      )}
      {printing && print && (
        <CashPrintView session={printing} summary={computeSummary(printing, sales)} sales={salesOfSession(printing, sales)} mode={print.mode} onClose={() => setPrint(null)} />
      )}
    </>
  );
}

function Row({ label, value, tone, small }: { label: string; value: string; tone?: "in" | "out"; small?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${small ? "text-xs" : ""}`}>
      <dt className={small ? "pl-3 text-slate-500" : "text-slate-600"}>{label}</dt>
      <dd className={`shrink-0 font-semibold ${tone === "out" ? "text-[#c9664f]" : tone === "in" ? "text-[#347652]" : ""}`}>{value}</dd>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f6f8f7] p-3">
      <p className="text-[9px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

// ---------- Abrir caja ----------
export function OpenModal({
  defaultFund,
  userName,
  onClose,
  onOpen,
}: {
  defaultFund: number;
  userName: string;
  onClose?: () => void;
  onOpen: (fund: number) => void;
}) {
  const [fund, setFund] = useState(String(defaultFund));
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">Caja 01</p>
            <h2 className="mt-1 text-xl font-semibold">Abrir caja</h2>
            <p className="mt-1 text-xs text-slate-400">Cajero: {userName}</p>
          </div>
          {onClose && (
            <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>
        <div className="p-6">
          <label className="form-label">
            Fondo de caja (efectivo inicial)
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input type="number" min={0} value={fund} onChange={(e) => setFund(e.target.value)} className="form-input pl-7 text-lg font-bold" autoFocus />
            </div>
          </label>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Cuenta el efectivo con el que inicias el turno. Es el monto que se suma al efectivo esperado del corte.</p>
        </div>
        <div className="border-t border-slate-100 bg-[#fafcfb] p-5">
          <button className="primary-button w-full" onClick={() => onOpen(Number(fund) || 0)}>
            <LockOpen size={16} /> Abrir caja con {money(Number(fund) || 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Movimiento de efectivo ----------
function MovementModal({
  maxCash,
  onClose,
  onSave,
}: {
  maxCash: number;
  onClose: () => void;
  onSave: (movement: Omit<CashMovement, "id" | "at" | "user">) => void;
}) {
  const [kind, setKind] = useState<"Retiro" | "Gasto" | "Ingreso">("Retiro");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const value = Number(amount) || 0;
  const exceeds = kind !== "Ingreso" && value > maxCash;
  const hints = { Retiro: "Ej. Retiro a bóveda / depósito bancario", Gasto: "Ej. Papelería, agua, flete local", Ingreso: "Ej. Cambio recibido, reposición de fondo" };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">Caja 01</p>
            <h2 className="mt-1 text-xl font-semibold">Entrada o salida de efectivo</h2>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-3 gap-2">
            {(["Retiro", "Gasto", "Ingreso"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setKind(item)}
                className={`rounded-xl border px-3 py-3 text-xs font-semibold ${kind === item ? "border-[#2f7468] bg-[#f2f8f6] text-[#285e56]" : "border-slate-200 text-slate-500"}`}
              >
                {item === "Ingreso" ? <ArrowDownLeft size={15} className="mx-auto mb-1" /> : <ArrowUpRight size={15} className="mx-auto mb-1" />}
                {item}
              </button>
            ))}
          </div>
          <label className="form-label">
            Monto
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input text-lg font-bold" placeholder="$0.00" />
          </label>
          <label className="form-label">
            Concepto
            <input value={concept} onChange={(e) => setConcept(e.target.value)} className="form-input" placeholder={hints[kind]} />
          </label>
          {exceeds && (
            <p className="flex items-center gap-2 rounded-xl bg-[#fff0eb] p-3 text-[11px] text-[#c9664f]">
              <TriangleAlert size={14} /> En caja solo debe haber {money(maxCash)}.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
            disabled={value <= 0 || !concept.trim() || exceeds}
            onClick={() => onSave({ kind, amount: value, concept: concept.trim() })}
          >
            <Check size={15} /> Registrar {kind.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Corte de caja (Z) ----------
function CloseModal({
  session,
  summary,
  userName,
  onClose,
  onConfirm,
}: {
  session: CashSession;
  summary: CashSummary;
  userName: string;
  onClose: () => void;
  onConfirm: (data: { counted: CashCount; leftFund: number; notes: string }) => void;
}) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [card, setCard] = useState("");
  const [transfer, setTransfer] = useState("");
  const [leftFund, setLeftFund] = useState(String(session.openingFund));
  const [notes, setNotes] = useState("");

  const cash = round(DENOMINATIONS.reduce((sum, d) => sum + (Number(counts[d.key]) || 0) * d.value, 0));
  const cardValue = card === "" ? summary.byMethod.Tarjeta : Number(card) || 0;
  const transferValue = transfer === "" ? summary.byMethod.Transferencia : Number(transfer) || 0;
  const rows = [
    { label: "Efectivo", expected: summary.expectedCash, counted: cash },
    { label: "Tarjeta (vouchers)", expected: summary.byMethod.Tarjeta, counted: cardValue },
    { label: "Transferencias", expected: summary.byMethod.Transferencia, counted: transferValue },
  ];
  const anyDiff = rows.some((row) => Math.abs(row.counted - row.expected) >= 0.01);
  const fund = Math.min(cash, Number(leftFund) || 0);
  const deposit = round(cash - fund);
  const counted = Object.values(counts).some((v) => v !== "");
  const valid = counted && (!anyDiff || notes.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">
              {session.id} · {session.register} · {session.cashier}
            </p>
            <h2 className="mt-1 text-xl font-semibold">Corte del día</h2>
            <p className="mt-1 text-xs text-slate-400">Cuenta el efectivo por denominación sin ver el esperado y captura los vouchers de la terminal.</p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calculator size={14} className="text-[#2f7468]" /> Arqueo de efectivo
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2">
              {DENOMINATIONS.map((d) => {
                const qty = Number(counts[d.key]) || 0;
                return (
                  <div key={d.key} className="flex items-center gap-2 text-xs">
                    <span className={`w-[74px] rounded-lg px-2 py-1.5 text-center font-semibold ${d.kind === "Billete" ? "bg-[#edf4f2] text-[#2f7468]" : "bg-[#fff6df] text-[#9a6b18]"}`}>
                      {d.value >= 1 ? `$${d.value}` : "50¢"}
                    </span>
                    <span className="text-slate-300">×</span>
                    <input
                      type="number"
                      min={0}
                      value={counts[d.key] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [d.key]: e.target.value }))}
                      className="h-9 w-16 rounded-lg border border-slate-200 text-center font-semibold outline-none focus:border-[#2f7468]"
                      placeholder="0"
                      aria-label={`Cantidad de ${d.kind.toLowerCase()}s de ${d.value}`}
                    />
                    <span className="ml-auto text-right text-slate-500">{qty ? money(qty * d.value) : "—"}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between rounded-xl bg-[#f2f8f6] px-4 py-3 text-sm font-bold text-[#183b36]">
              <span>Efectivo contado</span>
              <span>{money(cash)}</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="form-label">
                Total vouchers de tarjeta
                <input type="number" min={0} value={card} onChange={(e) => setCard(e.target.value)} className="form-input" placeholder={money(summary.byMethod.Tarjeta)} />
              </label>
              <label className="form-label">
                Transferencias confirmadas
                <input type="number" min={0} value={transfer} onChange={(e) => setTransfer(e.target.value)} className="form-input" placeholder={money(summary.byMethod.Transferencia)} />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1fr_auto] bg-[#fafcfb] px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Forma de pago</span>
                <span>Diferencia</span>
              </div>
              {rows.map((row) => {
                const diff = round(row.counted - row.expected);
                return (
                  <div key={row.label} className="border-t border-slate-100 px-3 py-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold">{row.label}</span>
                      <span className={`font-semibold ${diffColor(diff)}`}>{diffLabel(diff)}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Esperado {money(row.expected)} · contado {money(row.counted)}
                    </p>
                  </div>
                );
              })}
            </div>
            <label className="form-label">
              Fondo que se queda en caja
              <input type="number" min={0} value={leftFund} onChange={(e) => setLeftFund(e.target.value)} className="form-input" />
            </label>
            <div className="flex justify-between rounded-xl bg-slate-100 px-3 py-2.5 text-xs">
              <span className="text-slate-500">Retiro para depósito</span>
              <strong>{money(deposit)}</strong>
            </div>
            <label className="form-label">
              Observaciones {anyDiff && <span className="text-[#c9664f]">* obligatorio por diferencia</span>}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-16 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
                placeholder="Explica sobrantes o faltantes"
              />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-[#fafcfb] px-6 py-4">
          <p className="text-[11px] text-slate-400">Al cerrar, el punto de venta queda bloqueado hasta abrir un nuevo turno.</p>
          <div className="flex gap-3">
            <button className="secondary-button bg-white" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!valid}
              title={!counted ? "Captura el arqueo de efectivo" : ""}
              onClick={() =>
                onConfirm({
                  counted: {
                    denominations: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v) || 0])),
                    cash,
                    card: cardValue,
                    transfer: transferValue,
                  },
                  leftFund: fund,
                  notes: notes.trim(),
                })
              }
            >
              <Lock size={15} /> Cerrar corte · {userName.split(" ")[0]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
