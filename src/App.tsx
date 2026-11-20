import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Barcode,
  Bell,
  Boxes,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Download,
  Eye,
  FileText,
  IdCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import SalesModule, { initialSales, pendingAmount, type PosLine, type Sale } from "./SalesModule";
import InventoryModule, {
  initialInventory,
  type AdjustInput,
  type InventoryProduct,
  type StockMovement,
} from "./InventoryModule";
import CustomersModule, {
  initialCustomers,
  type Customer,
  type CustomerType,
} from "./CustomersModule";
import QuotePrintView from "./QuoteDocument";
import CompanyLogo from "./CompanyLogo";
import { LockScreen, LoginScreen, type LoginUser } from "./LoginScreen";
import { listForCustomer, listName, priceFor, pricesOf } from "./pricing";
import { applyConfig, company, initialCompany, initialPolicies, policies, type CompanyConfig, type Policies } from "./config";
import OrdersModule, {
  initialOrders,
  toPickStatuses,
  isReception,
  type Order,
  type OrderFilter,
} from "./OrdersModule";
import PurchasesModule, {
  initialPurchases,
  initialSuppliers,
  type PurchaseOrder,
  type Supplier,
} from "./PurchasesModule";
import RoutesModule, { initialRoutePlans, type RoutePlan } from "./RoutesModule";
import ReportsModule, { defaultFixedExpenses, type FixedExpense } from "./ReportsModule";
import SettingsModule from "./SettingsModule";
import type { Discount } from "./Discount";
import { explodeLines, initialKits, kitAsProduct, kitAvailability, kitComponentsFor, kitCost, type Kit } from "./KitsModule";
import { type SaleReturn } from "./ReturnsModule";
import CollaboratorsModule, {
  DEFAULT_SOCIAL_RATE,
  initialAdvances,
  initialCollaborators,
  monthlyCost,
  type Advance,
  type Collaborator,
  type PayrollRun,
} from "./CollaboratorsModule";
import { setStaff } from "./staff";
import { initialAccounts, initialTerminals, terminalFee, type BankAccount, type BankMovement, type BankOverride, type Terminal } from "./BanksModule";
import { ADMIN_ROLE, NO_ACCESS_ROLE, PERMISSION_GROUPS, can, initialRoles, maxDiscountOf, type PermissionKey, type Role as AccessRole } from "./RolesModule";
import {
  addDays as addDaysISO,
  balanceOf as layawayBalance,
  initialLayaways,
  initialWallet,
  paidOf as layawayPaid,
  type Layaway,
  type NewLayaway,
  type PayMethodL,
  type WalletKind,
  type WalletMovement,
} from "./LayawayModule";
import {
  initialSpecialOrders,
  isLate as specialIsLate,
  isUncollected as specialIsUncollected,
  balanceOf as specialBalance,
  type NewSpecialOrder,
  type SpecialOrder,
} from "./SpecialOrdersModule";
import CashModule, { initialCashSessions, type CashMovement, type CashSession, computeSummary } from "./CashModule";
import QuoteBuilder, { type QuoteBuilderResult, type QuoteLine } from "./QuoteBuilder";

type Role = "Administrador" | "Ventas" | "Almacén";
type QuoteStatus = "Borrador" | "Enviada" | "Aceptada" | "Vencida";
type Quote = {
  id: string;
  client: string;
  contact: string;
  amount: number;
  items: number;
  date: string;
  issuedAt: string;
  expiresAt: string;
  validUntil: string;
  status: QuoteStatus;
  owner: string;
  phone?: string;
  priceList?: string;
  lines?: QuoteLine[];
  subtotal?: number;
  tax?: number;
  notes?: string;
  saleId?: string;
  orderId?: string;
  lastAction?: string;
  discount?: Discount;
  discountAmount?: number;
};

type ConvertOptions = {
  fulfillment: Order["fulfillment"];
};

