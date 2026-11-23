import { useState } from "react";
import { TODAY_ISO } from "./entorno";
import { policies } from "./config";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Check,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  PackageCheck,
  Plus,
  Printer,
  Search,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";
import type { Customer } from "./CustomersModule";
import type { Order } from "./OrdersModule";
import CustomerPicker from "./CustomerPicker";

// ---------- Políticas ----------
// Reglas configurables en Configuración → Políticas
export const layawayRules = () => ({ min: policies.layawayMinPct / 100, days: policies.layawayDays, extension: policies.layawayExtensionDays });


// ---------- Tipos ----------
export type PayMethodL = "Efectivo" | "Tarjeta" | "Transferencia" | "Saldo a favor";
export type LayawayItem = {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  components?: { sku: string; name: string; quantity: number; unit: string }[];
};
export type LayawayPayment = { id: string; date: string; amount: number; method: PayMethodL; user: string };
export type Layaway = {
  id: string;
  client: string;
  phone: string;
  dateISO: string;
  createdAt: string;
  dueISO: string;
  items: LayawayItem[];
  total: number;
  payments: LayawayPayment[];
  status: "Vigente" | "Liquidado" | "Cancelado";
  notes: string;
  createdBy: string;
  extended?: number;
  saleId?: string;
  orderId?: string;
  liquidatedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  creditIssued?: number;
};
export type WalletKind = "Anticipo" | "Devolución" | "Apartado cancelado" | "Consumo" | "Saldo inicial";
export type WalletMovement = {
  id: string;
  client: string;
  date: string;
  kind: WalletKind;
  amount: number;
  balanceAfter: number;
  reference: string;
  method?: string;
  user: string;
};

export const initialLayaways: Layaway[] = [
  {
    id: "AP-0002",
    client: "Grupo Hidráulico Norte",
    phone: "81 8344 2150",
    dateISO: "2026-11-08",
    createdAt: "08 nov 2026 · 12:20",
    dueISO: "2026-12-08",
    items: [
      { sku: "ROT-TIN-1100", name: "Tinaco tricapa 1,100 L", quantity: 1, unit: "pieza", unitPrice: 3499 },
      { sku: "VAL-ESF-050", name: 'Válvula esfera latón 1/2"', quantity: 2, unit: "pieza", unitPrice: 138 },
    ],
    total: 3775,
    payments: [
      { id: "lp-1", date: "08 nov 2026 · 12:20", amount: 800, method: "Efectivo", user: "Ana López" },
      { id: "lp-2", date: "15 nov 2026 · 10:05", amount: 1000, method: "Transferencia", user: "Carlos Mendoza" },
    ],
    status: "Vigente",
    notes: "Recoge en mostrador al liquidar.",
    createdBy: "Ana López",
  },
  {
    id: "AP-0001",
    client: "Instalaciones Ríos",
    phone: "55 3348 1290",
    dateISO: "2026-10-09",
    createdAt: "09 oct 2026 · 16:40",
    dueISO: "2026-11-08",
    items: [{ sku: "PVC-TUB-100", name: 'Tubo PVC hidráulico 1" x 6 m', quantity: 4, unit: "tramo", unitPrice: 286.5 }],
    total: 1146,
    payments: [{ id: "lp-0", date: "09 oct 2026 · 16:40", amount: 300, method: "Efectivo", user: "Ana López" }],
    status: "Vigente",
    notes: "",
    createdBy: "Ana López",
  },
];

export const initialWallet: WalletMovement[] = [
  {
    id: "wm-1",
    client: "Ferretería López",
    date: "17 nov 2026 · 18:20",
    kind: "Devolución",
    amount: 189,
    balanceAfter: 189,
    reference: "Devolución DV-0001 · venta V-1844",
    user: "Ana López",
  },
];

