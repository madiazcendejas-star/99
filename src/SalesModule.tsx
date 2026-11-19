import { useMemo, useState } from "react";
import { policies } from "./config";
import type { Customer } from "./CustomersModule";
import { HandOverModal, type Order } from "./OrdersModule";
import type { RoutePlan } from "./RoutesModule";
import SalePrintView, { type ReceivedPayment } from "./SaleDocument";
import { OpenModal } from "./CashModule";
import CustomerPicker from "./CustomerPicker";
import type { KitLineComponent } from "./KitsModule";
import { ReturnWizard, ReturnsTable, type SaleReturn } from "./ReturnsModule";
import ReturnPrintView from "./ReturnDocument";
import { SpecialOrderModal, SpecialOrdersPanel, activeStatuses, isLate, isUncollected, type NewSpecialOrder, type SpecialOrder } from "./SpecialOrdersModule";
import SpecialOrderPrintView from "./SpecialOrderDocument";
import { LayawayModal, LayawaysPanel, WalletModal, isExpired, type Layaway, type NewLayaway, type PayMethodL, type WalletMovement } from "./LayawayModule";
import { LayawayPrintView, WalletPrintView } from "./LayawayDocument";
import type { InventoryProduct } from "./InventoryModule";
import type { Supplier } from "./PurchasesModule";
import { DiscountControl, discountLabel, documentTotals, lineTotals, type Discount } from "./Discount";
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Banknote,
  ClipboardCheck,
  Clock3,
  PackageCheck,
  PenLine,
  RotateCcw,
  Barcode,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  Eye,
  FileText,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRound,
  X,
  Wallet,
  PackagePlus,
  HandCoins,
} from "lucide-react";

export type SaleStatus = "Pagada" | "Pendiente" | "Cancelada";
export type PayMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Contra entrega" | "Saldo a favor" | "Anticipo" | "Apartado";
export type SalePayment = { method: PayMethod; amount: number };
export type SaleLine = {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Importe neto (ya con descuento de la partida) */
  total: number;
  /** Costo unitario cuando no viene del inventario (pedidos especiales, kits) */
  unitCost?: number;
  /** Kit: componentes por cada kit vendido (se imprimen en la nota) */
  components?: KitLineComponent[];
  discount?: Discount;
  discountAmount?: number;
};
/** Líneas vendidas en mostrador (se usan para generar la orden cuando es contra entrega) */
export type PosLine = { sku: string; name: string; quantity: number; unit: string; location: string };

const isCashOnDelivery = (sale: Sale) =>
  sale.payment === "Contra entrega" || !!sale.payments?.some((p) => p.method === "Contra entrega");

/** Monto que falta cobrar de una venta (en contra entrega mixta, solo la parte contra entrega) */
export const pendingAmount = (sale: Sale) =>
  sale.status !== "Pendiente"
    ? 0
    : Math.max(
        0,
        (sale.payments
          ? sale.payments.filter((p) => p.method === "Contra entrega").reduce((sum, p) => sum + p.amount, 0)
          : sale.amount) -
          (sale.creditedAmount ?? 0) -
          (sale.partialPaid ?? 0),
      );
export type Sale = {
  id: string;
  client: string;
  amount: number;
  items: number;
  date: string;
  time: string;
  status: SaleStatus;
  /** "Por definir": venta generada desde cotización; el cobro se registra en Ventas o Rutas.
   *  "Mixto": pagada con dos formas de pago (ver payments). */
  payment: PayMethod | "Por definir" | "Mixto";
  /** Desglose cuando se paga con dos formas de pago */
  payments?: SalePayment[];
  /** Partidas vendidas */
  lines?: SaleLine[];
  /** Venta que liquida un pedido especial (no admite devolución) */
  specialOrderId?: string;
  /** Importe devuelto por el cliente (notas de devolución DV) */
  returnedAmount?: number;
  /** Cobros parciales registrados en ruta (la venta sigue pendiente por la diferencia) */
  partialPaid?: number;
  /** Parte de las devoluciones que se descontó del saldo por cobrar */
  creditedAmount?: number;
  /** Turno de caja en el que se cobró (ventas de punto de venta) */
  cashSessionId?: string;
  /** Descuento global de la venta */
  discount?: Discount;
  discountAmount?: number;
  seller: string;
  type: "Mostrador" | "Pedido";
  /** Cotización de la que se originó la venta */
  quoteId?: string;
  /** Orden de surtido generada para la venta */
  orderId?: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  location: string;
  /** Kits virtuales */
  components?: KitLineComponent[];
  cost?: number;
};

type CartItem = Product & { quantity: number; discount?: Discount };