// Fecha de operación del prototipo (los datos de ejemplo son del 18 nov 2026).
// En producción: const TODAY_ISO = new Date().toISOString().slice(0, 10);
const TODAY_ISO = "2026-11-18";

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`)
    .toLocaleDateString("es-MX", { day: "numeric", month: "short" })
    .replace(".", "");
const fullDate = (iso: string) =>
  new Date(`${iso}T12:00:00`)
    .toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "");
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const daysUntil = (iso: string) =>
  Math.round(
    (new Date(`${iso}T12:00:00`).getTime() - new Date(`${TODAY_ISO}T12:00:00`).getTime()) /
      86_400_000,
  );
const nowTime = () => new Date().toTimeString().slice(0, 5);

const navItems = [
  { label: "Inicio", icon: LayoutDashboard },
  { label: "Cotizaciones", icon: FileText, count: 12 },
  { label: "Ventas", icon: ShoppingCart },
  { label: "Punto de venta", icon: Barcode },
  { label: "Caja", icon: Wallet },
  { label: "Inventario", icon: Boxes, count: 8 },
  { label: "Compras", icon: ShoppingBasket },
  { label: "Órdenes", icon: ClipboardList },
  { label: "Rutas", icon: Truck },
  { label: "Clientes", icon: Users },
  { label: "Colaboradores", icon: IdCard },
  { label: "Reportes", icon: ChartColumn },
];

const roleData: Record<Role, { name: string; greeting: string; description: string }> = {
  Administrador: {
    name: "Carlos Mendoza",
    greeting: "Buenos días, Carlos",
    get description() {
      return `Aquí está el pulso de ${company.commercialName} para hoy.`;
    },
  },
  Ventas: {
    name: "Ana López",
    greeting: "Buenos días, Ana",
    description: "Tienes clientes esperando seguimiento.",
  },
  Almacén: {
    name: "Luis Ortega",
    greeting: "Buenos días, Luis",
    description: "Estas son las prioridades de surtido del día.",
  },
};

type NavFocus = { status?: string; query?: string; selectedId?: string };
type Task = {
  title: string;
  meta: string;
  type: string;
  nav: string;
  focus?: NavFocus;
  action: string;
};

const taskSets: Record<Role, Task[]> = {
  Administrador: [
    {
      title: "Autorizar descuento especial",
      meta: "Cotización #C-299 · Ferretería López",
      type: "Hace 8 min",
      nav: "Cotizaciones",
      focus: { query: "C-299" },
      action: "Abrir cotización",
    },
    {
      title: "Revisar faltantes de ruta norte",
      meta: "Orden OS-0829 · 1 producto con faltante",
      type: "Urgente",
      nav: "Órdenes",
      focus: { selectedId: "OS-0829" },
      action: "Abrir orden",
    },
    {
      title: "Aprobar ajuste de inventario",
      meta: "Almacén principal · productos en stock bajo",
      type: "Hoy, 12:30",
      nav: "Inventario",
      focus: { status: "Bajo stock" },
      action: "Ver inventario",
    },
  ],
  Ventas: [
    {
      title: "Enviar cotización a Constructora MZ",
      meta: "Cotización #C-300 · Constructora MZ",
      type: "Hace 5 min",
      nav: "Cotizaciones",
      focus: { query: "C-300" },
      action: "Abrir cotización",
    },
    {
      title: "Confirmar disponibilidad de CPVC",
      meta: "Inventario · Tubo CPVC 3/4\"",
      type: "Urgente",
      nav: "Inventario",
      focus: { query: "CPVC" },
      action: "Ver existencias",
    },
    {
      title: "Dar seguimiento a pago",
      meta: "Plomería del Centro · saldo $2,048",
      type: "Hoy, 13:00",
      nav: "Clientes",
      focus: { selectedId: "CL-1046" },
      action: "Abrir cliente",
    },
  ],
  Almacén: [
    {
      title: "Surtir orden OS-0831",
      meta: "Plomería del Centro · Pasillos A, C y F",
      type: "Urgente",
      nav: "Órdenes",
      focus: { selectedId: "OS-0831" },
      action: "Abrir picking",
    },
    {
      title: "Validar rollos de manguera",
      meta: "Ubicación B-04 · conteo físico",
      type: "Hace 12 min",
      nav: "Inventario",
      focus: { query: "Manguera" },
      action: "Ver producto",
    },
    {
      title: "Preparar devolución",
      meta: "Proveedor Rotoplas · tinacos",
      type: "Hoy, 14:00",
      nav: "Inventario",
      focus: { query: "Rotoplas" },
      action: "Ver producto",
    },
  ],
};

const priceForType = (product: InventoryProduct, type: CustomerType) => priceFor(product, listForCustomer({ type }));

// Arma las partidas de las cotizaciones de ejemplo con el catálogo y la lista de precios del cliente
const sampleQuote = (
  base: Omit<
    Quote,
    "amount" | "items" | "validUntil" | "lines" | "subtotal" | "tax" | "priceList"
  >,
  picks: [string, number][],
): Quote => {
  const type = initialCustomers.find((c) => c.businessName === base.client)?.type || "Mostrador";
  const lines = picks.map(([sku, quantity]) => {
    const product = initialInventory.find((item) => item.sku === sku)!;
    const unitPrice = priceForType(product, type);
    return {
      sku,
      name: product.name,
      quantity,
      unit: product.saleUnit,
      unitPrice,
      total: unitPrice * quantity,
    };
  });
  const amount = lines.reduce((sum, line) => sum + line.total, 0);
  return {
    ...base,
    amount,
    items: lines.reduce((sum, line) => sum + line.quantity, 0),
    validUntil: shortDate(base.expiresAt),
    lines,
    subtotal: amount,
    tax: amount - amount / 1.16,
    priceList: listName(listForCustomer({ type })),
  };
};

// Pasa a "Vencida" toda cotización en borrador o enviada cuya vigencia ya terminó
const applyExpiry = (quote: Quote): Quote =>
  (quote.status === "Borrador" || quote.status === "Enviada") && quote.expiresAt < TODAY_ISO
    ? { ...quote, status: "Vencida", lastAction: "Sin respuesta del cliente" }
    : quote;

const initialQuotes: Quote[] = [
  sampleQuote(
    {
      id: "C-300",
      client: "Constructora MZ",
      contact: "Miguel Zamora",
      date: "18 nov 2026",
      issuedAt: "2026-11-18",
      expiresAt: "2026-11-25",
      status: "Enviada",
      owner: "Ana López",
      notes: "Obra Insurgentes Sur 820",
      lastAction: "Enviada por WhatsApp · 10:12",
    },
    [
      ["PVC-TUB-100", 20],
      ["CPVC-TUB-075", 24],
      ["PVC-COD-100", 120],
      ["ACC-TEF-012", 60],
    ],
  ),
  sampleQuote(
    {
      id: "C-299",
      client: "Ferretería López",
      contact: "Mariana López",
      date: "18 nov 2026",
      issuedAt: "2026-11-18",
      expiresAt: "2026-12-02",
      status: "Enviada",
      owner: "Carlos Mendoza",
      lastAction: "Enviada por WhatsApp · 11:30",
    },
    [
      ["PVC-TUB-100", 40],
      ["PVC-COD-100", 300],
      ["ACC-TEF-012", 200],
      ["MAN-REF-020", 100],
      ["ROT-TIN-1100", 3],
    ],
  ),
  sampleQuote(
    {
      id: "C-298",
      client: "Plomería del Centro",
      contact: "José Ramírez",
      date: "17 nov 2026",
      issuedAt: "2026-11-17",
      expiresAt: "2026-11-24",
      status: "Borrador",
      owner: "Ana López",
      lastAction: "Borrador guardado",
    },
    [
      ["CPVC-TUB-075", 30],
      ["PVC-COD-100", 150],
      ["ACC-TEF-012", 100],
    ],
  ),
  sampleQuote(
    {
      id: "C-297",
      client: "Grupo Hidráulico Norte",
      contact: "Pablo Cruz",
      date: "16 nov 2026",
      issuedAt: "2026-11-16",
      expiresAt: "2026-11-23",
      status: "Enviada",
      owner: "Carlos Mendoza",
      lastAction: "Enviada por correo · 16 nov",
    },
    [
      ["ROT-TIN-1100", 4],
      ["PVC-TUB-100", 50],
      ["MAN-REF-020", 120],
    ],
  ),
  sampleQuote(
    {
      id: "C-296",
      client: "Instalaciones Ríos",
      contact: "Sofía Ríos",
      date: "14 nov 2026",
      issuedAt: "2026-11-14",
      expiresAt: "2026-11-17",
      status: "Enviada",
      owner: "Ana López",
    },
    [
      ["PVC-TUB-100", 12],
      ["CPVC-TUB-075", 10],
      ["ACC-TEF-012", 40],
    ],
  ),
  sampleQuote(
    {
      id: "C-295",
      client: "Obras del Bajío",
      contact: "Andrés Téllez",
      date: "13 nov 2026",
      issuedAt: "2026-11-13",
      expiresAt: "2026-11-28",
      status: "Aceptada",
      owner: "Carlos Mendoza",
      saleId: "V-1840",
      orderId: "OS-0827",
      lastAction: "Convertida en venta · 16 nov",
    },
    [
      ["ROT-TIN-1100", 4],
      ["PVC-TUB-100", 30],
      ["PVC-COD-100", 100],
    ],
  ),
];

type QuoteFilter = "Todas" | "Activas" | QuoteStatus;
const activeQuoteStatuses: QuoteStatus[] = ["Borrador", "Enviada"];
const matchesQuoteFilter = (quote: Quote, filter: QuoteFilter) =>
  filter === "Todas" ||
  (filter === "Activas" ? activeQuoteStatuses.includes(quote.status) : quote.status === filter);

type QuotePeriod = "Cualquiera" | "Hoy" | "Últimos 7 días" | "Últimos 30 días";
type QuoteSort = "Más recientes" | "Mayor importe" | "Menor importe" | "Próximas a vencer";

const quoteStatusStyles: Record<QuoteStatus, string> = {
  Borrador: "bg-slate-100 text-slate-600",
  Enviada: "bg-[#e8f2ff] text-[#3973a8]",
  Aceptada: "bg-[#eaf6ef] text-[#347652]",
  Vencida: "bg-[#fff0eb] text-[#c9664f]",
};

const mxn = (value: number, digits = 2) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function QuotesModule({
  quotes,
  customers,
  onCreate,
  onAction,
  onBack,
  onUpdate,
  onConvert,
  onOpen,
  products = [],
  initialQuery = "",
  initialStatus = "Todas",
}: {
  products?: InventoryProduct[];
  quotes: Quote[];
  customers: Customer[];
  onCreate: () => void;
  onAction: (message: string) => void;
  onBack: () => void;
  onUpdate: (id: string, changes: Partial<Quote>) => void;
  onConvert: (quote: Quote, options: ConvertOptions) => void;
  onOpen: (nav: string, focus: NavFocus) => void;
  initialQuery?: string;
  initialStatus?: QuoteFilter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<QuoteFilter>(initialStatus);
  const [selected, setSelected] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [emailId, setEmailId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [convertId, setConvertId] = useState<string | null>(null);
  const [convertOptions, setConvertOptions] = useState<ConvertOptions>({ fulfillment: "Ruta" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [owner, setOwner] = useState("Todos");
  const [period, setPeriod] = useState<QuotePeriod>("Cualquiera");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [sort, setSort] = useState<QuoteSort>("Más recientes");

  const find = (id: string | null) => quotes.find((quote) => quote.id === id) || null;
  const preview = find(previewId);
  const printing = find(printId);
  const emailing = find(emailId);
  const converting = find(convertId);
  const customerOf = (quote: Quote) =>
    customers.find((customer) => customer.businessName === quote.client);

  const owners = [...new Set(quotes.map((quote) => quote.owner))];
  const advancedCount =
    (owner !== "Todos" ? 1 : 0) +
    (period !== "Cualquiera" ? 1 : 0) +
    (minAmount || maxAmount ? 1 : 0) +
    (expiringSoon ? 1 : 0) +
    (sort !== "Más recientes" ? 1 : 0);

  const clearAdvanced = () => {
    setOwner("Todos");
    setPeriod("Cualquiera");
    setMinAmount("");
    setMaxAmount("");
    setExpiringSoon(false);
    setSort("Más recientes");
  };

  const filteredQuotes = useMemo(() => {
    const periodDays = { Hoy: 0, "Últimos 7 días": 7, "Últimos 30 días": 30 } as const;
    const list = quotes.filter((quote) => {
      const remaining = daysUntil(quote.expiresAt);
      return (
        matchesQuoteFilter(quote, status) &&
        `${quote.id} ${quote.client} ${quote.contact}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (owner === "Todos" || quote.owner === owner) &&
        (period === "Cualquiera" || daysUntil(quote.issuedAt) >= -periodDays[period]) &&
        (!minAmount || quote.amount >= Number(minAmount)) &&
        (!maxAmount || quote.amount <= Number(maxAmount)) &&
        (!expiringSoon ||
          (activeQuoteStatuses.includes(quote.status) && remaining >= 0 && remaining <= 3))
      );
    });
    return [...list].sort((a, b) =>
      sort === "Mayor importe"
        ? b.amount - a.amount
        : sort === "Menor importe"
          ? a.amount - b.amount
          : sort === "Próximas a vencer"
            ? a.expiresAt.localeCompare(b.expiresAt)
            : b.issuedAt.localeCompare(a.issuedAt) || b.id.localeCompare(a.id),
    );
  }, [quotes, status, query, owner, period, minAmount, maxAmount, expiringSoon, sort]);

  const totalQuoted = quotes.reduce((sum, quote) => sum + quote.amount, 0);
  const sentQuotes = quotes.filter((quote) => quote.status === "Enviada");
  const accepted = quotes.filter((quote) => quote.status === "Aceptada").length;

  // ---------- Acciones que cambian el estado ----------
  const blockedIfExpired = (quote: Quote) => {
    if (quote.status !== "Vencida") return false;
    onAction(`La cotización ${quote.id} está vencida. Renueva su vigencia para enviarla.`);
    return true;
  };

  const markSent = (quote: Quote, channel: "WhatsApp" | "correo") =>
    onUpdate(quote.id, {
      status: quote.status === "Borrador" ? "Enviada" : quote.status,
      lastAction: `Enviada por ${channel} · ${nowTime()}`,
    });

  const sendWhatsApp = (quote: Quote) => {
    if (blockedIfExpired(quote)) return;
    const phone = (quote.phone || customerOf(quote)?.phone || "").replace(/\D/g, "");
    if (!phone) {
      onAction("Este cliente no tiene WhatsApp registrado");
      return;
    }
    const message = encodeURIComponent(
      `Hola ${quote.contact}, te comparto la cotización ${quote.id} por ${mxn(quote.amount)}, válida hasta el ${fullDate(quote.expiresAt)}.`,
    );
    window.open(`https://wa.me/52${phone}?text=${message}`, "_blank");
    markSent(quote, "WhatsApp");
    onAction(`Cotización ${quote.id} enviada por WhatsApp a ${quote.contact}`);
  };

  const openEmail = (quote: Quote) => {
    if (blockedIfExpired(quote)) return;
    setEmailTo(customerOf(quote)?.email || "");
    setEmailSubject(`Cotización ${quote.id} · ${company.commercialName}`);
    setEmailBody(
      `Hola ${quote.contact},\n\nTe comparto la cotización ${quote.id} por un total de ${mxn(quote.amount)} (IVA incluido), válida hasta el ${fullDate(quote.expiresAt)}.\n\nQuedo atento a tus comentarios para confirmar el pedido.\n\nSaludos,\n${quote.owner}\n${company.commercialName} · ${company.phone}`,
    );
    setEmailId(quote.id);
  };

  const sendEmail = () => {
    if (!emailing || !emailTo.trim()) return;
    markSent(emailing, "correo");
    onAction(`Cotización ${emailing.id} enviada a ${emailTo}`);
    setEmailId(null);
  };

  const renew = (quote: Quote) => {
    const expiresAt = addDays(TODAY_ISO, policies.quoteValidityDays);
    onUpdate(quote.id, {
      status: "Borrador",
      expiresAt,
      validUntil: shortDate(expiresAt),
      lastAction: `Vigencia renovada · ${nowTime()}`,
    });
    onAction(`${quote.id} renovada hasta el ${fullDate(expiresAt)}`);
  };

  const confirmConvert = () => {
    if (!converting) return;
    onConvert(converting, convertOptions);
    setConvertId(null);
  };

  const vigencia = (quote: Quote) => {
    const remaining = daysUntil(quote.expiresAt);
    if (quote.status === "Vencida")
      return <p className="mt-1 text-[10px] font-medium text-[#c9664f]">Venció el {quote.validUntil}</p>;
    if (activeQuoteStatuses.includes(quote.status) && remaining <= 3)
      return (
        <p className="mt-1 text-[10px] font-medium text-[#9a6b18]">
          {remaining === 0 ? "Vence hoy" : `Vence en ${remaining} ${remaining === 1 ? "día" : "días"}`}
        </p>
      );
    return <p className="mt-1 text-[10px] text-slate-400">Vigencia: {quote.validUntil}</p>;
  };

  const ConvertButton = ({ quote, large = false }: { quote: Quote; large?: boolean }) =>
    quote.saleId ? (
      <button
        className={
          large
            ? "secondary-button flex items-center gap-2 bg-white text-[#347652]"
            : "inline-flex items-center gap-1 rounded-lg bg-[#eaf6ef] px-2.5 py-1.5 text-[10px] font-semibold text-[#347652]"
        }
        onClick={() => onOpen("Órdenes", { selectedId: quote.orderId })}
        title={`Venta ${quote.saleId} · Orden ${quote.orderId}`}
      >
        <CircleCheck size={large ? 15 : 12} /> {large ? `Ver orden ${quote.orderId}` : "Convertida"}
      </button>
    ) : quote.status === "Vencida" ? (
      <button
        className={
          large
            ? "secondary-button flex items-center gap-2 bg-white"
            : "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:border-[#2f7468] hover:text-[#2f7468]"
        }
        onClick={() => renew(quote)}
      >
        <RefreshCw size={large ? 15 : 12} /> Renovar vigencia
      </button>
    ) : (
      <button
        className={
          large
            ? "primary-button"
            : "inline-flex items-center gap-1 rounded-lg bg-[#2f7468] px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-[#285f56]"
        }
        onClick={() => setConvertId(quote.id)}
      >
        <ShoppingCart size={large ? 15 : 12} /> {large ? "Convertir en venta" : "Convertir"}
      </button>
    );

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <button
            className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-[#2f7468]"
            onClick={onBack}
          >
            Operación <ChevronRight size={13} />{" "}
            <span className="text-slate-700">Cotizaciones</span>
          </button>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Cotizaciones</h1>
          <p className="mt-2 text-sm text-slate-500">
            Crea, envía y da seguimiento a tus propuestas comerciales.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="secondary-button flex items-center gap-2 bg-white"
            onClick={() => onAction("Reporte de cotizaciones exportado")}
          >
            <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
          </button>
          <button className="primary-button" onClick={onCreate}>
            <Plus size={17} /> Nueva cotización
          </button>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Cotizado este mes"
          value={mxn(totalQuoted, 0)}
          detail={`${quotes.length} cotizaciones emitidas`}
          icon={FileText}
          onClick={() => {
            setStatus("Todas");
            setSort("Más recientes");
          }}
        />
        <StatCard
          label="Pendientes de respuesta"
          value={String(sentQuotes.length)}
          detail={`${mxn(sentQuotes.reduce((sum, quote) => sum + quote.amount, 0), 0)} en seguimiento`}
          icon={Send}
          onClick={() => setStatus("Enviada")}
        />
        <StatCard
          label="Cotizaciones aceptadas"
          value={String(accepted)}
          detail="Convertidas en venta y orden"
          icon={Check}
          onClick={() => setStatus("Aceptada")}
        />
        <StatCard
          label="Ticket promedio"
          value={quotes.length ? mxn(totalQuoted / quotes.length, 0) : "$0"}
          detail="Ver de mayor a menor importe"
          icon={ChartColumn}
          onClick={() => {
            setStatus("Todas");
            setSort("Mayor importe");
          }}
        />
      </section>

      <section className="panel mt-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["Todas", "Activas", "Borrador", "Enviada", "Aceptada", "Vencida"] as const).map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`shrink-0 rounded-lg px-3 py-2 transition ${
                    status === item
                      ? "bg-white text-[#285e56] shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {item}
                  <span className="ml-1.5 text-[10px] opacity-60">
                    {quotes.filter((quote) => matchesQuoteFilter(quote, item)).length}
                  </span>
                </button>
              ),
            )}
          </div>
          <div className="ml-auto flex w-full gap-2 lg:w-auto">
            <div className="relative min-w-0 flex-1 lg:w-72">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#2f7468]"
                placeholder="Buscar cliente o folio..."
              />
            </div>
            <div className="relative">
              <button
                className={`relative grid size-10 shrink-0 place-items-center rounded-xl border bg-white transition ${
                  filtersOpen || advancedCount
                    ? "border-[#2f7468] text-[#2f7468]"
                    : "border-slate-200 text-slate-500"
                }`}
                aria-label="Filtros avanzados"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal size={16} />
                {advancedCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-[#2f7468] text-[8px] font-bold text-white">
                    {advancedCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <div className="dropdown right-0 w-80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Filtros avanzados</p>
                    <button className="text-[10px] font-semibold text-slate-400 hover:text-[#2f7468]" onClick={clearAdvanced}>
                      Limpiar
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    <label className="form-label">
                      Responsable
                      <select value={owner} onChange={(e) => setOwner(e.target.value)} className="form-input">
                        <option>Todos</option>
                        {owners.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <div className="form-label">
                      Fecha de emisión
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["Cualquiera", "Hoy", "Últimos 7 días", "Últimos 30 días"] as QuotePeriod[]).map((item) => (
                          <button
                            key={item}
                            onClick={() => setPeriod(item)}
                            className={`rounded-lg border px-2 py-2 text-[10px] font-semibold ${
                              period === item
                                ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]"
                                : "border-slate-200 text-slate-500"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-label">
                      Importe (MXN)
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="form-input" placeholder="Mínimo" />
                        <input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="form-input" placeholder="Máximo" />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-[#f6f8f7] px-3 py-2.5">
                      <span>
                        <span className="block text-xs font-semibold">Por vencer</span>
                        <span className="mt-0.5 block text-[10px] text-slate-400">Activas que vencen en 3 días o menos</span>
                      </span>
                      <input type="checkbox" checked={expiringSoon} onChange={(e) => setExpiringSoon(e.target.checked)} className="size-4 accent-[#2f7468]" />
                    </label>
                    <label className="form-label">
                      Ordenar por
                      <select value={sort} onChange={(e) => setSort(e.target.value as QuoteSort)} className="form-input">
                        <option>Más recientes</option>
                        <option>Mayor importe</option>
                        <option>Menor importe</option>
                        <option>Próximas a vencer</option>
                      </select>
                    </label>
                  </div>
                  <button className="primary-button mt-4 w-full" onClick={() => setFiltersOpen(false)}>
                    Ver {filteredQuotes.length} {filteredQuotes.length === 1 ? "cotización" : "cotizaciones"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {advancedCount > 0 && !filtersOpen && (
          <div className="flex items-center justify-between bg-[#f6f8f7] px-5 py-2.5 text-[11px] text-slate-500">
            <span>
              {[
                owner !== "Todos" && owner,
                period !== "Cualquiera" && period,
                (minAmount || maxAmount) &&
                  `${minAmount ? mxn(Number(minAmount), 0) : "$0"} – ${maxAmount ? mxn(Number(maxAmount), 0) : "sin tope"}`,
                expiringSoon && "Por vencer",
                sort !== "Más recientes" && `Orden: ${sort.toLowerCase()}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <button className="font-semibold text-[#2f7468]" onClick={clearAdvanced}>
              Quitar filtros
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex items-center justify-between bg-[#edf5f3] px-5 py-3 text-xs text-[#285e56]">
            <span>
              <strong>{selected.length}</strong> cotizaciones seleccionadas
            </span>
            <button className="font-semibold" onClick={() => setSelected([])}>
              Limpiar selección
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="w-12 px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={filteredQuotes.length > 0 && selected.length === filteredQuotes.length}
                    onChange={(event) =>
                      setSelected(event.target.checked ? filteredQuotes.map((quote) => quote.id) : [])
                    }
                    className="accent-[#2f7468]"
                    aria-label="Seleccionar todas"
                  />
                </th>
                <th className="py-3.5">Folio / cliente</th>
                <th className="py-3.5">Fecha</th>
                <th className="py-3.5">Importe</th>
                <th className="py-3.5">Estado</th>
                <th className="py-3.5">Responsable</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="group border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(quote.id)}
                      onChange={() =>
                        setSelected((items) =>
                          items.includes(quote.id) ? items.filter((item) => item !== quote.id) : [...items, quote.id],
                        )
                      }
                      className="accent-[#2f7468]"
                      aria-label={`Seleccionar ${quote.id}`}
                    />
                  </td>
                  <td className="py-4">
                    <button className="flex items-center gap-3 text-left" onClick={() => setPreviewId(quote.id)}>
                      <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] font-bold text-[#2f7468]">
                        {quote.client.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {quote.client} <span className="ml-1 font-normal text-slate-400">#{quote.id}</span>
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {quote.contact} · {quote.lines?.length || quote.items} partidas
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="py-4 text-slate-600">
                    {quote.date}
                    {vigencia(quote)}
                  </td>
                  <td className="py-4 font-semibold">{mxn(quote.amount)}</td>
                  <td className="py-4">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ${quoteStatusStyles[quote.status]}`}>
                      {quote.status}
                    </span>
                    {quote.saleId ? (
                      <button
                        className="mt-1 block text-[10px] font-semibold text-[#2f7468] hover:underline"
                        onClick={() => onOpen("Órdenes", { selectedId: quote.orderId })}
                      >
                        {quote.saleId} · {quote.orderId}
                      </button>
                    ) : (
                      quote.lastAction && <p className="mt-1 text-[10px] text-slate-400">{quote.lastAction}</p>
                    )}
                  </td>
                  <td className="py-4 text-slate-500">{quote.owner}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                        onClick={() => setPreviewId(quote.id)}
                        title="Visualizar"
                        aria-label={`Ver ${quote.id}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-[#eaf6ef] hover:text-[#347652]"
                        onClick={() => sendWhatsApp(quote)}
                        title="Enviar por WhatsApp"
                        aria-label={`Enviar ${quote.id} por WhatsApp`}
                      >
                        <MessageCircle size={15} />
                      </button>
                      <button
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                        onClick={() => openEmail(quote)}
                        title="Enviar por correo"
                        aria-label={`Enviar ${quote.id} por correo`}
                      >
                        <Mail size={15} />
                      </button>
                      <button
                        className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                        onClick={() => setPrintId(quote.id)}
                        title="Imprimir"
                        aria-label={`Imprimir ${quote.id}`}
                      >
                        <Printer size={15} />
                      </button>
                      <span className="ml-1">
                        <ConvertButton quote={quote} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotes.length === 0 && (
          <div className="grid place-items-center px-5 py-16 text-center">
            <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <FileText size={20} />
            </div>
            <p className="mt-3 text-sm font-semibold">No encontramos cotizaciones</p>
            <p className="mt-1 text-xs text-slate-400">Prueba con otro cliente, folio, estado o filtro.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          <span>
            Mostrando {filteredQuotes.length} de {quotes.length}
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300" disabled>
              Anterior
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600"
              onClick={() => onAction("No hay más cotizaciones por mostrar")}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102521]/65 p-4 backdrop-blur-sm">
          <article className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <CompanyLogo className="grid size-10 place-items-center rounded-xl bg-[#183b36] text-xs font-black text-[#b8f34a]" />
                <div>
                  <p className="eyebrow">Documento comercial</p>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Cotización {preview.id}</h2>
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${quoteStatusStyles[preview.status]}`}>
                      {preview.status}
                    </span>
                  </div>
                  {preview.lastAction && <p className="mt-1 text-[10px] text-slate-400">{preview.lastAction}</p>}
                </div>
              </div>
              <button
                className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                onClick={() => setPreviewId(null)}
                aria-label="Cerrar documento"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid gap-4 rounded-xl bg-[#f6f8f7] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Cliente</p>
                  <p className="mt-1.5 text-sm font-semibold">{preview.client}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{preview.contact}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Fecha y vigencia</p>
                  <p className="mt-1.5 text-sm font-semibold">{preview.date}</p>
                  {vigencia(preview)}
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Lista de precios</p>
                  <p className="mt-1.5 text-sm font-semibold">{preview.priceList || "Asignada al cliente"}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{preview.owner}</p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#fafcfb] text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 text-center">Cantidad</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(preview.lines || []).map((line) => (
                      <tr key={line.sku}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{line.name}</p>
                          <p className="mt-1 text-[9px] text-slate-400">{line.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {mxn(line.unitPrice)}
                          {line.discountAmount ? (
                            <span className="block text-[9px] text-[#c9664f]">
                              desc. {line.discount?.type === "%" ? `${line.discount.value}% ` : ""}−{mxn(line.discountAmount)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{mxn(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 ml-auto max-w-xs space-y-2 text-xs">
                {preview.discountAmount ? (
                  <div className="flex justify-between text-[#c9664f]">
                    <span>Descuento global{preview.discount?.type === "%" ? ` (${preview.discount.value}%)` : ""}</span>
                    <span>−{mxn(preview.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal sin IVA</span>
                  <span>{mxn(preview.amount - (preview.tax ?? preview.amount - preview.amount / 1.16))}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>IVA incluido</span>
                  <span>{mxn(preview.tax ?? preview.amount - preview.amount / 1.16)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span>{mxn(preview.amount)}</span>
                </div>
                <p className="pt-1 text-[10px] leading-snug text-slate-400">
                  Todos nuestros precios incluyen IVA. El desglose se muestra solo con fines fiscales; no se cobra IVA
                  adicional.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-[#fafcfb] p-5">
              <button className="secondary-button mr-auto flex items-center gap-2 bg-white" onClick={() => setPrintId(preview.id)}>
                <Printer size={15} /> Imprimir
              </button>
              <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => openEmail(preview)}>
                <Mail size={15} /> Enviar por correo
              </button>
              <button className="secondary-button flex items-center gap-2 bg-white" onClick={() => sendWhatsApp(preview)}>
                <MessageCircle size={15} /> Enviar por WhatsApp
              </button>
              <ConvertButton quote={preview} large />
            </div>
          </article>
        </div>
      )}

      {emailing && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#102521]/65 p-4 backdrop-blur-sm">
          <form
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              sendEmail();
            }}
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="eyebrow">Enviar por correo</p>
                <h2 className="mt-1 text-xl font-semibold">Cotización {emailing.id}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {emailing.client} · {mxn(emailing.amount)}
                </p>
              </div>
              <button type="button" className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={() => setEmailId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="form-label">
                Para *
                <input required type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="form-input" placeholder="correo@cliente.com" />
              </label>
              <label className="form-label">
                Asunto
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="form-input" />
              </label>
              <label className="form-label">
                Mensaje
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="min-h-40 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs leading-relaxed outline-none focus:border-[#2f7468]"
                />
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <span className="grid size-9 place-items-center rounded-lg bg-[#fff0eb] text-[9px] font-bold text-[#c9664f]">PDF</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">Cotizacion_{emailing.id}_{emailing.client.replace(/\s+/g, "_")}.pdf</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Documento tamaño carta · se adjunta automáticamente</p>
                </div>
                <button type="button" className="link-button" onClick={() => setPrintId(emailing.id)}>
                  Ver
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-[#fafcfb] p-5">
              <a
                className="secondary-button mr-auto flex items-center gap-2 bg-white"
                href={`mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  markSent(emailing, "correo");
                  setEmailId(null);
                }}
              >
                Abrir en mi correo
              </a>
              <button type="button" className="secondary-button bg-white" onClick={() => setEmailId(null)}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={!emailTo.trim()}>
                <Send size={15} /> Enviar
              </button>
            </div>
          </form>
        </div>
      )}

      {converting && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#102521]/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="eyebrow">Convertir cotización</p>
                <h2 className="mt-1 text-xl font-semibold">{converting.id} → Venta y orden</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {converting.client} · {converting.lines?.length || 0} partidas · {mxn(converting.amount)}
                </p>
              </div>
              <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={() => setConvertId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="form-label">
                Tipo de entrega
                <div className="grid grid-cols-2 gap-2">
                  {(["Ruta", "Recoge en mostrador"] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setConvertOptions((o) => ({ ...o, fulfillment: item }))}
                      className={`rounded-xl border p-3 text-left text-xs font-semibold ${
                        convertOptions.fulfillment === item ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {item === "Ruta" ? "Envío a domicilio (ruta)" : "Recoge en mostrador"}
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const short = (converting.lines || [])
                  .map((line) => {
                    const product = products.find((item) => item.sku === line.sku);
                    const available = product ? product.stock - product.reserved : 0;
                    return { line, available, missing: line.quantity - Math.max(0, available) };
                  })
                  .filter((item) => item.missing > 0);
                return short.length ? (
                  <div className="rounded-xl border border-[#f0d9a3] bg-[#fffaf0] p-4 text-[11px] leading-relaxed text-[#8a651e]">
                    <p className="font-semibold">Existencia insuficiente en {short.length} {short.length === 1 ? "partida" : "partidas"}:</p>
                    <ul className="mt-1.5 space-y-1">
                      {short.map(({ line, available, missing }) => (
                        <li key={line.sku} className="flex justify-between gap-3">
                          <span className="truncate">{line.name}</span>
                          <span className="shrink-0 font-semibold">
                            pide {line.quantity} · hay {Math.max(0, available)} · faltan {missing}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">Puedes convertir de todos modos: la orden se surtirá con lo disponible o tras registrar la entrada de mercancía.</p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 rounded-xl bg-[#eaf6ef] px-3 py-2.5 text-[11px] font-semibold text-[#347652]">
                    <Check size={13} /> Hay existencia suficiente para todas las partidas.
                  </p>
                );
              })()}
              <div className="rounded-xl bg-[#f2f8f6] p-4 text-[11px] leading-relaxed text-[#285e56]">
                <p className="font-semibold">Al confirmar:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  <li>
                    La cotización cambia a <strong>Aceptada</strong>.
                  </li>
                  <li>Se registra la venta tipo pedido en Ventas, por cobrar. El cobro se registra después en Ventas o en Rutas.</li>
                  <li>Se crea la orden de surtido y se reserva el stock de cada partida.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">
              <button className="secondary-button bg-white" onClick={() => setConvertId(null)}>
                Cancelar
              </button>
              <button className="primary-button" onClick={confirmConvert}>
                <Check size={15} /> Convertir y generar orden
              </button>
            </div>
          </div>
        </div>
      )}

      {printing && (
        <QuotePrintView quote={printing} customer={customerOf(printing)} onClose={() => setPrintId(null)} />
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  dark = false,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof FileText;
  dark?: boolean;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button className="stat-card stat-card--link" onClick={onClick}>
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
    );
  }
  return (
    <article className={`stat-card ${dark ? "stat-card--dark" : ""}`}>
      <div className="stat-icon">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div className="mt-5">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className={`mt-2 text-xs ${dark ? "text-white/55" : "text-slate-400"}`}>{detail}</p>
      </div>
    </article>
  );
}

function App() {
  const [currentUserId, setCurrentUserId] = useState("COL-001");
  // Sesión: nadie entra sin iniciar sesión; el PIN se habilita en el equipo después del primer acceso con correo
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockSwitch, setLockSwitch] = useState(false);
  const lastActivity = useRef(Date.now());
  const [roles, setRoles] = useState<AccessRole[]>(initialRoles);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialAccounts);
  const [terminals, setTerminals] = useState<Terminal[]>(initialTerminals);
  const [manualBank, setManualBank] = useState<BankMovement[]>([
    { id: "bm-seed-1", accountId: "acc-san", dateISO: "2026-11-17", at: "11:20", kind: "Otro egreso", gross: 12852, fee: 0, net: -12852, reference: "Pago a Distribuidora Amanco · OC-0041", status: "Confirmado", manual: true },
  ]);
  // Los cobros de días anteriores ya están confirmados con lo que realmente depositó el banco
  const [bankOverrides, setBankOverrides] = useState<Record<string, BankOverride>>({
    "sale-V-1844-0": { confirmed: true },
    "sale-V-1842-0": { received: 9583.4 },
    "sale-V-1840-0": { confirmed: true },
    "sale-V-1838-0": { received: 1171.6 },
    "dep-CJ-0010": { confirmed: true },
    "dep-CJ-0011": { confirmed: true },
  });
  const [activeNav, setActiveNav] = useState("Inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteCustomer, setQuoteCustomer] = useState<Customer | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [range, setRange] = useState<"Hoy" | "Semana">("Hoy");
  const [completed, setCompleted] = useState<string[]>([]);
  const [allTasksOpen, setAllTasksOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focus, setFocus] = useState<NavFocus>({});
  const [navKey, setNavKey] = useState(0);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>(() => initialQuotes.map(applyExpiry));
  const [sales, setSales] = useState<Sale[]>(() =>
    initialSales.map((sale) => ({
      ...sale,
      orderId:
        sale.orderId ?? initialOrders.find((order) => order.source.includes(sale.id))?.id,
      // Ventas de mostrador de hoy pertenecen al turno de caja abierto
      cashSessionId: sale.type === "Mostrador" && sale.date === "18 nov 2026" ? "CJ-0012" : sale.cashSessionId,
      returnedAmount: sale.id === "V-1844" ? 189 : sale.returnedAmount,
    })),
  );
  // Los apartados vigentes de ejemplo tienen su material apartado
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>(() =>
    initialInventory.map((product) => {
      const held = initialLayaways
        .filter((l) => l.status === "Vigente")
        .flatMap((l) => l.items)
        .filter((item) => item.sku === product.sku)
        .reduce((sum, item) => sum + item.quantity, 0);
      return held ? { ...product, reserved: product.reserved + held } : product;
    }),
  );
  const [layaways, setLayaways] = useState<Layaway[]>(initialLayaways);
  const [walletMovements, setWalletMovements] = useState<WalletMovement[]>(initialWallet);
  const [customers, setCustomers] = useState<Customer[]>(() =>
    initialCustomers.map((customer) => (customer.businessName === "Ferretería López" ? { ...customer, creditBalance: 189 } : customer)),
  );
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [routePlans, setRoutePlans] = useState<RoutePlan[]>(initialRoutePlans);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(initialPurchases);
  const [cashSessions, setCashSessions] = useState<CashSession[]>(initialCashSessions);
  const [specialOrders, setSpecialOrders] = useState<SpecialOrder[]>(initialSpecialOrders);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(defaultFixedExpenses);
  const [kits, setKits] = useState<Kit[]>(initialKits);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialCollaborators);
  const [advances, setAdvances] = useState<Advance[]>(initialAdvances);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [socialRate, setSocialRate] = useState(DEFAULT_SOCIAL_RATE);
  // Datos de la empresa y políticas del negocio (Configuración → Empresa / Políticas)
  const [companyCfg, setCompanyCfg] = useState<CompanyConfig>(initialCompany);
  const [policyCfg, setPolicyCfg] = useState<Policies>(initialPolicies);
  applyConfig(companyCfg, policyCfg);
  // Choferes, almacenistas y supervisores de los demás módulos salen de Colaboradores
  const activeStaff = collaborators.filter((c) => c.status === "Activo");
  setStaff({
    drivers: activeStaff.filter((c) => c.area === "Reparto").map((c) => c.name),
    pickers: activeStaff.filter((c) => c.area === "Almacén").map((c) => c.name),
    supervisors: activeStaff
      .filter((c) => can(roles, c.role, "ventas.autorizar") && c.pin)
      .map((c) => ({ name: c.name, role: c.position, pin: c.pin! })),
  });
  const payrollMonthly = activeStaff.reduce((sum, c) => sum + monthlyCost(c, socialRate), 0);
  /** Partidas con kits → partidas de componentes con su nombre y ubicación en almacén */
  const explode = <T extends { sku: string; quantity: number; name?: string; unit?: string; location?: string }>(list: T[]) =>
    explodeLines(list, kits).map((line) => {
      if (!line.kitSku) return line;
      const product = inventoryProducts.find((item) => item.sku === line.sku);
      return { ...line, name: product?.name ?? line.sku, unit: product?.saleUnit ?? line.unit, location: product ? `${product.aisle}-${product.shelf}` : "—" };
    });
  const [returns, setReturns] = useState<SaleReturn[]>([
    {
      id: "DV-0001",
      saleId: "V-1844",
      client: "Ferretería López",
      date: "17 nov 2026",
      time: "18:20",
      lines: [{ sku: "PVC-COD-100", name: 'Codo PVC hidráulico 1" 90°', unit: "pieza", quantity: 10, unitPrice: 18.9, amount: 189, condition: "Buen estado" }],
      reason: "No lo utilizó / sobrante de obra",
      notes: "Sobrante de la obra Av. Juárez",
      total: 189,
      appliedToBalance: 0,
      refundAmount: 189,
      refundMethod: "Saldo a favor",
      user: "Ana López",
    },
  ]);
  const [movements, setMovements] = useState<StockMovement[]>(() =>
    initialInventory.map((product) => ({
      id: `mv-init-${product.sku}`,
      sku: product.sku,
      date: "01 nov 2026 · 08:00",
      kind: "Entrada" as const,
      qty: product.stock,
      stockAfter: product.stock,
      reference: "Inventario inicial",
      user: "Carlos Mendoza",
    })),
  );

  // ---------- Usuario actual y permisos ----------
  const currentUser = collaborators.find((c) => c.id === currentUserId) ?? collaborators[0];
  const userRole = currentUser.role;
  const allow = (key: PermissionKey) => can(roles, userRole, key);
  const navPermission = (label: string) => PERMISSION_GROUPS.find((g) => g.nav === label)?.view;
  const navAllowed = (label: string) => {
    const key = navPermission(label);
    return key ? allow(key) : true;
  };
  // Tareas y textos de Inicio según el área del rol
  const role: Role = userRole === ADMIN_ROLE || userRole === "Gerente" ? "Administrador" : ["Vendedor", "Cajero"].includes(userRole) ? "Ventas" : "Almacén";
  const user = {
    name: currentUser.name,
    greeting: `Buenos días, ${currentUser.name.split(" ")[0]}`,
    description: roleData[role].description,
  };
  const switchUser = (id: string, message?: string) => {
    const next = collaborators.find((c) => c.id === id);
    if (!next) return;
    setCurrentUserId(id);
    const first = ["Inicio", ...navItems.map((i) => i.label), "Configuración"].find((label) => {
      const key = navPermission(label);
      return !key || can(roles, next.role, key);
    });
    setActiveNav(first ?? "Inicio");
    setFocus({});
    setNavKey((k) => k + 1);
    showToast(message ?? `Ahora ves el sistema como ${next.name} · ${next.role}`);
  };

  // ---------- Inicio de sesión, cambio de usuario y bloqueo ----------
  const loginUsers: LoginUser[] = collaborators
    .filter((c) => c.status === "Activo" && c.role !== NO_ACCESS_ROLE)
    .map((c) => ({ id: c.id, name: c.name, role: c.role, email: c.email, pin: c.pin }));
  const startSession = (id: string) => {
    const same = id === sessionUserId;
    setSessionUserId(id);
    setDeviceReady(true);
    setLocked(false);
    lastActivity.current = Date.now();
    const who = collaborators.find((c) => c.id === id);
    if (same) showToast(`Bienvenido de nuevo, ${who?.name.split(" ")[0]}`);
    else switchUser(id, `Sesión iniciada: ${who?.name} · ${who?.role}`);
  };
  const logout = () => {
    setSessionUserId(null);
    setLocked(false);
    setProfileOpen(false);
  };
  // Si al colaborador le quitan el acceso o lo dan de baja, su sesión se cierra
  useEffect(() => {
    if (sessionUserId && !loginUsers.some((u) => u.id === sessionUserId)) logout();
  });
  // Bloqueo por inactividad (Configuración → Políticas)
  useEffect(() => {
    if (!sessionUserId || locked || !policyCfg.lockMinutes) return;
    const touch = () => (lastActivity.current = Date.now());
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > policyCfg.lockMinutes * 60_000) {
        setLockSwitch(false);
        setLocked(true);
      }
    }, 5_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(timer);
    };
  }, [sessionUserId, locked, policyCfg.lockMinutes]);
  const saveRole = (role: AccessRole, previousName?: string) => {
    setRoles((items) => (items.some((r) => r.id === role.id) ? items.map((r) => (r.id === role.id ? role : r)) : [...items.slice(0, -1), role, items[items.length - 1]]));
    if (previousName && previousName !== role.name)
      setCollaborators((items) => items.map((c) => (c.role === previousName ? { ...c, role: role.name } : c)));
  };
  const deleteRole = (role: AccessRole) => {
    setRoles((items) => items.filter((r) => r.id !== role.id));
    setCollaborators((items) => items.map((c) => (c.role === role.name ? { ...c, role: NO_ACCESS_ROLE } : c)));
  };

  const navigate = (label: string, nextFocus: NavFocus = {}) => {
    setActiveNav(label);
    setFocus(nextFocus);
    setNavKey((key) => key + 1);
    setSidebarOpen(false);
    topRef.current?.scrollIntoView({ block: "start" });
  };

  // Existencias críticas: los 5 productos con menor disponible (existencia - reservado)
  const lowStockCount = inventoryProducts.filter(
    (product) => product.stock - product.reserved <= product.minimumStock,
  ).length;
  const criticalInventory = useMemo(
    () =>
      inventoryProducts
        .filter((product) =>
          `${product.name} ${product.sku} ${product.brand}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((product) => ({ ...product, available: product.stock - product.reserved }))
        .sort((a, b) => a.available - b.available)
        .slice(0, 5),
    [inventoryProducts, search],
  );

  // KPIs de inicio calculados con los datos reales de cada módulo
  const activeQuotes = quotes.filter((quote) => activeQuoteStatuses.includes(quote.status));
  const paidSales = sales.filter(
    (sale) => sale.status === "Pagada" && (range === "Semana" || sale.date === "18 nov 2026"),
  );
  // Las recepciones de compra viven en Órdenes, pero no son pedidos de clientes
  const pickingOrders = orders.filter((order) => !isReception(order));
  const ordersToPick = pickingOrders.filter((order) => toPickStatuses.includes(order.status));
  const ordersOnRoute = orders.filter((order) => order.status === "Asignada a ruta");
  const pendingStops = routePlans.reduce(
    (sum, route) => sum + route.stops.filter((stop) => stop.status === "Pendiente").length,
    0,
  );

  // Buscador global
  type SearchResult = {
    id: string;
    group: string;
    icon: typeof FileText;
    title: string;
    meta: string;
    nav: string;
    focus: NavFocus;
  };
  const searchResults = useMemo<SearchResult[]>(() => {
    const term = globalQuery.trim().toLowerCase();
    if (!term) return [];
    const has = (text: string) => text.toLowerCase().includes(term);
    const limit = <T,>(items: T[]) => items.slice(0, 4);
    return [
      ...limit(
        inventoryProducts.filter((p) => has(`${p.name} ${p.sku} ${p.brand} ${p.category}`)),
      ).map((p) => ({
        id: `p-${p.id}`,
        group: "Productos",
        icon: Boxes,
        title: p.name,
        meta: `${p.sku} · ${p.stock - p.reserved} ${p.baseUnit} disponibles · ${p.aisle}-${p.shelf}`,
        nav: "Inventario",
        focus: { query: p.sku },
      })),
      ...limit(
        customers.filter((c) => has(`${c.businessName} ${c.contactName} ${c.rfc} ${c.phone}`)),
      ).map((c) => ({
        id: `c-${c.id}`,
        group: "Clientes",
        icon: Users,
        title: c.businessName,
        meta: `${c.contactName} · ${c.phone}`,
        nav: "Clientes",
        focus: { selectedId: c.id },
      })),
      ...limit(orders.filter((o) => has(`${o.id} ${o.customer} ${o.source}`))).map((o) => ({
        id: `o-${o.id}`,
        group: "Pedidos y órdenes",
        icon: ClipboardList,
        title: `Orden ${o.id}`,
        meta: `${o.customer} · ${o.status}`,
        nav: "Órdenes",
        focus: { selectedId: o.id },
      })),
      ...limit(quotes.filter((q) => has(`${q.id} ${q.client} ${q.contact}`))).map((q) => ({
        id: `q-${q.id}`,
        group: "Cotizaciones",
        icon: FileText,
        title: `Cotización ${q.id}`,
        meta: `${q.client} · ${q.status}`,
        nav: "Cotizaciones",
        focus: { query: q.id },
      })),
      ...limit(sales.filter((s) => has(`${s.id} ${s.client}`))).map((s) => ({
        id: `s-${s.id}`,
        group: "Ventas",
        icon: ShoppingCart,
        title: `Venta ${s.id}`,
        meta: `${s.client} · ${s.status}`,
        nav: "Ventas",
        focus: { query: s.id },
      })),
    ];
  }, [globalQuery, inventoryProducts, customers, orders, quotes, sales]);

  const openSearchResult = (result: SearchResult) => {
    navigate(result.nav, result.focus);
    setGlobalQuery("");
    setSearchOpen(false);
  };

  const openTask = (task: Task) => {
    setAllTasksOpen(false);
    navigate(task.nav, task.focus);
  };

  const toggleTask = (title: string) =>
    setCompleted((items) =>
      items.includes(title) ? items.filter((item) => item !== title) : [...items, title],
    );

  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const handleCreateQuote = (result: QuoteBuilderResult) => {
    const nextNumber = Math.max(...quotes.map((quote) => Number(quote.id.replace("C-", "")))) + 1;
    setQuotes((items) => [
      {
        id: `C-${nextNumber}`,
        client: result.customer.businessName,
        contact: result.customer.contactName,
        phone: result.customer.phone,
        amount: result.total,
        items: result.lines.reduce((sum, line) => sum + line.quantity, 0),
        date: fullDate(TODAY_ISO),
        issuedAt: TODAY_ISO,
        expiresAt: addDays(TODAY_ISO, parseInt(result.validity, 10) || policies.quoteValidityDays),
        validUntil: shortDate(addDays(TODAY_ISO, parseInt(result.validity, 10) || policies.quoteValidityDays)),
        status: result.status,
        lastAction: result.status === "Enviada" ? `Finalizada · ${nowTime()}` : "Borrador guardado",
        owner: user.name,
        priceList: result.priceList,
        lines: result.lines,
        subtotal: result.subtotal,
        tax: result.tax,
        notes: result.notes,
        discount: result.discount,
        discountAmount: result.discountAmount,
      },
      ...items,
    ]);
    navigate("Cotizaciones");
    setQuoteOpen(false);
    setQuoteCustomer(null);
    showToast(`Cotización C-${nextNumber} creada correctamente`);
  };

  // ---------- Kardex ----------
  const movementStamp = () => `${fullDate(TODAY_ISO)} · ${nowTime()}`;
  /** Registra movimientos; para los que cambian existencia calcula la existencia resultante */
  const recordMovements = (
    entries: { sku: string; kind: StockMovement["kind"]; qty: number; reference: string; note?: string }[],
  ) => {
    const running: Record<string, number> = {};
    const created = entries
      .filter((entry) => entry.qty !== 0)
      .map((entry, index) => {
        const product = inventoryProducts.find((item) => item.sku === entry.sku);
        const changesStock = ["Entrada", "Salida", "Ajuste", "Merma"].includes(entry.kind);
        if (product && changesStock) running[entry.sku] = (running[entry.sku] ?? product.stock) + entry.qty;
        return {
          id: `mv-${Date.now()}-${index}`,
          date: movementStamp(),
          user: user.name,
          ...entry,
          stockAfter: product && changesStock ? Math.max(0, running[entry.sku]) : undefined,
        };
      })
      .filter((entry) => inventoryProducts.some((product) => product.sku === entry.sku));
    if (created.length) setMovements((items) => [...created.reverse(), ...items]);
  };

  const adjustStock = (sku: string, input: AdjustInput) => {
    const product = inventoryProducts.find((item) => item.sku === sku);
    if (!product) return;
    const qty =
      input.kind === "Entrada" ? input.qty : input.kind === "Conteo" ? input.counted - product.stock : -input.qty;
    setInventoryProducts((items) =>
      items.map((item) =>
        item.sku !== sku
          ? item
          : {
              ...item,
              stock: Math.max(0, item.stock + qty),
              cost:
                input.kind === "Entrada"
                  ? (item.stock * item.cost + input.qty * input.unitCost) / Math.max(1, item.stock + input.qty)
                  : item.cost,
              supplier: input.kind === "Entrada" && input.supplier ? input.supplier : item.supplier,
            },
      ),
    );
    recordMovements([
      {
        sku,
        kind: input.kind === "Conteo" ? "Ajuste" : input.kind,
        qty,
        reference:
          input.kind === "Entrada"
            ? `Compra · ${input.reference}${input.supplier ? ` · ${input.supplier}` : ""}`
            : input.kind === "Conteo"
              ? "Conteo físico"
              : "Merma",
        note: input.kind === "Entrada" ? undefined : input.note,
      },
    ]);
    showToast(
      input.kind === "Conteo" && qty === 0
        ? `Conteo de ${sku} registrado sin diferencias`
        : `${sku}: ${qty > 0 ? "+" : ""}${qty} ${product.saleUnit} registrados en el kardex`,
    );
  };

  const updateProduct = (product: InventoryProduct) =>
    setInventoryProducts((items) => items.map((item) => (item.id === product.id ? product : item)));

  // ---------- Compras ----------
  const updatePurchase = (po: PurchaseOrder) =>
    setPurchases((items) => items.map((item) => (item.id === po.id ? po : item)));

  /** La compra llegó: se genera la orden de recepción en Órdenes para que almacén le dé entrada */
  const sendPurchaseToWarehouse = (po: PurchaseOrder) => {
    const next =
      Math.max(10, ...orders.filter((order) => order.id.startsWith("RE-")).map((order) => Number(order.id.replace("RE-", "")))) + 1;
    const id = `RE-${String(next).padStart(4, "0")}`;
    const reception: Order = {
      id,
      kind: "Recepción",
      purchaseId: po.id,
      source: `Compra ${po.id}`,
      customer: po.supplierName,
      date: `${fullDate(TODAY_ISO)} · ${nowTime()}`,
      requiredAt: "Hoy",
      status: "Pendiente",
      priority: "Normal",
      fulfillment: "Recoge en mostrador",
      notes: po.specialOrderId
        ? `Pedido especial ${po.specialOrderId}: apartar para el cliente, no acomodar en anaquel de venta.`
        : po.notes,
      items: po.lines.filter((line) => line.quantity - (line.received ?? 0) > 0).map((line, index) => {
        const product = inventoryProducts.find((item) => item.sku === line.sku);
        return {
          id: `${id}-${index}`,
          sku: line.sku,
          name: line.name,
          quantity: line.quantity - (line.received ?? 0),
          unit: line.unit,
          aisle: product?.aisle ?? "—",
          shelf: product?.shelf ?? "—",
          available: product?.stock ?? 0,
          picked: false,
          issue: false,
          unitCost: line.unitCost,
        };
      }),
    };
    setOrders((items) => [reception, ...items]);
    updatePurchase({ ...po, status: "En recepción", receivedAt: undefined, arrivedAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`, receptionOrderId: id });
    showToast(`${po.id} enviada a almacén: recepción ${id} creada en Órdenes`);
  };

  /** Recepción firmada: entra el material al inventario y se cierra la compra */
  const completeReception = (order: Order) => {
    const received = order.items.filter((item) => (item.pickedQty ?? 0) > 0);
    setInventoryProducts((items) =>
      items.map((product) => {
        const lines = received.filter((item) => item.sku === product.sku);
        if (!lines.length) return product;
        const qty = lines.reduce((sum, item) => sum + (item.pickedQty ?? 0), 0);
        const value = lines.reduce((sum, item) => sum + (item.pickedQty ?? 0) * (item.unitCost ?? product.cost), 0);
        return {
          ...product,
          stock: product.stock + qty,
          cost: Math.round(((product.stock * product.cost + value) / Math.max(1, product.stock + qty)) * 100) / 100,
        };
      }),
    );
    recordMovements(
      received.map((item) => ({
        sku: item.sku,
        kind: "Entrada" as const,
        qty: item.pickedQty ?? 0,
        reference: `Recepción ${order.purchaseId} · ${order.customer}`,
      })),
    );
    const po = purchases.find((item) => item.id === order.purchaseId);
    if (po) {
      const lines = po.lines.map((line) => {
        const got = order.items.filter((item) => item.sku === line.sku).reduce((sum, item) => sum + (item.pickedQty ?? 0), 0);
        return { ...line, received: (line.received ?? 0) + got };
      });
      const complete = lines.every((line) => (line.received ?? 0) >= line.quantity);
      updatePurchase({
        ...po,
        lines,
        status: complete ? "Recibida" : "Recibida parcial",
        receivedAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`,
      });
      // Pedido especial: lo recibido se aparta para el cliente y se le avisa
      if (po.specialOrderId) {
        const reserve = received.filter((item) => inventoryProducts.some((product) => product.sku === item.sku));
        if (reserve.length) {
          setInventoryProducts((items) =>
            items.map((product) => {
              const qty = reserve.filter((item) => item.sku === product.sku).reduce((sum, item) => sum + (item.pickedQty ?? 0), 0);
              return qty ? { ...product, reserved: product.reserved + qty } : product;
            }),
          );
          recordMovements(
            reserve.map((item) => ({ sku: item.sku, kind: "Apartado" as const, qty: item.pickedQty ?? 0, reference: `Pedido especial ${po.specialOrderId}` })),
          );
        }
        updateSpecial(po.specialOrderId, { status: "Recibido", receivedISO: TODAY_ISO, receivedAt: `${fullDate(TODAY_ISO)} · ${nowTime()}` });
      }
    }
  };

  // ---------- Pedidos especiales ----------
  const updateSpecial = (id: string, changes: Partial<SpecialOrder>) =>
    setSpecialOrders((items) => items.map((order) => (order.id === id ? { ...order, ...changes } : order)));
  const createSpecialOrder = (data: NewSpecialOrder) => {
    const number = Math.max(0, ...specialOrders.map((order) => Number(order.id.replace("PE-", "")))) + 1;
    const id = `PE-${String(number).padStart(4, "0")}`;
    const order: SpecialOrder = {
      ...data,
      id,
      dateISO: TODAY_ISO,
      createdAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`,
      createdBy: user.name,
      status: "Por pedir",
      items: data.items.map((item, index) => (item.inCatalog ? item : { ...item, sku: `ESP-${String(number).padStart(4, "0")}-${index + 1}` })),
    };
    setSpecialOrders((items) => [order, ...items]);
    if (openCash)
      addCashMovement({
        kind: "Anticipo",
        amount: data.deposit,
        concept: `Anticipo pedido especial ${id} · ${data.client}`,
        reference: id,
        method: data.depositMethod === "Efectivo" ? undefined : data.depositMethod,
      });
    showToast(`Pedido especial ${id} registrado · anticipo ${mxn(data.deposit)} cobrado`);
    return id;
  };
  const specialToPurchase = (id: string) => {
    const sp = specialOrders.find((order) => order.id === id);
    if (!sp) return;
    const poId = `OC-${String(Math.max(...purchases.map((po) => Number(po.id.replace("OC-", ""))), 0) + 1).padStart(4, "0")}`;
    const stamp = `${fullDate(TODAY_ISO)} · ${nowTime()}`;
    setPurchases((items) => [
      {
        id: poId,
        supplierId: sp.supplierId,
        supplierName: sp.supplierName,
        date: fullDate(TODAY_ISO),
        dateISO: TODAY_ISO,
        requiredISO: sp.promiseISO,
        status: "Aprobada",
        origin: "Pedido especial",
        specialOrderId: sp.id,
        lines: sp.items.map((item) => ({
          sku: item.sku,
          name: item.inCatalog || !item.spec ? item.name : `${item.name} · ${item.spec}`,
          unit: item.unit,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
        notes: `Pedido especial ${sp.id} de ${sp.client}.${sp.notes ? ` ${sp.notes}` : ""}`,
        createdBy: user.name,
        approvedBy: user.name,
        approvedAt: stamp,
      },
      ...items,
    ]);
    updateSpecial(id, { status: "Pedido al proveedor", purchaseId: poId, orderedAt: stamp });
    showToast(`${poId} generada y aprobada para ${sp.supplierName} · envíala desde Compras`);
  };
  const notifySpecial = (id: string) => {
    const sp = specialOrders.find((order) => order.id === id);
    if (!sp) return;
    const text = `Hola, le avisamos de ${company.commercialName} que su pedido especial ${sp.id} ya llegó. Saldo pendiente: ${mxn(specialBalance(sp))}. Tiene ${policies.specialPickupDays} días para recogerlo.`;
    window.open(`https://wa.me/52${sp.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    updateSpecial(id, { status: "Avisado", notifiedAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`, notifiedISO: TODAY_ISO });
    showToast(`Aviso de ${sp.id} enviado a ${sp.client}`);
  };
  const deliverSpecial = (id: string, method: string) => {
    const sp = specialOrders.find((order) => order.id === id);
    if (!sp) return;
    const remaining = specialBalance(sp);
    const saleId = `V-${Math.max(...sales.map((sale) => Number(sale.id.replace("V-", "")))) + 1}`;
    setSales((items) => [
      {
        id: saleId,
        client: sp.client,
        amount: sp.total,
        items: sp.items.reduce((sum, item) => sum + item.quantity, 0),
        date: fullDate(TODAY_ISO),
        time: nowTime(),
        status: "Pagada",
        payment: "Mixto",
        payments: [
          { method: "Anticipo", amount: sp.deposit },
          ...(remaining > 0 ? [{ method: method as Sale["payment"] & string, amount: remaining }] : []),
        ] as Sale["payments"],
        seller: user.name,
        type: "Pedido",
        cashSessionId: openCash?.id,
        specialOrderId: sp.id,
        lines: sp.items.map((item) => ({
          sku: item.sku,
          name: item.inCatalog || !item.spec ? item.name : `${item.name} · ${item.spec}`,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
          unitCost: item.unitCost,
        })),
      },
      ...items,
    ]);
    const catalog = sp.items.filter((item) => item.inCatalog);
    if (catalog.length) {
      setInventoryProducts((items) =>
        items.map((product) => {
          const qty = catalog.filter((item) => item.sku === product.sku).reduce((sum, item) => sum + item.quantity, 0);
          return qty ? { ...product, stock: Math.max(0, product.stock - qty), reserved: Math.max(0, product.reserved - qty) } : product;
        }),
      );
      recordMovements(
        catalog.map((item) => ({ sku: item.sku, kind: "Salida" as const, qty: -item.quantity, reference: `Entrega pedido especial ${sp.id} · venta ${saleId}` })),
      );
    }
    if (method === "Saldo a favor") addWallet(sp.client, "Consumo", -remaining, `Liquidación pedido especial ${sp.id} · venta ${saleId}`);
    updateSpecial(id, { status: "Entregado", deliveredAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`, saleId });
    showToast(`${sp.id} entregado · venta ${saleId} generada con anticipo aplicado`);
  };
  const cancelSpecial = (id: string, reason: string) => {
    const sp = specialOrders.find((order) => order.id === id);
    if (!sp) return;
    if (["Recibido", "Avisado"].includes(sp.status)) {
      const catalog = sp.items.filter((item) => item.inCatalog);
      if (catalog.length) {
        setInventoryProducts((items) =>
          items.map((product) => {
            const qty = catalog.filter((item) => item.sku === product.sku).reduce((sum, item) => sum + item.quantity, 0);
            return qty ? { ...product, reserved: Math.max(0, product.reserved - qty) } : product;
          }),
        );
        recordMovements(
          catalog.map((item) => ({ sku: item.sku, kind: "Liberación" as const, qty: item.quantity, reference: `Cancelación pedido especial ${sp.id}` })),
        );
      }
    }
    const po = purchases.find((item) => item.id === sp.purchaseId);
    if (po && ["Borrador", "Aprobada"].includes(po.status)) updatePurchase({ ...po, status: "Cancelada" });
    updateSpecial(id, { status: "Cancelado", cancelledAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`, cancelReason: reason });
    showToast(`${sp.id} cancelado · anticipo de ${mxn(sp.deposit)} retenido`);
  };
  const specialTasks: Task[] = [
    ...layaways
      .filter((l) => l.status === "Vigente" && l.dueISO < TODAY_ISO)
      .map((l) => ({
        title: "Apartado vencido",
        meta: `${l.id} · ${l.client} · abonado ${mxn(layawayPaid(l))}`,
        type: "Prórroga o cancelar",
        nav: "Ventas",
        focus: { status: "Apartados" },
        action: "Ver apartado",
      })),
    ...specialOrders.filter(specialIsUncollected).map((sp) => ({
      title: `Pedido especial sin recoger`,
      meta: `${sp.id} · ${sp.client} · saldo ${mxn(specialBalance(sp))}`,
      type: "Más de 7 días",
      nav: "Ventas",
      focus: { status: "Pedidos especiales" },
      action: "Ver pedido especial",
    })),
    ...specialOrders.filter(specialIsLate).map((sp) => ({
      title: `Pedido especial atrasado`,
      meta: `${sp.id} · ${sp.supplierName} · ${sp.purchaseId}`,
      type: "Proveedor",
      nav: "Ventas",
      focus: { status: "Pedidos especiales" },
      action: "Ver pedido especial",
    })),
  ];

  // Actualiza una orden y refleja en inventario las entregas (sale material) y cancelaciones (se libera lo apartado)
  const updateOrder = (updated: Order) => {
    const previous = orders.find((order) => order.id === updated.id);
    const shippedLines = () =>
      updated.items.map((item) => ({ sku: item.sku, qty: item.pickedQty ?? item.quantity }));
    const delta = (sign: 1 | -1, stock: boolean) =>
      setInventoryProducts((items) =>
        items.map((product) => {
          const lines = updated.items.filter((item) => item.sku === product.sku);
          if (!lines.length) return product;
          const reserved = lines.reduce((sum, item) => sum + item.quantity, 0);
          const shipped = lines.reduce((sum, item) => sum + (item.pickedQty ?? item.quantity), 0);
          return {
            ...product,
            reserved: Math.max(0, product.reserved - sign * reserved),
            stock: stock ? Math.max(0, product.stock - sign * shipped) : product.stock,
          };
        }),
      );
    if (previous && isReception(updated)) {
      if (previous.status !== "Lista" && updated.status === "Lista") completeReception(updated);
      setOrders((items) => items.map((order) => (order.id === updated.id ? updated : order)));
      return;
    }
    if (previous && previous.status !== updated.status) {
      if (updated.status === "Entregada") {
        delta(1, true);
        recordMovements(
          shippedLines().map((line) => ({ sku: line.sku, kind: "Salida" as const, qty: -line.qty, reference: `Entrega orden ${updated.id}` })),
        );
      } else if (previous.status === "Entregada") {
        delta(-1, true);
        recordMovements(
          shippedLines().map((line) => ({ sku: line.sku, kind: "Entrada" as const, qty: line.qty, reference: `Corrección de entrega ${updated.id}` })),
        );
      }
      if (updated.status === "Cancelada" && previous.status !== "Cancelada") {
        delta(1, false);
        recordMovements(
          updated.items.map((item) => ({ sku: item.sku, kind: "Liberación" as const, qty: item.quantity, reference: `Cancelación orden ${updated.id}` })),
        );
      }
    }
    setOrders((items) => items.map((order) => (order.id === updated.id ? updated : order)));
  };

  // Venta de mostrador. Si tiene pago contra entrega se genera la orden de surtido con envío a domicilio.
  // ---------- Caja ----------
  const openCash = cashSessions.find((session) => session.status === "Abierta") || null;
  const addCashMovement = (movement: Omit<CashMovement, "id" | "at" | "user">) =>
    setCashSessions((items) =>
      items.map((session) =>
        session.status === "Abierta"
          ? { ...session, movements: [...session.movements, { ...movement, id: `mc-${Date.now()}`, at: nowTime(), user: user.name }] }
          : session,
      ),
    );
  const openCashSession = (fund: number) => {
    const next = Math.max(...cashSessions.map((session) => Number(session.id.replace("CJ-", ""))), 0) + 1;
    setCashSessions((items) => [
      {
        id: `CJ-${String(next).padStart(4, "0")}`,
        register: "Caja 01",
        cashier: user.name,
        dateISO: TODAY_ISO,
        openedAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`,
        openingFund: fund,
        status: "Abierta",
        movements: [],
      },
      ...items,
    ]);
    showToast(`Caja abierta con fondo de ${mxn(fund)}`);
  };
  const closeCashSession = (data: { counted: CashSession["counted"]; leftFund: number; notes: string }) => {
    if (!openCash || !data.counted) return;
    const summary = computeSummary(openCash, sales);
    setCashSessions((items) =>
      items.map((session) =>
        session.id === openCash.id
          ? {
              ...session,
              status: "Cerrada",
              summary,
              counted: data.counted,
              leftFund: data.leftFund,
              deposit: Math.round((data.counted!.cash - data.leftFund) * 100) / 100,
              notes: data.notes,
              closedAt: `${fullDate(TODAY_ISO)} · ${nowTime()}`,
              closedBy: user.name,
            }
          : session,
      ),
    );
    const diff = data.counted.cash - summary.expectedCash;
    showToast(
      `Corte ${openCash.id} cerrado · ${Math.abs(diff) < 0.01 ? "cuadra" : diff > 0 ? `sobrante ${mxn(diff)}` : `faltante ${mxn(-diff)}`}`,
    );
  };
  /** Las rutas mueven efectivo de la caja: viáticos al salir y liquidación al cerrar */
  const updateRoutePlan = (updatedRoute: RoutePlan) => {
    const previous = routePlans.find((route) => route.id === updatedRoute.id);
    if (openCash && previous) {
      if (previous.status === "Programada" && updatedRoute.status === "En reparto" && updatedRoute.viatics > 0)
        addCashMovement({ kind: "Viáticos de ruta", amount: updatedRoute.viatics, concept: `Viáticos ruta ${updatedRoute.id} · ${updatedRoute.driver}`, reference: updatedRoute.id });
      if (previous.status !== "Cerrada" && updatedRoute.status === "Cerrada" && (updatedRoute.cashReturned ?? 0) > 0)
        addCashMovement({ kind: "Liquidación de ruta", amount: updatedRoute.cashReturned!, concept: `Liquidación ruta ${updatedRoute.id} · ${updatedRoute.driver}`, reference: updatedRoute.id });
    }
    setRoutePlans((items) => items.map((route) => (route.id === updatedRoute.id ? updatedRoute : route)));
  };

  // ---------- Devoluciones ----------
  const registerReturn = (data: Omit<SaleReturn, "id" | "date" | "time" | "user" | "cashSessionId">) => {
    const next = Math.max(0, ...returns.map((ret) => Number(ret.id.replace("DV-", "")))) + 1;
    const ret: SaleReturn = {
      ...data,
      id: `DV-${String(next).padStart(4, "0")}`,
      date: fullDate(TODAY_ISO),
      time: nowTime(),
      user: user.name,
      cashSessionId: data.refundMethod === "Efectivo" ? openCash?.id : undefined,
    };
    setReturns((items) => [ret, ...items]);
    // La venta guarda lo devuelto y, si era por cobrar, se reduce su saldo
    setSales((items) =>
      items.map((sale) => {
        if (sale.id !== ret.saleId) return sale;
        const updated = {
          ...sale,
          returnedAmount: (sale.returnedAmount ?? 0) + ret.total,
          creditedAmount: (sale.creditedAmount ?? 0) + ret.appliedToBalance,
        };
        return updated.status === "Pendiente" && pendingAmount(updated) <= 0.009 ? { ...updated, status: "Pagada" as const } : updated;
      }),
    );
    // Inventario: buen estado regresa a existencia; dañado entra y sale como merma
    const retLines = explodeLines(ret.lines, kits);
    const good = retLines.filter((line) => line.condition === "Buen estado");
    setInventoryProducts((items) =>
      items.map((product) => {
        const qty = good.filter((line) => line.sku === product.sku).reduce((sum, line) => sum + line.quantity, 0);
        return qty ? { ...product, stock: product.stock + qty } : product;
      }),
    );
    recordMovements(
      retLines.flatMap((line) => [
        { sku: line.sku, kind: "Entrada" as const, qty: line.quantity, reference: `Devolución ${ret.id} · venta ${ret.saleId}` },
        ...(line.condition === "Dañado"
          ? [{ sku: line.sku, kind: "Merma" as const, qty: -line.quantity, reference: `Devolución ${ret.id} · material dañado`, note: ret.reason }]
          : []),
      ]),
    );
    // Dinero: caja, tarjeta/transferencia o saldo a favor del cliente
    if (ret.refundAmount > 0 && ret.refundMethod && ret.refundMethod !== "Saldo a favor" && openCash)
      addCashMovement({
        kind: "Devolución",
        amount: ret.refundAmount,
        concept: `Devolución ${ret.id} · venta ${ret.saleId} · ${ret.client}`,
        reference: ret.id,
        method: ret.refundMethod === "Efectivo" ? undefined : ret.refundMethod,
      });
    if (ret.refundMethod === "Saldo a favor" && ret.refundAmount > 0)
      addWallet(ret.client, "Devolución", ret.refundAmount, `Devolución ${ret.id} · venta ${ret.saleId}`);
    showToast(
      `Devolución ${ret.id} registrada · ${
        ret.refundAmount > 0 ? `${ret.refundMethod === "Saldo a favor" ? "saldo a favor" : `reembolso en ${ret.refundMethod?.toLowerCase()}`} ${mxn(ret.refundAmount)}` : `saldo por cobrar −${mxn(ret.appliedToBalance)}`
      }`,
    );
  };

  // ---------- Bancos: los movimientos se generan desde ventas, caja, cortes y nóminas ----------
  const bankMovements: BankMovement[] = (() => {
    const DETAIL_FROM = "2026-11-16";
    const terminal = terminals.find((t) => t.isDefault) ?? terminals[0];
    const cardAccount = terminal?.accountId ?? bankAccounts[0]?.id ?? "";
    const transferAccount = bankAccounts[0]?.id ?? "";
    const payrollAccount = bankAccounts[1]?.id ?? transferAccount;
    const MONTHS: Record<string, string> = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12" };
    const isoOf = (text: string) => {
      const m = text.match(/(\d{1,2}) (\w{3}) (\d{4})/);
      return m ? `${m[3]}-${MONTHS[m[2]] ?? "01"}-${m[1].padStart(2, "0")}` : TODAY_ISO;
    };
    const list: BankMovement[] = [];
    const charge = (id: string, method: string, amount: number, dateISO: string, at: string, reference: string) => {
      if (dateISO < DETAIL_FROM || amount <= 0) return;
      if (method === "Tarjeta") {
        const fee = terminalFee(amount, terminal);
        list.push({ id, accountId: cardAccount, dateISO, at, kind: "Venta con tarjeta", gross: amount, fee, net: Math.round((amount - fee) * 100) / 100, reference, terminalId: terminal?.id, status: "Por confirmar", estimated: true });
      } else if (method === "Transferencia") {
        list.push({ id, accountId: transferAccount, dateISO, at, kind: "Transferencia recibida", gross: amount, fee: 0, net: amount, reference, status: "Por confirmar" });
      }
    };
    sales
      .filter((sale) => sale.status === "Pagada")
      .forEach((sale) =>
        (sale.payments ?? [{ method: sale.payment, amount: sale.amount }]).forEach((part, index) =>
          charge(`sale-${sale.id}-${index}`, part.method, part.amount, isoOf(sale.date), sale.time, `Venta ${sale.id} · ${sale.client}`),
        ),
      );
    cashSessions.forEach((session) =>
      session.movements.forEach((m) => {
        if (m.method && m.method !== "Efectivo" && !["Devolución"].includes(m.kind)) charge(`cm-${m.id}`, m.method, m.amount, session.dateISO, m.at, m.concept);
        if (m.kind === "Devolución" && m.method && m.method !== "Efectivo" && session.dateISO >= DETAIL_FROM)
          list.push({ id: `cm-${m.id}`, accountId: m.method === "Tarjeta" ? cardAccount : transferAccount, dateISO: session.dateISO, at: m.at, kind: "Otro egreso", gross: m.amount, fee: 0, net: -m.amount, reference: m.concept, status: "Por confirmar" });
      }),
    );
    cashSessions
      .filter((session) => session.status === "Cerrada" && (session.deposit ?? 0) > 0)
      .forEach((session) =>
        list.push({
          id: `dep-${session.id}`,
          accountId: transferAccount,
          dateISO: session.dateISO,
          at: session.closedAt?.split("· ")[1] ?? "",
          kind: "Depósito de efectivo",
          gross: session.deposit!,
          fee: 0,
          net: session.deposit!,
          reference: `Depósito del corte ${session.id} · ${session.cashier}`,
          status: "Por confirmar",
        }),
      );
    payrollRuns
      .filter((run) => run.method === "Transferencia")
      .forEach((run) => {
        const total = run.lines.reduce((s, l) => s + l.net, 0);
        list.push({ id: `nom-${run.id}`, accountId: payrollAccount, dateISO: TODAY_ISO, at: "", kind: "Pago de nómina", gross: total, fee: 0, net: -total, reference: `Nómina ${run.label}`, status: "Confirmado" });
      });
    return [...list, ...manualBank].map((m) => {
      const o = bankOverrides[m.id];
      if (!o) return m;
      if (o.received !== undefined) return { ...m, net: o.received, fee: Math.round((m.gross - o.received) * 100) / 100, estimated: false, status: "Confirmado" as const };
      return o.confirmed ? { ...m, status: "Confirmado" as const } : m;
    });
  })();
  const bankFeesByDay = bankMovements.reduce<Record<string, number>>((acc, m) => {
    if (m.fee) acc[m.dateISO] = (acc[m.dateISO] || 0) + m.fee;
    return acc;
  }, {});

  // ---------- Monedero (saldo a favor) ----------
  const stampNow = () => `${fullDate(TODAY_ISO)} · ${nowTime()}`;
  const addWallet = (client: string, kind: WalletKind, amount: number, reference: string, method?: string) => {
    const current = customers.find((customer) => customer.businessName === client)?.creditBalance ?? 0;
    const balanceAfter = Math.max(0, Math.round((current + amount) * 100) / 100);
    setCustomers((items) => items.map((customer) => (customer.businessName === client ? { ...customer, creditBalance: balanceAfter } : customer)));
    setWalletMovements((items) => [
      ...items,
      { id: `wm-${Date.now()}-${items.length}`, client, date: stampNow(), kind, amount, balanceAfter, reference, method, user: user.name },
    ]);
  };
  /** Si el cliente no existe se registra (necesario para su monedero) */
  const ensureCustomer = (name: string, phone: string) => {
    if (customers.some((customer) => customer.businessName === name)) return;
    const next = Math.max(1000, ...customers.map((customer) => Number(customer.id.replace("CL-", "")) || 0)) + 1;
    setCustomers((items) => [
      ...items,
      {
        id: `CL-${next}`,
        businessName: name,
        contactName: name,
        rfc: "",
        type: "Mostrador",
        status: "Activo",
        phone,
        email: "",
        address: "",
        city: "",
        creditDays: 0,
        creditLimit: 0,
        balance: 0,
        totalPurchases: 0,
        orders: 0,
        lastPurchase: fullDate(TODAY_ISO),
        channel: "Mostrador",
        notes: "Alta desde punto de venta (apartado / monedero).",
        creditBalance: 0,
      },
    ]);
  };
  /** Cobro de abono o anticipo: a la caja (o se consume del monedero) */
  const collect = (client: string, amount: number, method: PayMethodL, kind: "Abono apartado" | "Anticipo", reference: string) => {
    if (method === "Saldo a favor") addWallet(client, "Consumo", -amount, reference);
    else if (openCash)
      addCashMovement({ kind, amount, concept: `${reference} · ${client}`, reference, method: method === "Efectivo" ? undefined : method });
  };
  const walletDeposit = (client: string, phone: string, amount: number, method: PayMethodL) => {
    ensureCustomer(client, phone);
    addWallet(client, "Anticipo", amount, `Anticipo a cuenta`, method);
    collect(client, amount, method, "Anticipo", "Anticipo a cuenta (monedero)");
    showToast(`Anticipo de ${mxn(amount)} abonado al monedero de ${client}`);
  };

  // ---------- Apartados ----------
  const holdItems = (items: { sku: string; quantity: number }[], sign: 1 | -1, reference: string) => {
    const parts = explodeLines(items, kits);
    setInventoryProducts((list) =>
      list.map((product) => {
        const qty = parts.filter((p) => p.sku === product.sku).reduce((sum, p) => sum + p.quantity, 0);
        return qty ? { ...product, reserved: Math.max(0, product.reserved + sign * qty) } : product;
      }),
    );
    recordMovements(parts.map((p) => ({ sku: p.sku, kind: sign > 0 ? ("Apartado" as const) : ("Liberación" as const), qty: p.quantity, reference })));
  };
  const createLayaway = (data: NewLayaway) => {
    const number = Math.max(0, ...layaways.map((l) => Number(l.id.replace("AP-", "")))) + 1;
    const id = `AP-${String(number).padStart(4, "0")}`;
    ensureCustomer(data.client, data.phone);
    setLayaways((items) => [
      {
        id,
        client: data.client,
        phone: data.phone,
        dateISO: TODAY_ISO,
        createdAt: stampNow(),
        dueISO: addDaysISO(TODAY_ISO, policies.layawayDays),
        items: data.items,
        total: data.total,
        payments: [{ id: `lp-${Date.now()}`, date: stampNow(), amount: data.firstPayment, method: data.method, user: user.name }],
        status: "Vigente",
        notes: data.notes,
        createdBy: user.name,
      },
      ...items,
    ]);
    holdItems(data.items, 1, `Apartado ${id} · ${data.client}`);
    collect(data.client, data.firstPayment, data.method, "Abono apartado", `Apartado ${id} · pago inicial`);
    showToast(`Apartado ${id} registrado · material apartado hasta el ${shortDate(addDaysISO(TODAY_ISO, policies.layawayDays))}`);
    return id;
  };
  const payLayaway = (id: string, amount: number, method: PayMethodL) => {
    const l = layaways.find((item) => item.id === id);
    if (!l) return;
    const payments = [...l.payments, { id: `lp-${Date.now()}`, date: stampNow(), amount, method, user: user.name }];
    collect(l.client, amount, method, "Abono apartado", `Apartado ${id} · abono`);
    const liquidated = layawayBalance({ ...l, payments }) <= 0.009;
    if (!liquidated) {
      setLayaways((items) => items.map((item) => (item.id === id ? { ...item, payments } : item)));
      showToast(`Abono de ${mxn(amount)} registrado en ${id} · saldo ${mxn(layawayBalance({ ...l, payments }))}`);
      return;
    }
    // Liquidado: se genera la venta y la orden de surtido (el material ya estaba apartado)
    const saleId = `V-${Math.max(...sales.map((sale) => Number(sale.id.replace("V-", "")))) + 1}`;
    const orderId = `OS-${String(Math.max(...orders.filter((o) => o.id.startsWith("OS-")).map((o) => Number(o.id.replace("OS-", "")))) + 1).padStart(4, "0")}`;
    setSales((items) => [
      {
        id: saleId,
        client: l.client,
        amount: l.total,
        items: l.items.reduce((sum, item) => sum + item.quantity, 0),
        date: fullDate(TODAY_ISO),
        time: nowTime(),
        status: "Pagada",
        payment: "Apartado",
        seller: user.name,
        type: "Mostrador",
        orderId,
        lines: l.items.map((item) => ({ sku: item.sku, name: item.name, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, total: item.unitPrice * item.quantity, components: item.components })),
      },
      ...items,
    ]);
    const parts = explode(l.items.map((item) => ({ ...item, location: "" }))) as (typeof l.items[number] & { location: string; kitName?: string })[];
    setOrders((items) => [
      {
        id: orderId,
        source: `Venta ${saleId} · Apartado ${id}`,
        customer: l.client,
        date: stampNow(),
        requiredAt: "Ahora · cliente en mostrador",
        status: "Pendiente",
        priority: "Alta",
        fulfillment: "Recoge en mostrador",
        notes: `Apartado ${id} liquidado: surtir y liberar a mostrador. El material ya estaba apartado.`,
        items: parts.map((part, index) => {
          const product = inventoryProducts.find((p) => p.sku === part.sku);
          return {
            id: `${orderId}-${index + 1}`,
            sku: part.sku,
            name: part.name,
            quantity: part.quantity,
            unit: part.unit,
            aisle: product?.aisle ?? "—",
            shelf: product?.shelf ?? "—",
            available: product?.stock ?? 0,
            picked: false,
            issue: false,
            kitName: part.kitName,
          };
        }),
      },
      ...items,
    ]);
    setLayaways((items) => items.map((item) => (item.id === id ? { ...item, payments, status: "Liquidado", saleId, orderId, liquidatedAt: stampNow() } : item)));
    showToast(`${id} liquidado · venta ${saleId} y orden ${orderId} enviada a almacén para entregar en mostrador`);
  };
  const extendLayaway = (id: string) => {
    setLayaways((items) =>
      items.map((item) =>
        item.id === id ? { ...item, dueISO: addDaysISO(item.dueISO < TODAY_ISO ? TODAY_ISO : item.dueISO, policies.layawayExtensionDays), extended: (item.extended ?? 0) + policies.layawayExtensionDays } : item,
      ),
    );
    showToast(`${id}: prórroga de ${policies.layawayExtensionDays} días otorgada`);
  };
  const cancelLayaway = (id: string, reason: string) => {
    const l = layaways.find((item) => item.id === id);
    if (!l) return undefined;
    const paid = layawayPaid(l);
    holdItems(l.items, -1, `Cancelación apartado ${id}`);
    addWallet(l.client, "Apartado cancelado", paid, `Apartado ${id} cancelado · ${reason}`);
    setLayaways((items) => items.map((item) => (item.id === id ? { ...item, status: "Cancelado", cancelledAt: stampNow(), cancelReason: reason, creditIssued: paid } : item)));
    showToast(`${id} cancelado · ${mxn(paid)} pasan al monedero de ${l.client}`);
    return l.client;
  };

  const handlePosSale = (rawSale: Sale, saleLines: PosLine[]) => {
    const lines = explode(saleLines) as (PosLine & { kitName?: string })[];
    const sale = { ...rawSale, cashSessionId: openCash?.id };
    const creditUsed = (sale.payments ?? [{ method: sale.payment, amount: sale.amount }])
      .filter((part) => part.method === "Saldo a favor")
      .reduce((sum, part) => sum + part.amount, 0);
    if (creditUsed > 0) addWallet(sale.client, "Consumo", -creditUsed, `Compra venta ${sale.id}`);
    // Toda venta del punto de venta genera orden de surtido:
    // pagada → se surte y se libera a mostrador; contra entrega → se surte y se libera a ruta
    const due = pendingAmount(sale);
    const counter = due <= 0;
    const time = nowTime();
    const orderId = `OS-${String(
      Math.max(...orders.filter((order) => order.id.startsWith("OS-")).map((order) => Number(order.id.replace("OS-", "")))) + 1,
    ).padStart(4, "0")}`;
    setSales((items) => [{ ...sale, orderId }, ...items]);
    setOrders((items) => [
      {
        id: orderId,
        source: `Venta ${sale.id} · ${counter ? "Mostrador" : "Contra entrega"}`,
        customer: sale.client,
        date: `${fullDate(TODAY_ISO)} · ${time}`,
        requiredAt: counter ? "Ahora · cliente en mostrador" : "Mañana, 10:00",
        status: "Pendiente",
        priority: counter ? "Alta" : "Normal",
        fulfillment: counter ? "Recoge en mostrador" : "Ruta",
        route: counter ? undefined : "Por asignar",
        notes: counter
          ? "Venta pagada en mostrador: surtir y liberar a mostrador para entregar al cliente."
          : `Venta de mostrador con pago contra entrega: cobrar ${mxn(due)} al entregar.`,
        items: lines.map((line, index) => {
          const product = inventoryProducts.find((item) => item.sku === line.sku);
          const [aisle, shelf] = line.location.split("-");
          return {
            id: `${orderId}-${index + 1}`,
            sku: line.sku,
            name: line.name,
            quantity: line.quantity,
            unit: line.unit,
            aisle: aisle || "—",
            shelf: shelf || "—",
            available: product?.stock ?? line.quantity,
            picked: false,
            issue: false,
            kitName: line.kitName,
          };
        }),
      },
      ...items,
    ]);
    setInventoryProducts((items) =>
      items.map((product) => {
        const reserved = lines.filter((line) => line.sku === product.sku).reduce((sum, line) => sum + line.quantity, 0);
        return reserved ? { ...product, reserved: product.reserved + reserved } : product;
      }),
    );
    recordMovements(
      lines.map((line) => ({ sku: line.sku, kind: "Apartado" as const, qty: line.quantity, reference: `Orden ${orderId} · venta ${sale.id}${line.kitName ? ` (${line.kitName})` : ""}` })),
    );
    showToast(
      counter
        ? `Venta ${sale.id} cobrada · orden ${orderId} enviada a almacén para surtir y entregar en mostrador`
        : `Venta ${sale.id} registrada · orden ${orderId} generada para entrega contra entrega`,
    );
  };

  /** Mostrador entrega al cliente una orden liberada por almacén */
  const deliverCounterOrder = (orderId: string, receivedBy: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    updateOrder({ ...order, status: "Entregada", receivedBy, deliveredAt: `${fullDate(TODAY_ISO)} · ${nowTime()}` });
    showToast(`${orderId} entregada en mostrador a ${receivedBy}`);
  };

  const updateSale = (id: string, changes: Partial<Sale>) =>
    setSales((items) => items.map((sale) => (sale.id === id ? { ...sale, ...changes } : sale)));

  const updateQuote = (id: string, changes: Partial<Quote>) =>
    setQuotes((items) => items.map((quote) => (quote.id === id ? { ...quote, ...changes } : quote)));

  // Convierte una cotización en venta (pedido) + orden de surtido y reserva el stock
  const convertQuote = (quote: Quote, options: ConvertOptions) => {
    const time = nowTime();
    const saleId = `V-${Math.max(...sales.map((sale) => Number(sale.id.replace("V-", "")))) + 1}`;
    const orderId = `OS-${String(
      Math.max(...orders.map((order) => Number(order.id.replace("OS-", "")))) + 1,
    ).padStart(4, "0")}`;
    const lines = explode(quote.lines || []) as (QuoteLine & { kitName?: string })[];
    setSales((items) => [
      {
        id: saleId,
        client: quote.client,
        amount: quote.amount,
        items: quote.items,
        date: fullDate(TODAY_ISO),
        time,
        status: "Pendiente",
        payment: "Por definir",
        seller: quote.owner,
        type: "Pedido",
        quoteId: quote.id,
        orderId,
        lines: quote.lines,
        discount: quote.discount,
        discountAmount: quote.discountAmount,
      },
      ...items,
    ]);
    // El cliente suma la compra a su historial (y a su saldo si queda por cobrar)
    setCustomers((items) =>
      items.map((customer) =>
        customer.businessName === quote.client
          ? {
              ...customer,
              orders: customer.orders + 1,
              totalPurchases: customer.totalPurchases + quote.amount,
              lastPurchase: fullDate(TODAY_ISO),
            }
          : customer,
      ),
    );
    setOrders((items) => [
      {
        id: orderId,
        source: `Cotización ${quote.id} · Venta ${saleId}`,
        customer: quote.client,
        date: `${fullDate(TODAY_ISO)} · ${time}`,
        requiredAt: options.fulfillment === "Ruta" ? "Mañana, 10:00" : "Hoy, 17:00",
        status: "Pendiente",
        priority: "Normal",
        fulfillment: options.fulfillment,
        route: options.fulfillment === "Ruta" ? "Por asignar" : undefined,
        notes: quote.notes
          ? `${quote.notes}. Generada desde la cotización ${quote.id}.`
          : `Generada desde la cotización ${quote.id}.`,
        items: lines.map((line, index) => {
          const product = inventoryProducts.find((item) => item.sku === line.sku);
          return {
            id: `${orderId}-${index + 1}`,
            sku: line.sku,
            name: line.name,
            quantity: line.quantity,
            unit: line.unit,
            aisle: product?.aisle || "—",
            shelf: product?.shelf || "—",
            available: product?.stock ?? 0,
            picked: false,
            issue: false,
            kitName: line.kitName,
          };
        }),
      },
      ...items,
    ]);
    setInventoryProducts((items) =>
      items.map((product) => {
        const reserved = lines
          .filter((line) => line.sku === product.sku)
          .reduce((sum, line) => sum + line.quantity, 0);
        return reserved ? { ...product, reserved: product.reserved + reserved } : product;
      }),
    );
    recordMovements(
      lines.map((line) => ({ sku: line.sku, kind: "Apartado" as const, qty: line.quantity, reference: `Orden ${orderId} · cotización ${quote.id}` })),
    );
    updateQuote(quote.id, {
      status: "Aceptada",
      saleId,
      orderId,
      lastAction: `Convertida en venta · ${time}`,
    });
    showToast(`${quote.id} aceptada: se generó la venta ${saleId} y la orden ${orderId}`);
  };

  if (!sessionUserId) return <LoginScreen users={loginUsers} onLogin={startSession} deviceReady={deviceReady} />;

  return (
    <div ref={topRef} className="min-h-screen bg-[#f4f7f6] text-[#162523]">
      {locked && (
        <LockScreen key={String(lockSwitch)} startSwitching={lockSwitch} user={loginUsers.find((u) => u.id === sessionUserId) ?? loginUsers[0]} users={loginUsers} onUnlock={startSession} onLogout={logout} />
      )}
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-6">
          <button className="flex items-center gap-3" onClick={() => navigate("Inicio")}>
            <span className="grid size-9 place-items-center rounded-xl bg-[#b8f34a] font-black text-[#17332e]">
              99
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">erp</span>
          </button>
          <button className="text-white/60 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center gap-3">
            {companyCfg.logo ? (
              <img src={companyCfg.logo} alt="" className="size-9 shrink-0 rounded-xl bg-white object-contain p-0.5" />
            ) : (
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#b8f34a]/15 text-[#b8f34a]">
                <Store size={18} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{companyCfg.commercialName}</p>
              <p className="truncate text-[11px] text-white/45">{companyCfg.branch}</p>
            </div>
          </div>
        </div>

        <nav className="mt-7 flex-1 px-3" aria-label="Navegación principal">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Operación
          </p>
          <div className="space-y-1">
            {navItems.filter(({ label }) => navAllowed(label)).map(({ label, icon: Icon, count }) => (
              <button
                key={label}
                onClick={() => {
                  navigate(label);
                  if (
                    label !== "Inicio" &&
                    label !== "Cotizaciones" &&
                    label !== "Ventas" &&
                    label !== "Punto de venta" &&
                    label !== "Inventario" &&
                    label !== "Compras" &&
                    label !== "Caja" &&
                    label !== "Colaboradores" &&
                    label !== "Clientes" &&
                    label !== "Órdenes" &&
                    label !== "Rutas" &&
                    label !== "Reportes"
                  )
                    showToast(`${label}: módulo en preparación`);
                }}
                className={`nav-item ${activeNav === label ? "nav-item--active" : ""}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {count && (
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-4">
          {navAllowed("Configuración") && <button
            className={`nav-item ${activeNav === "Configuración" ? "nav-item--active" : ""}`}
            onClick={() => {
              navigate("Configuración");
            }}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </button>}
          <div className="mx-3 mt-4 border-t border-white/10 pt-4 text-[10px] text-white/30">
            99 ERP · versión 1.0
          </div>
        </div>
      </aside>

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-slate-200/80 bg-[#f4f7f6]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <button
            className="mr-3 grid size-10 place-items-center rounded-xl border border-slate-200 bg-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              value={globalQuery}
              onChange={(event) => {
                setGlobalQuery(event.target.value);
                setSearchIndex(0);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSearchIndex((i) => Math.min(i + 1, searchResults.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSearchIndex((i) => Math.max(i - 1, 0));
                } else if (event.key === "Enter" && searchResults[searchIndex]) {
                  openSearchResult(searchResults[searchIndex]);
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  setSearchOpen(false);
                  event.currentTarget.blur();
                }
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/70 pl-10 pr-4 text-sm outline-none transition focus:border-[#2f7468] focus:bg-white focus:ring-4 focus:ring-[#2f7468]/10"
              placeholder="Buscar productos, clientes o pedidos..."
            />
            {searchOpen && globalQuery.trim() && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[440px] overflow-y-auto rounded-2xl border border-[#e5e9e8] bg-white p-2 shadow-[0_18px_50px_rgba(22,37,35,0.14)]">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm font-semibold">Sin resultados</p>
                    <p className="mt-1 text-xs text-slate-400">
                      No encontramos “{globalQuery.trim()}” en productos, clientes ni pedidos.
                    </p>
                  </div>
                ) : (
                  searchResults.map((result, index) => {
                    const ResultIcon = result.icon;
                    const firstOfGroup =
                      index === 0 || searchResults[index - 1].group !== result.group;
                    return (
                      <div key={result.id}>
                        {firstOfGroup && (
                          <p className="eyebrow px-3 pb-1.5 pt-3">{result.group}</p>
                        )}
                        <button
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setSearchIndex(index)}
                          onClick={() => openSearchResult(result)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            index === searchIndex ? "bg-[#f2f8f6]" : ""
                          }`}
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                            <ResultIcon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">
                              {result.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                              {result.meta}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                            {result.nav}
                          </span>
                          <ChevronRight size={14} className="shrink-0 text-slate-300" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <button
                className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notificaciones"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#e5785f] ring-2 ring-white" />
              </button>
              {notificationsOpen && (
                <div className="dropdown right-0 w-80">
                  <p className="px-4 pb-3 text-sm font-semibold">Notificaciones</p>
                  <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                    <strong className="block text-slate-800">Stock crítico detectado</strong>2
                    productos requieren reposición.
                  </div>
                  <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                    <strong className="block text-slate-800">Pedido listo para ruta</strong>La orden
                    #P-822 fue validada.
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-white"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="grid size-9 place-items-center rounded-xl bg-[#dce8e5] text-xs font-bold text-[#235f55]">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-semibold">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{userRole}</p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {profileOpen && (
                <div className="dropdown right-0 w-64">
                  <div className="px-3 pb-3">
                    <p className="text-sm font-semibold">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {currentUser.email || "Sin correo"} · {userRole}
                    </p>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        setProfileOpen(false);
                        setLockSwitch(true);
                        setLocked(true);
                      }}
                    >
                      <Users size={14} className="text-slate-400" /> Cambiar de usuario (PIN)
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50"
                      onClick={() => {
                        setProfileOpen(false);
                        setLockSwitch(false);
                        setLocked(true);
                      }}
                    >
                      <Lock size={14} className="text-slate-400" /> Bloquear ahora
                    </button>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#c9664f] hover:bg-[#fff6f3]" onClick={logout}>
                      <LogOut size={14} /> Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          {!navAllowed(activeNav) ? (
            <section className="panel mx-auto mt-10 max-w-md p-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0eb] text-[#c9664f]">
                <Lock size={20} />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Sin acceso a {activeNav}</h2>
              <p className="mt-2 text-xs text-slate-500">
                El rol <strong>{userRole}</strong> no tiene permiso para entrar a este módulo. Pide a un administrador que lo habilite en Configuración → Roles y permisos.
              </p>
            </section>
          ) : activeNav === "Cotizaciones" ? (
            <QuotesModule
              key={navKey}
              initialQuery={focus.query}
              initialStatus={focus.status as QuoteFilter | undefined}
              quotes={quotes}
              customers={customers}
              onCreate={() => setQuoteOpen(true)}
              onAction={showToast}
              onBack={() => navigate("Inicio")}
              onUpdate={updateQuote}
              onConvert={convertQuote}
              products={[...inventoryProducts, ...kits.map((kit) => kitAsProduct(kit, inventoryProducts))]}
              onOpen={navigate}
            />
          ) : activeNav === "Ventas" || activeNav === "Punto de venta" ? (
            <SalesModule
              key={`${activeNav}-${navKey}`}
              initialView={activeNav === "Punto de venta" ? "pos" : "documents"}
              onExitPos={activeNav === "Punto de venta" ? () => navigate("Ventas") : undefined}
              catalog={inventoryProducts
                .filter((product) => product.status === "Activo")
                .map((product) => ({
                  id: product.sku,
                  name: product.name,
                  category: product.category,
                  price: product.retailPrice,
                  prices: pricesOf(product),
                  stock: Math.max(0, product.stock - product.reserved),
                  unit: product.saleUnit,
                  location: `${product.aisle}-${product.shelf}`,
                }))
                .concat(
                  kits
                    .filter((kit) => kit.status === "Activo")
                    .map((kit) => ({
                      id: kit.sku,
                      name: kit.name,
                      category: "Kits",
                      price: kit.retailPrice,
                      prices: pricesOf(kit),
                      stock: kitAvailability(kit, inventoryProducts).available,
                      unit: "kit",
                      location: "Kit",
                      components: kitComponentsFor(kit, inventoryProducts),
                      cost: kitCost(kit, inventoryProducts),
                    })),
                )}
              initialSelectedId={focus.selectedId}
              onOpen={navigate}
              orders={pickingOrders}
              routes={routePlans}
              quotes={quotes}
              customers={customers}
              initialQuery={focus.query}
              initialStatus={focus.status === "Pedidos especiales" || focus.status === "Apartados" ? undefined : (focus.status as Sale["status"] | undefined)}
              initialList={focus.status === "Pedidos especiales" ? "special" : focus.status === "Apartados" ? "layaways" : undefined}
              specialOrders={specialOrders}
              suppliers={suppliers}
              inventory={inventoryProducts}
              special={{
                onCreate: createSpecialOrder,
                onToPurchase: specialToPurchase,
                onNotify: notifySpecial,
                onDeliver: deliverSpecial,
                onCancel: cancelSpecial,
              }}
              sales={sales}
              seller={user.name}
              onComplete={handlePosSale}
              onToast={showToast}
              cashSession={openCash}
              returns={returns}
              onReturn={allow("ventas.devoluciones") ? registerReturn : undefined}
              maxDiscount={maxDiscountOf(roles, userRole)}
              onDeliverCounter={deliverCounterOrder}
              layaways={layaways}
              walletMovements={walletMovements}
              layawayActions={{ onCreate: createLayaway, onPay: payLayaway, onExtend: extendLayaway, onCancel: cancelLayaway, onDeposit: walletDeposit }}
              onOpenCash={openCashSession}
              onGoCash={() => navigate("Caja")}
            />
          ) : activeNav === "Caja" ? (
            <CashModule
              key={navKey}
              initialTab={focus.status === "Bancos" ? "Bancos" : undefined}
              canClose={allow("corte.cerrar")}
              banks={{
                accounts: bankAccounts,
                terminals,
                movements: bankMovements,
                onConfirm: (id, received) => setBankOverrides((o) => ({ ...o, [id]: received !== undefined ? { received } : { confirmed: true } })),
                onManual: (m) => setManualBank((items) => [...items, m]),
                onDeleteManual: (id) => setManualBank((items) => items.filter((m) => m.id !== id)),
                onSaveConfig: (a, t) => {
                  setBankAccounts(a);
                  setTerminals(t);
                },
              }}
              sessions={cashSessions}
              sales={sales}
              userName={user.name}
              onAddMovement={addCashMovement}
              onClose={closeCashSession}
              onOpenSession={openCashSession}
              onPartialCut={() => showToast("Corte parcial (X) generado; el turno sigue abierto")}
              onNavigate={(nav, nextFocus) => navigate(nav, nextFocus || {})}
              onToast={showToast}
            />
          ) : activeNav === "Inventario" ? (
            <InventoryModule
              key={navKey}
              kits={kits}
              onSaveKit={(kit) => setKits((items) => (items.some((k) => k.id === kit.id) ? items.map((k) => (k.id === kit.id ? kit : k)) : [...items, kit]))}
              initialQuery={focus.query}
              initialStockFilter={focus.status as "Bajo stock" | "Sin stock" | undefined}
              products={inventoryProducts}
              movements={movements}
              onUpdateProduct={updateProduct}
              onAdjust={adjustStock}
              onAddProducts={(newProducts) => {
                setInventoryProducts((items) => [...newProducts, ...items]);
                setMovements((items) => [
                  ...newProducts.map((product, index) => ({
                    id: `mv-new-${Date.now()}-${index}`,
                    sku: product.sku,
                    date: movementStamp(),
                    kind: "Entrada" as const,
                    qty: product.stock,
                    stockAfter: product.stock,
                    reference: "Alta de producto",
                    user: user.name,
                  })),
                  ...items,
                ]);
              }}
              onToast={showToast}
            />
          ) : activeNav === "Compras" ? (
            <PurchasesModule
              key={navKey}
              canApprove={allow("compras.aprobar")}
              initialSelectedId={focus.selectedId}
              initialFilter={focus.status === "Abiertas" ? "Abiertas" : undefined}
              purchases={purchases}
              suppliers={suppliers}
              products={inventoryProducts}
              userName={user.name}
              onAddPurchase={(po) => setPurchases((items) => [po, ...items])}
              onUpdatePurchase={updatePurchase}
              onSendToWarehouse={sendPurchaseToWarehouse}
              specialPending={specialOrders.filter((order) => order.status === "Por pedir")}
              kits={kits}
              onSpecialToPurchase={specialToPurchase}
              onSaveSupplier={(supplier) =>
                setSuppliers((items) =>
                  items.some((item) => item.id === supplier.id)
                    ? items.map((item) => (item.id === supplier.id ? supplier : item))
                    : [...items, supplier],
                )
              }
              onToast={showToast}
              onOpen={navigate}
            />
          ) : activeNav === "Clientes" ? (
            <CustomersModule
              key={navKey}
              initialQuery={focus.query}
              initialSelectedId={focus.selectedId}
              customers={customers}
              sales={sales}
              quotes={quotes}
              orders={pickingOrders}
              onQuote={(customer) => {
                setQuoteCustomer(customer);
                setQuoteOpen(true);
              }}
              onOpen={navigate}
              onAddCustomer={(customer) => setCustomers((items) => [customer, ...items])}
              onUpdateCustomer={(customer) => setCustomers((items) => items.map((c) => (c.id === customer.id ? customer : c)))}
              onToast={showToast}
            />
          ) : activeNav === "Órdenes" ? (
            <OrdersModule
              key={navKey}
              initialQuery={focus.query}
              initialStatus={focus.status as OrderFilter | undefined}
              initialSelectedId={focus.selectedId}
              onNavigate={(nav, nextFocus) => navigate(nav, nextFocus || {})}
              orders={orders}
              onUpdate={updateOrder}
              onAdd={(order) => setOrders((items) => [order, ...items])}
              onToast={showToast}
            />
          ) : activeNav === "Rutas" ? (
            <RoutesModule
              key={navKey}
              orders={pickingOrders}
              routes={routePlans}
              onAddRoute={(route) => setRoutePlans((items) => [route, ...items])}
              onUpdateRoute={updateRoutePlan}
              onUpdateOrder={updateOrder}
              sales={sales}
              onUpdateSale={updateSale}
              onToast={showToast}
            />
          ) : activeNav === "Colaboradores" ? (
            <CollaboratorsModule
              key={navKey}
              collaborators={collaborators}
              roles={roles}
              canPayroll={allow("colaboradores.nomina")}
              advances={advances}
              payrollRuns={payrollRuns}
              socialRate={socialRate}
              sales={sales}
              returns={returns}
              cashOpen={Boolean(openCash)}
              userName={user.name}
              onSaveCollaborator={(c) =>
                setCollaborators((items) => (items.some((x) => x.id === c.id) ? items.map((x) => (x.id === c.id ? c : x)) : [...items, c]))
              }
              onSaveAdvance={(a, cash) => {
                setAdvances((items) => [a, ...items]);
                const who = collaborators.find((c) => c.id === a.collaboratorId)?.name ?? "";
                if (cash && openCash) addCashMovement({ kind: "Retiro", amount: a.amount, concept: `Préstamo a colaborador ${who} · ${a.id}`, reference: a.id });
                showToast(`Préstamo de ${mxn(a.amount)} a ${who} registrado`);
              }}
              onPayPayroll={(run) => {
                setPayrollRuns((items) => [run, ...items]);
                setAdvances((items) =>
                  items.map((a) => {
                    const line = run.lines.find((l) => l.collaboratorId === a.collaboratorId);
                    if (!line || !line.advance || a.remaining <= 0) return a;
                    return { ...a, remaining: Math.max(0, Math.round((a.remaining - Math.min(a.remaining, a.amount / a.installments)) * 100) / 100) };
                  }),
                );
                const total = run.lines.reduce((s, l) => s + l.net, 0);
                if (run.method === "Efectivo" && openCash) addCashMovement({ kind: "Gasto", amount: total, concept: `Nómina ${run.label}`, reference: run.id });
                showToast(`Nómina ${run.label} pagada · ${mxn(total)}`);
              }}
              onSocialRate={setSocialRate}
              onToast={showToast}
            />
          ) : activeNav === "Reportes" ? (
            <ReportsModule
              sales={sales}
              products={inventoryProducts}
              orders={pickingOrders}
              routes={routePlans}
              customers={customers}
              quotes={quotes}
              returns={returns}
              cashSessions={cashSessions}
              movements={movements}
              payrollMonthly={payrollMonthly}
              bankFees={bankFeesByDay}
              purchases={purchases}
              treasury={{
                cash: openCash ? computeSummary(openCash, sales).expectedCash : 0,
                accounts: bankAccounts.map((acc) => {
                  const mine = bankMovements.filter((m) => m.accountId === acc.id);
                  return {
                    name: `${acc.bank} ···${acc.last4}`,
                    books: acc.openingBalance + mine.reduce((sum, m) => sum + m.net, 0),
                    confirmed: acc.openingBalance + mine.filter((m) => m.status === "Confirmado").reduce((sum, m) => sum + m.net, 0),
                  };
                }),
              }}
              canSeeProfit={allow("reportes.utilidades")}
              commissionRates={Object.fromEntries(collaborators.map((c) => [c.name, c.commissionRate]))}
              fixedExpenses={fixedExpenses}
              onFixedExpenses={setFixedExpenses}
              onNavigate={(nav, nextFocus) => navigate(nav, nextFocus || {})}
              onToast={showToast}
            />
          ) : activeNav === "Configuración" ? (
            <SettingsModule
              key={navKey}
              onToast={showToast}
              initialSection={focus.status}
              business={{
                company: companyCfg,
                policies: policyCfg,
                onSave: (c, p) => {
                  setCompanyCfg(c);
                  setPolicyCfg(p);
                },
              }}
              access={{
                roles,
                usage: Object.fromEntries(roles.map((r) => [r.name, collaborators.filter((c) => c.role === r.name && c.status === "Activo").map((c) => c.name)])),
                people: collaborators.map((c) => ({ id: c.id, name: c.name, position: c.position, role: c.role, status: c.status })),
                canManageRoles: allow("configuracion.roles"),
                onChangeRole: (id, roleName) => setCollaborators((items) => items.map((c) => (c.id === id ? { ...c, role: roleName } : c))),
                onSaveRole: saveRole,
                onDeleteRole: deleteRole,
                onGoCollaborators: () => navigate("Colaboradores"),
              }}
            />
          ) : (
            <>
              <section className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#2f7468]">
                    <span className="size-1.5 rounded-full bg-[#73aa43]" /> Martes, 18 de noviembre
                  </div>
                  <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">
                    {user.greeting}
                    <span className="text-[#2f7468]">.</span>
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">{user.description}</p>
                </div>
                <button
                  className="primary-button"
                  style={{ backgroundColor: "rgb(47, 116, 104)" }}
                  onClick={() => setQuoteOpen(true)}
                >
                  <Plus size={18} /> Nueva cotización{" "}
                  <span className="ml-1 hidden border-l border-white/20 pl-3 text-[10px] text-white/60 sm:inline">
                    N
                  </span>
                </button>
              </section>

              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Cotizaciones activas"
                  value={String(activeQuotes.length)}
                  detail={`${activeQuotes.filter((quote) => quote.status === "Enviada").length} enviadas · ${activeQuotes.filter((quote) => quote.status === "Borrador").length} en borrador`}
                  icon={FileText}
                  onClick={() => navigate("Cotizaciones", { status: "Activas" })}
                />
                <StatCard
                  label={range === "Hoy" ? "Ventas de hoy" : "Ventas de la semana"}
                  value={paidSales
                    .reduce((sum, sale) => sum + sale.amount, 0)
                    .toLocaleString("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    })}
                  detail={`${paidSales.length} ventas pagadas`}
                  icon={ChartColumn}
                  onClick={() =>
                    navigate("Ventas", {
                      status: "Pagada",
                      query: range === "Hoy" ? "18 nov 2026" : undefined,
                    })
                  }
                />
                <StatCard
                  label="Órdenes por surtir"
                  value={String(ordersToPick.length)}
                  detail={`${ordersToPick.filter((order) => order.priority === "Alta").length} con prioridad alta`}
                  icon={PackageCheck}
                  onClick={() => navigate("Órdenes", { status: "Por surtir" })}
                />
                <StatCard
                  label="Pedidos en ruta"
                  value={String(ordersOnRoute.length)}
                  detail={`${pendingStops} ${pendingStops === 1 ? "entrega próxima" : "entregas próximas"}`}
                  icon={Truck}
                  onClick={() => navigate("Rutas")}
                />
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
                <section className="panel min-w-0">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Flujo operativo</p>
                      <h2 className="panel-title">Prioridad para hoy</h2>
                    </div>
                    <button className="link-button" onClick={() => setAllTasksOpen(true)}>
                      Ver todas <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[...specialTasks, ...taskSets[role]].map((task) => {
                      const isDone = completed.includes(task.title);
                      return (
                        <div
                          key={task.title}
                          role="button"
                          tabIndex={0}
                          onClick={() => openTask(task)}
                          onKeyDown={(event) => event.key === "Enter" && openTask(task)}
                          className={`task-row group cursor-pointer ${isDone ? "opacity-50" : ""}`}
                        >
                          <button
                            className={`task-check ${isDone ? "task-check--done" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleTask(task.title);
                            }}
                            aria-label={isDone ? "Marcar como pendiente" : "Completar tarea"}
                          >
                            {isDone && <Check size={13} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${isDone ? "line-through" : ""}`}
                            >
                              {task.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">{task.meta}</p>
                          </div>
                          <span className="hidden text-[10px] font-semibold text-[#2f7468] opacity-0 transition group-hover:opacity-100 md:inline">
                            {task.action}
                          </span>
                          <span
                            className={`hidden rounded-lg px-2.5 py-1 text-[10px] font-semibold sm:inline ${task.type === "Urgente" ? "bg-[#fff0eb] text-[#c9664f]" : "bg-slate-100 text-slate-500"}`}
                          >
                            {task.type}
                          </span>
                          <ChevronRight
                            size={17}
                            className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#2f7468]"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mx-5 mb-5 mt-2 flex items-center gap-3 rounded-xl bg-[#f2f8f6] p-3 text-xs text-[#285e56]">
                    <Sparkles size={16} />
                    <span>
                      <strong>Tip de 99:</strong> completa primero los pedidos de ruta para liberar
                      espacio de carga.
                    </span>
                  </div>
                </section>

                <section className="panel min-w-0">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Inventario</p>
                      <h2 className="panel-title">Existencias críticas</h2>
                    </div>
                    <button
                      className="rounded-lg bg-[#fff0eb] px-2.5 py-1 text-[10px] font-semibold text-[#c9664f] transition hover:bg-[#ffe4da]"
                      onClick={() => navigate("Inventario", { status: "Bajo stock" })}
                    >
                      {lowStockCount} {lowStockCount === 1 ? "alerta" : "alertas"}
                    </button>
                  </div>
                  <div className="px-5 pb-2">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={14}
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#2f7468]"
                        placeholder="Filtrar producto..."
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">
                      Los 5 productos con menor disponibilidad de todo el inventario.
                    </p>
                  </div>
                  <div className="px-5 pb-5">
                    {criticalInventory.map((item) => {
                      const isCritical = item.available <= item.minimumStock;
                      const level = Math.min(
                        100,
                        Math.max(4, (item.available / Math.max(1, item.maximumStock)) * 100),
                      );
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate("Inventario", { query: item.sku })}
                          className="group block w-full border-b border-slate-100 py-3 text-left last:border-0"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold transition group-hover:text-[#2f7468]">
                                {item.name}
                              </p>
                              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                {item.sku} · <MapPin size={10} /> {item.aisle}-{item.shelf}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs">
                                <strong className={isCritical ? "text-[#d36b53]" : ""}>
                                  {item.available}
                                </strong>{" "}
                                <span className="text-slate-400">{item.baseUnit}</span>
                              </p>
                              <p className="mt-1 text-[9px] text-slate-400">
                                Mín. {item.minimumStock}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${isCritical ? "bg-[#e5785f]" : "bg-[#82aa58]"}`}
                              style={{ width: `${level}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                    {criticalInventory.length === 0 && (
                      <p className="py-8 text-center text-xs text-slate-400">
                        No encontramos productos.
                      </p>
                    )}
                    <button className="link-button mt-3" onClick={() => navigate("Inventario")}>
                      Abrir inventario <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
              </div>

              {allTasksOpen && (
                <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-start justify-between border-b border-slate-100 p-6">
                      <div>
                        <p className="eyebrow">Flujo operativo</p>
                        <h2 className="mt-1 text-xl font-semibold">Todas las tareas</h2>
                        <p className="mt-1 text-xs text-slate-400">
                          Pendientes del equipo por área. Haz clic en una tarea para atenderla.
                        </p>
                      </div>
                      <button
                        className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                        onClick={() => setAllTasksOpen(false)}
                        aria-label="Cerrar tareas"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {([role, ...(["Administrador", "Ventas", "Almacén"] as Role[]).filter(
                        (item) => item !== role,
                      )] as Role[]).map((area) => (
                        <div key={area}>
                          <div className="flex items-center justify-between bg-[#fafcfb] px-6 py-2.5">
                            <p className="eyebrow">{area}</p>
                            <span className="text-[10px] text-slate-400">
                              {taskSets[area].filter((task) => !completed.includes(task.title)).length}{" "}
                              pendientes
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {taskSets[area].map((task) => {
                              const isDone = completed.includes(task.title);
                              return (
                                <div
                                  key={task.title}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openTask(task)}
                                  onKeyDown={(event) => event.key === "Enter" && openTask(task)}
                                  className={`task-row group cursor-pointer px-6 ${isDone ? "opacity-50" : ""}`}
                                >
                                  <button
                                    className={`task-check ${isDone ? "task-check--done" : ""}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleTask(task.title);
                                    }}
                                    aria-label={isDone ? "Marcar como pendiente" : "Completar tarea"}
                                  >
                                    {isDone && <Check size={13} />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`truncate text-sm font-semibold ${isDone ? "line-through" : ""}`}
                                    >
                                      {task.title}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-slate-400">
                                      {task.meta}
                                    </p>
                                  </div>
                                  <span
                                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${task.type === "Urgente" ? "bg-[#fff0eb] text-[#c9664f]" : "bg-slate-100 text-slate-500"}`}
                                  >
                                    {task.type}
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#2f7468]">
                                    {task.action} <ChevronRight size={13} />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
                <section className="panel overflow-hidden">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Rendimiento</p>
                      <h2 className="panel-title">Ventas recientes</h2>
                    </div>
                    <div className="flex rounded-lg bg-slate-100 p-1 text-[10px] font-semibold">
                      {(["Hoy", "Semana"] as const).map((item) => (
                        <button
                          key={item}
                          onClick={() => setRange(item)}
                          className={`rounded-md px-3 py-1.5 ${range === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="flex h-36 items-end gap-2 sm:gap-4">
                      {(range === "Hoy"
                        ? [24, 42, 33, 58, 48, 74, 68, 91, 73, 86, 62, 78]
                        : [42, 60, 54, 82, 65, 95, 88, 72, 92, 76, 98, 84]
                      ).map((height, index) => (
                        <div key={index} className="group relative flex h-full flex-1 items-end">
                          <div
                            className="w-full rounded-t-[5px] bg-[#dce9e6] transition-all group-hover:bg-[#2f7468]"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-[9px] text-slate-400">
                      <span>8:00</span>
                      <span>10:00</span>
                      <span>12:00</span>
                      <span>14:00</span>
                      <span>16:00</span>
                      <span>18:00</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-[#183b36] p-5 text-white shadow-[0_15px_40px_rgba(20,55,49,0.14)]">
                  {(() => {
                    type ChatMessage = {
                      id: number;
                      author: string;
                      initials: string;
                      text: string;
                      time: string;
                      mine?: boolean;
                    };
                    type ChannelId = "general" | "ventas" | "almacen" | "rutas";
                    const channelList: {
                      id: ChannelId;
                      name: string;
                      members: string;
                      roles: Role[];
                    }[] = [
                      {
                        id: "general",
                        name: "Equipo general",
                        members: "4 miembros",
                        roles: ["Administrador", "Ventas", "Almacén"],
                      },
                      {
                        id: "ventas",
                        name: "Ventas",
                        members: "Carlos y Ana",
                        roles: ["Administrador", "Ventas"],
                      },
                      {
                        id: "almacen",
                        name: "Almacén",
                        members: "Carlos y Luis",
                        roles: ["Administrador", "Almacén"],
                      },
                      {
                        id: "rutas",
                        name: "Rutas",
                        members: "3 miembros",
                        roles: ["Administrador", "Almacén"],
                      },
                    ];
                    const startingMessages: Record<ChannelId, ChatMessage[]> = {
                      general: [
                        {
                          id: 1,
                          author: "Ana López",
                          initials: "AL",
                          text: "La cotización C-298 ya está validada.",
                          time: "11:54",
                        },
                        {
                          id: 2,
                          author: "Luis Ortega",
                          initials: "LO",
                          text: "Ruta 02 terminada de surtir, sin faltantes.",
                          time: "11:46",
                        },
                      ],
                      ventas: [
                        {
                          id: 3,
                          author: "Ana López",
                          initials: "AL",
                          text: "El cliente de Constructora MZ confirmó el pedido.",
                          time: "11:37",
                        },
                      ],
                      almacen: [
                        {
                          id: 4,
                          author: "Luis Ortega",
                          initials: "LO",
                          text: "Quedan solo 6 tramos de CPVC de 3/4.",
                          time: "11:22",
                        },
                      ],
                      rutas: [
                        {
                          id: 5,
                          author: "Roberto García",
                          initials: "RG",
                          text: "Primera entrega completada. Sigo hacia Tlalnepantla.",
                          time: "11:18",
                        },
                      ],
                    };

                    function TeamChat() {
                      const [open, setOpen] = useState(false);
                      const [channel, setChannel] = useState<ChannelId>("general");
                      const [messages, setMessages] =
                        useState<Record<ChannelId, ChatMessage[]>>(startingMessages);
                      const [draft, setDraft] = useState("");
                      const [query, setQuery] = useState("");
                      const [unread, setUnread] = useState<Record<ChannelId, number>>({
                        general: 0,
                        ventas: 1,
                        almacen: 1,
                        rutas: 0,
                      });
                      const [notice, setNotice] = useState("");

                      const visibleChannels =
                        role === "Administrador"
                          ? channelList
                          : channelList.filter((item) => item.roles.includes(role));
                      const currentMessages = messages[channel].filter((message) =>
                        `${message.author} ${message.text}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      );
                      const totalUnread = Object.values(unread).reduce(
                        (total, count) => total + count,
                        0,
                      );

                      const selectChannel = (id: ChannelId) => {
                        setChannel(id);
                        setUnread((items) => ({ ...items, [id]: 0 }));
                      };

                      const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const text = draft.trim();
                        if (!text) return;
                        setMessages((items) => ({
                          ...items,
                          [channel]: [
                            ...items[channel],
                            {
                              id: Date.now(),
                              author: user.name,
                              initials: user.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2),
                              text,
                              time: "Ahora",
                              mine: true,
                            },
                          ],
                        }));
                        setDraft("");
                      };

                      const receiveMessage = () => {
                        const target: ChannelId = role === "Almacén" ? "almacen" : "general";
                        const incoming: ChatMessage = {
                          id: Date.now(),
                          author: "Ana López",
                          initials: "AL",
                          text: "¿Me ayudan a confirmar existencias para el pedido V-1848?",
                          time: "Ahora",
                        };
                        setMessages((items) => ({
                          ...items,
                          [target]: [...items[target], incoming],
                        }));
                        if (!open || channel !== target) {
                          setUnread((items) => ({ ...items, [target]: items[target] + 1 }));
                        }
                        setNotice("Nuevo mensaje de Ana López");
                        window.setTimeout(() => setNotice(""), 2600);
                      };

                      const recent = messages.general.slice(-2).reverse();

                      return (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#b8f34a]">
                                  Chat interno
                                </p>
                                {totalUnread > 0 && (
                                  <span className="grid size-4 place-items-center rounded-full bg-[#e5785f] text-[8px] font-bold text-white">
                                    {totalUnread}
                                  </span>
                                )}
                              </div>
                              <h2 className="mt-1 text-lg font-semibold">Equipo conectado</h2>
                            </div>
                            <button
                              className="relative grid size-9 place-items-center rounded-xl bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
                              onClick={receiveMessage}
                              aria-label="Simular nuevo mensaje"
                              title="Simular mensaje entrante"
                            >
                              <Bell size={17} />
                              {totalUnread > 0 && (
                                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#b8f34a]" />
                              )}
                            </button>
                          </div>

                          <div className="mt-5 space-y-3">
                            {recent.map((message) => (
                              <button
                                key={message.id}
                                className="flex w-full gap-3 rounded-xl p-1 text-left transition hover:bg-white/5"
                                onClick={() => {
                                  selectChannel("general");
                                  setOpen(true);
                                }}
                              >
                                <span
                                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${
                                    message.initials === "LO"
                                      ? "bg-[#b8f34a] text-[#183b36]"
                                      : "bg-white/10 text-white"
                                  }`}
                                >
                                  {message.initials}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center justify-between gap-2">
                                    <strong className="text-xs text-white">{message.author}</strong>
                                    <span className="text-[9px] text-white/30">{message.time}</span>
                                  </span>
                                  <span className="mt-1 block truncate text-[10px] text-white/55">
                                    {message.text}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>

                          <button
                            className="mt-4 flex w-full items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-xs font-semibold text-white transition hover:bg-white/15"
                            onClick={() => setOpen(true)}
                          >
                            <span className="flex items-center gap-2">
                              <MessageCircle size={15} className="text-[#b8f34a]" />
                              Abrir conversaciones
                            </span>
                            <ChevronRight size={14} className="text-white/40" />
                          </button>

                          {notice && (
                            <div className="fixed right-5 top-24 z-[70] flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#183b36] shadow-2xl">
                              <span className="grid size-8 place-items-center rounded-lg bg-[#edf4f2] text-[#2f7468]">
                                <MessageCircle size={15} />
                              </span>
                              {notice}
                            </div>
                          )}

                          {open && (
                            <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/65 p-3 text-[#162523] backdrop-blur-sm sm:p-5">
                              <div className="grid h-[min(760px,90vh)] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[260px_minmax(0,1fr)]">
                                <aside className="hidden border-r border-slate-200 bg-[#f7f9f8] md:flex md:flex-col">
                                  <div className="border-b border-slate-200 p-5">
                                    <div className="flex items-center gap-3">
                                      <span className="grid size-9 place-items-center rounded-xl bg-[#183b36] text-[10px] font-black text-[#b8f34a]">
                                        99
                                      </span>
                                      <div>
                                        <p className="text-sm font-semibold">Chat de equipo</p>
                                        <p className="mt-0.5 text-[9px] text-slate-400">
                                          {role === "Administrador" ? "Vista administrativa" : role}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                                      Conversaciones
                                    </p>
                                    {visibleChannels.map((item) => (
                                      <button
                                        key={item.id}
                                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${
                                          channel === item.id
                                            ? "bg-white text-[#285e56] shadow-sm"
                                            : "text-slate-500 hover:bg-white/70"
                                        }`}
                                        onClick={() => selectChannel(item.id)}
                                      >
                                        <span
                                          className={`grid size-8 place-items-center rounded-lg ${
                                            channel === item.id
                                              ? "bg-[#edf4f2] text-[#2f7468]"
                                              : "bg-slate-200/60 text-slate-400"
                                          }`}
                                        >
                                          <Users size={14} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-xs font-semibold">
                                            {item.name}
                                          </span>
                                          <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                                            {item.members}
                                          </span>
                                        </span>
                                        {unread[item.id] > 0 && (
                                          <span className="grid size-5 place-items-center rounded-full bg-[#e5785f] text-[8px] font-bold text-white">
                                            {unread[item.id]}
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  {role === "Administrador" && (
                                    <div className="mx-3 mt-auto mb-3 rounded-xl bg-[#183b36] p-3 text-white">
                                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b8f34a]">
                                        Administrador
                                      </p>
                                      <p className="mt-1 text-[10px] leading-relaxed text-white/55">
                                        Puedes consultar todos los canales y mensajes del equipo.
                                      </p>
                                    </div>
                                  )}
                                </aside>

                                <div className="flex min-w-0 flex-col">
                                  <header className="flex h-[70px] items-center gap-3 border-b border-slate-200 px-4 sm:px-5">
                                    <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                                      <Users size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold">
                                        {channelList.find((item) => item.id === channel)?.name}
                                      </p>
                                      <p className="mt-0.5 text-[9px] text-[#55a875]">
                                        Equipo disponible
                                      </p>
                                    </div>
                                    <button
                                      className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-500"
                                      onClick={() => setOpen(false)}
                                      aria-label="Cerrar chat"
                                    >
                                      <X size={16} />
                                    </button>
                                  </header>

                                  <div className="border-b border-slate-100 p-3 md:hidden">
                                    <select
                                      value={channel}
                                      onChange={(event) =>
                                        selectChannel(event.target.value as ChannelId)
                                      }
                                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none"
                                    >
                                      {visibleChannels.map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.name}
                                          {unread[item.id] ? ` (${unread[item.id]})` : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="border-b border-slate-100 p-3">
                                    <div className="relative">
                                      <Search
                                        size={14}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                      />
                                      <input
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        className="h-9 w-full rounded-xl bg-slate-100 pl-9 pr-3 text-[10px] outline-none"
                                        placeholder="Buscar en esta conversación..."
                                      />
                                    </div>
                                  </div>

                                  <div className="flex-1 space-y-4 overflow-y-auto bg-[#fafcfb] p-4 sm:p-6">
                                    <p className="text-center text-[9px] font-semibold uppercase tracking-wider text-slate-300">
                                      Hoy
                                    </p>
                                    {currentMessages.map((message) => (
                                      <div
                                        key={message.id}
                                        className={`flex gap-2.5 ${
                                          message.mine ? "flex-row-reverse" : ""
                                        }`}
                                      >
                                        <span
                                          className={`grid size-8 shrink-0 place-items-center rounded-lg text-[9px] font-bold ${
                                            message.mine
                                              ? "bg-[#b8f34a] text-[#183b36]"
                                              : "bg-[#dce8e5] text-[#285e56]"
                                          }`}
                                        >
                                          {message.initials}
                                        </span>
                                        <div
                                          className={`max-w-[78%] ${
                                            message.mine ? "text-right" : ""
                                          }`}
                                        >
                                          <p className="mb-1 text-[9px] font-semibold text-slate-400">
                                            {message.author} · {message.time}
                                          </p>
                                          <p
                                            className={`rounded-2xl px-3.5 py-2.5 text-left text-xs leading-relaxed ${
                                              message.mine
                                                ? "rounded-tr-sm bg-[#2f7468] text-white"
                                                : "rounded-tl-sm border border-slate-100 bg-white text-slate-600 shadow-sm"
                                            }`}
                                          >
                                            {message.text}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {currentMessages.length === 0 && (
                                      <p className="py-10 text-center text-xs text-slate-400">
                                        No encontramos mensajes.
                                      </p>
                                    )}
                                  </div>

                                  <form
                                    className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 sm:p-4"
                                    onSubmit={sendMessage}
                                  >
                                    <input
                                      value={draft}
                                      onChange={(event) => setDraft(event.target.value)}
                                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs outline-none focus:border-[#2f7468]"
                                      placeholder={`Escribe en ${channelList.find((item) => item.id === channel)?.name}...`}
                                      autoFocus
                                    />
                                    <button
                                      type="submit"
                                      disabled={!draft.trim()}
                                      className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2f7468] text-white transition hover:bg-[#285f56] disabled:opacity-40"
                                      aria-label="Enviar mensaje"
                                    >
                                      <Send size={17} />
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    }

                    return <TeamChat />;
                  })()}
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      {quoteOpen && (
        <QuoteBuilder
          maxDiscount={maxDiscountOf(roles, userRole)}
          initialCustomer={quoteCustomer || undefined}
          customers={customers}
          products={[...inventoryProducts, ...kits.filter((kit) => kit.status === "Activo").map((kit) => kitAsProduct(kit, inventoryProducts))]}
          owner={user.name}
          onClose={() => {
            setQuoteOpen(false);
            setQuoteCustomer(null);
          }}
          onAddCustomer={(customer) => setCustomers((items) => [customer, ...items])}
          onComplete={handleCreateQuote}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-xl bg-[#183b36] px-4 py-3 text-xs font-medium text-white shadow-xl">
          <Check size={15} className="text-[#b8f34a]" />
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
