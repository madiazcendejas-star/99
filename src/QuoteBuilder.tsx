import { useMemo, useState } from "react";
import { nuevoId } from "./entorno";
import { listForCustomer, listName, priceFor } from "./pricing";
import { policies } from "./config";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import type { Customer, CustomerType } from "./CustomersModule";
import type { InventoryProduct } from "./InventoryModule";
import { DiscountControl, discountLabel, documentTotals, lineTotals, type Discount } from "./Discount";

export type QuoteLine = {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  /** Importe neto de la partida (ya con su descuento) */
  total: number;
  /** Descuento parcial de la partida */
  discount?: Discount;
  discountAmount?: number;
  /** Kit: componentes por cada kit (se imprimen en la cotización) */
  components?: { sku: string; name: string; quantity: number; unit: string }[];
  unitCost?: number;
};

export type QuoteBuilderResult = {
  customer: Customer;
  lines: QuoteLine[];
  subtotal: number;
  tax: number;
  total: number;
  /** Descuento global (se aplica después de los descuentos por partida) */
  discount?: Discount;
  discountAmount?: number;
  validity: string;
  notes: string;
  /** Nombre de la lista de precios aplicada */
  priceList: string;
  status: "Borrador" | "Enviada";
};

type CartItem = {
  product: InventoryProduct;
  quantity: number;
  discount?: Discount;
};

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });


