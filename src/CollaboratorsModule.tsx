import { useMemo, useState } from "react";
import { TODAY_ISO, idVisible, nuevoId } from "./entorno";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  Briefcase,
  Check,
  ChevronRight,
  HandCoins,
  IdCard,
  Landmark,
  Pencil,
  Plus,
  Printer,
  Settings2,
  ShieldCheck,
  Target,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import type { Sale } from "./SalesModule";
import type { SaleReturn } from "./ReturnsModule";
import PayrollPrintView from "./CollaboratorsDocument";
import { can, NO_ACCESS_ROLE, type Role } from "./RolesModule";

// ---------- Tipos ----------
export type PayFrequency = "Semanal" | "Quincenal" | "Mensual";
export type Area = "Ventas" | "Caja" | "Almacén" | "Reparto" | "Administración";
/** Nombre de un rol definido en Configuración → Roles y permisos */
export type SystemRole = string;
export type Collaborator = {
  id: string;
  name: string;
  position: string;
  area: Area;
  role: SystemRole;
  pin?: string;
  phone: string;
  email: string;
  startISO: string;
  status: "Activo" | "Baja";
  salary: number;
  frequency: PayFrequency;
  socialSecurity: boolean;
  commissionRate: number;
  monthlyGoal: number;
  bank: string;
  emergencyContact: string;
  notes: string;
};
export type Advance = {
  id: string;
  collaboratorId: string;
  dateISO: string;
  amount: number;
  installments: number;
  remaining: number;
  reason: string;
};
export type PayrollLine = {
  collaboratorId: string;
  name: string;
  position: string;
  base: number;
  absences: number;
  absenceDiscount: number;
  commission: number;
  bonus: number;
  advance: number;
  net: number;
  socialCost: number;
  employerCost: number;
};
export type PayrollRun = {
  id: string;
  frequency: PayFrequency;
  fromISO: string;
  toISO: string;
  label: string;
  lines: PayrollLine[];
  method: "Transferencia" | "Efectivo";
  paidAt: string;
  paidBy: string;
};

// ---------- Datos de ejemplo ----------
export const DEFAULT_SOCIAL_RATE = 0.3;
export const initialCollaborators: Collaborator[] = [
  { id: "COL-001", name: "Carlos Mendoza", position: "Director general", area: "Administración", role: "Administrador", pin: "1234", phone: "55 4182 9050", email: "carlos@ferreteriademo.mx", startISO: "2019-03-01", status: "Activo", salary: 15000, frequency: "Mensual", socialSecurity: true, commissionRate: 0, monthlyGoal: 0, bank: "BBVA ···4021", emergencyContact: "Laura Mendoza · 55 1100 2233", notes: "" },
  { id: "COL-002", name: "Laura Gómez", position: "Gerente de sucursal", area: "Administración", role: "Gerente", pin: "5678", phone: "55 3011 8890", email: "laura@ferreteriademo.mx", startISO: "2021-06-15", status: "Activo", salary: 12000, frequency: "Mensual", socialSecurity: true, commissionRate: 0.5, monthlyGoal: 0, bank: "Santander ···7714", emergencyContact: "", notes: "Autoriza devoluciones y descuentos." },
  { id: "COL-003", pin: "2468", name: "Ana López", position: "Ejecutiva de ventas", area: "Ventas", role: "Vendedor", phone: "55 2290 1185", email: "ana@ferreteriademo.mx", startISO: "2022-01-10", status: "Activo", salary: 6500, frequency: "Quincenal", socialSecurity: true, commissionRate: 2, monthlyGoal: 180000, bank: "Banorte ···1132", emergencyContact: "", notes: "" },
  { id: "COL-004", pin: "1357", name: "Luis Ortega", position: "Jefe de almacén", area: "Almacén", role: "Almacenista", phone: "55 6620 4471", email: "", startISO: "2020-09-01", status: "Activo", salary: 2800, frequency: "Semanal", socialSecurity: true, commissionRate: 0, monthlyGoal: 0, bank: "BanCoppel ···8810", emergencyContact: "", notes: "" },
  { id: "COL-005", pin: "8642", name: "Mario Vega", position: "Auxiliar de almacén", area: "Almacén", role: "Almacenista", phone: "55 7781 0092", email: "", startISO: "2024-04-22", status: "Activo", salary: 2300, frequency: "Semanal", socialSecurity: false, commissionRate: 0, monthlyGoal: 0, bank: "Efectivo", emergencyContact: "", notes: "Sin seguro social (eventual)." },
  { id: "COL-006", pin: "9753", name: "Roberto García", position: "Chofer repartidor", area: "Reparto", role: "Chofer", phone: "55 4410 9823", email: "", startISO: "2021-02-01", status: "Activo", salary: 2600, frequency: "Semanal", socialSecurity: true, commissionRate: 0, monthlyGoal: 0, bank: "BBVA ···5530", emergencyContact: "", notes: "" },
  { id: "COL-007", pin: "3141", name: "Manuel Torres", position: "Chofer repartidor", area: "Reparto", role: "Chofer", phone: "55 8812 3304", email: "", startISO: "2023-07-17", status: "Activo", salary: 2500, frequency: "Semanal", socialSecurity: true, commissionRate: 0, monthlyGoal: 0, bank: "BBVA ···2219", emergencyContact: "", notes: "" },
  { id: "COL-008", name: "Jesús Hernández", position: "Chofer / ayudante", area: "Reparto", role: "Sin acceso", phone: "55 9021 4456", email: "", startISO: "2025-01-06", status: "Activo", salary: 2200, frequency: "Semanal", socialSecurity: false, commissionRate: 0, monthlyGoal: 0, bank: "Efectivo", emergencyContact: "", notes: "" },
];
export const initialAdvances: Advance[] = [{ id: "AD-001", collaboratorId: "COL-004", dateISO: "2026-11-09", amount: 1500, installments: 3, remaining: 1000, reason: "Adelanto por gastos médicos" }];

