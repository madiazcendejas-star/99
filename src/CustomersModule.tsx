import { useMemo, useState } from "react";
import StatementPrintView, { type StatementRow } from "./CustomerDocument";
import type { Order } from "./OrdersModule";
import { pendingAmount, type Sale } from "./SalesModule";
import {
  ArrowUpRight,
  Building2,
  Printer,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";

export type CustomerType = "Mayorista" | "Contratista" | "Mostrador";
export type CustomerStatus = "Activo" | "Con saldo" | "Inactivo";
export type Customer = {
  id: string;
  businessName: string;
  contactName: string;
  rfc: string;
  type: CustomerType;
  status: CustomerStatus;
  phone: string;
  email: string;
  address: string;
  city: string;
  creditDays: number;
  creditLimit: number;
  balance: number;
  totalPurchases: number;
  orders: number;
  lastPurchase: string;
  channel: "WhatsApp" | "Mostrador" | "Teléfono";
  notes: string;
  /** Saldo a favor por devoluciones, aplicable en compras futuras */
  creditBalance?: number;
};

export const initialCustomers: Customer[] = [
  {
    id: "CL-1049",
    businessName: "Ferremateriales Tula",
    contactName: "Rodrigo Pérez",
    rfc: "FTU190311HG5",
    type: "Mayorista",
    status: "Con saldo",
    phone: "773 732 1450",
    email: "compras@ferretula.mx",
    address: "Av. Insurgentes 210, Centro",
    city: "Tula de Allende, Hgo.",
    creditDays: 0,
    creditLimit: 0,
    balance: 10540,
    totalPurchases: 58320,
    orders: 7,
    lastPurchase: "17 nov 2026",
    channel: "WhatsApp",
    notes: "Entrega foránea. Cobro contra entrega en efectivo o transferencia.",
  },
  {
    id: "CL-1048",
    businessName: "Ferretería López",
    contactName: "Mariana López",
    rfc: "FLO180624KQ2",
    type: "Mayorista",
    status: "Activo",
    phone: "55 4182 9050",
    email: "compras@ferreterialopez.mx",
    address: "Av. Central 145, Col. Industrial",
    city: "Ciudad de México",
    creditDays: 30,
    creditLimit: 80000,
    balance: 0,
    totalPurchases: 184620,
    orders: 28,
    lastPurchase: "18 nov 2026",
    channel: "WhatsApp",
    notes: "Prefiere entregas por la mañana. Precio mayorista nivel A.",
  },
  {
    id: "CL-1047",
    businessName: "Constructora MZ",
    contactName: "Miguel Zamora",
    rfc: "CMZ2103158R4",
    type: "Contratista",
    status: "Con saldo",
    phone: "55 7231 4408",
    email: "miguel@constructoramz.com",
    address: "Insurgentes Sur 820, Piso 4",
    city: "Ciudad de México",
    creditDays: 15,
    creditLimit: 50000,
    balance: 18240,
    totalPurchases: 132480,
    orders: 19,
    lastPurchase: "17 nov 2026",
    channel: "WhatsApp",
    notes: "Solicita cotizaciones por obra y entrega consolidada.",
  },
  {
    id: "CL-1046",
    businessName: "Plomería del Centro",
    contactName: "José Ramírez",
    rfc: "PCE190806U71",
    type: "Mayorista",
    status: "Con saldo",
    phone: "55 1955 6210",
    email: "jose@plomeriacentro.mx",
    address: "República de Uruguay 67, Centro",
    city: "Ciudad de México",
    creditDays: 30,
    creditLimit: 60000,
    balance: 2048,
    totalPurchases: 248930,
    orders: 42,
    lastPurchase: "17 nov 2026",
    channel: "Teléfono",
    notes: "Cliente recurrente. Confirmar existencias de CPVC antes de surtir.",
  },
  {
    id: "CL-1045",
    businessName: "Instalaciones Ríos",
    contactName: "Sofía Ríos",
    rfc: "IRI220119AC3",
    type: "Contratista",
    status: "Activo",
    phone: "55 8803 1276",
    email: "sofia@instalacionesrios.com",
    address: "Calz. de Tlalpan 1830",
    city: "Ciudad de México",
    creditDays: 0,
    creditLimit: 0,
    balance: 0,
    totalPurchases: 68940,
    orders: 14,
    lastPurchase: "16 nov 2026",
    channel: "Mostrador",
    notes: "Pago de contado. Busca materiales para instalaciones residenciales.",
  },
  {
    id: "CL-1044",
    businessName: "Grupo Hidráulico Norte",
    contactName: "Pablo Cruz",
    rfc: "GHN170912JS8",
    type: "Mayorista",
    status: "Activo",
    phone: "55 6120 3384",
    email: "abasto@ghnorte.mx",
    address: "Av. Ceylán 450, Bodega 12",
    city: "Tlalnepantla",
    creditDays: 30,
    creditLimit: 120000,
    balance: 0,
    totalPurchases: 412680,
    orders: 56,
    lastPurchase: "15 nov 2026",
    channel: "WhatsApp",
    notes: "Cuenta estratégica. Entrega en ruta norte los martes y jueves.",
  },
  {
    id: "CL-1043",
    businessName: "Obras del Bajío",
    contactName: "Andrés Téllez",
    rfc: "OBA200528MR6",
    type: "Contratista",
    status: "Inactivo",
    phone: "442 318 9044",
    email: "andres@obrasbajio.mx",
    address: "Blvd. Bernardo Quintana 302",
    city: "Querétaro",
    creditDays: 15,
    creditLimit: 40000,
    balance: 0,
    totalPurchases: 84220,
    orders: 11,
    lastPurchase: "28 sep 2026",
    channel: "Teléfono",
    notes: "Sin actividad reciente. Contactar para reactivación.",
  },
];

type NewCustomer = Omit<
  Customer,
  "id" | "status" | "balance" | "totalPurchases" | "orders" | "lastPurchase"
>;

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export type CustomerQuoteRef = { id: string; client: string; date: string; amount: number; status: string; saleId?: string };
type DrawerTab = "Resumen" | "Ventas" | "Cotizaciones" | "Entregas";
type StatusFilter = "Todos" | "Activos" | "Con saldo" | "Inactivo";
type CustomerSort = "Nombre A-Z" | "Mayor compra" | "Mayor saldo" | "Mayor ticket" | "Compra más reciente";

// Fecha de operación del prototipo
const TODAY = new Date(2026, 10, 19, 12);
const MONTHS: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
/** Convierte "18 nov 2026" (o "18 nov 2026 · 10:20") a Date */
const parseDate = (text: string) => {
  const [day, month, year] = text.split(" · ")[0].split(" ");
  return new Date(Number(year), MONTHS[month?.toLowerCase()] ?? NaN, Number(day), 12);
};
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);
const shortDate = (date: Date) =>
  date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");

