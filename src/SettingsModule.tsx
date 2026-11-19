import { useState } from "react";
import { RolesSettings, type Role } from "./RolesModule";
import { initialCompany, initialPolicies, initialsOf, type CompanyConfig, type Policies } from "./config";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  KeyRound,
  MapPin,
  Package,
  Plus,
  Printer,
  ReceiptText,
  Route,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type SettingsSection =
  | "Empresa"
  | "Políticas"
  | "Usuarios"
  | "Roles y permisos"
  | "Ventas y POS"
  | "Inventario"
  | "Documentos"
  | "Rutas"
  | "Notificaciones"
  | "Seguridad";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Ventas" | "Almacén" | "Chofer";
  branch: string;
  active: boolean;
};

type CompanyValues = CompanyConfig;

const sections: { name: SettingsSection; description: string; icon: typeof Store }[] = [
  { name: "Empresa", description: "Identidad y sucursales", icon: Building2 },
  { name: "Políticas", description: "Apartados, devoluciones, kits…", icon: ClipboardList },
  { name: "Usuarios", description: "Quién entra al sistema", icon: Users },
  { name: "Roles y permisos", description: "Qué puede hacer cada rol", icon: ShieldCheck },
  { name: "Ventas y POS", description: "Caja, precios y cobros", icon: ShoppingCart },
  { name: "Inventario", description: "Unidades y existencias", icon: Package },
  { name: "Documentos", description: "Folios y formatos", icon: FileText },
  { name: "Rutas", description: "Logística y viáticos", icon: Route },
  { name: "Notificaciones", description: "Alertas del sistema", icon: Bell },
  { name: "Seguridad", description: "Acceso y auditoría", icon: ShieldCheck },
];

const initialUsers: AppUser[] = [
  {
    id: "USR-01",
    name: "Carlos Mendoza",
    email: "carlos@aquaplus.mx",
    role: "Administrador",
    branch: "Sucursal principal",
    active: true,
  },
  {
    id: "USR-02",
    name: "Ana López",
    email: "ana@aquaplus.mx",
    role: "Ventas",
    branch: "Sucursal principal",
    active: true,
  },
  {
    id: "USR-03",
    name: "Luis Ortega",
    email: "luis@aquaplus.mx",
    role: "Almacén",
    branch: "Sucursal principal",
    active: true,
  },
  {
    id: "USR-04",
    name: "Roberto García",
    email: "roberto@aquaplus.mx",
    role: "Chofer",
    branch: "Sucursal principal",
    active: true,
  },
];

export type AccessProps = {
  roles: Role[];
  usage: Record<string, string[]>;
  people: { id: string; name: string; position: string; role: string; status: string }[];
  canManageRoles: boolean;
  onChangeRole: (id: string, role: string) => void;
  onSaveRole: (role: Role, previousName?: string) => void;
  onDeleteRole: (role: Role) => void;
  onGoCollaborators: () => void;
};

export type BusinessProps = {
  company: CompanyConfig;
  policies: Policies;
  onSave: (company: CompanyConfig, policies: Policies) => void;
};

