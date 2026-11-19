import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Plus,
  Scale,
  Settings2,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

// ---------- Tipos ----------
export type BankAccount = { id: string; bank: string; alias: string; last4: string; openingBalance: number; openingISO: string };
export type Terminal = { id: string; name: string; accountId: string; feeRate: number; feeVat: boolean; isDefault: boolean };
export type BankKind =
  | "Venta con tarjeta"
  | "Transferencia recibida"
  | "Depósito de efectivo"
  | "Pago de nómina"
  | "Otro ingreso"
  | "Otro egreso";
export type BankMovement = {
  id: string;
  accountId: string;
  dateISO: string;
  at: string;
  kind: BankKind;
  /** Importe cobrado al cliente (tarjeta) o importe del movimiento */
  gross: number;
  /** Comisión de la terminal (solo tarjeta) */
  fee: number;
  /** Lo que realmente entra o sale de la cuenta (+ entra, − sale) */
  net: number;
  reference: string;
  terminalId?: string;
  status: "Por confirmar" | "Confirmado";
  /** true si la comisión es la configurada (estimada); false si se capturó lo recibido */
  estimated?: boolean;
  manual?: boolean;
};
export type BankOverride = { received?: number; confirmed?: boolean };

export const initialAccounts: BankAccount[] = [
  { id: "acc-bbva", bank: "BBVA", alias: "Cuenta empresarial", last4: "4021", openingBalance: 182450, openingISO: "2026-11-16" },
  { id: "acc-san", bank: "Santander", alias: "Cuenta de nómina y proveedores", last4: "7714", openingBalance: 64300, openingISO: "2026-11-16" },
];
export const initialTerminals: Terminal[] = [
  { id: "ter-bbva", name: "Terminal BBVA", accountId: "acc-bbva", feeRate: 2.6, feeVat: true, isDefault: true },
  { id: "ter-clip", name: "Clip (respaldo)", accountId: "acc-bbva", feeRate: 3.6, feeVat: true, isDefault: false },
];

const round = (v: number) => Math.round(v * 100) / 100;
export const money = (v: number) => v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
/** Comisión de la terminal: % sobre el cobro, más IVA si aplica */
export const terminalFee = (gross: number, t?: Terminal) => (t ? round(gross * (t.feeRate / 100) * (t.feeVat ? 1.16 : 1)) : 0);

const kindIcon = (k: BankKind) => (k === "Venta con tarjeta" ? CreditCard : k === "Depósito de efectivo" ? Banknote : k === "Transferencia recibida" ? CircleDollarSign : k === "Pago de nómina" || k === "Otro egreso" ? ArrowUpRight : ArrowDownLeft);

