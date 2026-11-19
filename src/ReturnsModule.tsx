import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Check,
  CircleDollarSign,
  CreditCard,
  KeyRound,
  PackageX,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import type { Customer } from "./CustomersModule";
import type { Order } from "./OrdersModule";
import type { Sale } from "./SalesModule";
import { staff } from "./staff";

// ---------- Políticas ----------
export const RETURN_DAYS = 30;
export const AUTH_LIMIT = 5000;
/** Supervisores con PIN: vienen de Colaboradores */
export const supervisorsList = () => staff.supervisors;
export const returnReasons = [
  "No lo utilizó / sobrante de obra",
  "Medida o modelo equivocado",
  "Producto defectuoso",
  "Garantía",
  "Error de captura en la venta",
  "Otro",
];

// ---------- Tipos ----------
export type RefundMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Saldo a favor";
export type ReturnCondition = "Buen estado" | "Dañado";
export type ReturnLine = {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  /** Precio neto pagado por unidad (con descuentos prorrateados) */
  unitPrice: number;
  amount: number;
  condition: ReturnCondition;
};
export type SaleReturn = {
  id: string;
  saleId: string;
  client: string;
  date: string;
  time: string;
  lines: ReturnLine[];
  reason: string;
  notes: string;
  total: number;
  /** Parte que se descuenta del saldo pendiente de la venta (ventas por cobrar) */
  appliedToBalance: number;
  /** Parte que se regresa al cliente */
  refundAmount: number;
  refundMethod?: RefundMethod;
  user: string;
  cashSessionId?: string;
  authorizedBy?: string;
  authReason?: string;
};

// ---------- Cálculos ----------
const round = (value: number) => Math.round(value * 100) / 100;
export const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const MONTHS: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
export const daysSince = (date: string, todayISO = "2026-11-18") => {
  const [d, m, y] = date.split(" ");
  const sold = new Date(Number(y), MONTHS[m] ?? 0, Number(d), 12);
  const today = new Date(`${todayISO}T12:00:00`);
  return Math.round((today.getTime() - sold.getTime()) / 86_400_000);
};

/** Partidas que todavía se pueden devolver, con el precio neto realmente pagado */
export const returnableLines = (sale: Sale, returns: SaleReturn[]) => {
  const lines = sale.lines || [];
  const linesTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const globalShare = linesTotal ? (sale.discountAmount ?? 0) / linesTotal : 0;
  return lines.map((line) => {
    const returned = returns
      .filter((ret) => ret.saleId === sale.id)
      .flatMap((ret) => ret.lines)
      .filter((item) => item.sku === line.sku)
      .reduce((sum, item) => sum + item.quantity, 0);
    const unitNet = round((line.total / Math.max(1, line.quantity)) * (1 - globalShare));
    return { ...line, returned, available: line.quantity - returned, unitNet };
  });
};

/** ¿El material ya está en manos del cliente? (si no, se cancela la orden en vez de devolver) */
export const deliveredOf = (sale: Sale, orders: Order[]) => {
  if (!sale.orderId) return sale.status !== "Cancelada";
  return orders.find((order) => order.id === sale.orderId)?.status === "Entregada";
};

const pendingOf = (sale: Sale) => {
  if (sale.status !== "Pendiente") return 0;
  const base = sale.payments
    ? sale.payments.filter((p) => p.method === "Contra entrega").reduce((s, p) => s + p.amount, 0)
    : sale.amount;
  return Math.max(0, round(base - (sale.creditedAmount ?? 0)));
};

const refundIcons: Record<RefundMethod, typeof Banknote> = {
  Efectivo: Banknote,
  Tarjeta: CreditCard,
  Transferencia: CircleDollarSign,
  "Saldo a favor": Wallet,
};