// ---------- Utilidades ----------
const round = (value: number) => Math.round(value * 100) / 100;
export const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
export const displayDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
export const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const daysLeft = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${TODAY_ISO}T12:00:00`).getTime()) / 86_400_000);
export const paidOf = (l: Layaway) => round(l.payments.reduce((s, p) => s + p.amount, 0));
export const balanceOf = (l: Layaway) => round(l.total - paidOf(l));
export const isExpired = (l: Layaway) => l.status === "Vigente" && daysLeft(l.dueISO) < 0;
export const stageOf = (l: Layaway, orders: Order[]) => {
  if (l.status === "Cancelado") return "Cancelado";
  if (l.status === "Liquidado") {
    const order = orders.find((o) => o.id === l.orderId);
    return order?.status === "Entregada" ? "Entregado" : order?.status === "Liberada a mostrador" ? "Listo en mostrador" : "Liquidado · en almacén";
  }
  return isExpired(l) ? "Vencido" : daysLeft(l.dueISO) <= 5 ? "Por vencer" : "Vigente";
};
const stageStyles: Record<string, string> = {
  Vigente: "bg-[#e8f2ff] text-[#3973a8]",
  "Por vencer": "bg-[#fff6df] text-[#9a6b18]",
  Vencido: "bg-[#fff0eb] text-[#c9664f]",
  "Liquidado · en almacén": "bg-[#e3f1ee] text-[#2f7468]",
  "Listo en mostrador": "bg-[#eef7e0] text-[#4a6b12]",
  Entregado: "bg-[#eaf6ef] text-[#347652]",
  Cancelado: "bg-slate-100 text-slate-400",
};
const methodIcons: Record<string, typeof Banknote> = { Efectivo: Banknote, Tarjeta: CreditCard, Transferencia: CircleDollarSign, "Saldo a favor": Wallet };

function MethodButtons({
  value,
  onChange,
  cashOpen,
  credit,
  amount,
  allowCredit = true,
}: {
  value: PayMethodL;
  onChange: (m: PayMethodL) => void;
  cashOpen: boolean;
  credit: number;
  amount: number;
  allowCredit?: boolean;
}) {
  const options: { label: PayMethodL; enabled: boolean; hint: string }[] = [
    { label: "Efectivo", enabled: cashOpen, hint: cashOpen ? "" : "Caja cerrada" },
    { label: "Tarjeta", enabled: true, hint: "" },
    { label: "Transferencia", enabled: true, hint: "" },
    ...(allowCredit ? [{ label: "Saldo a favor" as PayMethodL, enabled: credit >= amount && amount > 0, hint: credit ? `Disponible ${money(credit)}` : "Sin saldo a favor" }] : []),
  ];
  return (
    <div className={`grid gap-2 ${options.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
      {options.map(({ label, enabled, hint }) => {
        const Icon = methodIcons[label];
        return (
          <button
            key={label}
            type="button"
            disabled={!enabled}
            title={hint}
            onClick={() => onChange(label)}
            className={`grid min-h-[62px] place-items-center rounded-xl border p-2 text-[10px] font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-30 ${value === label ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Crear apartado (desde el punto de venta) ----------
export type NewLayaway = { client: string; phone: string; items: LayawayItem[]; total: number; firstPayment: number; method: PayMethodL; notes: string };
export function LayawayModal({
  items,
  total,
  initialClient,
  customers,
  cashOpen,
  onClose,
  onCreate,
}: {
  items: LayawayItem[];
  total: number;
  initialClient: string;
  customers: Customer[];
  cashOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewLayaway) => void;
}) {
  const [client, setClient] = useState(initialClient === "Público general" ? "" : initialClient);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethodL>(cashOpen ? "Efectivo" : "Tarjeta");
  const [notes, setNotes] = useState("");
  const customer = customers.find((c) => c.businessName.toLowerCase() === client.trim().toLowerCase());
  const min = round(total * layawayRules().min);
  const value = amount === "" ? min : Number(amount) || 0;
  const errors = [
    !client.trim() && "Captura el nombre del cliente",
    !customer && !phone.trim() && "Captura un teléfono (se registrará como cliente nuevo)",
    value < min - 0.009 && `El pago mínimo para apartar es ${money(min)} (${policies.layawayMinPct} %)`,
    value >= total && "Si paga el total, mejor cóbralo como venta",
    method === "Efectivo" && !cashOpen && "Abre la caja para cobrar en efectivo",
    method === "Saldo a favor" && (customer?.creditBalance ?? 0) < value && "El saldo a favor no alcanza",
  ].filter(Boolean) as string[];
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">Apartado · mínimo {policies.layawayMinPct} % · {policies.layawayDays} días para liquidar</p>
            <h2 className="mt-1 text-xl font-semibold">Apartar {money(total)}</h2>
            <p className="mt-1 text-xs text-slate-400">El material queda apartado a nombre del cliente hasta que liquide.</p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_150px] gap-3">
              <label className="form-label">
                Cliente *
                <CustomerPicker value={client} onChange={setClient} customers={customers} placeholder="Cliente registrado o nombre" />
              </label>
              <label className="form-label">
                Teléfono {customer ? "" : "*"}
                <input value={customer ? customer.phone : phone} disabled={Boolean(customer)} onChange={(e) => setPhone(e.target.value)} className="form-input" />
              </label>
            </div>
            {!customer && client.trim() && <p className="-mt-2 text-[10px] text-[#2f7468]">Se dará de alta como cliente nuevo para su monedero.</p>}
            <div className="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {items.map((item) => (
                <div key={item.sku} className="flex justify-between gap-3 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate">
                    {item.quantity} {item.unit} · {item.name}
                  </span>
                  <strong>{money(item.quantity * item.unitPrice)}</strong>
                </div>
              ))}
            </div>
            <label className="form-label">
              Notas
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" placeholder="Quién recoge, detalles" />
            </label>
          </div>
          <div className="space-y-3">
            <label className="form-label">
              Primer pago
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input pl-7 text-lg font-bold" placeholder={min.toFixed(2)} />
              </div>
            </label>
            <MethodButtons value={method} onChange={setMethod} cashOpen={cashOpen} credit={customer?.creditBalance ?? 0} amount={value} />
            <dl className="space-y-1 rounded-xl bg-[#f6f8f7] p-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Mínimo ({policies.layawayMinPct} %)</dt>
                <dd>{money(min)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Saldo por liquidar</dt>
                <dd>{money(Math.max(0, total - value))}</dd>
              </div>
              <div className="flex justify-between text-slate-500">
                <dt>Liquidar antes del</dt>
                <dd>{displayDate(addDays(TODAY_ISO, policies.layawayDays))}</dd>
              </div>
            </dl>
            <p className="text-[10px] leading-relaxed text-slate-400">Si el apartado se cancela o vence, lo abonado no se devuelve: queda como saldo a favor en el monedero del cliente.</p>
            {errors[0] && <p className="text-[11px] font-medium text-[#c9664f]">{errors[0]}.</p>}
            <button
              className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-40"
              disabled={errors.length > 0}
              onClick={() => onCreate({ client: customer?.businessName ?? client.trim(), phone: customer?.phone ?? phone.trim(), items, total, firstPayment: round(value), method, notes: notes.trim() })}
            >
              <HandCoins size={16} /> Apartar y cobrar {money(value)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Lista de apartados (Ventas) ----------
export function LayawaysPanel({
  layaways,
  orders,
  customers,
  cashOpen,
  onPay,
  onExtend,
  onCancel,
  onPrint,
  onOpenSale,
}: {
  layaways: Layaway[];
  orders: Order[];
  customers: Customer[];
  cashOpen: boolean;
  onPay: (id: string, amount: number, method: PayMethodL) => void;
  onExtend: (id: string) => void;
  onCancel: (id: string, reason: string) => void;
  onPrint: (id: string) => void;
  onOpenSale: (saleId: string) => void;
}) {
  const [filter, setFilter] = useState("Activos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const filters = ["Activos", "Por vencer", "Vencido", "Liquidados", "Entregado", "Cancelado"];
  const matches = (l: Layaway, f: string) => {
    const stage = stageOf(l, orders);
    if (f === "Activos") return l.status === "Vigente";
    if (f === "Liquidados") return l.status === "Liquidado" && stage !== "Entregado";
    return stage === f;
  };
  const visible = layaways.filter((l) => matches(l, filter));
  const selected = layaways.find((l) => l.id === selectedId) || null;
  const credit = (client: string) => customers.find((c) => c.businessName === client)?.creditBalance ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        {filters.map((f) => {
          const count = layaways.filter((l) => matches(l, f)).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${filter === f ? "bg-[#edf4f2] text-[#285e56]" : f === "Vencido" && count ? "text-[#c9664f]" : "text-slate-400 hover:text-slate-600"}`}
            >
              {f === "Vencido" ? "Vencidos" : f === "Entregado" ? "Entregados" : f === "Cancelado" ? "Cancelados" : f} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
        <p className="ml-auto text-[11px] text-slate-400">Los apartados se crean desde el punto de venta con el botón "Apartar".</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Apartado / cliente</th>
              <th className="py-3.5">Productos</th>
              <th className="py-3.5">Vence</th>
              <th className="py-3.5">Avance</th>
              <th className="py-3.5 pr-6 text-right">Saldo</th>
              <th className="py-3.5">Estado</th>
              <th className="px-5 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const stage = stageOf(l, orders);
              const paid = paidOf(l);
              const left = daysLeft(l.dueISO);
              return (
                <tr key={l.id} className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]">
                  <td className="px-5 py-4">
                    <button className="flex items-center gap-3 text-left" onClick={() => setSelectedId(l.id)}>
                      <span className="grid size-9 place-items-center rounded-xl bg-[#e8f2ff] text-[#3973a8]">
                        <HandCoins size={15} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{l.id}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{l.client}</p>
                      </div>
                    </button>
                  </td>
                  <td className="max-w-56 py-4">
                    <p className="truncate">{l.items.map((i) => `${i.quantity} ${i.name}`).join(", ")}</p>
                    <p className="mt-1 text-[10px] text-slate-400">Apartado el {displayDate(l.dateISO)}</p>
                  </td>
                  <td className="py-4">
                    <p className={l.status === "Vigente" && left < 0 ? "font-semibold text-[#c9664f]" : "text-slate-600"}>{displayDate(l.dueISO)}</p>
                    {l.status === "Vigente" && (
                      <p className={`mt-1 text-[10px] font-semibold ${left < 0 ? "text-[#c9664f]" : left <= 5 ? "text-[#9a6b18]" : "text-slate-400"}`}>
                        {left < 0 ? `Venció hace ${-left} días` : left === 0 ? "Vence hoy" : `Faltan ${left} días`}
                      </p>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#2f7468]" style={{ width: `${Math.min(100, (paid / l.total) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {money(paid)} de {money(l.total)} · {l.payments.length} {l.payments.length === 1 ? "pago" : "pagos"}
                    </p>
                  </td>
                  <td className="py-4 pr-6 text-right font-semibold">{l.status === "Vigente" ? money(balanceOf(l)) : "—"}</td>
                  <td className="py-4">
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${stageStyles[stage]}`}>{stage}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {l.status === "Vigente" && !isExpired(l) ? (
                      <button className="link-button" onClick={() => setPayId(l.id)}>
                        <Plus size={13} /> Abonar
                      </button>
                    ) : isExpired(l) ? (
                      <button className="link-button" onClick={() => setSelectedId(l.id)}>
                        Resolver
                      </button>
                    ) : (
                      <button className="link-button" onClick={() => setSelectedId(l.id)}>
                        Ver detalle
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="px-5 py-14 text-center text-xs text-slate-400">No hay apartados en este filtro.</p>}
      </div>

      {selected && (
        <>
          <button className="fixed inset-0 z-40 bg-[#102521]/40 backdrop-blur-[2px]" onClick={() => setSelectedId(null)} aria-label="Cerrar apartado" />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Apartado</p>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{selected.id}</h2>
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${stageStyles[stageOf(selected, orders)]}`}>{stageOf(selected, orders)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {selected.client} · {selected.phone} · vence {displayDate(selected.dueISO)}
                    {selected.extended ? ` (prórroga +${selected.extended} días)` : ""}
                  </p>
                </div>
                <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={() => setSelectedId(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Total", money(selected.total)],
                  ["Abonado", money(paidOf(selected))],
                  [selected.status === "Cancelado" ? "Pasó a saldo a favor" : "Saldo", selected.status === "Cancelado" ? money(selected.creditIssued ?? 0) : money(balanceOf(selected))],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#f6f8f7] p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={() => onPrint(selected.id)}>
                  <Printer size={14} /> Comprobante de apartado
                </button>
                {selected.status === "Vigente" && !isExpired(selected) && (
                  <button className="primary-button min-h-9" onClick={() => setPayId(selected.id)}>
                    <Plus size={14} /> Abonar
                  </button>
                )}
                {isExpired(selected) && (
                  <button className="primary-button min-h-9" onClick={() => onExtend(selected.id)}>
                    <CalendarClock size={14} /> Dar prórroga de {policies.layawayExtensionDays} días
                  </button>
                )}
                {selected.saleId && (
                  <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={() => onOpenSale(selected.saleId!)}>
                    Venta {selected.saleId} <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {isExpired(selected) && (
                <p className="flex items-start gap-2 rounded-xl bg-[#fff0eb] p-3 text-[11px] text-[#c9664f]">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                  El plazo venció el {displayDate(selected.dueISO)}. Da una prórroga o cancela: los {money(paidOf(selected))} abonados pasan al monedero del cliente como saldo a favor y el material se libera.
                </p>
              )}
              <section>
                <p className="eyebrow">Pagos</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                  {selected.payments.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
                      <div>
                        <p className="font-semibold">{i === 0 ? "Pago inicial" : `Abono ${i}`}</p>
                        <p className="text-[10px] text-slate-400">
                          {p.date} · {p.method} · {p.user}
                        </p>
                      </div>
                      <p className="font-semibold text-[#347652]">{money(p.amount)}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <p className="eyebrow">Material apartado</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                  {selected.items.map((item) => (
                    <div key={item.sku} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
                      <div className="min-w-0">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.sku} · {item.quantity} {item.unit} × {money(item.unitPrice)}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{money(item.quantity * item.unitPrice)}</p>
                    </div>
                  ))}
                </div>
              </section>
              {selected.status === "Cancelado" && (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Cancelado el {selected.cancelledAt} · {selected.cancelReason}. Se abonaron {money(selected.creditIssued ?? 0)} al monedero de {selected.client}.
                </p>
              )}
              {selected.status === "Vigente" && (
                <button className="w-full text-center text-xs font-semibold text-slate-400 hover:text-[#c9664f]" onClick={() => setCancelId(selected.id)}>
                  Cancelar apartado (lo abonado pasa a saldo a favor)
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {payId && (
        <PayModal
          layaway={layaways.find((l) => l.id === payId)!}
          cashOpen={cashOpen}
          credit={credit(layaways.find((l) => l.id === payId)!.client)}
          onClose={() => setPayId(null)}
          onConfirm={(amount, method) => {
            onPay(payId, amount, method);
            setPayId(null);
          }}
        />
      )}
      {cancelId && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
          <CancelBox
            layaway={layaways.find((l) => l.id === cancelId)!}
            onClose={() => setCancelId(null)}
            onConfirm={(reason) => {
              onCancel(cancelId, reason);
              setCancelId(null);
            }}
          />
        </div>
      )}
    </>
  );
}

function PayModal({
  layaway,
  cashOpen,
  credit,
  onClose,
  onConfirm,
}: {
  layaway: Layaway;
  cashOpen: boolean;
  credit: number;
  onClose: () => void;
  onConfirm: (amount: number, method: PayMethodL) => void;
}) {
  const due = balanceOf(layaway);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayMethodL>(cashOpen ? "Efectivo" : "Tarjeta");
  const value = amount === "" ? due : Math.min(due, Number(amount) || 0);
  const liquidates = value >= due - 0.009;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Abono a {layaway.id}</p>
            <h2 className="mt-1 text-xl font-semibold">Saldo {money(due)}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {layaway.client} · vence {displayDate(layaway.dueISO)}
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <label className="form-label mt-5">
          Monto del abono
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input type="number" min={0} max={due} value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input pl-7 text-lg font-bold" placeholder={due.toFixed(2)} />
          </div>
        </label>
        <div className="mt-3">
          <MethodButtons value={method} onChange={setMethod} cashOpen={cashOpen} credit={credit} amount={value} />
        </div>
        {liquidates ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f3fadf] p-3 text-[11px] text-[#3f5c0e]">
            <PackageCheck size={14} className="mt-0.5 shrink-0" />
            Con este pago queda liquidado: se genera la venta y la orden de surtido para entregarlo en mostrador.
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-slate-500">Quedarán {money(due - value)} por liquidar.</p>
        )}
        <button
          className="primary-button mt-4 w-full disabled:opacity-40"
          disabled={value <= 0 || (method === "Efectivo" && !cashOpen) || (method === "Saldo a favor" && credit < value)}
          onClick={() => onConfirm(Math.round(value * 100) / 100, method)}
        >
          <Check size={16} /> {liquidates ? "Liquidar apartado" : `Registrar abono de ${money(value)}`}
        </button>
      </div>
    </div>
  );
}

function CancelBox({ layaway, onClose, onConfirm }: { layaway: Layaway; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(isExpired(layaway) ? "Venció el plazo para liquidar" : "");
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <span className="grid size-11 place-items-center rounded-xl bg-[#fff0eb] text-[#c9664f]">
        <TriangleAlert size={19} />
      </span>
      <h2 className="mt-4 text-lg font-semibold">¿Cancelar el apartado {layaway.id}?</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        El material se libera para venta. Los <strong>{money(paidOf(layaway))}</strong> abonados no se devuelven en efectivo: pasan al <strong>monedero</strong> de {layaway.client} como saldo a favor
        y se imprime su comprobante.
      </p>
      <label className="form-label mt-4">
        Motivo
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="form-input" placeholder="Ej. El cliente ya no lo quiere" />
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <button className="secondary-button" onClick={onClose}>
          Conservar apartado
        </button>
        <button className="primary-button bg-[#c9664f] disabled:opacity-40" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
          Cancelar y pasar a saldo a favor
        </button>
      </div>
    </div>
  );
}

// ---------- Monedero (saldo a favor y anticipos) ----------
export function WalletModal({
  customers,
  movements,
  cashOpen,
  initialClient,
  onDeposit,
  onPrint,
  onClose,
}: {
  customers: Customer[];
  movements: WalletMovement[];
  cashOpen: boolean;
  initialClient?: string;
  onDeposit: (client: string, phone: string, amount: number, method: PayMethodL) => void;
  onPrint: (client: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialClient && initialClient !== "Público general" ? initialClient : "");
  const [client, setClient] = useState<string | null>(initialClient && customers.some((c) => c.businessName === initialClient) ? initialClient : null);
  const [depositing, setDepositing] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PayMethodL>(cashOpen ? "Efectivo" : "Tarjeta");
  const customer = customers.find((c) => c.businessName === client);
  const list = movements.filter((m) => m.client === client);
  const matches = customers
    .filter((c) => c.businessName.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.creditBalance ?? 0) - (a.creditBalance ?? 0))
    .slice(0, 6);
  const newName = query.trim() && !customers.some((c) => c.businessName.toLowerCase() === query.trim().toLowerCase()) ? query.trim() : "";
  const value = Number(amount) || 0;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">Monedero del cliente</p>
            <h2 className="mt-1 text-xl font-semibold">Saldo a favor y anticipos</h2>
            <p className="mt-1 text-xs text-slate-400">El saldo se usa como forma de pago "Saldo a favor" y se va descontando en cada compra.</p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {!client && !depositing ? (
            <>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#2f7468]" placeholder="Buscar cliente..." />
              </div>
              <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {matches.map((c) => (
                  <button key={c.id} className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs hover:bg-[#fafcfb]" onClick={() => setClient(c.businessName)}>
                    <span className="grid size-8 place-items-center rounded-lg bg-[#edf4f2] text-[#2f7468]">
                      <Wallet size={14} />
                    </span>
                    <span className="flex-1 font-semibold">{c.businessName}</span>
                    <span className={`font-semibold ${(c.creditBalance ?? 0) > 0 ? "text-[#347652]" : "text-slate-300"}`}>{money(c.creditBalance ?? 0)}</span>
                  </button>
                ))}
              </div>
              {newName && (
                <button className="link-button mt-3" onClick={() => setDepositing(true)}>
                  <Plus size={13} /> Registrar a "{newName}" y recibir anticipo
                </button>
              )}
            </>
          ) : depositing ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Anticipo de {customer?.businessName ?? newName}</p>
              {!customer && (
                <label className="form-label">
                  Teléfono *
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="Para su registro como cliente" />
                </label>
              )}
              <label className="form-label">
                Monto que deja a cuenta
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                  <input autoFocus type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input pl-7 text-lg font-bold" placeholder="0.00" />
                </div>
              </label>
              <MethodButtons value={method} onChange={setMethod} cashOpen={cashOpen} credit={0} amount={value} allowCredit={false} />
              <div className="flex justify-end gap-3">
                <button className="secondary-button" onClick={() => setDepositing(false)}>
                  Cancelar
                </button>
                <button
                  className="primary-button disabled:opacity-40"
                  disabled={value <= 0 || (method === "Efectivo" && !cashOpen) || (!customer && !phone.trim())}
                  onClick={() => {
                    onDeposit(customer?.businessName ?? newName, customer?.phone ?? phone.trim(), value, method);
                    setClient(customer?.businessName ?? newName);
                    setDepositing(false);
                    setAmount("");
                  }}
                >
                  <ArrowDownLeft size={15} /> Recibir anticipo de {money(value)}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-2xl bg-[#183b36] p-5 text-white">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{client}</p>
                  <p className="mt-1 text-3xl font-bold">{money(customer?.creditBalance ?? 0)}</p>
                  <p className="text-[11px] text-white/60">Saldo disponible en monedero</p>
                </div>
                <Wallet size={34} className="text-[#b8f34a]" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="primary-button" onClick={() => setDepositing(true)}>
                  <ArrowDownLeft size={15} /> Recibir anticipo
                </button>
                <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => onPrint(client!)}>
                  <Printer size={15} /> Imprimir comprobante de saldo
                </button>
                <button className="secondary-button ml-auto bg-white" onClick={() => setClient(null)}>
                  Otro cliente
                </button>
              </div>
              <p className="eyebrow mt-6">Movimientos</p>
              <div className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {[...list].reverse().map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <span className={`grid size-8 place-items-center rounded-lg ${m.amount >= 0 ? "bg-[#eaf6ef] text-[#347652]" : "bg-[#fff0eb] text-[#c9664f]"}`}>
                      {m.amount >= 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{m.kind}</p>
                      <p className="truncate text-[10px] text-slate-400">
                        {m.reference} · {m.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${m.amount >= 0 ? "text-[#347652]" : "text-[#c9664f]"}`}>
                        {m.amount >= 0 ? "+" : ""}
                        {money(m.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400">Saldo {money(m.balanceAfter)}</p>
                    </div>
                  </div>
                ))}
                {list.length === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">Sin movimientos.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