// ---------- Pestaña Bancos ----------
export function BanksPanel({
  accounts,
  terminals,
  movements,
  cashExpected,
  onConfirm,
  onManual,
  onDeleteManual,
  onSaveConfig,
  onToast,
}: {
  accounts: BankAccount[];
  terminals: Terminal[];
  movements: BankMovement[];
  cashExpected: number;
  onConfirm: (id: string, received?: number) => void;
  onManual: (m: BankMovement) => void;
  onDeleteManual: (id: string) => void;
  onSaveConfig: (accounts: BankAccount[], terminals: Terminal[]) => void;
  onToast: (message: string) => void;
}) {
  const [accountFilter, setAccountFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState<"Todos" | "Por confirmar" | "Confirmado">("Todos");
  const [receiving, setReceiving] = useState<BankMovement | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [reconcile, setReconcile] = useState<Record<string, string>>({});

  const balanceOf = (acc: BankAccount, onlyConfirmed: boolean) =>
    round(acc.openingBalance + movements.filter((m) => m.accountId === acc.id && (!onlyConfirmed || m.status === "Confirmado")).reduce((s, m) => s + m.net, 0));
  const pending = movements.filter((m) => m.status === "Por confirmar" && m.net > 0).reduce((s, m) => s + m.net, 0);
  const banksConfirmed = accounts.reduce((s, a) => s + balanceOf(a, true), 0);
  const cards = movements.filter((m) => m.kind === "Venta con tarjeta");
  const cardGross = cards.reduce((s, m) => s + m.gross, 0);
  const cardFees = cards.reduce((s, m) => s + m.fee, 0);
  const visible = movements
    .filter((m) => accountFilter === "Todas" || m.accountId === accountFilter)
    .filter((m) => statusFilter === "Todos" || m.status === statusFilter)
    .sort((a, b) => (b.dateISO + b.at).localeCompare(a.dateISO + a.at));

  return (
    <div className="mt-6 space-y-5">
      <section className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Dónde está tu dinero</p>
            <h2 className="panel-title">{money(cashExpected + banksConfirmed + pending)} en total</h2>
          </div>
          <div className="flex gap-2">
            <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setConfigOpen(true)}>
              <Settings2 size={15} /> Cuentas y terminales
            </button>
            <button className="primary-button" onClick={() => setManualOpen(true)}>
              <Plus size={15} /> Movimiento manual
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Efectivo en caja", value: cashExpected, hint: "Esperado en el cajón del turno", icon: Banknote },
            { label: "En bancos (confirmado)", value: banksConfirmed, hint: `${accounts.length} cuentas`, icon: Landmark },
            { label: "Por confirmar", value: pending, hint: "Tarjeta y transferencias aún no verificadas", icon: Scale },
            { label: "Cobrado con tarjeta", value: cardGross, hint: `Comisiones ${money(cardFees)} · neto ${money(cardGross - cardFees)}`, icon: CreditCard },
          ].map(({ label, value, hint, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-[#f6f8f7] p-4">
              <Icon size={16} className="text-[#2f7468]" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-0.5 text-lg font-bold">{money(value)}</p>
              <p className="text-[10px] text-slate-400">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {accounts.map((acc) => {
          const books = balanceOf(acc, false);
          const confirmed = balanceOf(acc, true);
          const real = reconcile[acc.id];
          const diff = real === undefined || real === "" ? undefined : round(Number(real) - confirmed);
          return (
            <section key={acc.id} className="panel overflow-hidden">
              <div className="flex items-start justify-between bg-[#183b36] p-5 text-white">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    {acc.bank} ···{acc.last4}
                  </p>
                  <p className="text-xs text-white/70">{acc.alias}</p>
                  <p className="mt-2 text-2xl font-bold">{money(confirmed)}</p>
                  <p className="text-[10px] text-white/60">Saldo confirmado · con pendientes {money(books)}</p>
                </div>
                <Landmark size={26} className="text-[#b8f34a]" />
              </div>
              <div className="flex flex-wrap items-center gap-3 p-4 text-xs">
                <label className="flex items-center gap-2 font-semibold text-slate-600">
                  Saldo según tu banco
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={real ?? ""}
                      onChange={(e) => setReconcile((r) => ({ ...r, [acc.id]: e.target.value }))}
                      className="h-9 w-36 rounded-lg border border-slate-200 pl-6 pr-2 text-right font-semibold outline-none focus:border-[#2f7468]"
                      placeholder="Cotejar"
                      aria-label={`Saldo real ${acc.bank}`}
                    />
                  </div>
                </label>
                {diff !== undefined && (
                  <span className={`rounded-lg px-2.5 py-1 font-semibold ${Math.abs(diff) < 0.01 ? "bg-[#eaf6ef] text-[#347652]" : "bg-[#fff0eb] text-[#c9664f]"}`}>
                    {Math.abs(diff) < 0.01 ? "Cuadra con el sistema" : `Diferencia ${diff > 0 ? "+" : ""}${money(diff)}`}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-slate-400">
                  Terminales: {terminals.filter((t) => t.accountId === acc.id).map((t) => `${t.name} (${t.feeRate}%${t.feeVat ? " + IVA" : ""})`).join(", ") || "ninguna"}
                </span>
              </div>
            </section>
          );
        })}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <p className="text-sm font-semibold">Movimientos bancarios</p>
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className="form-input h-9 w-56 text-xs" aria-label="Cuenta">
            <option value="Todas">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank} ···{a.last4}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-semibold">
            {(["Todos", "Por confirmar", "Confirmado"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-3 py-1.5 ${statusFilter === s ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}>
                {s === "Confirmado" ? "Confirmados" : s}
                {s === "Por confirmar" && <span className="ml-1 opacity-60">{movements.filter((m) => m.status === "Por confirmar").length}</span>}
              </button>
            ))}
          </div>
          <p className="ml-auto text-[10px] text-slate-400">Los cobros con tarjeta, transferencias, depósitos del corte y nóminas llegan solos.</p>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Movimiento</th>
              <th className="py-3">Cuenta</th>
              <th className="py-3 text-right">Cobrado</th>
              <th className="py-3 text-right">Comisión</th>
              <th className="py-3 text-right">Entra / sale</th>
              <th className="px-5 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((m) => {
              const Icon = kindIcon(m.kind);
              const acc = accounts.find((a) => a.id === m.accountId);
              return (
                <tr key={m.id} className="hover:bg-[#fafcfb]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-8 place-items-center rounded-lg ${m.net >= 0 ? "bg-[#eaf6ef] text-[#347652]" : "bg-[#fff0eb] text-[#c9664f]"}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{m.kind}</p>
                        <p className="max-w-80 truncate text-[10px] text-slate-400">
                          {m.reference} · {m.dateISO.slice(8)}/{m.dateISO.slice(5, 7)} {m.at}
                          {m.terminalId ? ` · ${terminals.find((t) => t.id === m.terminalId)?.name ?? ""}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-slate-500">
                    {acc?.bank} ···{acc?.last4}
                  </td>
                  <td className="py-3 text-right">{m.kind === "Venta con tarjeta" ? money(m.gross) : "—"}</td>
                  <td className="py-3 text-right text-[#c9664f]">
                    {m.fee ? `−${money(m.fee)}` : "—"}
                    {m.fee > 0 && <span className="block text-[9px] text-slate-400">{m.estimated ? "estimada" : "real"}</span>}
                  </td>
                  <td className={`py-3 text-right text-sm font-bold ${m.net >= 0 ? "text-[#347652]" : "text-[#c9664f]"}`}>
                    {m.net >= 0 ? "+" : ""}
                    {money(m.net)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.status === "Confirmado" ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#eaf6ef] px-2 py-1 text-[10px] font-semibold text-[#347652]">
                        <Check size={11} /> Confirmado
                      </span>
                    ) : m.kind === "Venta con tarjeta" ? (
                      <button className="link-button" onClick={() => setReceiving(m)}>
                        Registrar lo recibido
                      </button>
                    ) : (
                      <button className="link-button" onClick={() => onConfirm(m.id)}>
                        Confirmar
                      </button>
                    )}
                    {m.manual && (
                      <button className="ml-2 text-slate-300 hover:text-[#c9664f]" onClick={() => onDeleteManual(m.id)} aria-label="Eliminar movimiento">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-400">Sin movimientos con este filtro.</p>}
      </section>

      {receiving && (
        <ReceivedModal
          movement={receiving}
          terminal={terminals.find((t) => t.id === receiving.terminalId)}
          onClose={() => setReceiving(null)}
          onConfirm={(received) => {
            onConfirm(receiving.id, received);
            setReceiving(null);
            onToast(`Cobro con tarjeta confirmado: recibiste ${money(received)} de ${money(receiving.gross)}`);
          }}
        />
      )}
      {manualOpen && (
        <ManualModal
          accounts={accounts}
          onClose={() => setManualOpen(false)}
          onSave={(m) => {
            onManual(m);
            setManualOpen(false);
            onToast(`${m.kind} registrado`);
          }}
        />
      )}
      {configOpen && (
        <ConfigModal
          accounts={accounts}
          terminals={terminals}
          onClose={() => setConfigOpen(false)}
          onSave={(a, t) => {
            onSaveConfig(a, t);
            setConfigOpen(false);
            onToast("Cuentas y terminales guardadas");
          }}
        />
      )}
    </div>
  );
}

function Modal({ eyebrow, title, onClose, children, footer, wide }: { eyebrow: string; title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className={`mx-auto my-6 w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function ReceivedModal({ movement, terminal, onClose, onConfirm }: { movement: BankMovement; terminal?: Terminal; onClose: () => void; onConfirm: (received: number) => void }) {
  const estimated = round(movement.gross - terminalFee(movement.gross, terminal));
  const [value, setValue] = useState("");
  const received = value === "" ? estimated : Number(value) || 0;
  const fee = round(movement.gross - received);
  const rate = movement.gross ? (fee / movement.gross) * 100 : 0;
  return (
    <Modal
      eyebrow="Cobro con tarjeta"
      title={`Cobraste ${money(movement.gross)}`}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button disabled:opacity-40" disabled={received <= 0 || received > movement.gross} onClick={() => onConfirm(round(received))}>
            <Check size={15} /> Confirmar
          </button>
        </>
      }
    >
      <p className="text-xs text-slate-500">
        {movement.reference} · {terminal?.name ?? "Terminal"}
      </p>
      <label className="form-label mt-4">
        ¿Cuánto recibiste? (lo que dice la notificación del banco o de la terminal)
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input autoFocus type="number" value={value} onChange={(e) => setValue(e.target.value)} className="form-input pl-7 text-lg font-bold" placeholder={estimated.toFixed(2)} />
        </div>
      </label>
      <dl className="mt-4 space-y-1.5 rounded-xl bg-[#f6f8f7] p-3 text-xs">
        <div className="flex justify-between">
          <dt className="text-slate-500">Cobrado al cliente</dt>
          <dd>{money(movement.gross)}</dd>
        </div>
        <div className="flex justify-between text-[#c9664f]">
          <dt>Comisión</dt>
          <dd>
            −{money(fee)} ({rate.toFixed(2)} %)
          </dd>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
          <dt>Entra a la cuenta</dt>
          <dd>{money(received)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[10px] text-slate-400">
        Si lo dejas vacío se usa la comisión configurada de la terminal ({terminal?.feeRate ?? 0} %{terminal?.feeVat ? " + IVA" : ""}): {money(estimated)}.
      </p>
    </Modal>
  );
}

function ManualModal({ accounts, onClose, onSave }: { accounts: BankAccount[]; onClose: () => void; onSave: (m: BankMovement) => void }) {
  const [kind, setKind] = useState<"Otro ingreso" | "Otro egreso">("Otro egreso");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const value = Number(amount) || 0;
  return (
    <Modal
      eyebrow="Bancos"
      title="Movimiento manual"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button disabled:opacity-40"
            disabled={value <= 0 || !reference.trim()}
            onClick={() =>
              onSave({
                id: `bm-${Date.now()}`,
                accountId,
                dateISO: "2026-11-18",
                at: new Date().toTimeString().slice(0, 5),
                kind,
                gross: value,
                fee: 0,
                net: kind === "Otro ingreso" ? value : -value,
                reference: reference.trim(),
                status: "Confirmado",
                manual: true,
              })
            }
          >
            <Check size={15} /> Registrar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["Otro ingreso", "Otro egreso"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${kind === k ? "border-[#2f7468] bg-[#edf4f2] text-[#285e56]" : "border-slate-200 text-slate-500"}`}>
              {k === "Otro ingreso" ? "Ingreso" : "Egreso"}
            </button>
          ))}
        </div>
        <label className="form-label">
          Cuenta
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="form-input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank} ···{a.last4} · {a.alias}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Monto
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input font-semibold" placeholder="$0.00" />
        </label>
        <label className="form-label">
          Concepto
          <input value={reference} onChange={(e) => setReference(e.target.value)} className="form-input" placeholder="Ej. Pago a proveedor Amanco, comisión bancaria, renta" />
        </label>
      </div>
    </Modal>
  );
}

function ConfigModal({ accounts, terminals, onClose, onSave }: { accounts: BankAccount[]; terminals: Terminal[]; onClose: () => void; onSave: (a: BankAccount[], t: Terminal[]) => void }) {
  const [acc, setAcc] = useState(accounts);
  const [ter, setTer] = useState(terminals);
  const setA = (i: number, ch: Partial<BankAccount>) => setAcc((l) => l.map((x, j) => (j === i ? { ...x, ...ch } : x)));
  const setT = (i: number, ch: Partial<Terminal>) => setTer((l) => l.map((x, j) => (j === i ? { ...x, ...ch } : x)));
  return (
    <Modal
      wide
      eyebrow="Bancos"
      title="Cuentas y terminales"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button disabled:opacity-40" disabled={acc.length === 0 || acc.some((a) => !a.bank.trim())} onClick={() => onSave(acc, ter)}>
            <Check size={15} /> Guardar
          </button>
        </>
      }
    >
      <p className="text-xs font-semibold text-slate-700">Cuentas bancarias</p>
      <div className="mt-2 space-y-2">
        {acc.map((a, i) => (
          <div key={a.id} className="grid grid-cols-[110px_1fr_80px_140px_28px] items-center gap-2">
            <input value={a.bank} onChange={(e) => setA(i, { bank: e.target.value })} className="form-input h-9" placeholder="Banco" />
            <input value={a.alias} onChange={(e) => setA(i, { alias: e.target.value })} className="form-input h-9" placeholder="Alias" />
            <input value={a.last4} maxLength={4} onChange={(e) => setA(i, { last4: e.target.value.replace(/\D/g, "") })} className="form-input h-9" placeholder="···0000" />
            <input type="number" value={a.openingBalance} onChange={(e) => setA(i, { openingBalance: Number(e.target.value) || 0 })} className="form-input h-9 text-right" aria-label="Saldo inicial" title="Saldo inicial al 16 nov" />
            <button className="text-slate-300 hover:text-[#c9664f]" onClick={() => setAcc((l) => l.filter((_, j) => j !== i))} aria-label="Quitar cuenta">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button className="link-button" onClick={() => setAcc((l) => [...l, { id: `acc-${Date.now()}`, bank: "", alias: "", last4: "", openingBalance: 0, openingISO: "2026-11-16" }])}>
          + Agregar cuenta
        </button>
      </div>
      <p className="mt-5 text-xs font-semibold text-slate-700">Terminales bancarias</p>
      <div className="mt-2 space-y-2">
        {ter.map((t, i) => (
          <div key={t.id} className="grid grid-cols-[1fr_170px_90px_80px_90px_28px] items-center gap-2 text-xs">
            <input value={t.name} onChange={(e) => setT(i, { name: e.target.value })} className="form-input h-9" placeholder="Nombre" />
            <select value={t.accountId} onChange={(e) => setT(i, { accountId: e.target.value })} className="form-input h-9" aria-label="Deposita en">
              {acc.map((a) => (
                <option key={a.id} value={a.id}>
                  Deposita en {a.bank} ···{a.last4}
                </option>
              ))}
            </select>
            <div className="relative">
              <input type="number" step={0.01} value={t.feeRate} onChange={(e) => setT(i, { feeRate: Number(e.target.value) || 0 })} className="form-input h-9 pr-6 text-right" aria-label="Comisión %" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
            <label className="flex items-center gap-1 text-[10px] text-slate-500">
              <input type="checkbox" checked={t.feeVat} onChange={(e) => setT(i, { feeVat: e.target.checked })} className="accent-[#2f7468]" /> + IVA
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-500">
              <input type="radio" checked={t.isDefault} onChange={() => setTer((l) => l.map((x, j) => ({ ...x, isDefault: j === i })))} className="accent-[#2f7468]" /> Principal
            </label>
            <button className="text-slate-300 hover:text-[#c9664f]" onClick={() => setTer((l) => l.filter((_, j) => j !== i))} aria-label="Quitar terminal">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button className="link-button" onClick={() => setTer((l) => [...l, { id: `ter-${Date.now()}`, name: "Nueva terminal", accountId: acc[0]?.id ?? "", feeRate: 3, feeVat: true, isDefault: l.length === 0 }])}>
          + Agregar terminal
        </button>
      </div>
      <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f6f8f7] p-3 text-[11px] text-slate-500">
        <TriangleAlert size={13} className="mt-0.5 shrink-0 text-[#9a6b18]" />
        La comisión configurada se usa para estimar cuánto te depositan. Al confirmar cada cobro puedes capturar lo que realmente recibiste y el sistema calcula la comisión real. Las transferencias de clientes entran a la primera cuenta.
      </p>
    </Modal>
  );
}