const typeStyles: Record<CustomerType, string> = {
  Mayorista: "bg-[#edf4f2] text-[#2f7468]",
  Contratista: "bg-[#eef2ff] text-[#596ca6]",
  Mostrador: "bg-slate-100 text-slate-600",
};

const emptyCustomer: NewCustomer = {
  businessName: "",
  contactName: "",
  rfc: "",
  type: "Contratista",
  phone: "",
  email: "",
  address: "",
  city: "",
  creditDays: 0,
  creditLimit: 0,
  channel: "WhatsApp",
  notes: "",
};

export default function CustomersModule({
  customers,
  onAddCustomer,
  onToast,
  initialQuery = "",
  initialSelectedId,
  sales = [],
  quotes = [],
  orders = [],
  onQuote,
  onOpen,
}: {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onToast: (message: string) => void;
  initialQuery?: string;
  initialSelectedId?: string;
  sales?: Sale[];
  quotes?: CustomerQuoteRef[];
  orders?: Order[];
  onQuote?: (customer: Customer) => void;
  onOpen?: (nav: string, focus: { query?: string; selectedId?: string }) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<"Todos" | CustomerType>("Todos");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    () => customers.find((customer) => customer.id === initialSelectedId) || null,
  );
  const [form, setForm] = useState<NewCustomer>(emptyCustomer);
  const [tab, setTab] = useState<DrawerTab>("Resumen");
  const [statementId, setStatementId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [channel, setChannel] = useState("Todos");
  const [city, setCity] = useState("Todas");
  const [credit, setCredit] = useState<"Todos" | "Con crédito" | "Contado">("Todos");
  const [sort, setSort] = useState<CustomerSort>("Nombre A-Z");

  // ---------- Datos del cliente a partir de ventas, cotizaciones y órdenes ----------
  const salesOf = (customer: Customer) => sales.filter((sale) => sale.client === customer.businessName);
  const balanceOf = (customer: Customer) =>
    salesOf(customer).reduce((sum, sale) => sum + pendingAmount(sale), 0);
  const statusOf = (customer: Customer): CustomerStatus =>
    balanceOf(customer) > 0 ? "Con saldo" : customer.status === "Inactivo" ? "Inactivo" : "Activo";
  const ticketOf = (customer: Customer) => customer.totalPurchases / Math.max(1, customer.orders);

  const statementOf = (customer: Customer): StatementRow[] =>
    salesOf(customer)
      .filter((sale) => sale.status !== "Cancelada")
      .filter((sale) => pendingAmount(sale) > 0 || daysBetween(parseDate(sale.date), TODAY) <= 60)
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime() || b.id.localeCompare(a.id))
      .map((sale) => {
        const balance = pendingAmount(sale);
        const order = orders.find((item) => item.id === sale.orderId);
        // De contado con entrega pendiente: se cobra al entregar, todavía no vence
        const awaitingDelivery = customer.creditDays === 0 && !!order && order.status !== "Entregada";
        const due = new Date(parseDate(sale.date));
        due.setDate(due.getDate() + customer.creditDays);
        const daysOverdue = balance > 0 && !awaitingDelivery ? Math.max(0, daysBetween(due, TODAY)) : 0;
        return {
          id: sale.id,
          date: sale.date,
          concept: sale.type === "Pedido" ? `Pedido${sale.orderId ? ` · orden ${sale.orderId}` : ""}` : "Venta de mostrador",
          amount: sale.amount,
          paid: sale.amount - balance,
          balance,
          dueDate: awaitingDelivery && balance > 0 ? "Al entregar" : shortDate(due),
          daysOverdue,
          status:
            balance === 0
              ? "Pagada"
              : awaitingDelivery
                ? "Contra entrega"
                : daysOverdue > 0
                  ? `Vencida ${daysOverdue} d`
                  : "Por vencer",
        };
      });

  const historyOf = (customer: Customer) => {
    const customerSales = salesOf(customer).sort((a, b) => b.id.localeCompare(a.id));
    const customerQuotes = quotes
      .filter((quote) => quote.client === customer.businessName)
      .sort((a, b) => b.id.localeCompare(a.id));
    const customerOrders = orders
      .filter((order) => order.customer === customer.businessName)
      .sort((a, b) => b.id.localeCompare(a.id));
    const activity = [
      ...customerSales.map((sale) => ({
        when: parseDate(sale.date).getTime() + 2,
        date: sale.date,
        title: `Venta ${sale.id} · ${money(sale.amount)}`,
        detail: pendingAmount(sale) > 0 ? `Por cobrar ${money(pendingAmount(sale))}` : sale.status,
        dot: pendingAmount(sale) > 0 ? "bg-[#e2b553]" : sale.status === "Cancelada" ? "bg-[#e5785f]" : "bg-[#82aa58]",
        open: () => onOpen?.("Ventas", { selectedId: sale.id }),
      })),
      ...customerQuotes.map((quote) => ({
        when: parseDate(quote.date).getTime() + 1,
        date: quote.date,
        title: `Cotización ${quote.id} · ${money(quote.amount)}`,
        detail: quote.status,
        dot: "bg-[#73a3d6]",
        open: () => onOpen?.("Cotizaciones", { query: quote.id }),
      })),
      ...customerOrders
        .filter((order) => order.status === "Entregada")
        .map((order) => ({
          when: parseDate(order.date).getTime() + 3,
          date: order.date.split(" · ")[0],
          title: `Orden ${order.id} entregada`,
          detail: `${order.items.length} partidas · ${order.fulfillment}`,
          dot: "bg-[#2f7468]",
          open: () => onOpen?.("Órdenes", { selectedId: order.id }),
        })),
    ].sort((a, b) => b.when - a.when);
    return { sales: customerSales, quotes: customerQuotes, orders: customerOrders, activity };
  };

  const openWhatsApp = (customer: Customer) => {
    const phone = customer.phone.replace(/\D/g, "");
    if (!phone) {
      onToast("Este cliente no tiene teléfono registrado");
      return;
    }
    window.open(`https://wa.me/52${phone}?text=${encodeURIComponent(`Hola ${customer.contactName}, `)}`, "_blank");
    onToast(`Abriendo WhatsApp con ${customer.contactName}`);
  };

  const cities = [...new Set(customers.map((customer) => customer.city).filter(Boolean))].sort();
  const advancedCount =
    (statusFilter !== "Todos" ? 1 : 0) +
    (channel !== "Todos" ? 1 : 0) +
    (city !== "Todas" ? 1 : 0) +
    (credit !== "Todos" ? 1 : 0) +
    (sort !== "Nombre A-Z" ? 1 : 0);
  const clearAdvanced = () => {
    setStatusFilter("Todos");
    setChannel("Todos");
    setCity("Todas");
    setCredit("Todos");
    setSort("Nombre A-Z");
  };

  const filtered = useMemo(() => {
    const list = customers.filter(
      (customer) =>
        (type === "Todos" || customer.type === type) &&
        `${customer.businessName} ${customer.contactName} ${customer.rfc} ${customer.phone}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (statusFilter === "Todos" ||
          (statusFilter === "Activos" ? statusOf(customer) !== "Inactivo" : statusOf(customer) === statusFilter)) &&
        (channel === "Todos" || customer.channel === channel) &&
        (city === "Todas" || customer.city === city) &&
        (credit === "Todos" || (credit === "Con crédito" ? customer.creditDays > 0 : customer.creditDays === 0)),
    );
    return [...list].sort((a, b) =>
      sort === "Mayor compra"
        ? b.totalPurchases - a.totalPurchases
        : sort === "Mayor saldo"
          ? balanceOf(b) - balanceOf(a)
          : sort === "Mayor ticket"
            ? ticketOf(b) - ticketOf(a)
            : sort === "Compra más reciente"
              ? (parseDate(b.lastPurchase).getTime() || 0) - (parseDate(a.lastPurchase).getTime() || 0)
              : a.businessName.localeCompare(b.businessName),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, sales, query, type, statusFilter, channel, city, credit, sort]);

  const totalBalance = customers.reduce((sum, customer) => sum + balanceOf(customer), 0);
  const statementCustomer = customers.find((customer) => customer.id === statementId) || null;
  const totalPurchases = customers.reduce((sum, customer) => sum + customer.totalPurchases, 0);

  const submitCustomer = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextNumber =
      Math.max(...customers.map((customer) => Number(customer.id.replace("CL-", "")))) + 1;
    const customer: Customer = {
      ...form,
      id: `CL-${nextNumber}`,
      status: "Activo",
      balance: 0,
      totalPurchases: 0,
      orders: 0,
      lastPurchase: "Sin compras",
    };
    onAddCustomer(customer);
    setForm(emptyCustomer);
    setAddOpen(false);
    onToast(`${customer.businessName} agregado al directorio`);
  };

  const update = <K extends keyof NewCustomer>(field: K, value: NewCustomer[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Comercial <ChevronRight size={13} /> <span className="text-slate-700">Clientes</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Clientes</h1>
          <p className="mt-2 text-sm text-slate-500">
            Centraliza contactos, historial, saldos y condiciones comerciales.
          </p>
        </div>
        <button className="primary-button" onClick={() => setAddOpen(true)}>
          <Plus size={17} /> Nuevo cliente
        </button>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Clientes activos",
            value: String(customers.filter((customer) => statusOf(customer) !== "Inactivo").length),
            detail: `${customers.filter((customer) => statusOf(customer) === "Inactivo").length} inactivos`,
            icon: Users,
            action: () => {
              clearAdvanced();
              setStatusFilter("Activos");
            },
          },
          {
            label: "Ventas acumuladas",
            value: money(totalPurchases),
            detail: "Ver de mayor a menor compra",
            icon: ShoppingBag,
            action: () => {
              clearAdvanced();
              setSort("Mayor compra");
            },
          },
          {
            label: "Saldo por cobrar",
            value: money(totalBalance),
            detail: `${customers.filter((customer) => balanceOf(customer) > 0).length} cuentas abiertas`,
            icon: CircleDollarSign,
            action: () => {
              clearAdvanced();
              setStatusFilter("Con saldo");
              setSort("Mayor saldo");
            },
          },
          {
            label: "Ticket promedio",
            value: money(totalPurchases / Math.max(1, customers.reduce((sum, customer) => sum + customer.orders, 0))),
            detail: "Ver de mayor a menor ticket",
            icon: FileText,
            action: () => {
              clearAdvanced();
              setSort("Mayor ticket");
            },
          },
        ].map(({ label, value, detail, icon: Icon, action }) => (
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

      <section className="panel mt-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["Todos", "Mayorista", "Contratista", "Mostrador"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setType(item)}
                className={`shrink-0 rounded-lg px-3 py-2 ${
                  type === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"
                }`}
              >
                {item}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {item === "Todos"
                    ? customers.length
                    : customers.filter((customer) => customer.type === item).length}
                </span>
              </button>
            ))}
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
                placeholder="Buscar cliente, contacto, RFC o teléfono..."
              />
            </div>
            <div className="relative">
              <button
                className={`relative grid size-10 shrink-0 place-items-center rounded-xl border bg-white transition ${
                  filtersOpen || advancedCount ? "border-[#2f7468] text-[#2f7468]" : "border-slate-200 text-slate-500"
                }`}
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-label="Filtros avanzados"
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
                    <div className="form-label">
                      Estado de la cuenta
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["Todos", "Activos", "Con saldo", "Inactivo"] as StatusFilter[]).map((item) => (
                          <button
                            key={item}
                            onClick={() => setStatusFilter(item)}
                            className={`rounded-lg border px-2 py-2 text-[10px] font-semibold ${
                              statusFilter === item ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"
                            }`}
                          >
                            {item === "Inactivo" ? "Inactivos" : item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="form-label">
                        Canal
                        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="form-input">
                          {["Todos", "WhatsApp", "Teléfono", "Mostrador"].map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                      <label className="form-label">
                        Crédito
                        <select value={credit} onChange={(e) => setCredit(e.target.value as typeof credit)} className="form-input">
                          {["Todos", "Con crédito", "Contado"].map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="form-label">
                      Ciudad
                      <select value={city} onChange={(e) => setCity(e.target.value)} className="form-input">
                        <option>Todas</option>
                        {cities.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label className="form-label">
                      Ordenar por
                      <select value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)} className="form-input">
                        {(["Nombre A-Z", "Mayor compra", "Mayor saldo", "Mayor ticket", "Compra más reciente"] as CustomerSort[]).map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="primary-button mt-4 w-full" onClick={() => setFiltersOpen(false)}>
                    Ver {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
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
                statusFilter !== "Todos" && (statusFilter === "Inactivo" ? "Inactivos" : statusFilter),
                channel !== "Todos" && `Canal: ${channel}`,
                city !== "Todas" && city,
                credit !== "Todos" && credit,
                sort !== "Nombre A-Z" && `Orden: ${sort.toLowerCase()}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <button className="font-semibold text-[#2f7468]" onClick={clearAdvanced}>
              Quitar filtros
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Cliente</th>
                <th className="py-3.5">Contacto</th>
                <th className="py-3.5">Compras</th>
                <th className="py-3.5">Saldo</th>
                <th className="py-3.5">Última compra</th>
                <th className="py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]"
                >
                  <td className="px-5 py-4">
                    <button
                      className="flex items-center gap-3 text-left"
                      onClick={() => {
                        setTab("Resumen");
                        setSelectedCustomer(customer);
                      }}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f2] font-bold text-[#2f7468]">
                        {customer.businessName
                          .split(" ")
                          .filter((word) => /^[A-ZÁÉÍÓÚÑ]/.test(word))
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{customer.businessName}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {customer.id} · {customer.rfc}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="py-4">
                    <p className="text-slate-700">{customer.contactName}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{customer.phone}</p>
                  </td>
                  <td className="py-4">
                    <p className="font-semibold">{money(customer.totalPurchases)}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{customer.orders} operaciones</p>
                  </td>
                  <td className="py-4">
                    <p
                      className={`font-semibold ${balanceOf(customer) > 0 ? "text-[#c9664f]" : "text-slate-400"}`}
                    >
                      {money(balanceOf(customer))}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Límite {money(customer.creditLimit)}
                    </p>
                  </td>
                  <td className="py-4 text-slate-500">{customer.lastPurchase}</td>
                  <td className="py-4">
                    <div className="space-y-1.5">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ${typeStyles[customer.type]}`}
                      >
                        {customer.type}
                      </span>
                      {statusOf(customer) === "Inactivo" && (
                        <p className="text-[9px] text-slate-400">Sin actividad</p>
                      )}
                      {statusOf(customer) === "Con saldo" && (
                        <p className="text-[9px] font-semibold text-[#c9664f]">Con saldo</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-[#eaf6ef] hover:text-[#347652]"
                        onClick={() => openWhatsApp(customer)}
                        aria-label={`Contactar a ${customer.contactName}`}
                      >
                        <MessageCircle size={15} />
                      </button>
                      <button
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                        onClick={() => setSelectedCustomer(customer)}
                        aria-label={`Ver ${customer.businessName}`}
                      >
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="grid place-items-center px-5 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <Users size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold">No encontramos clientes</p>
            <p className="mt-1 text-xs text-slate-400">Cambia los filtros o agrega uno nuevo.</p>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Mostrando {filtered.length} de {customers.length} clientes
        </div>
      </section>

      {addOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="eyebrow">Directorio comercial</p>
                <h2 className="mt-1 text-xl font-semibold">Nuevo cliente</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Registra contacto, condiciones de venta y crédito.
                </p>
              </div>
              <button
                className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                onClick={() => setAddOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitCustomer}>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <FormField label="Razón social o nombre *" wide>
                  <input
                    required
                    value={form.businessName}
                    onChange={(event) => update("businessName", event.target.value)}
                    className="form-input"
                    placeholder="Nombre del negocio"
                  />
                </FormField>
                <FormField label="Nombre de contacto *">
                  <input
                    required
                    value={form.contactName}
                    onChange={(event) => update("contactName", event.target.value)}
                    className="form-input"
                    placeholder="Nombre completo"
                  />
                </FormField>
                <FormField label="RFC">
                  <input
                    value={form.rfc}
                    onChange={(event) => update("rfc", event.target.value.toUpperCase())}
                    className="form-input"
                    placeholder="RFC con homoclave"
                  />
                </FormField>
                <FormField label="Tipo de cliente">
                  <select
                    value={form.type}
                    onChange={(event) => update("type", event.target.value as CustomerType)}
                    className="form-input"
                  >
                    <option>Mayorista</option>
                    <option>Contratista</option>
                    <option>Mostrador</option>
                  </select>
                </FormField>
                <FormField label="Canal preferido">
                  <select
                    value={form.channel}
                    onChange={(event) =>
                      update("channel", event.target.value as Customer["channel"])
                    }
                    className="form-input"
                  >
                    <option>WhatsApp</option>
                    <option>Mostrador</option>
                    <option>Teléfono</option>
                  </select>
                </FormField>
                <FormField label="Teléfono *">
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    className="form-input"
                    placeholder="55 0000 0000"
                  />
                </FormField>
                <FormField label="Correo electrónico">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    className="form-input"
                    placeholder="contacto@empresa.mx"
                  />
                </FormField>
                <FormField label="Dirección" wide>
                  <input
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                    className="form-input"
                    placeholder="Calle, número y colonia"
                  />
                </FormField>
                <FormField label="Ciudad">
                  <input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    className="form-input"
                    placeholder="Ciudad"
                  />
                </FormField>
                <FormField label="Días de crédito">
                  <input
                    type="number"
                    min="0"
                    value={form.creditDays}
                    onChange={(event) => update("creditDays", Number(event.target.value))}
                    className="form-input"
                  />
                </FormField>
                <FormField label="Límite de crédito">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.creditLimit}
                      onChange={(event) => update("creditLimit", Number(event.target.value))}
                      className="form-input pl-7"
                    />
                  </div>
                </FormField>
                <FormField label="Notas comerciales" wide>
                  <textarea
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className="min-h-20 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
                    placeholder="Preferencias, horarios de entrega o acuerdos..."
                  />
                </FormField>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setAddOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  <Check size={16} /> Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCustomer && (() => {
        const customer = customers.find((item) => item.id === selectedCustomer.id) || selectedCustomer;
        const history = historyOf(customer);
        const balance = balanceOf(customer);
        const statement = statementOf(customer);
        const overdue = statement.filter((row) => row.daysOverdue > 0).reduce((sum, row) => sum + row.balance, 0);
        return (
          <>
            <button
              className="fixed inset-0 z-40 bg-[#102521]/40 backdrop-blur-[2px]"
              onClick={() => setSelectedCustomer(null)}
              aria-label="Cerrar ficha"
            />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#edf4f2] text-base font-bold text-[#2f7468]">
                      {customer.businessName
                        .split(" ")
                        .filter((word) => /^[A-ZÁÉÍÓÚÑ]/.test(word))
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">{customer.businessName}</h2>
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${typeStyles[customer.type]}`}>
                          {customer.type}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {customer.id} · {customer.rfc || "Sin RFC"} · {customer.city || "Sin ciudad"}
                      </p>
                    </div>
                  </div>
                  <button
                    className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="primary-button min-h-10" onClick={() => onQuote?.(customer)}>
                    <FileText size={15} /> Cotizar
                  </button>
                  <button className="secondary-button flex min-h-10 items-center justify-center gap-2 bg-white" onClick={() => openWhatsApp(customer)}>
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button className="secondary-button flex min-h-10 items-center justify-center gap-2 bg-white" onClick={() => setStatementId(customer.id)}>
                    <Printer size={15} /> Estado de cuenta
                  </button>
                </div>
                <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {([
                    ["Resumen", null],
                    ["Ventas", history.sales.length],
                    ["Cotizaciones", history.quotes.length],
                    ["Entregas", history.orders.length],
                  ] as [DrawerTab, number | null][]).map(([item, count]) => (
                    <button
                      key={item}
                      onClick={() => setTab(item)}
                      className={`flex-1 rounded-lg px-2 py-2 ${tab === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
                    >
                      {item}
                      {count !== null && <span className="ml-1 text-[10px] opacity-60">{count}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {tab === "Resumen" && (
                  <>
                    <section className="grid grid-cols-2 gap-3">
                      <Summary label="Compras totales" value={money(customer.totalPurchases)} />
                      <Summary label="Operaciones" value={String(customer.orders)} />
                      <Summary label="Saldo por cobrar" value={money(balance)} danger={balance > 0} />
                      <Summary
                        label={customer.creditLimit ? "Crédito disponible" : "Condición"}
                        value={customer.creditLimit ? money(Math.max(0, customer.creditLimit - balance)) : "Contado"}
                      />
                      {(customer.creditBalance ?? 0) > 0 && (
                        <Summary label="Saldo a favor (devoluciones)" value={money(customer.creditBalance ?? 0)} />
                      )}
                    </section>
                    {overdue > 0 && (
                      <p className="flex items-center gap-2 rounded-xl bg-[#fff0eb] px-3 py-2.5 text-[11px] font-semibold text-[#c9664f]">
                        Tiene {money(overdue)} vencidos según sus días de crédito.
                      </p>
                    )}
                    <section>
                      <p className="eyebrow">Contacto</p>
                      <div className="mt-3 space-y-3 text-xs text-slate-600">
                        <InfoRow icon={UserRound} value={customer.contactName} />
                        <InfoRow icon={Phone} value={customer.phone} />
                        <InfoRow icon={Mail} value={customer.email || "Sin correo registrado"} />
                        <InfoRow icon={MapPin} value={`${customer.address}, ${customer.city}`} />
                      </div>
                    </section>
                    <section>
                      <p className="eyebrow">Condiciones</p>
                      <div className="mt-3 rounded-xl border border-slate-100 p-4 text-xs">
                        {[
                          ["Lista de precios", customer.type],
                          ["Días de crédito", customer.creditDays ? `${customer.creditDays} días` : "Contado"],
                          ["Límite de crédito", customer.creditLimit ? money(customer.creditLimit) : "—"],
                          ["Canal preferido", customer.channel],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between py-1.5">
                            <span className="text-slate-400">{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section>
                      <p className="eyebrow">Notas</p>
                      <p className="mt-3 rounded-xl bg-[#f6f8f7] p-4 text-xs leading-relaxed text-slate-500">
                        {customer.notes || "Sin notas comerciales."}
                      </p>
                    </section>
                    <section>
                      <p className="eyebrow">Actividad reciente</p>
                      <div className="mt-3 space-y-2">
                        {history.activity.slice(0, 6).map((item, index) => (
                          <button
                            key={index}
                            onClick={item.open}
                            className="flex w-full gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-[#cfe3dd] hover:bg-[#fafcfb]"
                          >
                            <span className={`mt-1 size-2 shrink-0 rounded-full ${item.dot}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold">{item.title}</p>
                              <p className="mt-1 text-[10px] text-slate-400">{item.detail}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400">{item.date}</span>
                          </button>
                        ))}
                        {history.activity.length === 0 && (
                          <p className="text-xs text-slate-400">Sin movimientos registrados todavía.</p>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {tab === "Ventas" && (
                  <ListBlock
                    empty="Este cliente aún no tiene ventas."
                    rows={history.sales.map((sale) => ({
                      key: sale.id,
                      title: `Venta ${sale.id}`,
                      detail: `${sale.date} · ${sale.type}${sale.orderId ? ` · Orden ${sale.orderId}` : ""}`,
                      amount: money(sale.amount),
                      badge: pendingAmount(sale) > 0 ? `Debe ${money(pendingAmount(sale))}` : sale.status,
                      tone: sale.status === "Cancelada" ? "red" : pendingAmount(sale) > 0 ? "amber" : "green",
                      open: () => onOpen?.("Ventas", { selectedId: sale.id }),
                    }))}
                  />
                )}
                {tab === "Cotizaciones" && (
                  <ListBlock
                    empty="Este cliente aún no tiene cotizaciones."
                    rows={history.quotes.map((quote) => ({
                      key: quote.id,
                      title: `Cotización ${quote.id}`,
                      detail: `${quote.date}${quote.saleId ? ` · Venta ${quote.saleId}` : ""}`,
                      amount: money(quote.amount),
                      badge: quote.status,
                      tone: quote.status === "Aceptada" ? "green" : quote.status === "Vencida" ? "red" : quote.status === "Enviada" ? "blue" : "slate",
                      open: () => onOpen?.("Cotizaciones", { query: quote.id }),
                    }))}
                  />
                )}
                {tab === "Entregas" && (
                  <ListBlock
                    empty="Este cliente no tiene órdenes de surtido."
                    rows={history.orders.map((order) => ({
                      key: order.id,
                      title: `Orden ${order.id}`,
                      detail: `${order.date} · ${order.fulfillment}${order.route && order.route !== "Por asignar" ? ` · ${order.route}` : ""}`,
                      amount: `${order.items.length} ${order.items.length === 1 ? "partida" : "partidas"}`,
                      badge: order.status,
                      tone: order.status === "Entregada" ? "green" : ["Cancelada", "Por reacomodar"].includes(order.status) ? "red" : "blue",
                      open: () => onOpen?.("Órdenes", { selectedId: order.id }),
                    }))}
                  />
                )}
              </div>
            </aside>
          </>
        );
      })()}

      {statementCustomer && (
        <StatementPrintView
          customer={statementCustomer}
          rows={statementOf(statementCustomer)}
          onClose={() => setStatementId(null)}
        />
      )}
    </>
  );
}

const toneClasses = {
  green: "bg-[#eaf6ef] text-[#347652]",
  amber: "bg-[#fff6df] text-[#9a6b18]",
  red: "bg-[#fff0eb] text-[#c9664f]",
  blue: "bg-[#e8f2ff] text-[#3973a8]",
  slate: "bg-slate-100 text-slate-500",
};

function ListBlock({
  rows,
  empty,
}: {
  rows: {
    key: string;
    title: string;
    detail: string;
    amount: string;
    badge: string;
    tone: keyof typeof toneClasses;
    open: () => void;
  }[];
  empty: string;
}) {
  if (!rows.length) return <p className="py-10 text-center text-xs text-slate-400">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      {rows.map((row) => (
        <button
          key={row.key}
          onClick={row.open}
          className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-[#fafcfb]"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{row.title}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{row.detail}</p>
          </div>
          <span className="text-xs font-semibold">{row.amount}</span>
          <span className={`w-28 rounded-lg px-2 py-1 text-center text-[10px] font-semibold ${toneClasses[row.tone]}`}>
            {row.badge}
          </span>
          <ChevronRight size={14} className="text-slate-300" />
        </button>
      ))}
    </div>
  );
}

function FormField({

  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`form-label ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function InfoRow({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
      <span>{value}</span>
    </div>
  );
}

function Summary({
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
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1.5 text-sm font-semibold ${danger ? "text-[#c9664f]" : ""}`}>{value}</p>
    </div>
  );
}

function Activity({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#82aa58]" />
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