// ---------- Cálculos ----------

const round = (v: number) => Math.round(v * 100) / 100;
export const money = (v: number) => v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const MONTHS: Record<string, string> = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12" };
export const isoOf = (text?: string) => {
  const m = text?.match(/(\d{1,2}) (\w{3}) (\d{4})/);
  return m ? `${m[3]}-${MONTHS[m[2]] ?? "01"}-${m[1].padStart(2, "0")}` : "";
};
const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const lastDay = (iso: string) => {
  const d = new Date(`${iso.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
};
export const label = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
/** Mensual equivalente del sueldo */
export const monthlySalary = (c: Pick<Collaborator, "salary" | "frequency">) => (c.frequency === "Semanal" ? (c.salary * 52) / 12 : c.frequency === "Quincenal" ? c.salary * 2 : c.salary);
export const monthlyCost = (c: Collaborator, rate: number) => round(monthlySalary(c) * (1 + (c.socialSecurity ? rate : 0)));

export const periodOf = (frequency: PayFrequency, offset: 0 | -1) => {
  if (frequency === "Semanal") {
    const day = new Date(`${TODAY_ISO}T12:00:00`).getDay() || 7;
    const from = shift(TODAY_ISO, -(day - 1) + offset * 7);
    const to = shift(from, 6);
    return { from, to, label: `Semana ${label(from)} – ${label(to)}`, days: 7 };
  }
  if (frequency === "Quincenal") {
    const second = Number(TODAY_ISO.slice(8)) > 15;
    const month = TODAY_ISO.slice(0, 7);
    const current = second ? { from: `${month}-16`, to: lastDay(TODAY_ISO) } : { from: `${month}-01`, to: `${month}-15` };
    const prev = second ? { from: `${month}-01`, to: `${month}-15` } : { from: `${shift(`${month}-01`, -1).slice(0, 7)}-16`, to: shift(`${month}-01`, -1) };
    const p = offset === 0 ? current : prev;
    return { ...p, label: `Quincena ${label(p.from)} – ${label(p.to)}`, days: 15 };
  }
  const month = offset === 0 ? TODAY_ISO.slice(0, 7) : shift(`${TODAY_ISO.slice(0, 7)}-01`, -1).slice(0, 7);
  const from = `${month}-01`;
  const to = lastDay(from);
  return { from, to, label: `Mes de ${new Date(`${from}T12:00:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}`, days: 30 };
};

/** Comisión: % sobre ventas cobradas del vendedor en el periodo, menos devoluciones */
export const commissionOf = (c: Collaborator, sales: Sale[], returns: SaleReturn[], from: string, to: string) => {
  const mine = sales.filter((s) => s.seller === c.name && s.status !== "Cancelada" && isoOf(s.date) >= from && isoOf(s.date) <= to);
  const paid = mine.filter((s) => s.status === "Pagada");
  const pending = mine.filter((s) => s.status === "Pendiente");
  const paidIds = new Set(paid.map((s) => s.id));
  const returned = returns.filter((r) => paidIds.has(r.saleId)).reduce((sum, r) => sum + r.total, 0);
  const paidAmount = paid.reduce((sum, s) => sum + s.amount, 0);
  const base = Math.max(0, paidAmount - returned);
  return {
    tickets: mine.length,
    sold: round(mine.reduce((s, x) => s + x.amount, 0)),
    paidAmount: round(paidAmount),
    returned: round(returned),
    base: round(base),
    commission: round((base * c.commissionRate) / 100),
    pendingAmount: round(pending.reduce((s, x) => s + x.amount, 0)),
    pendingCommission: round((pending.reduce((s, x) => s + x.amount, 0) * c.commissionRate) / 100),
  };
};

export const buildPayroll = (
  list: Collaborator[],
  frequency: PayFrequency,
  period: { from: string; to: string; days: number },
  sales: Sale[],
  returns: SaleReturn[],
  advances: Advance[],
  rate: number,
  edits: Record<string, { bonus?: number; absences?: number }>,
): PayrollLine[] =>
  list
    .filter((c) => c.status === "Activo" && c.frequency === frequency)
    .map((c) => {
      const e = edits[c.id] ?? {};
      const absences = e.absences ?? 0;
      const absenceDiscount = round((c.salary / period.days) * absences);
      const commission = c.commissionRate ? commissionOf(c, sales, returns, period.from, period.to).commission : 0;
      const bonus = e.bonus ?? 0;
      const advance = round(
        advances.filter((a) => a.collaboratorId === c.id && a.remaining > 0).reduce((s, a) => s + Math.min(a.remaining, a.amount / a.installments), 0),
      );
      const taxable = c.salary - absenceDiscount;
      const socialCost = c.socialSecurity ? round(taxable * rate) : 0;
      return {
        collaboratorId: c.id,
        name: c.name,
        position: c.position,
        base: c.salary,
        absences,
        absenceDiscount,
        commission,
        bonus,
        advance,
        net: round(taxable + commission + bonus - advance),
        socialCost,
        employerCost: round(taxable + commission + bonus + socialCost),
      };
    });

const areaStyles: Record<Area, string> = {
  Ventas: "bg-[#e8f2ff] text-[#3973a8]",
  Caja: "bg-[#f0ecff] text-[#6b57a8]",
  Almacén: "bg-[#fff6df] text-[#9a6b18]",
  Reparto: "bg-[#eef7e0] text-[#4a6b12]",
  Administración: "bg-[#e3f1ee] text-[#2f7468]",
};
type Tab = "Colaboradores" | "Nómina" | "Comisiones" | "Préstamos";

export default function CollaboratorsModule({
  collaborators,
  advances,
  payrollRuns,
  socialRate,
  sales,
  returns,
  cashOpen,
  userName,
  onSaveCollaborator,
  onSaveAdvance,
  onPayPayroll,
  onSocialRate,
  onToast,
  roles = [],
  canPayroll = true,
}: {
  roles?: Role[];
  canPayroll?: boolean;
  collaborators: Collaborator[];
  advances: Advance[];
  payrollRuns: PayrollRun[];
  socialRate: number;
  sales: Sale[];
  returns: SaleReturn[];
  cashOpen: boolean;
  userName: string;
  onSaveCollaborator: (c: Collaborator) => void;
  onSaveAdvance: (a: Advance, cash: boolean) => void;
  onPayPayroll: (run: PayrollRun) => void;
  onSocialRate: (rate: number) => void;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("Colaboradores");
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [frequency, setFrequency] = useState<PayFrequency>("Semanal");
  const [offset, setOffset] = useState<0 | -1>(0);
  const [edits, setEdits] = useState<Record<string, { bonus?: number; absences?: number }>>({});
  const [payOpen, setPayOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [printRun, setPrintRun] = useState<PayrollRun | null>(null);
  const [commMonth, setCommMonth] = useState<0 | -1>(0);

  const active = collaborators.filter((c) => c.status === "Activo");
  const totalMonthly = active.reduce((s, c) => s + monthlyCost(c, socialRate), 0);
  const month = periodOf("Mensual", commMonth);
  const sellers = active.filter((c) => c.commissionRate > 0);
  const commissions = sellers.map((c) => ({ c, ...commissionOf(c, sales, returns, month.from, month.to) }));
  const monthComm = commissions.reduce((s, x) => s + x.commission, 0);
  const owed = advances.reduce((s, a) => s + a.remaining, 0);

  const period = periodOf(frequency, offset);
  const paidRun = payrollRuns.find((r) => r.frequency === frequency && r.fromISO === period.from);
  const lines = useMemo(
    () => paidRun?.lines ?? buildPayroll(collaborators, frequency, period, sales, returns, advances, socialRate, edits),
    [paidRun, collaborators, frequency, period.from, sales, returns, advances, socialRate, edits],
  );
  const sum = (key: keyof PayrollLine) => round(lines.reduce((s, l) => s + (l[key] as number), 0));

  const kpis = [
    { label: "Colaboradores activos", value: String(active.length), detail: `${active.filter((c) => c.role !== "Sin acceso").length} con acceso al sistema`, icon: Users, go: "Colaboradores" as Tab },
    { label: "Costo mensual de nómina", value: canPayroll ? money(totalMonthly) : "—", detail: `Sueldos + carga social (${Math.round(socialRate * 100)} %)`, icon: Landmark, go: "Nómina" as Tab },
    { label: "Comisiones del mes", value: money(monthComm), detail: `${money(commissions.reduce((s, x) => s + x.pendingCommission, 0))} pendientes de cobro`, icon: BadgeDollarSign, go: "Comisiones" as Tab },
    { label: "Préstamos por recuperar", value: money(owed), detail: `${advances.filter((a) => a.remaining > 0).length} activos`, icon: HandCoins, go: "Préstamos" as Tab },
  ];

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Administración <ChevronRight size={13} /> <span className="text-slate-700">Colaboradores</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Colaboradores</h1>
          <p className="mt-2 text-sm text-slate-500">Equipo, sueldos, nómina, comisiones y préstamos.</p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setRateOpen(true)} title="Carga social estimada">
            <Settings2 size={15} /> Carga social {Math.round(socialRate * 100)} %
          </button>
          <button
            className="primary-button"
            onClick={() =>
              setEditing({ id: nuevoId(`COL-${String(collaborators.length + 1).padStart(3, "0")}`), name: "", position: "", area: "Ventas", role: "Vendedor", phone: "", email: "", startISO: TODAY_ISO, status: "Activo", salary: 0, frequency: "Quincenal", socialSecurity: true, commissionRate: 0, monthlyGoal: 0, bank: "", emergencyContact: "", notes: "" })
            }
          >
            <Plus size={16} /> Nuevo colaborador
          </button>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label: l, value, detail, icon: Icon, go }) => (
          <button key={l} className="stat-card stat-card--link" onClick={() => setTab(go)}>
            <div className="flex items-start justify-between">
              <div className="stat-icon">
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <ArrowUpRight size={16} className="stat-go" />
            </div>
            <div className="mt-5">
              <p className="stat-label">{l}</p>
              <p className="stat-value">{value}</p>
              <p className="stat-detail mt-2 text-xs text-slate-400">{detail}</p>
            </div>
          </button>
        ))}
      </section>

      <nav className="mt-7 flex gap-1 border-b border-slate-200">
        {(["Colaboradores", "Nómina", "Comisiones", "Préstamos"] as Tab[]).filter((t) => canPayroll || t === "Colaboradores").map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative px-5 py-3 text-xs font-semibold transition ${tab === t ? "text-[#285e56]" : "text-slate-400 hover:text-slate-600"}`}>
            {t === "Préstamos" ? "Préstamos y adelantos" : t}
            {tab === t && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2f7468]" />}
          </button>
        ))}
      </nav>

      {tab === "Colaboradores" && (
        <section className="panel mt-6 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Colaborador</th>
                <th className="py-3.5">Área</th>
                <th className="py-3.5">Acceso al sistema</th>
                <th className="py-3.5 text-right">Sueldo</th>
                <th className="py-3.5 text-center">Seguro social</th>
                <th className="py-3.5 text-right">Comisión</th>
                <th className="py-3.5 text-right">Costo mensual</th>
                <th className="px-5 py-3.5 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collaborators.map((c) => (
                <tr key={c.id} className={`hover:bg-[#fafcfb] ${c.status === "Baja" ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[10px] font-bold text-[#2f7468]">
                        {c.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.position} · {idVisible(c.id)}
                          {c.status === "Baja" ? " · Baja" : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${areaStyles[c.area]}`}>{c.area}</span>
                  </td>
                  <td className="py-3.5 text-slate-600">
                    {c.role === NO_ACCESS_ROLE ? <span className="text-slate-300">Sin acceso</span> : c.role}
                    {c.pin && c.role !== NO_ACCESS_ROLE && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] text-[#2f7468]"><ShieldCheck size={10} /> PIN</span>}
                  </td>
                  <td className="py-3.5 text-right">
                    <p className="font-semibold">{canPayroll ? money(c.salary) : "•••"}</p>
                    <p className="text-[10px] text-slate-400">{c.frequency.toLowerCase()}</p>
                  </td>
                  <td className="py-3.5 text-center">{c.socialSecurity ? <Check size={14} className="mx-auto text-[#347652]" /> : <span className="text-[10px] text-slate-400">No</span>}</td>
                  <td className="py-3.5 text-right">{c.commissionRate ? `${c.commissionRate} %` : "—"}</td>
                  <td className="py-3.5 text-right font-semibold">{canPayroll ? money(monthlyCost(c, socialRate)) : "•••"}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]" onClick={() => setEditing(c)} title="Editar colaborador">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-[#fafcfb] text-xs font-semibold">
                <td className="px-5 py-3" colSpan={6}>
                  Costo mensual total de la plantilla activa
                </td>
                <td className="py-3 text-right">{canPayroll ? money(totalMonthly) : "•••"}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {tab === "Nómina" && (
        <>
          <section className="panel mt-6 flex flex-wrap items-center gap-4 p-4">
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {(["Semanal", "Quincenal", "Mensual"] as PayFrequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFrequency(f);
                    setEdits({});
                  }}
                  className={`rounded-lg px-4 py-2 ${frequency === f ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
                >
                  {f} <span className="opacity-60">{active.filter((c) => c.frequency === f).length}</span>
                </button>
              ))}
            </div>
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {([0, -1] as const).map((o) => (
                <button key={o} onClick={() => setOffset(o)} className={`rounded-lg px-3 py-2 ${offset === o ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}>
                  {o === 0 ? "Periodo actual" : "Periodo anterior"}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold">{period.label}</p>
            {paidRun ? (
              <span className="ml-auto flex items-center gap-2 rounded-lg bg-[#eaf6ef] px-3 py-1.5 text-[11px] font-semibold text-[#347652]">
                <Check size={13} /> Pagada {paidRun.paidAt} · {paidRun.method.toLowerCase()}
              </span>
            ) : (
              <button className="primary-button ml-auto disabled:opacity-40" disabled={lines.length === 0} onClick={() => setPayOpen(true)}>
                <Banknote size={15} /> Pagar nómina {money(sum("net"))}
              </button>
            )}
            {paidRun && (
              <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => setPrintRun(paidRun)}>
                <Printer size={14} /> Recibos
              </button>
            )}
          </section>
          <section className="panel mt-4 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="py-3 text-right">Sueldo</th>
                  <th className="py-3 text-center">Faltas</th>
                  <th className="py-3 text-right">Comisión</th>
                  <th className="py-3 text-right">Bono</th>
                  <th className="py-3 text-right">Préstamo</th>
                  <th className="py-3 text-right">Neto a pagar</th>
                  <th className="px-5 py-3 text-right">Costo empresa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l) => {
                  const c = collaborators.find((x) => x.id === l.collaboratorId);
                  return (
                    <tr key={l.collaboratorId}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{l.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {l.position} · {c?.socialSecurity ? "con seguro social" : "sin seguro social"}
                        </p>
                      </td>
                      <td className="py-3 text-right">{money(l.base)}</td>
                      <td className="py-3 text-center">
                        {paidRun ? (
                          l.absences || "—"
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={period.days}
                            value={edits[l.collaboratorId]?.absences ?? ""}
                            onChange={(e) => setEdits((v) => ({ ...v, [l.collaboratorId]: { ...v[l.collaboratorId], absences: Math.max(0, Number(e.target.value) || 0) } }))}
                            className="h-8 w-14 rounded-lg border border-slate-200 text-center outline-none focus:border-[#2f7468]"
                            placeholder="0"
                            aria-label={`Faltas de ${l.name}`}
                          />
                        )}
                        {l.absenceDiscount > 0 && <p className="text-[9px] text-[#c9664f]">−{money(l.absenceDiscount)}</p>}
                      </td>
                      <td className="py-3 text-right">{l.commission ? <span className="text-[#347652]">+{money(l.commission)}</span> : "—"}</td>
                      <td className="py-3 text-right">
                        {paidRun ? (
                          l.bonus ? money(l.bonus) : "—"
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={edits[l.collaboratorId]?.bonus ?? ""}
                            onChange={(e) => setEdits((v) => ({ ...v, [l.collaboratorId]: { ...v[l.collaboratorId], bonus: Math.max(0, Number(e.target.value) || 0) } }))}
                            className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-right outline-none focus:border-[#2f7468]"
                            placeholder="$0"
                            aria-label={`Bono de ${l.name}`}
                          />
                        )}
                      </td>
                      <td className="py-3 text-right">{l.advance ? <span className="text-[#c9664f]">−{money(l.advance)}</span> : "—"}</td>
                      <td className="py-3 text-right text-sm font-bold">{money(l.net)}</td>
                      <td className="px-5 py-3 text-right">
                        <p className="font-semibold">{money(l.employerCost)}</p>
                        {l.socialCost > 0 && <p className="text-[9px] text-slate-400">incl. carga social {money(l.socialCost)}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-[#fafcfb] text-xs font-bold">
                  <td className="px-5 py-3">{lines.length} colaboradores</td>
                  <td className="py-3 text-right">{money(sum("base"))}</td>
                  <td className="py-3 text-center text-[#c9664f]">{sum("absenceDiscount") ? `−${money(sum("absenceDiscount"))}` : ""}</td>
                  <td className="py-3 text-right">{money(sum("commission"))}</td>
                  <td className="py-3 text-right">{money(sum("bonus"))}</td>
                  <td className="py-3 text-right">−{money(sum("advance"))}</td>
                  <td className="py-3 text-right text-sm">{money(sum("net"))}</td>
                  <td className="px-5 py-3 text-right">{money(sum("employerCost"))}</td>
                </tr>
              </tfoot>
            </table>
            {lines.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-400">Nadie cobra con periodicidad {frequency.toLowerCase()}.</p>}
          </section>
          {payrollRuns.length > 0 && (
            <section className="panel mt-4 overflow-hidden">
              <div className="panel-header border-b border-slate-100">
                <div>
                  <p className="eyebrow">Historial</p>
                  <h2 className="panel-title">Nóminas pagadas</h2>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {payrollRuns.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3 text-xs">
                    <span className="flex-1 font-semibold">
                      {r.id} · {r.label}
                    </span>
                    <span className="text-slate-500">
                      {r.lines.length} personas · {r.method}
                    </span>
                    <span className="font-semibold">{money(r.lines.reduce((s, l) => s + l.net, 0))}</span>
                    <button className="link-button" onClick={() => setPrintRun(r)}>
                      <Printer size={13} /> Recibos
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {tab === "Comisiones" && (
        <>
          <section className="panel mt-6 flex flex-wrap items-center gap-4 p-4">
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {([0, -1] as const).map((o) => (
                <button key={o} onClick={() => setCommMonth(o)} className={`rounded-lg px-4 py-2 ${commMonth === o ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}>
                  {o === 0 ? "Este mes" : "Mes anterior"}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold">{month.label}</p>
            <p className="ml-auto max-w-md text-[11px] text-slate-500">
              La comisión se gana sobre ventas <strong>cobradas</strong> del vendedor, menos devoluciones. Las ventas por cobrar se muestran como comisión pendiente. Se paga junto con la nómina del vendedor.
            </p>
          </section>
          <section className="panel mt-4 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Vendedor</th>
                  <th className="py-3 text-right">Vendido</th>
                  <th className="py-3 text-right">Cobrado</th>
                  <th className="py-3 text-right">Devoluciones</th>
                  <th className="py-3 text-center">% comisión</th>
                  <th className="py-3 text-right">Comisión ganada</th>
                  <th className="py-3 text-right">Pendiente</th>
                  <th className="px-5 py-3">Meta del mes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active
                  .filter((c) => c.area === "Ventas" || c.commissionRate > 0)
                  .map((c) => {
                    const x = commissionOf(c, sales, returns, month.from, month.to);
                    const progress = c.monthlyGoal ? (x.sold / c.monthlyGoal) * 100 : 0;
                    return (
                      <tr key={c.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold">{c.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {x.tickets} ventas · {c.frequency.toLowerCase()}
                          </p>
                        </td>
                        <td className="py-3 text-right">{money(x.sold)}</td>
                        <td className="py-3 text-right">{money(x.paidAmount)}</td>
                        <td className="py-3 text-right text-[#c9664f]">{x.returned ? `−${money(x.returned)}` : "—"}</td>
                        <td className="py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={30}
                              step={0.1}
                              value={c.commissionRate}
                              onChange={(e) => onSaveCollaborator({ ...c, commissionRate: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })}
                              className="h-8 w-16 rounded-lg border border-slate-200 text-center font-semibold outline-none focus:border-[#2f7468]"
                              aria-label={`Porcentaje de comisión de ${c.name}`}
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm font-bold text-[#347652]">{money(x.commission)}</td>
                        <td className="py-3 text-right text-slate-500">{x.pendingCommission ? money(x.pendingCommission) : "—"}</td>
                        <td className="px-5 py-3">
                          {c.monthlyGoal ? (
                            <>
                              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-[#2f7468]" style={{ width: `${Math.min(100, progress)}%` }} />
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {progress.toFixed(0)}% de {money(c.monthlyGoal)}
                              </p>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-300">Sin meta</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === "Préstamos" && (
        <section className="panel mt-6 overflow-hidden">
          <div className="panel-header border-b border-slate-100">
            <div>
              <p className="eyebrow">Se descuentan solos en cada nómina</p>
              <h2 className="panel-title">Préstamos y adelantos</h2>
            </div>
            <button className="primary-button" onClick={() => setAdvanceOpen(true)}>
              <Plus size={15} /> Nuevo préstamo / adelanto
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {advances.map((a) => {
              const c = collaborators.find((x) => x.id === a.collaboratorId);
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 text-xs">
                  <span className="grid size-9 place-items-center rounded-xl bg-[#fff6df] text-[#9a6b18]">
                    <HandCoins size={15} />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {c?.name} · {money(a.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {a.id} · {label(a.dateISO)} · {a.reason} · {a.installments} descuentos de {money(a.amount / a.installments)} ({c?.frequency.toLowerCase()})
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[#2f7468]" style={{ width: `${((a.amount - a.remaining) / a.amount) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-slate-400">{a.remaining ? `Resta ${money(a.remaining)}` : "Liquidado"}</p>
                  </div>
                </div>
              );
            })}
            {advances.length === 0 && <p className="px-5 py-12 text-center text-xs text-slate-400">Sin préstamos registrados.</p>}
          </div>
        </section>
      )}

      {editing && (
        <CollaboratorModal
          roles={roles}
          canPayroll={canPayroll}
          collaborator={editing}
          socialRate={socialRate}
          isNew={!collaborators.some((c) => c.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            onSaveCollaborator(c);
            setEditing(null);
            onToast(`${c.name} guardado`);
          }}
        />
      )}
      {payOpen && (
        <PayModal
          total={sum("net")}
          label={period.label}
          cashOpen={cashOpen}
          onClose={() => setPayOpen(false)}
          onConfirm={(method) => {
            const run: PayrollRun = {
              id: `NOM-${period.from.replace(/-/g, "").slice(2)}-${frequency[0]}`,
              frequency,
              fromISO: period.from,
              toISO: period.to,
              label: period.label,
              lines,
              method,
              paidAt: `${label(TODAY_ISO)} ${TODAY_ISO.slice(0, 4)}`,
              paidBy: userName,
            };
            onPayPayroll(run);
            setPayOpen(false);
            setEdits({});
            setPrintRun(run);
          }}
        />
      )}
      {advanceOpen && (
        <AdvanceModal
          collaborators={active}
          cashOpen={cashOpen}
          onClose={() => setAdvanceOpen(false)}
          onSave={(a, cash) => {
            onSaveAdvance({ ...a, id: `AD-${String(advances.length + 1).padStart(3, "0")}` }, cash);
            setAdvanceOpen(false);
          }}
        />
      )}
      {rateOpen && (
        <RateModal
          rate={socialRate}
          onClose={() => setRateOpen(false)}
          onSave={(r) => {
            onSocialRate(r);
            setRateOpen(false);
            onToast(`Carga social estimada: ${Math.round(r * 100)} %`);
          }}
        />
      )}
      {printRun && <PayrollPrintView run={printRun} collaborators={collaborators} onClose={() => setPrintRun(null)} />}
    </>
  );
}

// ---------- Modales ----------
function Shell({ title, eyebrow, onClose, children, footer, wide }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
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

function CollaboratorModal({ collaborator, socialRate, isNew, onClose, onSave, roles, canPayroll }: { collaborator: Collaborator; socialRate: number; isNew: boolean; onClose: () => void; onSave: (c: Collaborator) => void; roles: Role[]; canPayroll: boolean }) {
  const [f, setF] = useState(collaborator);
  const set = <K extends keyof Collaborator>(k: K, v: Collaborator[K]) => setF((x) => ({ ...x, [k]: v }));
  const canAuthorize = can(roles, f.role, "ventas.autorizar");
  const valid = f.name.trim() && f.position.trim() && (f.salary > 0 || !canPayroll) && (!f.pin || /^\d{4}$/.test(f.pin));
  return (
    <Shell
      wide
      eyebrow={isNew ? "Alta de colaborador" : f.id}
      title={isNew ? "Nuevo colaborador" : f.name}
      onClose={onClose}
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={f.status === "Activo"} onChange={(e) => set("status", e.target.checked ? "Activo" : "Baja")} className="accent-[#2f7468]" />
            Activo (desmarca para darlo de baja)
          </label>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button disabled:opacity-40" disabled={!valid} onClick={() => onSave({ ...f, name: f.name.trim() })}>
            <Check size={15} /> Guardar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <IdCard size={14} className="text-[#2f7468]" /> Datos generales
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-label">
              Nombre completo *
              <input value={f.name} onChange={(e) => set("name", e.target.value)} className="form-input" />
            </label>
            <label className="form-label">
              Puesto *
              <input value={f.position} onChange={(e) => set("position", e.target.value)} className="form-input" placeholder="Ej. Vendedor de mostrador" />
            </label>
            <label className="form-label">
              Área
              <select value={f.area} onChange={(e) => set("area", e.target.value as Area)} className="form-input">
                {(["Ventas", "Caja", "Almacén", "Reparto", "Administración"] as Area[]).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Fecha de ingreso
              <input type="date" value={f.startISO} onChange={(e) => set("startISO", e.target.value)} className="form-input" />
            </label>
            <label className="form-label">
              Teléfono
              <input value={f.phone} onChange={(e) => set("phone", e.target.value)} className="form-input" />
            </label>
            <label className="form-label">
              Contacto de emergencia
              <input value={f.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className="form-input" placeholder="Nombre · teléfono" />
            </label>
          </div>
        </div>
        {canPayroll && <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Landmark size={14} className="text-[#2f7468]" /> Sueldo
          </p>
          <div className="grid grid-cols-3 gap-3">
            <label className="form-label">
              Sueldo por periodo *
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                <input type="number" min={0} value={f.salary || ""} onChange={(e) => set("salary", Number(e.target.value) || 0)} className="form-input pl-6 font-semibold" />
              </div>
            </label>
            <label className="form-label">
              Periodicidad
              <select value={f.frequency} onChange={(e) => set("frequency", e.target.value as PayFrequency)} className="form-input">
                <option>Semanal</option>
                <option>Quincenal</option>
                <option>Mensual</option>
              </select>
            </label>
            <label className="form-label">
              Cuenta / forma de pago
              <input value={f.bank} onChange={(e) => set("bank", e.target.value)} className="form-input" placeholder="Banco ···1234 o Efectivo" />
            </label>
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-xs">
            <span>
              <strong>Tiene seguro social</strong>
              <span className="block text-[10px] text-slate-400">Si no tiene, se ignora la carga social ({Math.round(socialRate * 100)} %) en su costo.</span>
            </span>
            <input type="checkbox" checked={f.socialSecurity} onChange={(e) => set("socialSecurity", e.target.checked)} className="size-4 accent-[#2f7468]" />
          </label>
          <p className="mt-2 text-[11px] text-slate-500">
            Mensual equivalente {money(monthlySalary(f))} · costo para la empresa <strong>{money(monthlySalary(f) * (1 + (f.socialSecurity ? socialRate : 0)))}</strong> al mes
          </p>
        </div>}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Target size={14} className="text-[#2f7468]" /> Comisión y meta
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-label">
                % sobre ventas
                <div className="relative">
                  <input type="number" min={0} max={30} step={0.1} value={f.commissionRate || ""} onChange={(e) => set("commissionRate", Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className="form-input pr-7 font-semibold" placeholder="0" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </label>
              <label className="form-label">
                Meta mensual
                <input type="number" min={0} value={f.monthlyGoal || ""} onChange={(e) => set("monthlyGoal", Number(e.target.value) || 0)} className="form-input" placeholder="$0" />
              </label>
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Briefcase size={14} className="text-[#2f7468]" /> Acceso al sistema
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="form-label">
                Rol
                <select value={f.role} onChange={(e) => set("role", e.target.value as SystemRole)} className="form-input">
                  {roles.map((r) => (
                    <option key={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>
              {f.role !== NO_ACCESS_ROLE && (
                <label className="form-label">
                  PIN de acceso
                  <input inputMode="numeric" maxLength={4} value={f.pin ?? ""} onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))} className="form-input tracking-[0.3em]" placeholder="4 dígitos" />
                </label>
              )}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              Su <strong>correo</strong> es su usuario para entrar con contraseña; el <strong>PIN</strong> sirve para el cambio rápido de usuario y para desbloquear.
              {canAuthorize ? " Con este rol, su PIN también autoriza devoluciones y descuentos." : ""} Los permisos se configuran en Configuración → Roles y permisos.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function PayModal({ total, label: l, cashOpen, onClose, onConfirm }: { total: number; label: string; cashOpen: boolean; onClose: () => void; onConfirm: (m: "Transferencia" | "Efectivo") => void }) {
  const [method, setMethod] = useState<"Transferencia" | "Efectivo">("Transferencia");
  return (
    <Shell
      eyebrow="Pagar nómina"
      title={money(total)}
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button disabled:opacity-40" disabled={method === "Efectivo" && !cashOpen} onClick={() => onConfirm(method)}>
            <Check size={15} /> Confirmar pago
          </button>
        </>
      }
    >
      <p className="text-xs text-slate-500">{l}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["Transferencia", "Efectivo"] as const).map((m) => (
          <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border px-3 py-3 text-xs font-semibold ${method === m ? "border-[#2f7468] bg-[#edf4f2] text-[#285e56]" : "border-slate-200 text-slate-500"}`}>
            {m}
          </button>
        ))}
      </div>
      {method === "Efectivo" && (
        <p className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-[11px] ${cashOpen ? "bg-[#fff6df] text-[#8a651e]" : "bg-[#fff0eb] text-[#c9664f]"}`}>
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {cashOpen ? "Se registra como salida de efectivo en el corte de caja del turno." : "Abre la caja para pagar en efectivo."}
        </p>
      )}
      <p className="mt-3 text-[11px] text-slate-500">Los préstamos descontados se abonan y se generan los recibos de cada colaborador.</p>
    </Shell>
  );
}

function AdvanceModal({ collaborators, cashOpen, onClose, onSave }: { collaborators: Collaborator[]; cashOpen: boolean; onClose: () => void; onSave: (a: Advance, cash: boolean) => void }) {
  const [collaboratorId, setCollaboratorId] = useState(collaborators[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("2");
  const [reason, setReason] = useState("");
  const [cash, setCash] = useState(cashOpen);
  const value = Number(amount) || 0;
  const n = Math.max(1, Number(installments) || 1);
  const c = collaborators.find((x) => x.id === collaboratorId);
  return (
    <Shell
      eyebrow="Préstamo o adelanto"
      title="Nuevo préstamo"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button disabled:opacity-40"
            disabled={!c || value <= 0 || !reason.trim() || (cash && !cashOpen)}
            onClick={() => onSave({ id: "", collaboratorId, dateISO: TODAY_ISO, amount: value, installments: n, remaining: value, reason: reason.trim() }, cash)}
          >
            <Check size={15} /> Registrar
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="form-label">
          Colaborador
          <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="form-input">
            {collaborators.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {x.frequency.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="form-label">
            Monto
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="form-input font-semibold" placeholder="$0.00" />
          </label>
          <label className="form-label">
            Número de descuentos
            <input type="number" min={1} value={installments} onChange={(e) => setInstallments(e.target.value)} className="form-input" />
          </label>
        </div>
        <label className="form-label">
          Motivo
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="form-input" placeholder="Ej. Adelanto de sueldo" />
        </label>
        {value > 0 && c && (
          <p className="text-[11px] text-slate-500">
            Se descontarán {money(value / n)} en cada nómina {c.frequency.toLowerCase()} durante {n} {n === 1 ? "periodo" : "periodos"}.
          </p>
        )}
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="accent-[#2f7468]" />
          Se entrega en efectivo de la caja {cashOpen ? "" : "(caja cerrada)"}
        </label>
      </div>
    </Shell>
  );
}

function RateModal({ rate, onClose, onSave }: { rate: number; onClose: () => void; onSave: (r: number) => void }) {
  const [value, setValue] = useState(String(Math.round(rate * 100)));
  return (
    <Shell
      eyebrow="Costo de nómina"
      title="Carga social estimada"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" onClick={() => onSave(Math.max(0, Math.min(80, Number(value) || 0)) / 100)}>
            Guardar
          </button>
        </>
      }
    >
      <label className="form-label">
        % sobre el sueldo
        <div className="relative">
          <input type="number" min={0} max={80} value={value} onChange={(e) => setValue(e.target.value)} className="form-input pr-8 text-lg font-bold" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
        </div>
      </label>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Estimado de cuotas IMSS, Infonavit e impuesto sobre nómina. Solo se aplica a colaboradores marcados con seguro social. Pide a tu contador el porcentaje real de tu empresa.
      </p>
    </Shell>
  );
}