export default function QuoteBuilder({
  initialCustomer,
  customers,
  products,
  owner,
  onClose,
  onAddCustomer,
  onComplete,
  maxDiscount = 100,
}: {
  maxDiscount?: number;
  initialCustomer?: Customer;
  customers: Customer[];
  products: InventoryProduct[];
  owner: string;
  onClose: () => void;
  onAddCustomer: (customer: Customer) => void;
  onComplete: (result: QuoteBuilderResult) => void;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMenu, setCustomerMenu] = useState(!initialCustomer);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [validity, setValidity] = useState(`${policies.quoteValidityDays} días`);
  const [notes, setNotes] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState<Discount | undefined>();

  const visibleCustomers = customers.filter((customer) =>
    `${customer.businessName} ${customer.contactName} ${customer.rfc}`
      .toLowerCase()
      .includes(customerQuery.toLowerCase()),
  );
  const categories = ["Todas", ...new Set(products.map((product) => product.category))];
  const visibleProducts = products.filter(
    (product) =>
      (category === "Todas" || product.category === category) &&
      `${product.name} ${product.sku} ${product.category} ${product.brand} ${product.description}`
        .toLowerCase()
        .includes(productQuery.toLowerCase()),
  );

  // Lista de precios del cliente (la asignada o la de su tipo); se guarda con su nombre
  const priceListId = listForCustomer(selectedCustomer);
  const priceList = listName(priceListId);
  const calcOf = (item: CartItem) => lineTotals(priceFor(item.product, priceListId), item.quantity, item.discount);
  const totals = documentTotals(cart.map(calcOf), globalDiscount);
  const subtotal = totals.total;
  const tax = totals.tax;
  const setLineDiscount = (productId: string, discount?: Discount) =>
    setCart((items) => items.map((item) => (item.product.id === productId ? { ...item, discount } : item)));

  const chooseCustomer = (customer: Customer) => {
    if (selectedCustomer && selectedCustomer.id !== customer.id) {
      setPendingCustomer(customer);
      return;
    }
    setSelectedCustomer(customer);
    setCustomerQuery("");
    setCustomerMenu(false);
  };

  const confirmCustomerChange = () => {
    if (!pendingCustomer) return;
    setSelectedCustomer(pendingCustomer);
    setPendingCustomer(null);
    setCustomerQuery("");
    setCustomerMenu(false);
  };

  const addProduct = (product: InventoryProduct) => {
    setCart((items) => {
      const current = items.find((item) => item.product.id === product.id);
      if (current) {
        return items.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  Math.max(1, item.product.stock - item.product.reserved),
                ),
              }
            : item,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) =>
    setCart((items) =>
      items
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  Math.min(quantity, item.product.stock - item.product.reserved),
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

  const finish = (status: QuoteBuilderResult["status"]) => {
    if (!selectedCustomer || cart.length === 0) return;
    onComplete({
      customer: selectedCustomer,
      lines: cart.map((item) => {
        const unitPrice = priceFor(item.product, priceListId);
        const calc = calcOf(item);
        return {
          sku: item.product.sku,
          name: item.product.name,
          quantity: item.quantity,
          unit: item.product.saleUnit,
          unitPrice,
          total: calc.net,
          discount: calc.discount > 0 ? item.discount : undefined,
          discountAmount: calc.discount > 0 ? calc.discount : undefined,
          components: item.product.kitComponents,
          unitCost: item.product.kitComponents ? item.product.cost : undefined,
        };
      }),
      subtotal: totals.subtotal,
      tax,
      total: subtotal,
      discount: totals.globalDiscount > 0 ? globalDiscount : undefined,
      discountAmount: totals.globalDiscount > 0 ? totals.globalDiscount : undefined,
      validity,
      notes,
      priceList,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#eef2f1]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <button
          className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          onClick={onClose}
          aria-label="Cerrar cotizador"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-[#183b36] text-[9px] font-black text-[#b8f34a]">
              99
            </span>
            <h1 className="text-lg font-semibold">Nueva cotización</h1>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">Cotizador B2B · {owner}</p>
        </div>
        <div className="ml-auto hidden items-center gap-2 rounded-lg bg-[#eaf6ef] px-3 py-2 text-[10px] font-semibold text-[#347652] sm:flex">
          <span className="size-1.5 rounded-full bg-[#55a875]" /> Inventario sincronizado
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:p-6">
        <div className="min-w-0 space-y-5">
          <section className="panel relative z-20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                <UserRound size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Paso 1</p>
                    <h2 className="mt-1 text-base font-semibold">Cliente y lista de precios</h2>
                  </div>
                  <button className="link-button" onClick={() => setNewCustomerOpen(true)}>
                    <UserPlus size={14} /> Registrar cliente
                  </button>
                </div>

                {selectedCustomer ? (
                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#c9ddd8] bg-[#f2f8f6] p-4 sm:flex-row sm:items-center">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-bold text-[#2f7468]">
                      {selectedCustomer.businessName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {selectedCustomer.businessName}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {selectedCustomer.contactName} · {selectedCustomer.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[9px] uppercase tracking-wider text-slate-400">
                          Lista aplicada
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#2f7468]">
                          {priceList}
                        </p>
                      </div>
                      <button
                        className="rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-slate-500 shadow-sm"
                        onClick={() => setCustomerMenu(true)}
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-[#fafcfb] px-4 py-4 text-left"
                    onClick={() => setCustomerMenu(true)}
                  >
                    <span>
                      <span className="block text-xs font-semibold">Selecciona un cliente</span>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        La lista de precios se asignará automáticamente.
                      </span>
                    </span>
                    <ChevronDown size={16} className="text-slate-400" />
                  </button>
                )}

                {customerMenu && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="relative border-b border-slate-100 p-3">
                      <Search
                        size={15}
                        className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={customerQuery}
                        onChange={(event) => setCustomerQuery(event.target.value)}
                        className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-xs outline-none"
                        placeholder="Buscar por nombre, contacto o RFC..."
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-2">
                      {visibleCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-slate-50"
                          onClick={() => chooseCustomer(customer)}
                        >
                          <span className="grid size-9 place-items-center rounded-lg bg-[#edf4f2] text-[10px] font-bold text-[#2f7468]">
                            {customer.businessName.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">
                              {customer.businessName}
                            </span>
                            <span className="mt-1 block text-[9px] text-slate-400">
                              {customer.contactName} · {customer.rfc}
                            </span>
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-500">
                            {listName(listForCustomer(customer))}
                          </span>
                        </button>
                      ))}
                      {visibleCustomers.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-xs font-semibold">No encontramos el cliente</p>
                          <button
                            className="link-button mt-2"
                            onClick={() => setNewCustomerOpen(true)}
                          >
                            <Plus size={13} /> Registrarlo ahora
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="eyebrow">Paso 2</p>
                  <h2 className="mt-1 text-base font-semibold">Agregar productos</h2>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Busca por descripción, categoría, marca o SKU.
                  </p>
                </div>
                <span className="rounded-lg bg-[#edf4f2] px-3 py-2 text-[10px] font-semibold text-[#2f7468]">
                  Precios: {priceList}
                </span>
              </div>
              <div className="relative mt-4">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2f7468]"
                />
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-[#fafcfb] pl-11 pr-4 text-xs outline-none focus:border-[#2f7468] focus:ring-4 focus:ring-[#2f7468]/10"
                  placeholder="Ej. tubo PVC, CPVC, PVC-TUB-100..."
                />
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-semibold ${
                      category === item ? "bg-[#2f7468] text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => {
                const available = product.stock - product.reserved;
                const inCart = cart.find((item) => item.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    disabled={available <= 0}
                    onClick={() => addProduct(product)}
                    className="group rounded-xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#82aaa2] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                        <PackagePlus size={16} />
                      </span>
                      {inCart && (
                        <span className="grid size-6 place-items-center rounded-full bg-[#2f7468] text-[9px] font-bold text-white">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs font-semibold leading-relaxed">
                      {product.name}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">
                      {product.sku} · {product.category}
                    </p>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#285e56]">
                          {money(priceFor(product, priceListId))}
                        </p>
                        <p className="mt-0.5 text-[9px] text-slate-400">por {product.saleUnit}</p>
                      </div>
                      <p
                        className={`text-[9px] font-semibold ${
                          available <= product.minimumStock ? "text-[#c9664f]" : "text-[#347652]"
                        }`}
                      >
                        {available} disponibles
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-[92px]">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="eyebrow">Cotización actual</p>
                <h2 className="mt-1 text-lg font-semibold">Partidas</h2>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} productos
              </span>
            </div>

            <div className="max-h-[360px] min-h-48 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="grid min-h-44 place-items-center text-center">
                  <div>
                    <span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
                      <ShoppingCart size={19} />
                    </span>
                    <p className="mt-3 text-xs font-semibold">Agrega productos</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Selecciónalos desde el catálogo.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const price = priceFor(item.product, priceListId);
                    return (
                      <div
                        key={item.product.id}
                        className="border-b border-slate-100 pb-4 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-semibold">
                              {item.product.name}
                            </p>
                            <p className="mt-1 text-[9px] text-slate-400">
                              {item.product.sku} · {money(price)} c/u
                            </p>
                          </div>
                          <button
                            className="text-slate-300 hover:text-[#c9664f]"
                            onClick={() =>
                              setCart((items) =>
                                items.filter((entry) => entry.product.id !== item.product.id),
                              )
                            }
                            aria-label={`Eliminar ${item.product.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-200">
                            <button
                              className="grid size-7 place-items-center text-slate-500"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(event) =>
                                updateQuantity(item.product.id, Number(event.target.value))
                              }
                              className="h-7 w-10 border-x border-slate-200 text-center text-xs font-semibold outline-none"
                            />
                            <button
                              className="grid size-7 place-items-center text-slate-500"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-right">
                            {calcOf(item).discount > 0 && (
                              <p className="text-[10px] text-slate-400 line-through">{money(price * item.quantity)}</p>
                            )}
                            <p className="text-xs font-bold">{money(calcOf(item).net)}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <DiscountControl
                            maxPercent={maxDiscount}
                            compact
                            value={item.discount}
                            base={price * item.quantity}
                            onChange={(discount) => setLineDiscount(item.product.id, discount)}
                            label={`Descuento ${item.product.name}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-[#fafcfb] p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="form-label">
                  Vigencia
                  <select
                    value={validity}
                    onChange={(event) => setValidity(event.target.value)}
                    className="form-input"
                  >
                    {[...new Set([policies.quoteValidityDays, 7, 15, 30])].sort((a, b) => a - b).map((d) => (
                      <option key={d}>{d} días</option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  Lista
                  <input className="form-input" value={priceList} readOnly />
                </label>
              </div>
              <label className="form-label mt-3">
                Nota interna
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="form-input"
                  placeholder="Obra o referencia"
                />
              </label>
              {maxDiscount > 0 && <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5">
                <DiscountControl
                  maxPercent={maxDiscount}
                  label="Descuento global"
                  value={globalDiscount}
                  base={totals.afterLines}
                  onChange={setGlobalDiscount}
                />
              </div>}
              <div className="mt-4 space-y-2 text-xs">
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
              {!selectedCustomer && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#fff6df] p-2.5 text-[10px] text-[#8a651e]">
                  <TriangleAlert size={13} /> Selecciona un cliente para continuar.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  disabled={!selectedCustomer || cart.length === 0}
                  onClick={() => finish("Borrador")}
                  className="secondary-button bg-white disabled:opacity-40"
                >
                  Guardar borrador
                </button>
                <button
                  disabled={!selectedCustomer || cart.length === 0}
                  onClick={() => finish("Enviada")}
                  className="primary-button disabled:opacity-40"
                >
                  <Send size={15} /> Finalizar
                </button>
              </div>
            </div>
          </section>
        </aside>
      </main>

      {pendingCustomer && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#102521]/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <span className="grid size-11 place-items-center rounded-xl bg-[#fff0eb] text-[#c9664f]">
              <TriangleAlert size={19} />
            </span>
            <h2 className="mt-4 text-lg font-semibold">¿Cambiar el cliente?</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Estás cambiando de <strong>{selectedCustomer?.businessName}</strong> a{" "}
              <strong>{pendingCustomer.businessName}</strong>. Todos los precios de la cotización se
              actualizarán automáticamente de la lista <strong>{priceList}</strong> a
              la lista <strong>{listName(listForCustomer(pendingCustomer))}</strong>.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="secondary-button" onClick={() => setPendingCustomer(null)}>
                Conservar cliente
              </button>
              <button className="primary-button" onClick={confirmCustomerChange}>
                <Check size={15} /> Cambiar y actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {newCustomerOpen && (
        <NewCustomerModal
          customers={customers}
          onClose={() => setNewCustomerOpen(false)}
          onCreate={(customer) => {
            onAddCustomer(customer);
            setSelectedCustomer(customer);
            setNewCustomerOpen(false);
            setCustomerMenu(false);
          }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({
  customers,
  onClose,
  onCreate,
}: {
  customers: Customer[];
  onClose: () => void;
  onCreate: (customer: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [rfc, setRfc] = useState("");
  const [type, setType] = useState<CustomerType>("Contratista");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextNumber =
      Math.max(...customers.map((customer) => Number(customer.id.replace("CL-", "")))) + 1;
    onCreate({
      id: nuevoId(`CL-${nextNumber}`),
      businessName: name,
      contactName: contact,
      rfc,
      type,
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
      lastPurchase: "Sin compras",
      channel: "WhatsApp",
      notes: "Cliente creado desde el cotizador.",
    });
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#102521]/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Alta rápida</p>
            <h2 className="mt-1 text-xl font-semibold">Registrar cliente</h2>
            <p className="mt-1 text-xs text-slate-400">Quedará seleccionado en esta cotización.</p>
          </div>
          <button
            className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="form-label sm:col-span-2">
            Nombre o razón social *
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Contacto *
            <input
              required
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              className="form-input"
            />
          </label>
          <label className="form-label">
            WhatsApp *
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="form-input"
              placeholder="55 0000 0000"
            />
          </label>
          <label className="form-label">
            RFC
            <input
              value={rfc}
              onChange={(event) => setRfc(event.target.value.toUpperCase())}
              className="form-input"
            />
          </label>
          <label className="form-label">
            Lista de precios *
            <select
              value={type}
              onChange={(event) => setType(event.target.value as CustomerType)}
              className="form-input"
            >
              <option>Mayorista</option>
              <option>Contratista</option>
              <option>Mostrador</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              <UserPlus size={15} /> Registrar y seleccionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
