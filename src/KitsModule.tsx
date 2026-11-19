import { useState } from "react";
import {
  Check,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { InventoryProduct } from "./InventoryModule";

// ---------- Tipos ----------
export type KitComponent = { sku: string; quantity: number };
export type Kit = {
  id: string;
  sku: string;
  name: string;
  description: string;
  components: KitComponent[];
  retailPrice: number;
  wholesalePrice: number;
  contractorPrice: number;
  status: "Activo" | "Inactivo";
};
/** Componentes ya resueltos (nombre y unidad) para imprimir en documentos */
export type KitLineComponent = { sku: string; name: string; quantity: number; unit: string };

export const KIT_DISCOUNT = 0.05;
export const MIN_MARGIN = 0.2;

export const initialKits: Kit[] = [
  {
    id: "kit-1",
    sku: "KIT-TIN-1100",
    name: "Kit instalación tinaco 1,100 L",
    description: "Tinaco, tubería, conexiones, válvulas y sellado para instalación completa.",
    components: [
      { sku: "ROT-TIN-1100", quantity: 1 },
      { sku: "PVC-TUB-100", quantity: 2 },
      { sku: "PVC-COD-100", quantity: 6 },
      { sku: "VAL-ESF-050", quantity: 2 },
      { sku: "ACC-TEF-012", quantity: 2 },
      { sku: "PEG-PVC-250", quantity: 1 },
    ],
    retailPrice: 4650,
    wholesalePrice: 4390,
    contractorPrice: 4250,
    status: "Activo",
  },
  {
    id: "kit-2",
    sku: "KIT-REP-HID",
    name: "Kit reparación hidráulica básica",
    description: "Para reparar fugas y tramos dañados de tubería de 1\".",
    components: [
      { sku: "PVC-TUB-100", quantity: 1 },
      { sku: "PVC-COD-100", quantity: 4 },
      { sku: "ACC-TEF-012", quantity: 2 },
      { sku: "PEG-PVC-250", quantity: 1 },
    ],
    retailPrice: 520,
    wholesalePrice: 485,
    contractorPrice: 470,
    status: "Activo",
  },
  {
    id: "kit-3",
    sku: "KIT-JAR-020",
    name: "Kit riego de jardín 20 m",
    description: "Manguera reforzada con conexiones y válvula de paso.",
    components: [
      { sku: "MAN-REF-020", quantity: 20 },
      { sku: "VAL-ESF-050", quantity: 1 },
      { sku: "ACC-TEF-012", quantity: 1 },
    ],
    retailPrice: 690,
    wholesalePrice: 650,
    contractorPrice: 630,
    status: "Activo",
  },
];

// ---------- Cálculos ----------
const round = (value: number) => Math.round(value * 100) / 100;
const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const productOf = (products: InventoryProduct[], sku: string) => products.find((p) => p.sku === sku);

export const kitCost = (kit: Pick<Kit, "components">, products: InventoryProduct[]) =>
  round(kit.components.reduce((sum, c) => sum + (productOf(products, c.sku)?.cost ?? 0) * c.quantity, 0));
export const kitListPrice = (kit: Pick<Kit, "components">, products: InventoryProduct[], field: "retailPrice" | "wholesalePrice" | "contractorPrice" = "retailPrice") =>
  round(kit.components.reduce((sum, c) => sum + (productOf(products, c.sku)?.[field] ?? 0) * c.quantity, 0));
/** Precio sugerido: 5 % menos que comprar las piezas sueltas, sin bajar del margen mínimo; redondeado a $10 */
export const suggestedPrice = (kit: Pick<Kit, "components">, products: InventoryProduct[], field: "retailPrice" | "wholesalePrice" | "contractorPrice" = "retailPrice") => {
  const byDiscount = kitListPrice(kit, products, field) * (1 - KIT_DISCOUNT);
  const byMargin = kitCost(kit, products) / (1 - MIN_MARGIN);
  return Math.ceil(Math.max(byDiscount, byMargin) / 10) * 10;
};
/** Kits virtuales: lo disponible lo marca el componente más escaso */
export const kitAvailability = (kit: Pick<Kit, "components">, products: InventoryProduct[]) => {
  let limiting: { sku: string; name: string; canMake: number } | null = null;
  for (const c of kit.components) {
    const p = productOf(products, c.sku);
    const canMake = p ? Math.floor(Math.max(0, p.stock - p.reserved) / c.quantity) : 0;
    if (!limiting || canMake < limiting.canMake) limiting = { sku: c.sku, name: p?.name ?? c.sku, canMake };
  }
  return { available: limiting?.canMake ?? 0, limiting };
};
export const kitComponentsFor = (kit: Pick<Kit, "components">, products: InventoryProduct[]): KitLineComponent[] =>
  kit.components.map((c) => {
    const p = productOf(products, c.sku);
    return { sku: c.sku, name: p?.name ?? c.sku, quantity: c.quantity, unit: p?.saleUnit ?? "pieza" };
  });

/** El kit como "producto" para catálogos (punto de venta, cotizador) */
export const kitAsProduct = (kit: Kit, products: InventoryProduct[]): InventoryProduct => ({
  id: kit.id,
  sku: kit.sku,
  barcode: "",
  name: kit.name,
  category: "Kits",
  brand: "Kit",
  description: kit.description,
  baseUnit: "kit",
  saleUnit: "kit",
  conversion: 1,
  stock: kitAvailability(kit, products).available,
  reserved: 0,
  minimumStock: 0,
  maximumStock: 0,
  cost: kitCost(kit, products),
  retailPrice: kit.retailPrice,
  wholesalePrice: kit.wholesalePrice,
  contractorPrice: kit.contractorPrice,
  tax: 16,
  aisle: "Kit",
  shelf: "",
  supplier: "",
  status: kit.status,
  kitComponents: kitComponentsFor(kit, products),
});

/** Convierte partidas que pueden incluir kits en partidas de componentes (para inventario y surtido) */
export const explodeLines = <T extends { sku: string; quantity: number }>(lines: T[], kits: Kit[]) =>
  lines.flatMap((line) => {
    const kit = kits.find((k) => k.sku === line.sku);
    return kit
      ? kit.components.map((c) => ({ ...line, sku: c.sku, quantity: c.quantity * line.quantity, kitSku: kit.sku, kitName: kit.name }))
      : [{ ...line, kitSku: undefined as string | undefined, kitName: undefined as string | undefined }];
  });

// ---------- Panel de kits (Inventario) ----------
export function KitsPanel({
  kits,
  products,
  onSave,
  onToast,
}: {
  kits: Kit[];
  products: InventoryProduct[];
  onSave: (kit: Kit) => void;
  onToast: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Kit | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(kits[0]?.id ?? null);
  const selected = kits.find((k) => k.id === selectedId) ?? null;

  return (
    <>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <section className="panel overflow-hidden">
          <div className="panel-header border-b border-slate-100">
            <div>
              <p className="eyebrow">Kits virtuales · sin inventario propio</p>
              <h2 className="panel-title">{kits.length} kits</h2>
            </div>
            <button className="primary-button" onClick={() => setEditing({ id: `kit-${Date.now()}`, sku: "KIT-", name: "", description: "", components: [], retailPrice: 0, wholesalePrice: 0, contractorPrice: 0, status: "Activo" })}>
              <Plus size={16} /> Nuevo kit
            </button>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafcfb] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Kit</th>
                <th className="py-3 text-center">Componentes</th>
                <th className="py-3 text-right">Disponibles</th>
                <th className="py-3 pl-4 text-right">Costo</th>
                <th className="py-3 pl-4 text-right">Precio</th>
                <th className="px-5 py-3 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kits.map((kit) => {
                const { available, limiting } = kitAvailability(kit, products);
                const cost = kitCost(kit, products);
                const margin = kit.retailPrice ? (kit.retailPrice - cost) / kit.retailPrice : 0;
                return (
                  <tr key={kit.id} className={`cursor-pointer transition hover:bg-[#fafcfb] ${selectedId === kit.id ? "bg-[#f2f8f6]" : ""}`} onClick={() => setSelectedId(kit.id)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                          <Layers size={15} />
                        </span>
                        <div>
                          <p className="font-semibold">{kit.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {kit.sku} · {kit.status}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center text-slate-600">{kit.components.length}</td>
                    <td className="py-3.5 text-right">
                      <p className={`font-semibold ${available === 0 ? "text-[#c9664f]" : ""}`}>{available}</p>
                      {limiting && <p className="ml-auto max-w-[96px] truncate text-[9px] text-slate-400" title={`Limita: ${limiting.name}`}>por {limiting.name.split(" ")[0].toLowerCase()}</p>}
                    </td>
                    <td className="py-3.5 pl-4 text-right text-slate-500">{money(cost)}</td>
                    <td className="py-3.5 pl-4 text-right font-semibold">{money(kit.retailPrice)}</td>
                    <td className={`px-5 py-3.5 text-right font-semibold ${margin < MIN_MARGIN ? "text-[#c9664f]" : "text-[#347652]"}`}>{(margin * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {selected && (
          <section className="panel h-fit overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <p className="eyebrow">{selected.sku}</p>
                <h2 className="mt-1 text-base font-semibold">{selected.name}</h2>
                <p className="mt-1 text-[11px] text-slate-400">{selected.description}</p>
              </div>
              <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]" onClick={() => setEditing(selected)} title="Editar kit">
                <Pencil size={14} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {selected.components.map((c) => {
                const p = productOf(products, c.sku);
                const canMake = p ? Math.floor(Math.max(0, p.stock - p.reserved) / c.quantity) : 0;
                const limit = kitAvailability(selected, products).limiting?.sku === c.sku;
                return (
                  <div key={c.sku} className={`flex items-center gap-3 px-5 py-2.5 text-xs ${limit ? "bg-[#fff8f5]" : ""}`}>
                    <span className="w-10 text-right font-bold text-[#2f7468]">{c.quantity}×</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p?.name ?? c.sku}</p>
                      <p className="text-[10px] text-slate-400">
                        {c.sku} · disponible {p ? p.stock - p.reserved : 0} {p?.saleUnit} · alcanza para {canMake}
                      </p>
                    </div>
                    {limit && <span className="rounded bg-[#fff0eb] px-1.5 py-0.5 text-[9px] font-semibold text-[#c9664f]">Limita</span>}
                  </div>
                );
              })}
            </div>
            <PriceSummary kit={selected} products={products} />
          </section>
        )}
      </div>

      {editing && (
        <KitModal
          kit={editing}
          products={products}
          isNew={!kits.some((k) => k.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={(kit) => {
            onSave(kit);
            setSelectedId(kit.id);
            setEditing(null);
            onToast(`Kit ${kit.name} guardado`);
          }}
        />
      )}
    </>
  );
}

function PriceSummary({ kit, products }: { kit: Kit; products: InventoryProduct[] }) {
  const cost = kitCost(kit, products);
  const loose = kitListPrice(kit, products);
  return (
    <dl className="space-y-1.5 border-t border-slate-100 bg-[#fafcfb] p-5 text-xs">
      <div className="flex justify-between text-slate-500">
        <dt>Piezas sueltas (mostrador)</dt>
        <dd className="line-through">{money(loose)}</dd>
      </div>
      <div className="flex justify-between text-base font-bold">
        <dt>Precio del kit</dt>
        <dd>{money(kit.retailPrice)}</dd>
      </div>
      <div className="flex justify-between text-[#347652]">
        <dt>El cliente ahorra</dt>
        <dd>{money(Math.max(0, loose - kit.retailPrice))}</dd>
      </div>
      <div className="flex justify-between text-slate-500">
        <dt>Costo · margen</dt>
        <dd>
          {money(cost)} · {kit.retailPrice ? (((kit.retailPrice - cost) / kit.retailPrice) * 100).toFixed(1) : "0"}%
        </dd>
      </div>
      <div className="flex justify-between text-slate-400">
        <dt>Mayorista · contratista</dt>
        <dd>
          {money(kit.wholesalePrice)} · {money(kit.contractorPrice)}
        </dd>
      </div>
    </dl>
  );
}

// ---------- Alta / edición ----------
function KitModal({
  kit,
  products,
  isNew,
  onClose,
  onSave,
}: {
  kit: Kit;
  products: InventoryProduct[];
  isNew: boolean;
  onClose: () => void;
  onSave: (kit: Kit) => void;
}) {
  const [form, setForm] = useState<Kit>(kit);
  const [pick, setPick] = useState("");
  const set = <K extends keyof Kit>(key: K, value: Kit[K]) => setForm((f) => ({ ...f, [key]: value }));
  const cost = kitCost(form, products);
  const lists = [
    { key: "retailPrice" as const, label: "Mostrador" },
    { key: "wholesalePrice" as const, label: "Mayorista" },
    { key: "contractorPrice" as const, label: "Contratista" },
  ];
  const lowMargin = lists.some(({ key }) => form[key] > 0 && (form[key] - cost) / form[key] < MIN_MARGIN);
  const valid = form.name.trim() && form.sku.trim().length > 4 && form.components.length >= 2 && lists.every(({ key }) => form[key] > 0);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="eyebrow">Kit virtual · se descuentan los componentes al vender</p>
            <h2 className="mt-1 text-xl font-semibold">{isNew ? "Nuevo kit" : form.name}</h2>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-[1fr_180px] gap-3">
            <label className="form-label">
              Nombre del kit *
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className="form-input" placeholder="Ej. Kit instalación de calentador" />
            </label>
            <label className="form-label">
              Código *
              <input value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} className="form-input font-mono" />
            </label>
          </div>
          <label className="form-label">
            Descripción
            <input value={form.description} onChange={(e) => set("description", e.target.value)} className="form-input" placeholder="Qué incluye y para qué sirve" />
          </label>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_100px_100px_28px] gap-3 bg-[#fafcfb] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Componente</span>
              <span className="text-center">Cantidad</span>
              <span className="text-right">Costo</span>
              <span className="text-right">Precio suelto</span>
              <span />
            </div>
            {form.components.map((c, index) => {
              const p = productOf(products, c.sku);
              return (
                <div key={c.sku} className="grid grid-cols-[minmax(0,1fr)_90px_100px_100px_28px] items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p?.name ?? c.sku}</p>
                    <p className="text-[10px] text-slate-400">
                      {c.sku} · {p?.saleUnit}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={c.quantity}
                    onChange={(e) => set("components", form.components.map((x, i) => (i === index ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))}
                    className="h-9 rounded-lg border border-slate-200 text-center font-semibold outline-none focus:border-[#2f7468]"
                  />
                  <p className="text-right text-slate-500">{money((p?.cost ?? 0) * c.quantity)}</p>
                  <p className="text-right">{money((p?.retailPrice ?? 0) * c.quantity)}</p>
                  <button className="text-slate-300 hover:text-[#c9664f]" onClick={() => set("components", form.components.filter((_, i) => i !== index))} aria-label="Quitar componente">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <div className="flex gap-2 border-t border-slate-100 bg-[#fafcfb] px-4 py-3">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="form-input h-9 flex-1 bg-white text-xs">
                <option value="">Agregar componente...</option>
                {products
                  .filter((p) => p.status === "Activo" && !form.components.some((c) => c.sku === p.sku))
                  .map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} · {money(p.retailPrice)}
                    </option>
                  ))}
              </select>
              <button className="secondary-button flex min-h-9 items-center gap-1 bg-white disabled:opacity-40" disabled={!pick} onClick={() => {
                set("components", [...form.components, { sku: pick, quantity: 1 }]);
                setPick("");
              }}>
                <Plus size={13} /> Agregar
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Precios del kit</p>
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] font-semibold text-[#2f7468] disabled:opacity-40"
                disabled={form.components.length === 0}
                onClick={() => setForm((f) => ({ ...f, retailPrice: suggestedPrice(f, products), wholesalePrice: suggestedPrice(f, products, "wholesalePrice"), contractorPrice: suggestedPrice(f, products, "contractorPrice") }))}
              >
                <Sparkles size={13} /> Usar precios sugeridos
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {lists.map(({ key, label }) => {
                const loose = kitListPrice(form, products, key);
                const suggested = suggestedPrice(form, products, key);
                const margin = form[key] ? (form[key] - cost) / form[key] : 0;
                return (
                  <div key={key} className="rounded-xl bg-[#f6f8f7] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <div className="relative mt-1.5">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <input
                        type="number"
                        min={0}
                        value={form[key] || ""}
                        onChange={(e) => set(key, Number(e.target.value) || 0)}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 text-right text-sm font-bold outline-none focus:border-[#2f7468]"
                        aria-label={`Precio ${label}`}
                      />
                    </div>
                    <button type="button" className="mt-1.5 text-[10px] font-semibold text-[#2f7468] hover:underline" onClick={() => set(key, suggested)}>
                      Sugerido {money(suggested)}
                    </button>
                    <p className="text-[10px] text-slate-400">Suelto {money(loose)}</p>
                    <p className={`text-[10px] font-semibold ${form[key] && margin < MIN_MARGIN ? "text-[#c9664f]" : "text-[#347652]"}`}>
                      {form[key] ? `Margen ${(margin * 100).toFixed(1)}%` : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
              Costo del kit {money(cost)}. El sugerido es {KIT_DISCOUNT * 100}% menos que comprar las piezas sueltas, sin bajar del margen mínimo de {MIN_MARGIN * 100}%, redondeado a $10.
            </p>
            {lowMargin && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#c9664f]">
                <TriangleAlert size={13} /> Algún precio deja menos del {MIN_MARGIN * 100}% de margen.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-[#fafcfb] px-6 py-4">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={form.status === "Activo"} onChange={(e) => set("status", e.target.checked ? "Activo" : "Inactivo")} className="accent-[#2f7468]" />
            Kit activo (visible en punto de venta y cotizador)
          </label>
          <div className="flex gap-3">
            <button className="secondary-button bg-white" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary-button disabled:cursor-not-allowed disabled:opacity-40" disabled={!valid} onClick={() => onSave(form)}>
              <Check size={16} /> Guardar kit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