export default function SettingsModule({
  onToast,
  access,
  initialSection,
  business,
}: {
  onToast: (message: string) => void;
  access?: AccessProps;
  initialSection?: string;
  business?: BusinessProps;
}) {
  const [section, setSection] = useState<SettingsSection>((initialSection as SettingsSection) || "Empresa");
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [userOpen, setUserOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [company, setCompany] = useState<CompanyValues>(business?.company ?? initialCompany);
  const [policyDraft, setPolicyDraft] = useState<Policies>(business?.policies ?? initialPolicies);

  const [pos, setPos] = useState({
    defaultPrice: "Mostrador",
    tax: "16",
    maxDiscount: "10",
    ticketFooter: "Gracias por su compra. Conserve su ticket.",
    cashDrawer: true,
    allowNegativeStock: false,
    requireCustomer: false,
    autoPrint: true,
  });
  const [inventory, setInventory] = useState({
    valuation: "Costo promedio",
    defaultUnit: "pieza",
    reservationMinutes: "30",
    lowStock: true,
    requireLocation: true,
    allowFractions: true,
    requireAdjustmentReason: true,
  });
  const [documents, setDocuments] = useState({
    quotePrefix: "C",
    quoteNext: "301",
    salePrefix: "V",
    saleNext: "1848",
    orderPrefix: "OS",
    orderNext: "0832",
    quoteValidity: "7",
    showPricesOnPicking: false,
    showLocationOnPicking: true,
    legalTerms: "Precios sujetos a cambio sin previo aviso. Existencias sujetas a disponibilidad.",
  });
  const [routeSettings, setRouteSettings] = useState({
    firstDeparture: "08:30",
    maxStops: "12",
    maxViatics: "1500",
    groupingRadius: "8",
    requireProof: true,
    requireSignature: true,
    allowPartialDelivery: false,
    optimizeByZone: true,
  });
  const [notifications, setNotifications] = useState({
    lowStock: true,
    missingOrder: true,
    quoteExpiry: true,
    overdueBalance: true,
    routeDelay: true,
    emailSummary: false,
    browserAlerts: true,
  });
  const [security, setSecurity] = useState({
    sessionMinutes: "120",
    passwordDays: "90",
    twoFactorAdmin: false,
    logChanges: true,
    approvalDiscount: true,
    approvalCancellation: true,
  });

  const update =
    <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>) =>
    <K extends keyof T>(field: K, value: T[K]) => {
      setter((current) => ({ ...current, [field]: value }));
      setDirty(true);
    };

  const save = () => {
    if (!company.commercialName.trim()) return onToast("Escribe el nombre comercial de la empresa");
    business?.onSave(company, policyDraft);
    setDirty(false);
    onToast("Configuración guardada · los documentos y reglas ya usan los nuevos datos");
  };

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Administración <ChevronRight size={13} />{" "}
            <span className="text-slate-700">Configuración</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">
            Configuración
          </h1>
          <p className="mt-2 text-sm text-slate-500">Define cómo opera 99 ERP en tu empresa.</p>
        </div>
        <button
          className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!dirty}
          onClick={save}
        >
          <Save size={16} /> Guardar cambios
        </button>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgba(30,61,55,0.035)] lg:sticky lg:top-24">
          {sections.filter(({ name }) => name !== "Roles y permisos" || !access || access.canManageRoles).map(({ name, description, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setSection(name)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                section === name ? "bg-[#edf4f2] text-[#285e56]" : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                  section === name ? "bg-white text-[#2f7468]" : "bg-slate-100 text-slate-400"
                }`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{name}</span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                  {description}
                </span>
              </span>
              {section === name && <ChevronRight size={14} />}
            </button>
          ))}
        </aside>

        <div className="min-w-0">
          {section === "Empresa" && (
            <CompanySettings
              company={company}
              update={update(setCompany)}
              onDirty={() => setDirty(true)}
              onToast={onToast}
            />
          )}
          {section === "Políticas" && <PoliciesSettings values={policyDraft} update={update(setPolicyDraft)} />}
          {section === "Roles y permisos" && access && (
            <RolesSettings roles={access.roles} usage={access.usage} onSave={access.onSaveRole} onDelete={access.onDeleteRole} onToast={onToast} />
          )}
          {section === "Usuarios" && access && (
            <section className="panel overflow-hidden">
              <div className="panel-header border-b border-slate-100">
                <div>
                  <p className="eyebrow">Equipo</p>
                  <h2 className="panel-title">Usuarios del sistema</h2>
                  <p className="mt-1 text-xs text-slate-400">Cada colaborador entra con el rol que tenga asignado. Las altas y bajas se hacen en Colaboradores.</p>
                </div>
                <button className="secondary-button bg-white" onClick={access.onGoCollaborators}>
                  Ir a Colaboradores
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {access.people.map((person) => (
                  <div key={person.id} className={`flex items-center gap-3 px-5 py-3 text-xs ${person.status !== "Activo" ? "opacity-50" : ""}`}>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[10px] font-bold text-[#2f7468]">
                      {person.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {person.position}
                        {person.status !== "Activo" ? " · baja" : ""}
                      </p>
                    </div>
                    <select
                      value={person.role}
                      disabled={!access.canManageRoles}
                      onChange={(e) => {
                        access.onChangeRole(person.id, e.target.value);
                        onToast(`${person.name}: rol ${e.target.value}`);
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold outline-none disabled:opacity-60"
                      aria-label={`Rol de ${person.name}`}
                    >
                      {access.roles.map((r) => (
                        <option key={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}
          {section === "Usuarios" && !access && (
            <UsersSettings
              users={users}
              setUsers={(next) => {
                setUsers(next);
                setDirty(true);
              }}
              onAdd={() => setUserOpen(true)}
            />
          )}
          {section === "Ventas y POS" && (
            <PosSettings values={pos} update={update(setPos)} onToast={onToast} />
          )}
          {section === "Inventario" && (
            <InventorySettings values={inventory} update={update(setInventory)} />
          )}
          {section === "Documentos" && (
            <DocumentsSettings values={documents} update={update(setDocuments)} />
          )}
          {section === "Rutas" && (
            <RoutesSettings values={routeSettings} update={update(setRouteSettings)} />
          )}
          {section === "Notificaciones" && (
            <NotificationSettings values={notifications} update={update(setNotifications)} />
          )}
          {section === "Seguridad" && (
            <SecuritySettings values={security} update={update(setSecurity)} onToast={onToast} />
          )}
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-[#183b36] px-4 py-3 text-xs text-white shadow-2xl">
          <span className="size-2 rounded-full bg-[#b8f34a]" />
          <span className="hidden sm:inline">Tienes cambios sin guardar</span>
          <button
            className="rounded-lg bg-white px-3 py-1.5 font-semibold text-[#183b36]"
            onClick={save}
          >
            Guardar
          </button>
        </div>
      )}

      {userOpen && (
        <NewUserModal
          users={users}
          onClose={() => setUserOpen(false)}
          onCreate={(user) => {
            setUsers((items) => [...items, user]);
            setUserOpen(false);
            setDirty(true);
            onToast(`Invitación enviada a ${user.email}`);
          }}
        />
      )}
    </>
  );
}

function SettingsCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function CompanySettings({
  company,
  update,
  onDirty,
  onToast,
}: {
  company: CompanyValues;
  update: <K extends keyof CompanyValues>(field: K, value: CompanyValues[K]) => void;
  onDirty: () => void;
  onToast: (message: string) => void;
}) {
  const pickLogo = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) return onToast("Usa una imagen PNG, JPG, SVG o WEBP");
    if (file.size > 2 * 1024 * 1024) return onToast("El logotipo debe pesar menos de 2 MB");
    const reader = new FileReader();
    reader.onload = () => {
      update("logo", String(reader.result));
      onDirty();
    };
    reader.readAsDataURL(file);
  };
  const rfcOk = !company.rfc || /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(company.rfc);
  return (
    <div className="space-y-5">
      <SettingsCard eyebrow="Identidad" title="Empresa" description="Estos datos aparecen en cotizaciones, notas, tickets, órdenes de compra y reportes impresos.">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          {company.logo ? (
            <img src={company.logo} alt="Logotipo" className="size-20 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1" />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[#183b36] text-xl font-black text-[#b8f34a]">{initialsOf(company.commercialName)}</span>
          )}
          <div>
            <p className="text-sm font-semibold">Logotipo de la empresa</p>
            <p className="mt-1 text-xs text-slate-400">PNG, JPG, SVG o WEBP, máximo 2 MB. Sin logotipo se usan las iniciales.</p>
            <div className="mt-3 flex gap-2">
              <label className="secondary-button inline-flex min-h-9 cursor-pointer items-center">
                {company.logo ? "Cambiar logotipo" : "Subir logotipo"}
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" aria-label="Subir logotipo" onChange={(e) => pickLogo(e.target.files?.[0])} />
              </label>
              {company.logo && (
                <button className="min-h-9 px-3 text-xs font-semibold text-[#c9664f]" onClick={() => update("logo", "")}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre comercial" value={company.commercialName} onChange={(v) => update("commercialName", v)} />
          <TextField label="Razón social" value={company.legalName} onChange={(v) => update("legalName", v)} />
          <label className="form-label">
            RFC
            <input value={company.rfc} onChange={(e) => update("rfc", e.target.value.toUpperCase().trim())} className={`form-input ${rfcOk ? "" : "border-[#e5785f]"}`} maxLength={13} />
            {!rfcOk && <span className="text-[10px] font-normal text-[#c9664f]">El RFC debe tener 12 caracteres (moral) o 13 (física).</span>}
          </label>
          <SelectField
            label="Régimen fiscal"
            value={company.taxRegime}
            onChange={(v) => update("taxRegime", v)}
            options={[
              "601 · General de Ley Personas Morales",
              "603 · Personas Morales con Fines no Lucrativos",
              "612 · Personas Físicas con Actividades Empresariales y Profesionales",
              "621 · Incorporación Fiscal",
              "626 · Régimen Simplificado de Confianza",
            ]}
          />
          <TextField label="Teléfono" value={company.phone} onChange={(v) => update("phone", v)} />
          <TextField label="Correo de contacto" value={company.email} onChange={(v) => update("email", v)} type="email" />
          <TextField label="Sitio web" value={company.website} onChange={(v) => update("website", v)} />
        </div>
      </SettingsCard>

      <SettingsCard eyebrow="Operación" title="Sucursal y almacén" description="Domicilio que aparece en los documentos impresos.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nombre de sucursal" value={company.branch} onChange={(v) => update("branch", v)} />
          <TextField label="Nombre de almacén" value={company.warehouse} onChange={(v) => update("warehouse", v)} />
          <div className="sm:col-span-2">
            <TextField label="Calle, número y colonia" value={company.street} onChange={(v) => update("street", v)} />
          </div>
          <TextField label="Ciudad o municipio" value={company.city} onChange={(v) => update("city", v)} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Estado" value={company.state} onChange={(v) => update("state", v)} />
            <TextField label="Código postal" value={company.postalCode} onChange={(v) => update("postalCode", v.replace(/\D/g, "").slice(0, 5))} />
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-[#f6f8f7] p-4 text-[11px] text-slate-500">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Así se ve en tus documentos</p>
          <div className="flex items-start gap-3">
            {company.logo ? (
              <img src={company.logo} alt="" className="size-11 rounded-lg bg-white object-contain" />
            ) : (
              <span className="grid size-11 place-items-center rounded-lg bg-[#183b36] text-sm font-black text-[#b8f34a]">{initialsOf(company.commercialName)}</span>
            )}
            <div>
              <p className="text-sm font-bold text-[#162523]">{company.commercialName || "Nombre comercial"}</p>
              <p>{company.legalName}</p>
              <p>RFC {company.rfc}</p>
              <p>{[company.street, company.city, company.postalCode && `C.P. ${company.postalCode}`].filter(Boolean).join(", ")}</p>
              <p>
                Tel. {company.phone} · {company.email}
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

function PolicyNumber({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="form-label">
      {label}
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Math.max(min, max !== undefined ? Math.min(max, n) : n));
          }}
          className="form-input pr-16 text-right font-semibold"
          aria-label={label}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>
      </div>
      {hint && <span className="text-[10px] font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

function PoliciesSettings({ values, update }: { values: Policies; update: <K extends keyof Policies>(field: K, value: Policies[K]) => void }) {
  const money = (v: number) => v.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const example = 2000;
  return (
    <div className="space-y-5">
      <section className="flex items-start gap-3 rounded-xl border border-[#cfe3dd] bg-[#f3f8f6] p-4 text-xs text-slate-600">
        <ClipboardList size={16} className="mt-0.5 shrink-0 text-[#2f7468]" />
        <p>
          Estas reglas las aplica todo el sistema: punto de venta, apartados, pedidos especiales, devoluciones, kits, cotizaciones y los textos de los documentos impresos. Al guardar, los cambios aplican a las operaciones nuevas; las que ya existen conservan sus fechas.
        </p>
      </section>
      <SettingsCard eyebrow="Ventas" title="Apartados" description="Material que el cliente deja apartado y paga en abonos.">
        <div className="grid gap-4 sm:grid-cols-3">
          <PolicyNumber label="Pago mínimo para apartar" value={values.layawayMinPct} onChange={(v) => update("layawayMinPct", v)} suffix="%" min={1} max={100} />
          <PolicyNumber label="Plazo para liquidar" value={values.layawayDays} onChange={(v) => update("layawayDays", v)} suffix="días" min={1} max={365} />
          <PolicyNumber label="Prórroga" value={values.layawayExtensionDays} onChange={(v) => update("layawayExtensionDays", v)} suffix="días" min={0} max={180} />
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          Ejemplo: un apartado de {money(example)} pide al menos {money((example * values.layawayMinPct) / 100)} y vence en {values.layawayDays} días. Si se cancela o vence, el dinero queda como saldo a favor del cliente.
        </p>
      </SettingsCard>
      <SettingsCard eyebrow="Ventas" title="Pedidos especiales" description="Productos que se piden al proveedor para un cliente.">
        <div className="grid gap-4 sm:grid-cols-3">
          <PolicyNumber label="Anticipo mínimo" value={values.specialDepositPct} onChange={(v) => update("specialDepositPct", v)} suffix="%" min={0} max={100} />
          <PolicyNumber label="Días para recoger" value={values.specialPickupDays} onChange={(v) => update("specialPickupDays", v)} suffix="días" min={1} max={90} hint="Se cuentan desde el aviso al cliente" />
        </div>
        <p className="mt-4 text-[11px] text-slate-500">
          Ejemplo: un pedido de {money(example)} pide al menos {money((example * values.specialDepositPct) / 100)} de anticipo, que no se devuelve si el cliente cancela.
        </p>
      </SettingsCard>
      <SettingsCard eyebrow="Ventas" title="Devoluciones" description="Fuera de estas reglas, la devolución pide la autorización de un supervisor con su PIN.">
        <div className="grid gap-4 sm:grid-cols-3">
          <PolicyNumber label="Plazo para devolver" value={values.returnDays} onChange={(v) => update("returnDays", v)} suffix="días" min={0} max={365} />
          <PolicyNumber label="Autorizar a partir de" value={values.returnAuthLimit} onChange={(v) => update("returnAuthLimit", v)} suffix="MXN" min={0} />
        </div>
      </SettingsCard>
      <SettingsCard eyebrow="Inventario" title="Kits" description="Cómo se calcula el precio sugerido de un kit.">
        <div className="grid gap-4 sm:grid-cols-3">
          <PolicyNumber label="Descuento vs. piezas sueltas" value={values.kitDiscountPct} onChange={(v) => update("kitDiscountPct", v)} suffix="%" min={0} max={90} />
          <PolicyNumber label="Margen mínimo" value={values.kitMinMarginPct} onChange={(v) => update("kitMinMarginPct", v)} suffix="%" min={0} max={90} />
        </div>
      </SettingsCard>
      <SettingsCard eyebrow="Ventas" title="Cotizaciones">
        <div className="grid gap-4 sm:grid-cols-3">
          <PolicyNumber label="Vigencia predeterminada" value={values.quoteValidityDays} onChange={(v) => update("quoteValidityDays", v)} suffix="días" min={1} max={90} />
        </div>
      </SettingsCard>
    </div>
  );
}

function UsersSettings({
  users,
  setUsers,
  onAdd,
}: {
  users: AppUser[];
  setUsers: (users: AppUser[]) => void;
  onAdd: () => void;
}) {
  const permissions = [
    ["Administrador", true, true, true, true, true],
    ["Ventas", true, true, false, false, false],
    ["Almacén", false, false, true, true, false],
    ["Chofer", false, false, false, true, false],
  ];
  return (
    <div className="space-y-5">
      <SettingsCard
        eyebrow="Equipo"
        title="Usuarios"
        description="Administra quién puede acceder a 99 ERP."
      >
        <div className="mb-4 flex justify-end">
          <button className="primary-button" onClick={onAdd}>
            <UserPlus size={16} /> Invitar usuario
          </button>
        </div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-xs font-bold text-[#2f7468]">
                {user.name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{user.name}</p>
                <p className="mt-1 truncate text-[10px] text-slate-400">{user.email}</p>
              </div>
              <select
                value={user.role}
                onChange={(event) =>
                  setUsers(
                    users.map((item) =>
                      item.id === user.id
                        ? { ...item, role: event.target.value as AppUser["role"] }
                        : item,
                    ),
                  )
                }
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold outline-none"
              >
                <option>Administrador</option>
                <option>Ventas</option>
                <option>Almacén</option>
                <option>Chofer</option>
              </select>
              <Toggle
                checked={user.active}
                onChange={(active) =>
                  setUsers(users.map((item) => (item.id === user.id ? { ...item, active } : item)))
                }
                label=""
                compact
              />
              <button
                className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-[#fff0eb] hover:text-[#c9664f]"
                onClick={() => setUsers(users.filter((item) => item.id !== user.id))}
                aria-label={`Eliminar ${user.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        eyebrow="Control de acceso"
        title="Permisos por rol"
        description="Resumen de los módulos disponibles para cada perfil."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-3">Rol</th>
                {["Ventas", "Costos", "Inventario", "Órdenes", "Configuración"].map((item) => (
                  <th key={item} className="pb-3 text-center">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map(([role, ...values]) => (
                <tr key={String(role)} className="border-t border-slate-100">
                  <td className="py-3 font-semibold">{role}</td>
                  {values.map((allowed, index) => (
                    <td key={index} className="py-3 text-center">
                      {allowed ? (
                        <Check size={14} className="mx-auto text-[#347652]" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </div>
  );
}

function PosSettings({
  values,
  update,
  onToast,
}: {
  values: {
    defaultPrice: string;
    tax: string;
    maxDiscount: string;
    ticketFooter: string;
    cashDrawer: boolean;
    allowNegativeStock: boolean;
    requireCustomer: boolean;
    autoPrint: boolean;
  };
  update: <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => void;
  onToast: (message: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        eyebrow="Punto de venta"
        title="Reglas comerciales"
        description="Valores predeterminados para ventas de mostrador."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Lista de precios"
            value={values.defaultPrice}
            onChange={(v) => update("defaultPrice", v)}
            options={["Mostrador", "Mayoreo", "Contratista"]}
          />
          <TextField
            label="IVA predeterminado (%)"
            value={values.tax}
            onChange={(v) => update("tax", v)}
            type="number"
          />
          <TextField
            label="Descuento máximo sin autorización (%)"
            value={values.maxDiscount}
            onChange={(v) => update("maxDiscount", v)}
            type="number"
          />
        </div>
        <div className="mt-5 space-y-1">
          <Toggle
            checked={values.allowNegativeStock}
            onChange={(v) => update("allowNegativeStock", v)}
            label="Permitir vender sin existencia"
            description="No recomendado: puede generar inventario negativo."
          />
          <Toggle
            checked={values.requireCustomer}
            onChange={(v) => update("requireCustomer", v)}
            label="Solicitar cliente en cada venta"
            description="Impide cobrar hasta seleccionar un cliente."
          />
        </div>
      </SettingsCard>
      <SettingsCard
        eyebrow="Caja"
        title="Impresión y periféricos"
        description="Comportamiento del equipo en el punto de venta."
      >
        <div className="space-y-1">
          <Toggle
            checked={values.cashDrawer}
            onChange={(v) => update("cashDrawer", v)}
            label="Abrir cajón al completar el cobro"
          />
          <Toggle
            checked={values.autoPrint}
            onChange={(v) => update("autoPrint", v)}
            label="Imprimir ticket automáticamente"
          />
        </div>
        <label className="form-label mt-5">
          Texto al pie del ticket
          <textarea
            value={values.ticketFooter}
            onChange={(e) => update("ticketFooter", e.target.value)}
            className="min-h-20 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
          />
        </label>
        <button
          className="secondary-button mt-4 flex items-center gap-2"
          onClick={() => onToast("Página de prueba enviada a la impresora")}
        >
          <Printer size={15} /> Probar impresora
        </button>
      </SettingsCard>
    </div>
  );
}

function InventorySettings({
  values,
  update,
}: {
  values: {
    valuation: string;
    defaultUnit: string;
    reservationMinutes: string;
    lowStock: boolean;
    requireLocation: boolean;
    allowFractions: boolean;
    requireAdjustmentReason: boolean;
  };
  update: <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        eyebrow="Existencias"
        title="Reglas de inventario"
        description="Define cómo se registran, reservan y valúan los productos."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Método de valuación"
            value={values.valuation}
            onChange={(v) => update("valuation", v)}
            options={["Costo promedio", "Último costo"]}
          />
          <SelectField
            label="Unidad predeterminada"
            value={values.defaultUnit}
            onChange={(v) => update("defaultUnit", v)}
            options={["pieza", "metro", "tramo", "rollo", "caja"]}
          />
          <TextField
            label="Minutos de reserva"
            value={values.reservationMinutes}
            onChange={(v) => update("reservationMinutes", v)}
            type="number"
          />
        </div>
        <div className="mt-5 space-y-1">
          <Toggle
            checked={values.allowFractions}
            onChange={(v) => update("allowFractions", v)}
            label="Permitir unidades fraccionadas"
            description="Habilita venta y conteo en metros, tramos o fracciones."
          />
          <Toggle
            checked={values.requireLocation}
            onChange={(v) => update("requireLocation", v)}
            label="Exigir pasillo y estante"
            description="Los productos nuevos deben tener ubicación física."
          />
          <Toggle
            checked={values.lowStock}
            onChange={(v) => update("lowStock", v)}
            label="Generar alertas de stock mínimo"
          />
          <Toggle
            checked={values.requireAdjustmentReason}
            onChange={(v) => update("requireAdjustmentReason", v)}
            label="Exigir motivo en ajustes y mermas"
          />
        </div>
      </SettingsCard>
      <SettingsCard eyebrow="Catálogo" title="Unidades habilitadas">
        <div className="flex flex-wrap gap-2">
          {["Pieza", "Metro", "Tramo", "Rollo", "Caja", "Litro", "Kilogramo"].map((unit) => (
            <span
              key={unit}
              className="rounded-xl border border-[#b8d0ca] bg-[#edf4f2] px-3 py-2 text-xs font-semibold text-[#2f7468]"
            >
              {unit}
            </span>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

function DocumentsSettings({
  values,
  update,
}: {
  values: {
    quotePrefix: string;
    quoteNext: string;
    salePrefix: string;
    saleNext: string;
    orderPrefix: string;
    orderNext: string;
    quoteValidity: string;
    showPricesOnPicking: boolean;
    showLocationOnPicking: boolean;
    legalTerms: string;
  };
  update: <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        eyebrow="Numeración"
        title="Series y folios"
        description="El siguiente número se asigna automáticamente al crear un documento."
      >
        <div className="space-y-4">
          {[
            { label: "Cotizaciones", prefix: "quotePrefix", next: "quoteNext", icon: FileText },
            { label: "Ventas", prefix: "salePrefix", next: "saleNext", icon: ReceiptText },
            { label: "Órdenes", prefix: "orderPrefix", next: "orderNext", icon: ClipboardList },
          ].map(({ label, prefix, next, icon: Icon }) => (
            <div
              key={label}
              className="grid items-end gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-[1fr_120px_160px]"
            >
              <div className="flex items-center gap-3 pb-1">
                <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <Icon size={16} />
                </span>
                <p className="text-xs font-semibold">{label}</p>
              </div>
              <TextField
                label="Prefijo"
                value={values[prefix as keyof typeof values] as string}
                onChange={(v) => update(prefix as keyof typeof values, v as never)}
              />
              <TextField
                label="Siguiente folio"
                value={values[next as keyof typeof values] as string}
                onChange={(v) => update(next as keyof typeof values, v as never)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>
      <SettingsCard eyebrow="Formato" title="Cotizaciones y picking">
        <div className="grid gap-4 sm:grid-cols-2">
          <p className="text-xs text-slate-500 sm:col-span-2">La vigencia de las cotizaciones se define en Configuración → Políticas.</p>
        </div>
        <div className="mt-5 space-y-1">
          <Toggle
            checked={values.showPricesOnPicking}
            onChange={(v) => update("showPricesOnPicking", v)}
            label="Mostrar precios en la hoja de picking"
          />
          <Toggle
            checked={values.showLocationOnPicking}
            onChange={(v) => update("showLocationOnPicking", v)}
            label="Mostrar pasillo y estante"
          />
        </div>
        <label className="form-label mt-5">
          Términos comerciales
          <textarea
            value={values.legalTerms}
            onChange={(e) => update("legalTerms", e.target.value)}
            className="min-h-24 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
          />
        </label>
      </SettingsCard>
    </div>
  );
}

function RoutesSettings({
  values,
  update,
}: {
  values: {
    firstDeparture: string;
    maxStops: string;
    maxViatics: string;
    groupingRadius: string;
    requireProof: boolean;
    requireSignature: boolean;
    allowPartialDelivery: boolean;
    optimizeByZone: boolean;
  };
  update: <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard
        eyebrow="Planeación"
        title="Reglas de rutas"
        description="Parámetros para agrupar pedidos y preparar las salidas."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Primera hora de salida"
            value={values.firstDeparture}
            onChange={(v) => update("firstDeparture", v)}
            type="time"
          />
          <TextField
            label="Máximo de paradas por ruta"
            value={values.maxStops}
            onChange={(v) => update("maxStops", v)}
            type="number"
          />
          <TextField
            label="Radio de agrupación (km)"
            value={values.groupingRadius}
            onChange={(v) => update("groupingRadius", v)}
            type="number"
          />
          <TextField
            label="Viáticos máximos sin autorización"
            value={values.maxViatics}
            onChange={(v) => update("maxViatics", v)}
            type="number"
          />
        </div>
        <div className="mt-5 space-y-1">
          <Toggle
            checked={values.optimizeByZone}
            onChange={(v) => update("optimizeByZone", v)}
            label="Sugerir rutas por cercanía"
            description="Agrupa pedidos por zona y proximidad de dirección."
          />
          <Toggle
            checked={values.requireProof}
            onChange={(v) => update("requireProof", v)}
            label="Exigir comprobantes de viáticos"
          />
          <Toggle
            checked={values.requireSignature}
            onChange={(v) => update("requireSignature", v)}
            label="Exigir confirmación de entrega"
          />
          <Toggle
            checked={values.allowPartialDelivery}
            onChange={(v) => update("allowPartialDelivery", v)}
            label="Permitir entregas parciales"
          />
        </div>
      </SettingsCard>
      <SettingsCard eyebrow="Flotilla" title="Choferes y vehículos">
        <div className="grid gap-3 sm:grid-cols-2">
          <ResourceCard icon={Users} title="3 choferes activos" detail="Roberto, Manuel y Jesús" />
          <ResourceCard
            icon={Route}
            title="3 vehículos disponibles"
            detail="NP300, Transit y Ram 700"
          />
        </div>
      </SettingsCard>
    </div>
  );
}

function NotificationSettings({
  values,
  update,
}: {
  values: {
    lowStock: boolean;
    missingOrder: boolean;
    quoteExpiry: boolean;
    overdueBalance: boolean;
    routeDelay: boolean;
    emailSummary: boolean;
    browserAlerts: boolean;
  };
  update: <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => void;
}) {
  return (
    <SettingsCard
      eyebrow="Alertas"
      title="Notificaciones"
      description="Elige los eventos que requieren atención del equipo."
    >
      <div className="space-y-1">
        <Toggle
          checked={values.lowStock}
          onChange={(v) => update("lowStock", v)}
          label="Stock bajo"
          description="Cuando un producto llega a su nivel mínimo."
        />
        <Toggle
          checked={values.missingOrder}
          onChange={(v) => update("missingOrder", v)}
          label="Órdenes con faltantes"
          description="Al reportar una partida incompleta durante el picking."
        />
        <Toggle
          checked={values.quoteExpiry}
          onChange={(v) => update("quoteExpiry", v)}
          label="Cotizaciones por vencer"
          description="24 horas antes de alcanzar su vigencia."
        />
        <Toggle
          checked={values.overdueBalance}
          onChange={(v) => update("overdueBalance", v)}
          label="Saldos vencidos"
          description="Cuando un cliente supera sus días de crédito."
        />
        <Toggle
          checked={values.routeDelay}
          onChange={(v) => update("routeDelay", v)}
          label="Rutas retrasadas"
          description="Si una ruta no inicia o termina en el horario previsto."
        />
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="mb-3 text-xs font-semibold">Canales</p>
        <Toggle
          checked={values.browserAlerts}
          onChange={(v) => update("browserAlerts", v)}
          label="Notificaciones en el navegador"
        />
        <Toggle
          checked={values.emailSummary}
          onChange={(v) => update("emailSummary", v)}
          label="Resumen diario por correo"
        />
      </div>
    </SettingsCard>
  );
}

function SecuritySettings({
  values,
  update,
  onToast,
}: {
  values: {
    sessionMinutes: string;
    passwordDays: string;
    twoFactorAdmin: boolean;
    logChanges: boolean;
    approvalDiscount: boolean;
    approvalCancellation: boolean;
  };
  update: <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => void;
  onToast: (message: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsCard eyebrow="Acceso" title="Políticas de seguridad">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Duración de sesión (minutos)"
            value={values.sessionMinutes}
            onChange={(v) => update("sessionMinutes", v)}
            type="number"
          />
          <TextField
            label="Renovación de contraseña (días)"
            value={values.passwordDays}
            onChange={(v) => update("passwordDays", v)}
            type="number"
          />
        </div>
        <div className="mt-5 space-y-1">
          <Toggle
            checked={values.twoFactorAdmin}
            onChange={(v) => update("twoFactorAdmin", v)}
            label="Autenticación de dos factores para administradores"
          />
          <Toggle
            checked={values.logChanges}
            onChange={(v) => update("logChanges", v)}
            label="Registrar cambios y movimientos sensibles"
          />
          <Toggle
            checked={values.approvalDiscount}
            onChange={(v) => update("approvalDiscount", v)}
            label="Exigir autorización para descuentos especiales"
          />
          <Toggle
            checked={values.approvalCancellation}
            onChange={(v) => update("approvalCancellation", v)}
            label="Exigir autorización para cancelaciones"
          />
        </div>
      </SettingsCard>
      <SettingsCard eyebrow="Auditoría" title="Actividad y respaldo">
        <div className="grid gap-3 sm:grid-cols-2">
          <ResourceCard
            icon={KeyRound}
            title="Registro de actividad"
            detail="Última revisión: hoy, 11:42"
            action={() => onToast("Registro de actividad abierto")}
          />
          <ResourceCard
            icon={ShieldCheck}
            title="Exportar respaldo"
            detail="Descarga una copia de los datos"
            action={() => onToast("Respaldo preparado para descarga")}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="form-label">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="form-label">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="form-input"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  compact = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl ${compact ? "" : "px-2 py-3 hover:bg-slate-50"}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#2f7468]" : "bg-slate-200"}`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all ${checked ? "left-6" : "left-1"}`}
        />
      </button>
      {label && (
        <span className="min-w-0">
          <span className="block text-xs font-semibold">{label}</span>
          {description && (
            <span className="mt-1 block text-[10px] text-slate-400">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}

function ResourceCard({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: typeof Users;
  title: string;
  detail: string;
  action?: () => void;
}) {
  const content = (
    <>
      <span className="grid size-10 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold">{title}</span>
        <span className="mt-1 block text-[10px] text-slate-400">{detail}</span>
      </span>
      {action && <ChevronRight size={14} className="text-slate-300" />}
    </>
  );
  return action ? (
    <button
      className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 text-left hover:bg-slate-50"
      onClick={action}
    >
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">{content}</div>
  );
}

function NewUserModal({
  users,
  onClose,
  onCreate,
}: {
  users: AppUser[];
  onClose: () => void;
  onCreate: (user: AppUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppUser["role"]>("Ventas");
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreate({
      id: `USR-${String(users.length + 1).padStart(2, "0")}`,
      name,
      email,
      role,
      branch: "Sucursal principal",
      active: true,
    });
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Equipo</p>
            <h2 className="mt-1 text-xl font-semibold">Invitar usuario</h2>
            <p className="mt-1 text-xs text-slate-400">Recibirá un correo para crear su acceso.</p>
          </div>
          <button
            className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <TextField label="Nombre completo" value={name} onChange={setName} />
          <TextField label="Correo electrónico" value={email} onChange={setEmail} type="email" />
          <SelectField
            label="Rol"
            value={role}
            onChange={(value) => setRole(value as AppUser["role"])}
            options={["Administrador", "Ventas", "Almacén", "Chofer"]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              <UserPlus size={15} /> Enviar invitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