type SaleSeed = Omit<Sale, "amount" | "items" | "lines">;
// Arma una venta de ejemplo con sus partidas; el importe es la suma de las partidas
const seedSale = (base: SaleSeed, picks: [string, number, number?][]): Sale => {
  const lines = picks.map(([sku, quantity, price]) => {
    const product = products.find((item) => item.id === sku)!;
    const unitPrice = price ?? product.price;
    return { sku, name: product.name, quantity, unit: product.unit, unitPrice, total: unitPrice * quantity };
  });
  return {
    ...base,
    lines,
    amount: lines.reduce((sum, line) => sum + line.total, 0),
    items: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
};

const seedSales = (): Sale[] => [
  seedSale(
    { id: "V-1790", client: "Constructora MZ", date: "10 oct 2026", time: "12:15", status: "Pagada", payment: "Efectivo", seller: "Ana López", type: "Mostrador" },
    [["PVC-TUB-100", 6], ["VAL-ESF-050", 5]],
  ),
  seedSale(
    { id: "V-1847", client: "Público general", date: "18 nov 2026", time: "11:42", status: "Pagada", payment: "Efectivo", seller: "Ana López", type: "Mostrador" },
    [["PVC-COD-100", 10], ["ACC-TEF-012", 8], ["VAL-ESF-050", 4], ["PEG-PVC-250", 2]],
  ),
  seedSale(
    { id: "V-1846", client: "Plomería del Centro", date: "18 nov 2026", time: "10:18", status: "Pendiente", payment: "Por definir", seller: "Carlos Mendoza", type: "Pedido" },
    [["CPVC-TUB-075", 6], ["PVC-COD-100", 20], ["PEG-PVC-250", 4], ["ACC-TEF-012", 12]],
  ),
  seedSale(
    { id: "V-1845", client: "Instalaciones Ríos", date: "18 nov 2026", time: "09:36", status: "Pagada", payment: "Tarjeta", seller: "Ana López", type: "Mostrador" },
    [["PVC-TUB-100", 4], ["VAL-ESF-050", 8]],
  ),
  seedSale(
    { id: "V-1844", client: "Ferretería López", date: "17 nov 2026", time: "17:05", status: "Pagada", payment: "Transferencia", seller: "Carlos Mendoza", type: "Pedido" },
    [["MAN-REF-020", 20], ["ACC-TEF-012", 40], ["PVC-COD-100", 60]],
  ),
  seedSale(
    { id: "V-1843", client: "Público general", date: "17 nov 2026", time: "16:22", status: "Cancelada", payment: "Efectivo", seller: "Ana López", type: "Mostrador" },
    [["PVC-TUB-100", 2], ["ACC-TEF-012", 4]],
  ),
  seedSale(
    { id: "V-1842", client: "Grupo Hidráulico Norte", date: "17 nov 2026", time: "13:14", status: "Pagada", payment: "Tarjeta", seller: "Ana López", type: "Mostrador" },
    [["ROT-TIN-1100", 2], ["PVC-TUB-100", 10]],
  ),
  seedSale(
    { id: "V-1841", client: "Ferremateriales Tula", date: "17 nov 2026", time: "12:40", status: "Pendiente", payment: "Por definir", seller: "Ana López", type: "Pedido" },
    [["PVC-TUB-100", 15, 264], ["ROT-TIN-1100", 2, 3290]],
  ),
  seedSale(
    { id: "V-1840", client: "Obras del Bajío", date: "16 nov 2026", time: "15:40", status: "Pagada", payment: "Transferencia", seller: "Carlos Mendoza", type: "Pedido", quoteId: "C-295", orderId: "OS-0827" },
    [["ROT-TIN-1100", 4, 3150], ["PVC-TUB-100", 30, 249.5], ["PVC-COD-100", 100, 15.8]],
  ),
  seedSale(
    { id: "V-1839", client: "Ferretería López", date: "16 nov 2026", time: "13:18", status: "Pagada", payment: "Efectivo", seller: "Carlos Mendoza", type: "Pedido", orderId: "OS-0826" },
    [["PVC-COD-100", 40, 16.5]],
  ),
  seedSale(
    { id: "V-1838", client: "Constructora MZ", date: "16 nov 2026", time: "12:02", status: "Pagada", payment: "Tarjeta", seller: "Ana López", type: "Pedido", orderId: "OS-0825" },
    [["CPVC-TUB-075", 8, 151]],
  ),
];


const products: Product[] = [
  {
    id: "PVC-TUB-100",
    name: 'Tubo PVC hidráulico 1" x 6 m',
    category: "PVC hidráulico",
    price: 286.5,
    stock: 38,
    unit: "tramo",
    location: "A-02",
  },
  {
    id: "PVC-COD-100",
    name: 'Codo PVC hidráulico 1" 90°',
    category: "Conexiones PVC",
    price: 18.9,
    stock: 124,
    unit: "pieza",
    location: "A-06",
  },
  {
    id: "CPVC-TUB-075",
    name: 'Tubo CPVC 3/4" x 3 m',
    category: "CPVC",
    price: 174,
    stock: 16,
    unit: "tramo",
    location: "C-04",
  },
  {
    id: "ROT-TIN-1100",
    name: "Tinaco Rotoplas tricapa 1,100 L",
    category: "Almacenamiento",
    price: 3499,
    stock: 7,
    unit: "pieza",
    location: "P-01",
  },
  {
    id: "ACC-TEF-012",
    name: "Cinta teflón alta densidad 12 mm",
    category: "Accesorios",
    price: 12.5,
    stock: 240,
    unit: "pieza",
    location: "F-08",
  },
  {
    id: "VAL-ESF-050",
    name: 'Válvula esfera latón 1/2"',
    category: "Válvulas",
    price: 138,
    stock: 42,
    unit: "pieza",
    location: "D-03",
  },
  {
    id: "MAN-REF-020",
    name: 'Manguera reforzada 1/2"',
    category: "Mangueras",
    price: 28,
    stock: 86,
    unit: "metro",
    location: "B-04",
  },
  {
    id: "PEG-PVC-250",
    name: "Pegamento PVC azul 250 ml",
    category: "Adhesivos",
    price: 119,
    stock: 31,
    unit: "pieza",
    location: "F-02",
  },
];

// Más recientes primero
export const initialSales: Sale[] = seedSales().sort((a, b) => b.id.localeCompare(a.id));

const statusStyles: Record<SaleStatus, string> = {
  Pagada: "bg-[#eaf6ef] text-[#347652]",
  Pendiente: "bg-[#fff6df] text-[#9a6b18]",
  Cancelada: "bg-[#fff0eb] text-[#c9664f]",
};

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function SalesModule({
  sales,
  seller,
  onComplete,
  onToast,
  initialQuery = "",
  initialStatus = "Todas",
  onOpen,
  catalog,
  initialView = "documents",
  onExitPos,
  initialSelectedId,
  orders = [],
  routes = [],
  quotes = [],
  customers = [],
  cashSession,
  onOpenCash,
  onGoCash,
  returns = [],
  onReturn,
  onDeliverCounter,
  specialOrders = [],
  suppliers = [],
  inventory = [],
  special,
  initialList,
  layaways = [],
  walletMovements = [],
  layawayActions,
  maxDiscount = 100,
}: {
  /** Tope de descuento del rol del usuario */
  maxDiscount?: number;
  layaways?: Layaway[];
  walletMovements?: WalletMovement[];
  layawayActions?: {
    onCreate: (data: NewLayaway) => string;
    onPay: (id: string, amount: number, method: PayMethodL) => void;
    onExtend: (id: string) => void;
    onCancel: (id: string, reason: string) => string | undefined;
    onDeposit: (client: string, phone: string, amount: number, method: PayMethodL) => void;
  };
  specialOrders?: SpecialOrder[];
  suppliers?: Supplier[];
  inventory?: InventoryProduct[];
  initialList?: "special" | "returns" | "layaways";
  special?: {
    onCreate: (order: NewSpecialOrder) => string;
    onToPurchase: (id: string) => void;
    onNotify: (id: string) => void;
    onDeliver: (id: string, method: string) => void;
    onCancel: (id: string, reason: string) => void;
  };
  returns?: SaleReturn[];
  onDeliverCounter?: (orderId: string, receivedBy: string) => void;
  onReturn?: (ret: Omit<SaleReturn, "id" | "date" | "time" | "user" | "cashSessionId">) => void;
  /** Turno de caja abierto; null = caja cerrada (el punto de venta se bloquea) */
  cashSession?: { id: string; register: string; cashier: string; openedAt: string } | null;
  onOpenCash?: (fund: number) => void;
  onGoCash?: () => void;
  onOpen?: (nav: string, focus: { query?: string; selectedId?: string }) => void;
  initialSelectedId?: string;
  /** "pos" abre directo el punto de venta (acceso desde el menú lateral) */
  initialView?: "documents" | "pos";
  /** Al salir del punto de venta abierto desde el menú */
  onExitPos?: () => void;
  /** Catálogo del punto de venta (existencias reales del inventario) */
  catalog?: Product[];
  orders?: Order[];
  routes?: RoutePlan[];
  quotes?: SaleQuoteRef[];
  customers?: Customer[];
  sales: Sale[];
  seller: string;
  onComplete: (sale: Sale, lines: PosLine[]) => void;
  onToast: (message: string) => void;
  initialQuery?: string;
  initialStatus?: "Todas" | SaleStatus;
}) {
  const [view, setView] = useState<"documents" | "pos">(initialView);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<"Todas" | SaleStatus>(initialStatus);
  const [productQuery, setProductQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<Discount | undefined>();
  const [customer, setCustomer] = useState("Público general");
  const [payment, setPayment] = useState<PayMethod>("Efectivo");
  const [received, setReceived] = useState("");
  const [split, setSplit] = useState(false);
  const [payment2, setPayment2] = useState<PayMethod>("Tarjeta");
  const [amount1, setAmount1] = useState("");
  const [amount2, setAmount2] = useState("");
  const [amount2Touched, setAmount2Touched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(initialSelectedId || null);
  const [printId, setPrintId] = useState<string | null>(null);
  const traceOf = (sale: Sale) => buildTrace(sale, orders, routes, quotes, returns);
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [handOverId, setHandOverId] = useState<string | null>(null);
  const counterOrders = orders.filter(
    (order) => order.fulfillment === "Recoge en mostrador" && !["Entregada", "Cancelada", "Por reacomodar"].includes(order.status),
  );
  const counterReady = counterOrders.filter((order) => order.status === "Liberada a mostrador");
  const [showReturns, setShowReturns] = useState(initialList === "returns");
  const [showSpecial, setShowSpecial] = useState(initialList === "special");
  const [showLayaways, setShowLayaways] = useState(initialList === "layaways");
  const [layawayOpen, setLayawayOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [printLayawayId, setPrintLayawayId] = useState<string | null>(null);
  const [walletPrint, setWalletPrint] = useState<string | null>(null);
  const printLayaway = layaways.find((l) => l.id === printLayawayId) || null;
  const [specialFor, setSpecialFor] = useState<string | null>(null);
  const [printSpecialId, setPrintSpecialId] = useState<string | null>(null);
  const printSpecial = specialOrders.find((order) => order.id === printSpecialId) || null;
  const [printReturnId, setPrintReturnId] = useState<string | null>(null);
  const printReturn = returns.find((ret) => ret.id === printReturnId) || null;
  const creditCustomer = customers.find((item) => item.businessName.toLowerCase() === customer.trim().toLowerCase());
  const creditAvailable = creditCustomer?.creditBalance ?? 0;
  const detailSale = sales.find((sale) => sale.id === detailId) || null;
  const printSale = sales.find((sale) => sale.id === printId) || null;

  const filteredSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          (status === "Todas" || sale.status === status) &&
          `${sale.id} ${sale.client} ${sale.seller} ${sale.date} ${sale.type}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, sales, status],
  );
  const filteredProducts = useMemo(
    () =>
      (catalog ?? products).filter((product) =>
        `${product.name} ${product.id} ${product.category}`
          .toLowerCase()
          .includes(productQuery.toLowerCase()),
      ),
    [productQuery, catalog],
  );

  const calcOf = (item: CartItem) => lineTotals(item.price, item.quantity, item.discount);
  const totals = documentTotals(cart.map(calcOf), globalDiscount);
  // "subtotal" es el total a cobrar (precios con IVA incluido, ya con descuentos)
  const subtotal = totals.total;
  const tax = totals.tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const paidToday = sales
    .filter((sale) => sale.status === "Pagada" && sale.date === "18 nov 2026")
    .reduce((sum, sale) => sum + sale.amount, 0);
  // ---------- Cobro ----------
  const round = (value: number) => Math.round(value * 100) / 100;
  const parts: SalePayment[] = split
    ? [
        { method: payment, amount: round(Number(amount1) || 0) },
        { method: payment2, amount: round(Number(amount2) || 0) },
      ]
    : [{ method: payment, amount: round(subtotal) }];
  const cashPart = parts.filter((p) => p.method === "Efectivo").reduce((sum, p) => sum + p.amount, 0);
  const codPart = parts.filter((p) => p.method === "Contra entrega").reduce((sum, p) => sum + p.amount, 0);
  const creditPart = parts.filter((p) => p.method === "Saldo a favor").reduce((sum, p) => sum + p.amount, 0);
  const assigned = round(parts.reduce((sum, p) => sum + p.amount, 0));
  const remaining = round(subtotal - assigned);
  const change = Math.max(0, Number(received || 0) - cashPart);
  const paymentError = creditPart > creditAvailable + 0.009
    ? `El saldo a favor disponible es ${money(creditAvailable)}.`
    : split
    ? payment === payment2
      ? "Elige dos formas de pago distintas."
      : parts.some((p) => p.amount <= 0)
        ? "Captura el monto de cada forma de pago."
        : Math.abs(remaining) > 0.009
          ? remaining > 0
            ? `Faltan ${money(remaining)} por asignar.`
            : `Te pasaste por ${money(-remaining)}.`
          : cashPart > 0 && Number(received || 0) < cashPart
            ? "El efectivo recibido no cubre la parte en efectivo."
            : ""
    : payment === "Efectivo" && Number(received || 0) < subtotal
      ? "Captura el efectivo recibido."
      : "";

  const openCheckout = () => {
    setSplit(false);
    setPayment("Efectivo");
    setPayment2("Tarjeta");
    setAmount1("");
    setAmount2("");
    setAmount2Touched(false);
    setReceived("");
    setConfirmOpen(true);
  };

  const changeAmount1 = (value: string) => {
    setAmount1(value);
    if (!amount2Touched) {
      const rest = round(subtotal - (Number(value) || 0));
      setAmount2(value === "" ? "" : String(Math.max(0, rest)));
    }
  };

  const addProduct = (product: Product) => {
    if (product.stock <= 0 && product.components) {
      onToast(`${product.name}: falta existencia de algún componente`);
      return;
    }
    if (product.stock <= 0) {
      if (special) {
        // Sin existencia: se ofrece capturarlo como pedido especial
        setSpecialFor(product.id);
        onToast(`${product.name} no tiene existencia: captúralo como pedido especial`);
      } else onToast(`${product.name} no tiene existencia disponible`);
      return;
    }
    setCart((items) => {
      const current = items.find((item) => item.id === product.id);
      if (current) {
        return items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
            : item,
        );
      }
      return [...items, { ...product, quantity: 1 }];
    });
  };

  const changeQuantity = (id: string, amount: number) => {
    setCart((items) =>
      items
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, Math.min(item.stock, item.quantity + amount)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const completeSale = () => {
    if (paymentError) return;
    const nextNumber = Math.max(...sales.map((sale) => Number(sale.id.replace("V-", "")))) + 1;
    const sale: Sale = {
      id: `V-${nextNumber}`,
      client: customer || "Público general",
      amount: subtotal,
      items: totalItems,
      date: "18 nov 2026",
      time: new Date().toTimeString().slice(0, 5),
      status: codPart > 0 ? "Pendiente" : "Pagada",
      payment: split ? "Mixto" : payment,
      payments: split ? parts : undefined,
      seller,
      type: codPart > 0 ? "Pedido" : "Mostrador",
      lines: cart.map((item) => {
        const calc = calcOf(item);
        return {
          sku: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.price,
          total: calc.net,
          discount: calc.discount > 0 ? item.discount : undefined,
          discountAmount: calc.discount > 0 ? calc.discount : undefined,
          components: item.components,
          unitCost: item.components ? item.cost : undefined,
        };
      }),
      discount: totals.globalDiscount > 0 ? globalDiscount : undefined,
      discountAmount: totals.globalDiscount > 0 ? totals.globalDiscount : undefined,
    };
    onComplete(
      sale,
      cart.map((item) => ({
        sku: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
      })),
    );
    setCart([]);
    setGlobalDiscount(undefined);
    setCustomer("Público general");
    setReceived("");
    setConfirmOpen(false);
    // Desde el menú lateral la caja queda lista para la siguiente venta
    setView(initialView);
  };

  const returnModals = (
    <>
      {returnFor !== null && onReturn && (
        <ReturnWizard
          sales={sales}
          returns={returns}
          orders={orders}
          customers={customers}
          initialSaleId={returnFor || undefined}
          cashOpen={Boolean(cashSession)}
          userName={seller}
          onClose={() => setReturnFor(null)}
          onConfirm={(ret) => {
            onReturn(ret);
            setReturnFor(null);
            setShowReturns(true);
          }}
        />
      )}
      {specialFor !== null && special && (
        <SpecialOrderModal
          customers={customers}
          suppliers={suppliers}
          inventory={inventory}
          initialSku={specialFor || undefined}
          cashOpen={Boolean(cashSession)}
          onClose={() => setSpecialFor(null)}
          onCreate={(order) => {
            const id = special.onCreate(order);
            setSpecialFor(null);
            setPrintSpecialId(id);
          }}
        />
      )}
      {layawayOpen && layawayActions && (
        <LayawayModal
          items={cart.map((item) => {
            const factor = totals.afterLines ? totals.total / totals.afterLines : 1;
            return {
              sku: item.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: Math.round(((calcOf(item).net * factor) / item.quantity) * 100) / 100,
              components: item.components,
            };
          })}
          total={totals.total}
          initialClient={customer}
          customers={customers}
          cashOpen={Boolean(cashSession)}
          onClose={() => setLayawayOpen(false)}
          onCreate={(data) => {
            const id = layawayActions.onCreate(data);
            setLayawayOpen(false);
            setCart([]);
            setGlobalDiscount(undefined);
            setCustomer("Público general");
            setPrintLayawayId(id);
          }}
        />
      )}
      {walletOpen && layawayActions && (
        <WalletModal
          customers={customers}
          movements={walletMovements}
          cashOpen={Boolean(cashSession)}
          initialClient={customer}
          onDeposit={(client, phone, amount, method) => {
            layawayActions.onDeposit(client, phone, amount, method);
            setWalletPrint(client);
          }}
          onPrint={(client) => setWalletPrint(client)}
          onClose={() => setWalletOpen(false)}
        />
      )}
      {printLayaway && <LayawayPrintView layaway={printLayaway} onClose={() => setPrintLayawayId(null)} />}
      {walletPrint && (
        <WalletPrintView
          client={walletPrint}
          balance={customers.find((c) => c.businessName === walletPrint)?.creditBalance ?? 0}
          movements={walletMovements.filter((m) => m.client === walletPrint)}
          onClose={() => setWalletPrint(null)}
        />
      )}
      {printSpecial && <SpecialOrderPrintView order={printSpecial} onClose={() => setPrintSpecialId(null)} />}
      {counterOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="eyebrow">Entregas en mostrador</p>
                <h2 className="mt-1 text-xl font-semibold">Pedidos de mostrador en almacén</h2>
                <p className="mt-1 text-xs text-slate-400">Cuando almacén libera la orden, ya puedes entregarla al cliente.</p>
              </div>
              <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={() => setCounterOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {counterOrders.map((order) => {
                const ready = order.status === "Liberada a mostrador";
                const captured = order.items.filter((item) => item.pickedQty !== undefined).length;
                return (
                  <div key={order.id} className={`flex items-center gap-4 px-6 py-3.5 text-xs ${ready ? "bg-[#f7fbef]" : ""}`}>
                    <span className={`grid size-9 place-items-center rounded-xl ${ready ? "bg-[#b8f34a] text-[#183b36]" : "bg-slate-100 text-slate-400"}`}>
                      <PackageCheck size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {order.id} · {order.customer}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {order.source} · {order.items.length} partidas
                      </p>
                    </div>
                    {ready ? (
                      <button className="primary-button min-h-9" onClick={() => setHandOverId(order.id)}>
                        Entregar
                      </button>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                        {order.status === "Lista" ? "Surtida, por liberar" : order.status === "Pendiente" ? "Por surtir" : `Surtiendo ${captured}/${order.items.length}`}
                      </span>
                    )}
                  </div>
                );
              })}
              {counterOrders.length === 0 && <p className="px-6 py-12 text-center text-xs text-slate-400">No hay pedidos de mostrador pendientes.</p>}
            </div>
          </div>
        </div>
      )}
      {handOverId && onDeliverCounter && (
        <HandOverModal
          order={orders.find((order) => order.id === handOverId)!}
          onClose={() => setHandOverId(null)}
          onConfirm={(receivedBy) => {
            onDeliverCounter(handOverId, receivedBy);
            setHandOverId(null);
          }}
        />
      )}
      {printReturn && (
        <ReturnPrintView
          ret={printReturn}
          customer={customers.find((item) => item.businessName === printReturn.client)}
          onClose={() => setPrintReturnId(null)}
        />
      )}
    </>
  );

  if (view === "pos") {
    return (
      <div className="-mx-4 -my-7 min-h-[calc(100vh-76px)] bg-[#eef2f1] sm:-mx-7 lg:-mx-10 lg:-my-9">
        <div className="flex min-h-[calc(100vh-76px)] flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <button
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={() => (onExitPos ? onExitPos() : setView("documents"))}
              aria-label="Volver a ventas"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-[#183b36] text-[9px] font-black text-[#b8f34a]">
                  99
                </span>
                <h1 className="text-lg font-semibold">Punto de venta</h1>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {cashSession
                  ? `${cashSession.register} · ${cashSession.cashier} · Turno ${cashSession.id} abierto desde ${cashSession.openedAt.split("· ")[1]}`
                  : cashSession === null
                    ? "Caja cerrada"
                    : `Caja 01 · ${seller} · Turno abierto`}
              </p>
            </div>
            {layawayActions && (
              <button
                className="ml-auto flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-[#2f7468] hover:text-[#2f7468]"
                onClick={() => setWalletOpen(true)}
              >
                <Wallet size={14} /> Monedero
              </button>
            )}
            {onDeliverCounter && (
              <button
                className={`${layawayActions ? "" : "ml-auto "}flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[11px] font-semibold ${counterReady.length ? "border-[#9bc64a] bg-[#f3fadf] text-[#3f5c0e]" : "border-slate-200 text-slate-600 hover:border-[#2f7468] hover:text-[#2f7468]"}`}
                onClick={() => setCounterOpen(true)}
                title={`${counterReady.length} listos para entregar · ${counterOrders.length - counterReady.length} surtiéndose en almacén`}
              >
                <PackageCheck size={14} /> Por entregar
                <span className={`rounded-full px-1.5 text-[10px] ${counterReady.length ? "bg-[#b8f34a] text-[#183b36]" : "bg-slate-100 text-slate-500"}`}>{counterReady.length}</span>

              </button>
            )}
            {special && (
              <button
                className={`${onDeliverCounter ? "" : "ml-auto "}flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-[#2f7468] hover:text-[#2f7468]`}
                onClick={() => setSpecialFor("")}
              >
                <PackagePlus size={14} /> Pedido especial
              </button>
            )}
            {onReturn && (
              <button
                className={`${special ? "" : "ml-auto "}flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-[#2f7468] hover:text-[#2f7468]`}
                onClick={() => setReturnFor("")}
              >
                <RotateCcw size={14} /> Devolución
              </button>
            )}
            {onGoCash && (
              <button
                className={`${onReturn ? "" : "ml-auto "}flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-[#2f7468] hover:text-[#2f7468]`}
                onClick={onGoCash}
              >
                <Wallet size={14} /> Caja
              </button>
            )}
            <div className={`${onGoCash ? "!hidden " : "ml-auto "}hidden items-center gap-2 rounded-lg bg-[#eaf6ef] px-3 py-2 text-[10px] font-semibold text-[#347652] sm:flex`}>
              <span className="size-1.5 rounded-full bg-[#55a875]" /> Sistema en línea
            </div>
          </div>

          <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="min-w-0 p-4 sm:p-6">
              <div className="relative">
                <Barcode
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2f7468]"
                  size={20}
                />
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm shadow-sm outline-none focus:border-[#2f7468] focus:ring-4 focus:ring-[#2f7468]/10"
                  placeholder="Escanea un código o busca por producto, SKU o categoría..."
                  autoFocus
                />
              </div>
              <div className="mb-4 mt-6 flex items-end justify-between">
                <div>
                  <p className="eyebrow">Catálogo rápido</p>
                  <h2 className="mt-1 text-lg font-semibold">Productos frecuentes</h2>
                </div>
                <p className="text-[10px] text-slate-400">{filteredProducts.length} resultados</p>
              </div>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="group min-h-40 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_5px_20px_rgba(30,61,55,0.03)] transition hover:-translate-y-0.5 hover:border-[#82aaa2] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                        <ShoppingBag size={17} />
                      </span>
                      <span className={`rounded-md px-2 py-1 text-[9px] ${product.components ? "bg-[#b8f34a] font-bold text-[#183b36]" : "bg-slate-100 text-slate-500"}`}>
                        {product.components ? `Kit · ${product.components.length} piezas` : product.location}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-2 text-xs font-semibold leading-relaxed">
                      {product.name}
                    </p>
                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-sm font-bold text-[#285e56]">{money(product.price)}</p>
                      <p className="text-[9px] text-slate-400">
                        {product.stock} {product.unit}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <aside className="flex min-h-[620px] flex-col border-t border-slate-200 bg-white lg:border-l lg:border-t-0">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow">Venta actual</p>
                    <h2 className="mt-1 text-lg font-semibold">Carrito</h2>
                  </div>
                  <span className="rounded-lg bg-[#edf4f2] px-2.5 py-1 text-[10px] font-semibold text-[#2f7468]">
                    {totalItems} artículos
                  </span>
                </div>
                <div className="mt-4">
                  <CustomerPicker value={customer} onChange={setCustomer} customers={customers} allowGeneral compact />
                  {creditAvailable > 0 && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#347652]">
                      <Wallet size={11} /> Saldo a favor disponible: {money(creditAvailable)}
                    </p>
                  )}
                </div>
              </div>

              <div className="min-h-[240px] flex-1 overflow-y-auto p-5">
                {cart.length === 0 ? (
                  <div className="grid h-full min-h-56 place-items-center text-center">
                    <div>
                      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                        <ShoppingCart size={21} />
                      </span>
                      <p className="mt-3 text-sm font-semibold">El carrito está vacío</p>
                      <p className="mt-1 max-w-48 text-xs leading-relaxed text-slate-400">
                        Busca o selecciona productos para iniciar la venta.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="border-b border-slate-100 pb-4 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{item.name}</p>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {item.id} · {money(item.price)} c/u
                            </p>
                          </div>
                          <button
                            className="text-slate-300 hover:text-[#c9664f]"
                            onClick={() =>
                              setCart((items) => items.filter((entry) => entry.id !== item.id))
                            }
                            aria-label={`Eliminar ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-200">
                            <button
                              className="grid size-7 place-items-center text-slate-500"
                              onClick={() => changeQuantity(item.id, -1)}
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              className="grid size-7 place-items-center text-slate-500"
                              onClick={() => changeQuantity(item.id, 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-right">
                            {calcOf(item).discount > 0 && (
                              <p className="text-[10px] text-slate-400 line-through">{money(item.price * item.quantity)}</p>
                            )}
                            <p className="text-xs font-bold">{money(calcOf(item).net)}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <DiscountControl
                            maxPercent={maxDiscount}
                            compact
                            value={item.discount}
                            base={item.price * item.quantity}
                            label={`Descuento ${item.name}`}
                            onChange={(discount) =>
                              setCart((items) => items.map((entry) => (entry.id === item.id ? { ...entry, discount } : entry)))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-[#fafcfb] p-5">
                {cart.length > 0 && maxDiscount > 0 && (
                  <div className="mb-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5">
                    <DiscountControl maxPercent={maxDiscount} label="Descuento global" value={globalDiscount} base={totals.afterLines} onChange={setGlobalDiscount} />
                  </div>
                )}
                <div className="space-y-2 text-xs">
                  {totals.totalDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-slate-500">
                        <span>Importe antes de descuentos</span>
                        <span>{money(totals.gross)}</span>
                      </div>
                      {totals.lineDiscounts > 0 && (
                        <div className="flex justify-between text-[#c9664f]">
                          <span>Descuentos por partida</span>
                          <span>−{money(totals.lineDiscounts)}</span>
                        </div>
                      )}
                      {totals.globalDiscount > 0 && (
                        <div className="flex justify-between text-[#c9664f]">
                          <span>Descuento global {globalDiscount?.type === "%" ? `(${discountLabel(globalDiscount)})` : ""}</span>
                          <span>−{money(totals.globalDiscount)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal sin IVA</span>
                    <span>{money(subtotal - tax)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>IVA incluido (16%)</span>
                    <span>{money(tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
                    <span>Total</span>
                    <span>{money(subtotal)}</span>
                  </div>
                </div>
                <button
                  className="primary-button mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={cart.length === 0}
                  onClick={openCheckout}
                >
                  Cobrar {money(subtotal)} <ChevronRight size={16} />
                </button>
                {layawayActions && (
                  <button
                    className="secondary-button mt-2 flex w-full items-center justify-center gap-2 bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={cart.length === 0}
                    onClick={() => setLayawayOpen(true)}
                  >
                    <HandCoins size={15} /> Apartar con {policies.layawayMinPct} %
                  </button>
                )}
              </div>
            </aside>
          </div>
        </div>

        {returnModals}
        {cashSession === null && onOpenCash && (
          <OpenModal defaultFund={2000} userName={seller} onClose={onExitPos ?? (() => setView("documents"))} onOpen={onOpenCash} />
        )}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#102521]/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Confirmar cobro</p>
                  <h2 className="mt-1 text-xl font-semibold">Total {money(subtotal)}</h2>
                </div>
                <button
                  className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                  onClick={() => setConfirmOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {split ? "Primera forma de pago" : "Método de pago"}
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={split}
                    onClick={() => {
                      setSplit(!split);
                      setAmount1("");
                      setAmount2("");
                      setAmount2Touched(false);
                      if (payment2 === payment) setPayment2(payment === "Tarjeta" ? "Efectivo" : "Tarjeta");
                    }}
                    className={`relative h-5 w-9 rounded-full transition ${split ? "bg-[#2f7468]" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${split ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  Pagar con dos formas
                </label>
              </div>
              <MethodPicker value={payment} onChange={setPayment} disabled={split ? payment2 : undefined} credit={creditAvailable} />
              {split && (
                <div className="mt-2">
                  <AmountInput label={`Monto con ${payment.toLowerCase()}`} value={amount1} onChange={changeAmount1} />
                  <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Segunda forma de pago
                  </p>
                  <MethodPicker value={payment2} onChange={setPayment2} disabled={payment} credit={creditAvailable} />
                  <AmountInput
                    label={`Monto con ${payment2.toLowerCase()}`}
                    value={amount2}
                    onChange={(value) => {
                      setAmount2(value);
                      setAmount2Touched(true);
                    }}
                  />
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-3 text-center text-[11px]">
                    <div>
                      <p className="text-slate-400">Total</p>
                      <p className="mt-0.5 font-semibold">{money(subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Asignado</p>
                      <p className="mt-0.5 font-semibold">{money(assigned)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Restante</p>
                      <p className={`mt-0.5 font-semibold ${Math.abs(remaining) > 0.009 ? "text-[#c9664f]" : "text-[#347652]"}`}>
                        {money(remaining)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {cashPart > 0 && (
                <div className="mt-4">
                  <label className="form-label">
                    Efectivo recibido{split ? ` (parte en efectivo: ${money(cashPart)})` : ""}
                    <input
                      type="number"
                      min={0}
                      value={received}
                      onChange={(event) => setReceived(event.target.value)}
                      className="form-input"
                      placeholder={money(cashPart)}
                    />
                  </label>
                  <div className="mt-3 flex justify-between rounded-xl bg-slate-100 p-3 text-xs">
                    <span className="text-slate-500">Cambio</span>
                    <strong>{money(change)}</strong>
                  </div>
                </div>
              )}
              {codPart > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f2f8f6] p-3 text-[11px] leading-relaxed text-[#285e56]">
                  <Truck size={15} className="mt-0.5 shrink-0" />
                  <span>
                    Se cobrarán <strong>{money(codPart)}</strong> al entregar. Se generará una orden de surtido con
                    envío a domicilio y el chofer registrará el cobro en Rutas.
                  </span>
                </div>
              )}
              {codPart === 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f3fadf] p-3 text-[11px] leading-relaxed text-[#3f5c0e]">
                  <PackageCheck size={15} className="mt-0.5 shrink-0" />
                  <span>Se genera la orden de surtido: almacén surte, firma y la libera a mostrador para entregarla al cliente.</span>
                </div>
              )}
              {paymentError && (split || payment === "Efectivo" || payment === "Saldo a favor") && (
                <p className="mt-3 text-[11px] font-medium text-[#c9664f]">{paymentError}</p>
              )}
              <button
                className="primary-button mt-5 w-full"
                onClick={completeSale}
                disabled={Boolean(paymentError)}
              >
                <Check size={16} /> {codPart > 0 ? "Confirmar venta contra entrega" : "Confirmar venta"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Operación <ChevronRight size={13} /> <span className="text-slate-700">Ventas</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Ventas</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulta tus documentos y opera las ventas de mostrador.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="secondary-button flex items-center gap-2 bg-white"
            onClick={() => onToast("Reporte de ventas exportado")}
          >
            <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
          </button>
          <button className="primary-button" onClick={() => setView("pos")}>
            <ShoppingCart size={17} /> Abrir punto de venta
          </button>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(() => {
          const today = sales.filter((sale) => sale.date === "18 nov 2026" && sale.status !== "Cancelada");
          const counter = sales.filter((sale) => sale.type === "Mostrador");
          const pendingSales = sales.filter((sale) => pendingAmount(sale) > 0);
          return [
            {
              label: "Ventas de hoy",
              value: money(paidToday),
              detail: `${today.filter((sale) => sale.status === "Pagada").length} ventas cobradas hoy`,
              icon: CircleDollarSign,
              action: () => {
                setStatus("Pagada");
                setQuery("18 nov 2026");
              },
            },
            {
              label: "Ticket promedio",
              value: money(today.reduce((sum, sale) => sum + sale.amount, 0) / Math.max(1, today.length)),
              detail: `${today.length} operaciones de hoy`,
              icon: ReceiptText,
              action: () => {
                setStatus("Todas");
                setQuery("18 nov 2026");
              },
            },
            {
              label: "Por cobrar",
              value: money(pendingSales.reduce((sum, sale) => sum + pendingAmount(sale), 0)),
              detail: `${pendingSales.length} ${pendingSales.length === 1 ? "documento pendiente" : "documentos pendientes"}`,
              icon: FileText,
              action: () => {
                setStatus("Pendiente");
                setQuery("");
              },
            },
            {
              label: "Ventas mostrador",
              value: String(counter.length),
              detail: `${Math.round((counter.length / Math.max(1, sales.length)) * 100)}% de operaciones`,
              icon: ShoppingBag,
              action: () => {
                setStatus("Todas");
                setQuery("Mostrador");
              },
            },
          ];
        })().map(({ label, value, detail, icon: Icon, action }) => (
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
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["Todas", "Pagada", "Pendiente", "Cancelada"] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setStatus(item);
                  setShowReturns(false);
                  setShowSpecial(false);
                  setShowLayaways(false);
                }}
                className={`shrink-0 rounded-lg px-3 py-2 transition ${
                  status === item && !showReturns && !showSpecial && !showLayaways ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"
                }`}
              >
                {item}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {item === "Todas"
                    ? sales.length
                    : sales.filter((sale) => sale.status === item).length}
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                setShowReturns(true);
                setShowSpecial(false);
                setShowLayaways(false);
              }}
              className={`shrink-0 rounded-lg px-3 py-2 transition ${showReturns ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
            >
              Devoluciones
              <span className="ml-1.5 text-[10px] opacity-60">{returns.length}</span>
            </button>
            {layawayActions && (
              <button
                onClick={() => {
                  setShowLayaways(true);
                  setShowSpecial(false);
                  setShowReturns(false);
                }}
                className={`shrink-0 rounded-lg px-3 py-2 transition ${showLayaways ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
              >
                Apartados
                <span className="ml-1.5 text-[10px] opacity-60">{layaways.filter((l) => l.status === "Vigente").length}</span>
                {layaways.some(isExpired) && <span className="ml-1 inline-block size-1.5 rounded-full bg-[#e5785f] align-middle" />}
              </button>
            )}
            {special && (
              <button
                onClick={() => {
                  setShowSpecial(true);
                  setShowReturns(false);
                  setShowLayaways(false);
                }}
                className={`shrink-0 rounded-lg px-3 py-2 transition ${showSpecial ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
              >
                Pedidos especiales
                <span className="ml-1.5 text-[10px] opacity-60">{specialOrders.filter((o) => activeStatuses.includes(o.status)).length}</span>
                {specialOrders.some((o) => isLate(o) || isUncollected(o)) && <span className="ml-1 inline-block size-1.5 rounded-full bg-[#e5785f] align-middle" />}
              </button>
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
                placeholder="Buscar folio, cliente o vendedor..."
              />
            </div>
            <button
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              onClick={() => onToast("Filtros de venta actualizados")}
              aria-label="Más filtros"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {showLayaways && layawayActions ? (
          <LayawaysPanel
            layaways={layaways}
            orders={orders}
            customers={customers}
            cashOpen={Boolean(cashSession)}
            onPay={layawayActions.onPay}
            onExtend={layawayActions.onExtend}
            onCancel={(id, reason) => {
              const client = layawayActions.onCancel(id, reason);
              if (client) setWalletPrint(client);
            }}
            onPrint={(id) => setPrintLayawayId(id)}
            onOpenSale={(id) => {
              setShowLayaways(false);
              setDetailId(id);
            }}
          />
        ) : showSpecial && special ? (
          <SpecialOrdersPanel
            orders={specialOrders}
            customers={customers}
            cashOpen={Boolean(cashSession)}
            onNew={() => setSpecialFor("")}
            onToPurchase={special.onToPurchase}
            onNotify={special.onNotify}
            onDeliver={special.onDeliver}
            onCancel={special.onCancel}
            onPrint={(id) => setPrintSpecialId(id)}
            onOpenPurchase={(id) => onOpen?.("Compras", { selectedId: id })}
            onOpenSale={(id) => {
              setShowSpecial(false);
              setDetailId(id);
            }}
          />
        ) : showReturns ? (
          <div className="overflow-x-auto">
            <ReturnsTable
              returns={returns.filter((ret) => `${ret.id} ${ret.saleId} ${ret.client}`.toLowerCase().includes(query.toLowerCase()))}
              onOpenSale={(id) => setDetailId(id)}
              onPrint={(id) => setPrintReturnId(id)}
            />
          </div>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Documento</th>
                <th className="py-3.5">Fecha</th>
                <th className="py-3.5">Importe</th>
                <th className="py-3.5">Pago</th>
                <th className="py-3.5">Estado</th>
                <th className="py-3.5">Vendedor</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                        <ReceiptText size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">
                          Venta #{sale.id}
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-400">
                            {sale.type}
                          </span>
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {sale.client} · {sale.items} artículos
                        </p>
                        {(sale.quoteId || sale.orderId) && (
                          <p className="mt-1 flex gap-2 text-[10px] font-semibold">
                            {sale.quoteId && (
                              <button
                                className="text-[#2f7468] hover:underline"
                                onClick={() => onOpen?.("Cotizaciones", { query: sale.quoteId })}
                              >
                                Cotización {sale.quoteId}
                              </button>
                            )}
                            {sale.orderId && (
                              <button
                                className="text-[#2f7468] hover:underline"
                                onClick={() => onOpen?.("Órdenes", { selectedId: sale.orderId })}
                              >
                                Orden {sale.orderId}
                              </button>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-slate-600">
                    {sale.date}
                    <p className="mt-1 text-[10px] text-slate-400">{sale.time} h</p>
                  </td>
                  <td className="py-4 font-semibold">{money(sale.amount)}</td>
                  <td className="py-4 text-slate-500">
                    {sale.payments ? (
                      <div className="space-y-0.5">
                        {sale.payments.map((part) => (
                          <p key={part.method}>
                            {part.method} <span className="text-[10px] text-slate-400">{money(part.amount)}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      sale.payment
                    )}
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[sale.status]}`}
                    >
                      {sale.status}
                    </span>
                    {sale.returnedAmount ? (
                      <span className="ml-1 inline-flex rounded-lg bg-[#fff0eb] px-2 py-1 text-[9px] font-semibold text-[#c9664f]">
                        {sale.returnedAmount >= sale.amount - 0.01 ? "Devuelta" : "Dev. parcial"}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-4 text-slate-500">{sale.seller}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                        onClick={() => setDetailId(sale.id)}
                        title="Ver historial"
                        aria-label={`Ver ${sale.id}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                        onClick={() => setPrintId(sale.id)}
                        title="Imprimir nota de venta"
                        aria-label={`Imprimir ${sale.id}`}
                      >
                        <Printer size={15} />
                      </button>
                      {onReturn && (
                        <button
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#c9664f] disabled:cursor-not-allowed disabled:opacity-30"
                          disabled={sale.status === "Cancelada"}
                          onClick={() => setReturnFor(sale.id)}
                          title="Registrar devolución"
                          aria-label={`Devolver ${sale.id}`}
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="grid place-items-center px-5 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <ReceiptText size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold">No encontramos ventas</p>
            <p className="mt-1 text-xs text-slate-400">Cambia los filtros o la búsqueda.</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          <span>
            Mostrando {filteredSales.length} de {sales.length} documentos
          </span>
          <button className="link-button" onClick={() => onToast("Historial actualizado")}>
            Actualizar historial <ChevronRight size={13} />
          </button>
        </div>
        </>
        )}
      </section>

      {detailSale && (
        <SaleDetail
          sale={detailSale}
          trace={traceOf(detailSale)}
          onClose={() => setDetailId(null)}
          onPrint={() => setPrintId(detailSale.id)}
          onReturn={
            onReturn && detailSale.status !== "Cancelada"
              ? () => {
                  setReturnFor(detailSale.id);
                }
              : undefined
          }
          onOpen={(nav, focus) => {
            setDetailId(null);
            onOpen?.(nav, focus);
          }}
        />
      )}
      {returnModals}
      {printSale && (
        <SalePrintView
          sale={printSale}
          customer={customers.find((customer) => customer.businessName === printSale.client)}
          received={traceOf(printSale).received}
          pending={traceOf(printSale).pending}
          deliveryLabel={traceOf(printSale).delivery}
          onClose={() => setPrintId(null)}
        />
      )}
    </>
  );
}

const methodOptions: { label: PayMethod; icon: typeof Banknote }[] = [
  { label: "Efectivo", icon: Banknote },
  { label: "Tarjeta", icon: CreditCard },
  { label: "Transferencia", icon: CircleDollarSign },
  { label: "Contra entrega", icon: Truck },
  { label: "Saldo a favor", icon: Wallet },
];

function MethodPicker({
  value,
  onChange,
  disabled,
  credit = 0,
}: {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
  disabled?: PayMethod;
  credit?: number;
}) {
  const options = methodOptions.filter((option) => option.label !== "Saldo a favor" || credit > 0);
  return (
    <div className={`mt-2 grid gap-2 ${options.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
      {options.map(({ label, icon: Icon }) => (
        <button
          key={label}
          disabled={label === disabled}
          onClick={() => onChange(label)}
          className={`grid min-h-[72px] place-items-center rounded-xl border p-2 text-center text-[10px] font-semibold leading-tight transition disabled:cursor-not-allowed disabled:opacity-30 ${
            value === label ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"
          }`}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}

function AmountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="form-label mt-3">
      {label}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="form-input pl-7 text-sm font-semibold"
          placeholder="0.00"
        />
      </div>
    </label>
  );
}

// ---------- Historial (trazabilidad) de una venta ----------
export type SaleQuoteRef = { id: string; date: string; lastAction?: string };
type Tone = "done" | "warn" | "danger" | "pending";
type TraceEvent = { title: string; detail?: string; when?: string; tone: Tone; icon: typeof FileText };
type SaleTrace = {
  events: TraceEvent[];
  received: ReceivedPayment[];
  pending: number;
  delivery: string;
  order?: Order;
};

const timeOf = (text?: string) => text?.match(/\b\d{1,2}:\d{2}\b/)?.[0];

function buildTrace(sale: Sale, orders: Order[], routes: RoutePlan[], quotes: SaleQuoteRef[], returns: SaleReturn[] = []): SaleTrace {
  const events: TraceEvent[] = [];
  const order = orders.find((item) => item.id === sale.orderId);
  const quote = quotes.find((item) => item.id === sale.quoteId);
  const stamp = `${sale.date} · ${sale.time}`;
  const routeStops = routes
    .flatMap((route) =>
      route.stops.filter((stop) => stop.orderId === sale.orderId).map((stop) => ({ route, stop })),
    )
    .sort((a, b) => a.route.id.localeCompare(b.route.id));

  // Pagos recibidos
  const received: ReceivedPayment[] = [];
  const routeCollections = routeStops.filter(({ stop }) => (stop.collected || 0) > 0);
  if (sale.payments) {
    sale.payments
      .filter((part) => part.method !== "Contra entrega")
      .forEach((part) =>
        received.push({ label: "Pago en mostrador", method: part.method, amount: part.amount, when: stamp }),
      );
  } else if (sale.status === "Pagada" && routeCollections.length === 0) {
    received.push({
      label: sale.type === "Mostrador" ? "Pago en mostrador" : "Pago registrado",
      method: sale.payment,
      amount: sale.amount,
      when: stamp,
    });
  }
  routeCollections.forEach(({ route, stop }) =>
    received.push({
      label: `Cobro en ruta ${route.id}`,
      method: stop.collectMethod || "—",
      amount: stop.collected || 0,
      when: stop.deliveredAt || route.date,
    }),
  );
  const paid = received.reduce((sum, item) => sum + item.amount, 0);
  const pending = sale.status === "Pendiente" ? Math.max(0, sale.amount - paid - (sale.creditedAmount ?? 0)) : 0;

  // Línea de tiempo
  if (quote) {
    events.push({ icon: FileText, tone: "done", title: `Cotización ${quote.id} emitida`, when: quote.date });
    events.push({
      icon: Check,
      tone: "done",
      title: "El cliente aceptó la cotización",
      detail: "Se convirtió en venta y orden de surtido",
      when: timeOf(quote.lastAction) ? `${sale.date} · ${timeOf(quote.lastAction)}` : sale.date,
    });
  }
  events.push({
    icon: ReceiptText,
    tone: "done",
    title: `Venta ${sale.id} registrada`,
    detail: `${sale.type === "Pedido" ? "Pedido" : "Venta de mostrador"} · ${sale.client} · atendió ${sale.seller}`,
    when: `${stamp} h`,
  });
  received
    .filter((item) => !item.label.startsWith("Cobro en ruta"))
    .forEach((item) =>
      events.push({
        icon: CircleDollarSign,
        tone: "done",
        title: `${item.label}: ${money(item.amount)}`,
        detail: `Forma de pago: ${item.method}`,
        when: `${item.when} h`,
      }),
    );
  if (!order && sale.type === "Mostrador" && sale.status !== "Cancelada") {
    events.push({ icon: PackageCheck, tone: "done", title: "Material entregado en mostrador", when: `${stamp} h` });
  }

  if (order) {
    events.push({
      icon: ClipboardCheck,
      tone: "done",
      title: `Orden de surtido ${order.id} creada`,
      detail: `${order.items.length} ${order.items.length === 1 ? "partida" : "partidas"} · ${order.fulfillment === "Ruta" ? "envío a domicilio" : "recoge en mostrador"}`,
      when: order.date,
    });
    const captured = order.items.filter((item) => item.pickedQty !== undefined).length;
    if (["En surtido", "Con faltantes"].includes(order.status) && !order.signedBy) {
      events.push({
        icon: Clock3,
        tone: "warn",
        title: "Surtido en proceso",
        detail: `${captured} de ${order.items.length} partidas capturadas${order.picker ? ` · ${order.picker}` : ""}`,
      });
    }
    if (order.signedBy) {
      const requested = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const picked = order.items.reduce((sum, item) => sum + (item.pickedQty ?? item.quantity), 0);
      const rate = Math.round((picked / Math.max(1, requested)) * 100);
      events.push({
        icon: PenLine,
        tone: rate < 100 ? "warn" : "done",
        title: `Surtido firmado por ${order.signedBy}`,
        detail: rate < 100 ? `Surtido parcial: ${rate}% de lo solicitado` : "Surtido completo",
        when: order.signedAt,
      });
    }
    if (order.printedAt) events.push({ icon: FileText, tone: "done", title: "Hoja de picking impresa", when: order.printedAt });
    if (order.releasedAt && order.fulfillment === "Ruta")
      events.push({ icon: Truck, tone: "done", title: "Liberada a ruta", when: order.releasedAt });
    if (order.fulfillment === "Recoge en mostrador" && order.releasedAt)
      events.push({ icon: PackageCheck, tone: "done", title: "Liberada a mostrador por almacén", detail: "Material listo para entregar al cliente", when: order.releasedAt });
    if (order.fulfillment === "Recoge en mostrador" && order.status === "Entregada")
      events.push({
        icon: PackageCheck,
        tone: "done",
        title: `Entregada en mostrador${order.receivedBy ? ` · recibió ${order.receivedBy}` : ""}`,
        when: order.deliveredAt ?? order.releasedAt,
      });

    routeStops.forEach(({ route, stop }) => {
      events.push({
        icon: Truck,
        tone: "done",
        title: `Asignada a la hoja de ruta ${route.id}`,
        detail: `${route.driver} · ${route.vehicle}`,
        when: `${route.date} · salida ${route.departureTime} h`,
      });
      if (route.startedAt) events.push({ icon: Truck, tone: "done", title: "Salió a reparto", when: route.startedAt });
      if (stop.status === "Entregada") {
        events.push({
          icon: PackageCheck,
          tone: "done",
          title: `Entregada · recibió ${stop.receivedBy}`,
          when: stop.deliveredAt,
        });
        events.push({
          icon: CircleDollarSign,
          tone: stop.collected ? "done" : "warn",
          title: stop.collected ? `Cobrado por el chofer: ${money(stop.collected)}` : "Entregada sin cobro (crédito)",
          ...(stop.shortReason ? { tone: "warn" as Tone } : {}),
          detail: [stop.collected ? `Forma de pago: ${stop.collectMethod}` : "", stop.shortReason ? `Cobró ${money(stop.shortAmount ?? 0)} menos · ${stop.shortReason}` : ""].filter(Boolean).join(" · ") || undefined,
          when: stop.deliveredAt,
        });
      }
      if (stop.status === "No entregada") {
        events.push({ icon: Ban, tone: "danger", title: "No se entregó", detail: `Motivo: ${stop.failReason}`, when: route.closedAt });
        if (stop.resolution === "Reprogramada")
          events.push({ icon: RotateCcw, tone: "warn", title: "Entrega reprogramada", detail: "Regresó a órdenes liberadas a ruta", when: route.closedAt });
        if (stop.resolution === "Cancelada")
          events.push({ icon: Ban, tone: "danger", title: "Orden cancelada en el corte de ruta", detail: "Material enviado a reacomodo", when: route.closedAt });
      }
    });
    if (order.status === "Cancelada" && order.returnedAt)
      events.push({ icon: RotateCcw, tone: "danger", title: "Material reacomodado en almacén", when: order.returnedAt });
  }
  returns
    .filter((ret) => ret.saleId === sale.id)
    .forEach((ret) =>
      events.push({
        icon: RotateCcw,
        tone: "danger",
        title: `Devolución ${ret.id}: ${money(ret.total)}`,
        detail: `${ret.lines.map((l) => `${l.quantity} ${l.unit} ${l.name}`).join(", ")} · ${ret.reason} · ${
          ret.refundAmount > 0 ? `reembolso ${ret.refundMethod?.toLowerCase()}` : "descontado del saldo"
        }${ret.authorizedBy ? ` · autorizó ${ret.authorizedBy}` : ""}`,
        when: `${ret.date} · ${ret.time} h`,
      }),
    );
  if (sale.status === "Cancelada" && !events.some((event) => event.tone === "danger"))
    events.push({ icon: Ban, tone: "danger", title: "Venta cancelada" });

  // Siguientes pasos
  const next: Record<string, string> = {
    Pendiente: "Surtir la orden en almacén",
    "En surtido": "Terminar y firmar el surtido",
    "Con faltantes": "Terminar y firmar el surtido",
    Lista: order?.fulfillment === "Ruta" ? "Liberar la orden a ruta" : "Liberar la orden a mostrador",
    "Liberada a mostrador": "Entregar al cliente en mostrador",
    "Liberada a ruta": "Asignar a una hoja de ruta",
    "Asignada a ruta": "Entregar al cliente",
    "Por reacomodar": "Reacomodar el material en almacén",
  };
  if (order && next[order.status]) events.push({ icon: Clock3, tone: "pending", title: `Pendiente: ${next[order.status]}` });
  if (pending > 0) events.push({ icon: Clock3, tone: "pending", title: `Pendiente de cobro: ${money(pending)}` });

  const deliveryByOrder: Record<string, string> = {
    Pendiente: "Por surtir",
    "En surtido": "En surtido",
    "Con faltantes": "En surtido",
    Lista: "Surtida, por liberar",
    "Liberada a mostrador": "Lista en mostrador",
    "Liberada a ruta": "Lista para ruta",
    "Asignada a ruta": routeStops.at(-1)?.route.startedAt ? `En reparto (${routeStops.at(-1)?.route.id})` : `En ruta ${routeStops.at(-1)?.route.id ?? ""}`,
    Entregada: "Entregada",
    "Por reacomodar": "Cancelada · reacomodo",
    Cancelada: "Cancelada",
  };
  const delivery = order
    ? deliveryByOrder[order.status] || order.status
    : sale.status === "Cancelada"
      ? "Cancelada"
      : sale.type === "Mostrador"
        ? "Entregada en mostrador"
        : "Por definir";

  return { events, received, pending, delivery, order };
}

const toneStyles: Record<Tone, string> = {
  done: "bg-[#2f7468] text-white",
  warn: "bg-[#fff6df] text-[#9a6b18] ring-1 ring-[#ecd08f]",
  danger: "bg-[#fff0eb] text-[#c9664f] ring-1 ring-[#f0b4a5]",
  pending: "bg-white text-slate-400 ring-1 ring-dashed ring-slate-300",
};

function SaleDetail({
  sale,
  trace,
  onClose,
  onPrint,
  onOpen,
  onReturn,
}: {
  sale: Sale;
  trace: SaleTrace;
  onClose: () => void;
  onPrint: () => void;
  onReturn?: () => void;
  onOpen: (nav: string, focus: { query?: string; selectedId?: string }) => void;
}) {
  const paid = trace.received.reduce((sum, item) => sum + item.amount, 0);
  return (
    <>
      <button className="fixed inset-0 z-40 bg-[#102521]/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Cerrar historial" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Historial de la venta</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Venta {sale.id}</h2>
                <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${statusStyles[sale.status]}`}>
                  {sale.status}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{sale.type}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {sale.client} · {sale.date} · {sale.time} h
              </p>
            </div>
            <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#f6f8f7] p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
              <p className="mt-1 text-sm font-semibold">{money(sale.amount)}</p>
            </div>
            <div className="rounded-xl bg-[#f6f8f7] p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Cobro</p>
              <p className={`mt-1 text-sm font-semibold ${trace.pending > 0 ? "text-[#c9664f]" : ""}`}>
                {sale.status === "Cancelada" ? "Cancelada" : trace.pending > 0 ? `Debe ${money(trace.pending)}` : `Pagado ${money(paid)}`}
              </p>
            </div>
            <div className="rounded-xl bg-[#f6f8f7] p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Entrega</p>
              <p className="mt-1 text-sm font-semibold">{trace.delivery}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="primary-button min-h-9" onClick={onPrint}>
              <Printer size={14} /> Imprimir nota de venta
            </button>
            {onReturn && (
              <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={onReturn}>
                <RotateCcw size={13} /> Devolver
              </button>
            )}
            {sale.orderId && (
              <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={() => onOpen("Órdenes", { selectedId: sale.orderId })}>
                Orden {sale.orderId} <ArrowUpRight size={13} />
              </button>
            )}
            {sale.quoteId && (
              <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white" onClick={() => onOpen("Cotizaciones", { query: sale.quoteId })}>
                Cotización {sale.quoteId} <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section>
            <p className="eyebrow">Recorrido</p>
            <ol className="mt-4">
              {trace.events.map((event, index) => {
                const Icon = event.icon;
                const last = index === trace.events.length - 1;
                return (
                  <li key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-full ${toneStyles[event.tone]}`}>
                        <Icon size={13} />
                      </span>
                      {!last && (
                        <span className={`my-1 w-px flex-1 ${event.tone === "pending" ? "border-l border-dashed border-slate-300" : "bg-slate-200"}`} />
                      )}
                    </div>
                    <div className={`min-w-0 flex-1 ${last ? "" : "pb-4"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-xs font-semibold ${event.tone === "pending" ? "text-slate-400" : event.tone === "danger" ? "text-[#c9664f]" : ""}`}>
                          {event.title}
                        </p>
                        {event.when && <span className="shrink-0 text-[10px] text-slate-400">{event.when}</span>}
                      </div>
                      {event.detail && <p className="mt-0.5 text-[11px] text-slate-500">{event.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section>
            <p className="eyebrow">Pagos</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
              {trace.received.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.method} · {item.when}
                    </p>
                  </div>
                  <p className="font-semibold">{money(item.amount)}</p>
                </div>
              ))}
              {trace.received.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">Sin pagos registrados.</p>}
              {trace.pending > 0 && (
                <div className="flex items-center justify-between bg-[#fff8f5] px-3 py-2.5 text-xs">
                  <p className="font-semibold text-[#c9664f]">Saldo pendiente</p>
                  <p className="font-semibold text-[#c9664f]">{money(trace.pending)}</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <p className="eyebrow">Partidas</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
              {(sale.lines || []).map((line) => (
                <div key={line.sku} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{line.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {line.sku} · {line.quantity} {line.unit} × {money(line.unitPrice)}
                      {line.discountAmount ? (
                        <span className="text-[#c9664f]"> · desc. {line.discount?.type === "%" ? `${line.discount.value}% ` : ""}−{money(line.discountAmount)}</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{money(line.total)}</p>
                </div>
              ))}
              {sale.discountAmount ? (
                <div className="flex items-center justify-between bg-[#fff8f5] px-3 py-2.5 text-xs text-[#c9664f]">
                  <span className="font-semibold">Descuento global{sale.discount?.type === "%" ? ` (${sale.discount.value}%)` : ""}</span>
                  <span className="font-semibold">−{money(sale.discountAmount)}</span>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