// ---------- Asistente de devolución ----------
export function ReturnWizard({
  sales,
  returns,
  orders,
  customers,
  initialSaleId,
  cashOpen,
  userName,
  onClose,
  onConfirm,
}: {
  sales: Sale[];
  returns: SaleReturn[];
  orders: Order[];
  customers: Customer[];
  initialSaleId?: string;
  cashOpen: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: (ret: Omit<SaleReturn, "id" | "date" | "time" | "user" | "cashSessionId">) => void;
}) {
  const [saleId, setSaleId] = useState<string | null>(initialSaleId || null);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [condition, setCondition] = useState<Record<string, ReturnCondition>>({});
  const [reason, setReason] = useState(returnReasons[0]);
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<RefundMethod | null>(null);
  const supervisors = supervisorsList();
  const [supervisor, setSupervisor] = useState(supervisors[0]?.name ?? "");
  const [pin, setPin] = useState("");

  const sale = sales.find((item) => item.id === saleId) || null;
  const matches = useMemo(
    () =>
      sales
        .filter((item) => item.status !== "Cancelada" && `${item.id} ${item.client}`.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8),
    [sales, query],
  );

  if (!sale) {
    return (
      <Shell title="Devolución de mercancía" subtitle="Busca la venta por folio del ticket o por cliente" onClose={onClose}>
        <div className="p-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#2f7468]"
              placeholder="Escanea el ticket o escribe el folio (ej. V-1847)"
            />
          </div>
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {matches.map((item) => {
              const days = daysSince(item.date);
              return (
                <button key={item.id} className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs hover:bg-[#fafcfb]" onClick={() => setSaleId(item.id)}>
                  <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                    <RotateCcw size={15} />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {item.id} · {item.client}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.date} · {item.items} artículos · {item.status}
                      {item.returnedAmount ? ` · devuelto ${money(item.returnedAmount)}` : ""}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold ${days > RETURN_DAYS ? "text-[#c9664f]" : "text-slate-400"}`}>
                    {days > RETURN_DAYS ? `Fuera de plazo (${days} días)` : `Hace ${days} ${days === 1 ? "día" : "días"}`}
                  </span>
                  <span className="w-20 text-right font-semibold">{money(item.amount)}</span>
                </button>
              );
            })}
            {matches.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">No encontramos ventas con ese folio o cliente.</p>}
          </div>
        </div>
      </Shell>
    );
  }

  const lines = returnableLines(sale, returns);
  const delivered = deliveredOf(sale, orders);
  const days = daysSince(sale.date);
  const customer = customers.find((item) => item.businessName === sale.client);
  const chosen = lines
    .map((line) => {
      const q = Math.min(line.available, Math.max(0, Number(qty[line.sku]) || 0));
      return { line, q, amount: round(q * line.unitNet) };
    })
    .filter((item) => item.q > 0);
  const total = round(chosen.reduce((sum, item) => sum + item.amount, 0));
  const pending = pendingOf(sale);
  const appliedToBalance = round(Math.min(total, pending));
  const refundAmount = round(total - appliedToBalance);

  const paidMethods = new Set<string>(sale.payments ? sale.payments.map((p) => p.method) : [sale.payment]);
  const methods: { method: RefundMethod; enabled: boolean; hint: string }[] = [
    { method: "Efectivo", enabled: cashOpen, hint: cashOpen ? "Sale de la caja del turno" : "Abre la caja para devolver efectivo" },
    { method: "Tarjeta", enabled: paidMethods.has("Tarjeta"), hint: paidMethods.has("Tarjeta") ? "Reembolso a la misma tarjeta" : "La venta no se pagó con tarjeta" },
    { method: "Transferencia", enabled: paidMethods.has("Transferencia"), hint: paidMethods.has("Transferencia") ? "Transferencia a la cuenta del cliente" : "La venta no se pagó por transferencia" },
    { method: "Saldo a favor", enabled: Boolean(customer), hint: customer ? `Queda a favor de ${customer.businessName}` : "Solo para clientes registrados" },
  ];
  const selectedMethod = method && methods.find((m) => m.method === method)?.enabled ? method : null;

  const outOfTerm = days > RETURN_DAYS;
  const overLimit = total > AUTH_LIMIT;
  const needsAuth = outOfTerm || overLimit;
  const authReason = [outOfTerm && `fuera de plazo (${days} días)`, overLimit && `monto mayor a ${money(AUTH_LIMIT)}`].filter(Boolean).join(" y ");
  const pinOk = supervisors.find((s) => s.name === supervisor)?.pin === pin;
  const valid = delivered && chosen.length > 0 && (refundAmount === 0 || selectedMethod) && (!needsAuth || pinOk);

  return (
    <Shell
      title={`Devolución de la venta ${sale.id}`}
      subtitle={`${sale.client} · ${sale.date} · ${sale.status === "Pendiente" ? `por cobrar ${money(pending)}` : `pagada con ${sale.payments ? sale.payments.map((p) => p.method).join(" + ") : sale.payment}`}`}
      onClose={onClose}
      onBack={initialSaleId ? undefined : () => setSaleId(null)}
      wide
    >
      {sale.specialOrderId ? (
        <div className="p-6">
          <p className="flex items-start gap-2 rounded-xl bg-[#fff6df] p-4 text-xs text-[#8a651e]">
            <TriangleAlert size={15} className="shrink-0" />
            Esta venta liquida el pedido especial {sale.specialOrderId}. Por política, los pedidos especiales no admiten devolución.
          </p>
        </div>
      ) : !delivered ? (
        <div className="p-6">
          <p className="flex items-start gap-2 rounded-xl bg-[#fff6df] p-4 text-xs text-[#8a651e]">
            <TriangleAlert size={15} className="shrink-0" />
            El material de esta venta todavía no se le entrega al cliente (orden {sale.orderId}). En lugar de una devolución, cancela o modifica la orden de surtido.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            {outOfTerm && (
              <p className="flex items-center gap-2 rounded-xl bg-[#fff0eb] px-3 py-2.5 text-[11px] text-[#c9664f]">
                <TriangleAlert size={14} /> Venta de hace {days} días: el plazo de devolución es de {RETURN_DAYS} días. Requiere autorización.
              </p>
            )}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[minmax(0,1fr)_112px_136px_76px] gap-3 bg-[#fafcfb] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Producto</span>
                <span>Devuelve / disponible</span>
                <span>Estado del material</span>
                <span className="text-right">Importe</span>
              </div>
              {lines.map((line) => {
                const q = Math.min(line.available, Math.max(0, Number(qty[line.sku]) || 0));
                const cond = condition[line.sku] ?? "Buen estado";
                return (
                  <div key={line.sku} className={`grid grid-cols-[minmax(0,1fr)_112px_136px_76px] items-center gap-3 border-t border-slate-100 px-4 py-3 text-xs ${line.available === 0 ? "opacity-50" : ""}`}>
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold leading-snug">{line.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {line.sku} · pagado {money(line.unitNet)} c/u{line.returned ? ` · ya devueltos ${line.returned}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={line.available}
                        disabled={line.available === 0}
                        value={qty[line.sku] ?? ""}
                        onChange={(e) => setQty((v) => ({ ...v, [line.sku]: e.target.value }))}
                        placeholder="0"
                        className="h-9 w-16 rounded-lg border-2 border-slate-200 text-center text-sm font-bold outline-none focus:border-[#2f7468]"
                        aria-label={`Cantidad a devolver de ${line.name}`}
                      />
                      <span className="text-xs font-semibold text-slate-400">/ {line.available}</span>
                    </div>
                    <div className="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-semibold">
                      {(["Buen estado", "Dañado"] as ReturnCondition[]).map((item) => (
                        <button
                          key={item}
                          disabled={line.available === 0}
                          onClick={() => setCondition((v) => ({ ...v, [line.sku]: item }))}
                          className={`flex-1 rounded-md px-2 py-1.5 ${cond === item ? (item === "Dañado" ? "bg-white text-[#c9664f] shadow-sm" : "bg-white text-[#285e56] shadow-sm") : "text-slate-400"}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <p className="text-right font-semibold">{q ? money(q * line.unitNet) : "—"}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-label">
                Motivo
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="form-input">
                  {returnReasons.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="form-label">
                Observaciones
                <input value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" placeholder="Detalle del material o del cliente" />
              </label>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400">
              Material en buen estado regresa al inventario disponible. Material dañado se registra en el kardex como entrada y merma, y no queda disponible para venta.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-[#f6f8f7] p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total a devolver</span>
                <strong className="text-lg">{money(total)}</strong>
              </div>
              {appliedToBalance > 0 && (
                <div className="mt-2 flex justify-between text-[#285e56]">
                  <span>Se descuenta del saldo por cobrar</span>
                  <strong>{money(appliedToBalance)}</strong>
                </div>
              )}
              {refundAmount > 0 && appliedToBalance > 0 && (
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Se regresa al cliente</span>
                  <strong>{money(refundAmount)}</strong>
                </div>
              )}
            </div>
            {refundAmount > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">¿Cómo se le regresa {money(refundAmount)}?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {methods.map(({ method: m, enabled, hint }) => {
                    const Icon = refundIcons[m];
                    return (
                      <button
                        key={m}
                        disabled={!enabled}
                        title={hint}
                        onClick={() => setMethod(m)}
                        className={`rounded-xl border p-2.5 text-left text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${selectedMethod === m ? "border-[#2f7468] bg-[#edf4f2] text-[#285e56]" : "border-slate-200 text-slate-600"}`}
                      >
                        <Icon size={15} />
                        <span className="mt-1 block">{m}</span>
                        <span className="block text-[9px] font-normal leading-tight text-slate-400">{hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {needsAuth && chosen.length > 0 && (
              <div className="rounded-xl border border-[#f0d9a3] bg-[#fffaf0] p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#8a651e]">
                  <ShieldCheck size={14} /> Requiere autorización
                </p>
                <p className="mt-0.5 text-[10px] text-[#8a651e]">Motivo: {authReason}.</p>
                <div className="mt-3 grid grid-cols-[1fr_90px] gap-2">
                  <select value={supervisor} onChange={(e) => setSupervisor(e.target.value)} className="form-input h-9 bg-white text-xs">
                    {supervisors.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} · {s.role}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <KeyRound size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="PIN"
                      className={`h-9 w-full rounded-lg border bg-white pl-7 pr-2 text-sm font-bold tracking-[0.3em] outline-none ${pin.length === 4 && !pinOk ? "border-[#e5785f]" : "border-slate-200 focus:border-[#2f7468]"}`}
                      aria-label="PIN del supervisor"
                    />
                  </div>
                </div>
                {pinOk ? (
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#347652]">
                    <Check size={12} /> Autorizado por {supervisor}
                  </p>
                ) : (
                  <p className="mt-2 text-[9px] text-slate-400">PIN de demostración: Carlos 1234 · Laura 5678 (se configuran en Colaboradores)</p>
                )}
              </div>
            )}
            <button
              className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!valid}
              onClick={() =>
                onConfirm({
                  saleId: sale.id,
                  client: sale.client,
                  lines: chosen.map(({ line, q, amount }) => ({
                    sku: line.sku,
                    name: line.name,
                    unit: line.unit,
                    quantity: q,
                    unitPrice: line.unitNet,
                    amount,
                    condition: condition[line.sku] ?? "Buen estado",
                  })),
                  reason,
                  notes: notes.trim(),
                  total,
                  appliedToBalance,
                  refundAmount,
                  refundMethod: refundAmount > 0 ? selectedMethod ?? undefined : undefined,
                  authorizedBy: needsAuth ? supervisor : undefined,
                  authReason: needsAuth ? authReason : undefined,
                })
              }
            >
              <RotateCcw size={15} /> Registrar devolución · {userName.split(" ")[0]}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  onClose,
  onBack,
  wide,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onBack?: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className={`mx-auto my-6 w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-start gap-3">
            {onBack && (
              <button className="mt-1 grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500" onClick={onBack} aria-label="Elegir otra venta">
                <ArrowLeft size={15} />
              </button>
            )}
            <div>
              <p className="eyebrow">Devoluciones · plazo {RETURN_DAYS} días · sin cargo por reposición</p>
              <h2 className="mt-1 text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Lista de devoluciones (pestaña en Ventas) ----------
export function ReturnsTable({
  returns,
  onOpenSale,
  onPrint,
}: {
  returns: SaleReturn[];
  onOpenSale: (saleId: string) => void;
  onPrint: (id: string) => void;
}) {
  return (
    <>
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3.5">Devolución</th>
            <th className="py-3.5">Fecha</th>
            <th className="py-3.5">Motivo</th>
            <th className="py-3.5">Importe</th>
            <th className="py-3.5">Reembolso</th>
            <th className="py-3.5">Autorizó</th>
            <th className="px-5 py-3.5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {returns.map((ret) => (
            <tr key={ret.id} className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#fff0eb] text-[#c9664f]">
                    <RotateCcw size={15} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">{ret.id}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {ret.client} ·{" "}
                      <button className="font-semibold text-[#2f7468] hover:underline" onClick={() => onOpenSale(ret.saleId)}>
                        Venta {ret.saleId}
                      </button>
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-4 text-slate-600">
                {ret.date}
                <p className="mt-1 text-[10px] text-slate-400">{ret.time} h · {ret.user}</p>
              </td>
              <td className="py-4 text-slate-600">
                {ret.reason}
                <p className="mt-1 text-[10px] text-slate-400">
                  {ret.lines.reduce((s, l) => s + l.quantity, 0)} artículos
                  {ret.lines.some((l) => l.condition === "Dañado") && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[#c9664f]">
                      <PackageX size={10} /> con daño
                    </span>
                  )}
                </p>
              </td>
              <td className="py-4 font-semibold text-[#c9664f]">−{money(ret.total)}</td>
              <td className="py-4 text-slate-600">
                {ret.refundAmount > 0 ? `${ret.refundMethod} ${money(ret.refundAmount)}` : ""}
                {ret.appliedToBalance > 0 && <p className="text-[10px] text-slate-400">Saldo por cobrar −{money(ret.appliedToBalance)}</p>}
              </td>
              <td className="py-4 text-slate-500">{ret.authorizedBy || "No requirió"}</td>
              <td className="px-5 py-4 text-right">
                <button className="grid size-8 place-items-center justify-self-end rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]" onClick={() => onPrint(ret.id)} title="Imprimir nota de devolución">
                  <Printer size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {returns.length === 0 && <p className="px-5 py-14 text-center text-xs text-slate-400">Aún no hay devoluciones registradas.</p>}
    </>
  );
}
