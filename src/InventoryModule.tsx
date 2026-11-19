import { useMemo, useRef, useState } from "react";
import { KitsPanel, type Kit, type KitLineComponent } from "./KitsModule";
import {
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  MapPin,
  PackagePlus,
  PenLine,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";

export type InventoryProduct = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  baseUnit: string;
  saleUnit: string;
  conversion: number;
  stock: number;
  reserved: number;
  minimumStock: number;
  maximumStock: number;
  cost: number;
  retailPrice: number;
  wholesalePrice: number;
  contractorPrice: number;
  tax: number;
  aisle: string;
  shelf: string;
  supplier: string;
  status: "Activo" | "Inactivo";
  /** Solo para kits mostrados como producto en catálogos */
  kitComponents?: KitLineComponent[];
};

export const initialInventory: InventoryProduct[] = [
  {
    id: "prod-7",
    sku: "VAL-ESF-050",
    barcode: "7501234561063",
    name: 'Válvula esfera latón 1/2"',
    category: "Válvulas",
    brand: "Urrea",
    description: "Válvula de esfera de latón forjado, rosca NPT, uso agua fría y caliente.",
    baseUnit: "pieza",
    saleUnit: "pieza",
    conversion: 1,
    stock: 42,
    reserved: 0,
    minimumStock: 15,
    maximumStock: 80,
    cost: 92,
    retailPrice: 138,
    wholesalePrice: 126,
    contractorPrice: 119,
    tax: 16,
    aisle: "D",
    shelf: "03",
    supplier: "Urrea Distribución",
    status: "Activo",
  },
  {
    id: "prod-8",
    sku: "PEG-PVC-250",
    barcode: "7501234561070",
    name: "Pegamento PVC azul 250 ml",
    category: "Adhesivos",
    brand: "Truper",
    description: "Cemento para tubería y conexiones de PVC hidráulico.",
    baseUnit: "pieza",
    saleUnit: "pieza",
    conversion: 1,
    stock: 31,
    reserved: 0,
    minimumStock: 12,
    maximumStock: 60,
    cost: 78,
    retailPrice: 119,
    wholesalePrice: 108,
    contractorPrice: 102,
    tax: 16,
    aisle: "F",
    shelf: "02",
    supplier: "Truper",
    status: "Activo",
  },
  {
    id: "prod-1",
    sku: "PVC-TUB-100",
    barcode: "7501234561001",
    name: 'Tubo PVC hidráulico 1" x 6 m',
    category: "PVC hidráulico",
    brand: "Amanco",
    description: "Tubería hidráulica RD-26 para conducción de agua a presión.",
    baseUnit: "metro",
    saleUnit: "tramo",
    conversion: 6,
    stock: 38,
    reserved: 8,
    minimumStock: 12,
    maximumStock: 80,
    cost: 214.2,
    retailPrice: 286.5,
    wholesalePrice: 264,
    contractorPrice: 249.5,
    tax: 16,
    aisle: "A",
    shelf: "02",
    supplier: "Distribuidora Amanco",
    status: "Activo",
  },
  {
    id: "prod-2",
    sku: "PVC-COD-100",
    barcode: "7501234561018",
    name: 'Codo PVC hidráulico 1" 90°',
    category: "Conexiones PVC",
    brand: "Rexolite",
    description: "Conexión cementar para cambio de dirección a 90 grados.",
    baseUnit: "pieza",
    saleUnit: "pieza",
    conversion: 1,
    stock: 124,
    reserved: 16,
    minimumStock: 30,
    maximumStock: 200,
    cost: 11.4,
    retailPrice: 18.9,
    wholesalePrice: 16.5,
    contractorPrice: 15.8,
    tax: 16,
    aisle: "A",
    shelf: "06",
    supplier: "Conexiones del Centro",
    status: "Activo",
  },
  {
    id: "prod-3",
    sku: "CPVC-TUB-075",
    barcode: "7501234561025",
    name: 'Tubo CPVC 3/4" x 3 m',
    category: "CPVC",
    brand: "FlowGuard",
    description: "Tubería para agua caliente y fría, longitud de 3 metros.",
    baseUnit: "metro",
    saleUnit: "tramo",
    conversion: 3,
    stock: 16,
    reserved: 10,
    minimumStock: 18,
    maximumStock: 60,
    cost: 128,
    retailPrice: 174,
    wholesalePrice: 159,
    contractorPrice: 151,
    tax: 16,
    aisle: "C",
    shelf: "04",
    supplier: "Hidro Sistemas MX",
    status: "Activo",
  },
  {
    id: "prod-4",
    sku: "ROT-TIN-1100",
    barcode: "7501234561032",
    name: "Tinaco tricapa 1,100 L",
    category: "Almacenamiento",
    brand: "Rotoplas",
    description: "Tinaco equipado con filtro y accesorios de instalación.",
    baseUnit: "pieza",
    saleUnit: "pieza",
    conversion: 1,
    stock: 7,
    reserved: 2,
    minimumStock: 4,
    maximumStock: 14,
    cost: 2740,
    retailPrice: 3499,
    wholesalePrice: 3290,
    contractorPrice: 3150,
    tax: 16,
    aisle: "P",
    shelf: "01",
    supplier: "Rotoplas México",
    status: "Activo",
  },
  {
    id: "prod-5",
    sku: "ACC-TEF-012",
    barcode: "7501234561049",
    name: "Cinta teflón alta densidad 12 mm",
    category: "Accesorios",
    brand: "Foset",
    description: "Cinta selladora para conexiones roscadas.",
    baseUnit: "pieza",
    saleUnit: "pieza",
    conversion: 1,
    stock: 240,
    reserved: 22,
    minimumStock: 50,
    maximumStock: 300,
    cost: 6.8,
    retailPrice: 12.5,
    wholesalePrice: 10.5,
    contractorPrice: 9.8,
    tax: 16,
    aisle: "F",
    shelf: "08",
    supplier: "Truper",
    status: "Activo",
  },
  {
    id: "prod-6",
    sku: "MAN-REF-020",
    barcode: "7501234561056",
    name: 'Manguera reforzada 1/2"',
    category: "Mangueras",
    brand: "IUSA",
    description: "Manguera reforzada de uso rudo, venta por metro o rollo.",
    baseUnit: "metro",
    saleUnit: "metro",
    conversion: 1,
    stock: 8,
    reserved: 3,
    minimumStock: 20,
    maximumStock: 120,
    cost: 18.4,
    retailPrice: 28,
    wholesalePrice: 25.2,
    contractorPrice: 23.8,
    tax: 16,
    aisle: "B",
    shelf: "04",
    supplier: "IUSA Distribución",
    status: "Activo",
  },
];

type NewProduct = Omit<InventoryProduct, "id" | "reserved">;

export type MovementKind = "Entrada" | "Salida" | "Ajuste" | "Merma" | "Apartado" | "Liberación";
/** Kardex: cada cambio de existencia (o de apartado) queda registrado */
export type StockMovement = {
  id: string;
  sku: string;
  date: string;
  kind: MovementKind;
  qty: number;
  stockAfter?: number;
  reference: string;
  user: string;
  note?: string;
};
export type AdjustInput =
  | { kind: "Entrada"; qty: number; unitCost: number; supplier: string; reference: string }
  | { kind: "Conteo"; counted: number; note: string }
  | { kind: "Merma"; qty: number; note: string };

const kindStyles: Record<MovementKind, string> = {
  Entrada: "bg-[#eaf6ef] text-[#347652]",
  Salida: "bg-[#e8f2ff] text-[#3973a8]",
  Ajuste: "bg-[#fff6df] text-[#9a6b18]",
  Merma: "bg-[#fff0eb] text-[#c9664f]",
  Apartado: "bg-slate-100 text-slate-500",
  Liberación: "bg-slate-100 text-slate-500",
};

type InventorySort = "Nombre A-Z" | "Menor disponible" | "Mayor valor" | "Mayor margen" | "Más unidades";

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const emptyProduct: NewProduct = {
  sku: "",
  barcode: "",
  name: "",
  category: "",
  brand: "",
  description: "",
  baseUnit: "pieza",
  saleUnit: "pieza",
  conversion: 1,
  stock: 0,
  minimumStock: 0,
  maximumStock: 0,
  cost: 0,
  retailPrice: 0,
  wholesalePrice: 0,
  contractorPrice: 0,
  tax: 16,
  aisle: "",
  shelf: "",
  supplier: "",
  status: "Activo",
};

export default function InventoryModule({
  kits = [],
  onSaveKit,
  products,
  onAddProducts,
  onToast,
  initialQuery = "",
  initialStockFilter = "Todos",
  movements = [],
  onUpdateProduct,
  onAdjust,
}: {
  products: InventoryProduct[];
  onAddProducts: (products: InventoryProduct[]) => void;
  onToast: (message: string) => void;
  initialQuery?: string;
  initialStockFilter?: "Todos" | "Bajo stock" | "Sin stock";
  movements?: StockMovement[];
  onUpdateProduct?: (product: InventoryProduct) => void;
  onAdjust?: (sku: string, input: AdjustInput) => void;
  kits?: Kit[];
  onSaveKit?: (kit: Kit) => void;
}) {
  const [view, setView] = useState<"Productos" | "Kits">("Productos");
  const [query, setQuery] = useState(initialQuery);
  const [stockFilter, setStockFilter] = useState<"Todos" | "Bajo stock" | "Sin stock">(
    initialStockFilter,
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState<NewProduct>(emptyProduct);
  const [bulkRows, setBulkRows] = useState<InventoryProduct[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tab, setTab] = useState<"Detalle" | "Movimientos">("Detalle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustKind, setAdjustKind] = useState<AdjustInput["kind"] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState("Todas");
  const [brand, setBrand] = useState("Todas");
  const [supplier, setSupplier] = useState("Todos");
  const [aisle, setAisle] = useState("Todos");
  const [sort, setSort] = useState<InventorySort>("Nombre A-Z");

  const detail = products.find((product) => product.id === detailId) || null;
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
  const advancedCount =
    (category !== "Todas" ? 1 : 0) +
    (brand !== "Todas" ? 1 : 0) +
    (supplier !== "Todos" ? 1 : 0) +
    (aisle !== "Todos" ? 1 : 0) +
    (sort !== "Nombre A-Z" ? 1 : 0);
  const clearAdvanced = () => {
    setCategory("Todas");
    setBrand("Todas");
    setSupplier("Todos");
    setAisle("Todos");
    setSort("Nombre A-Z");
  };
  const openDetail = (product: InventoryProduct) => {
    setTab("Detalle");
    setDetailId(product.id);
  };
  const openAdjust = (kind: AdjustInput["kind"]) => setAdjustKind(kind);
  const closeManual = () => {
    setManualOpen(false);
    setEditingId(null);
    setForm(emptyProduct);
  };
  const openEdit = (product: InventoryProduct) => {
    const { id: _id, reserved: _reserved, ...rest } = product;
    setForm(rest);
    setEditingId(product.id);
    setManualOpen(true);
  };

  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const matchesQuery = `${product.name} ${product.sku} ${product.barcode} ${product.brand}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const available = product.stock - product.reserved;
      const matchesStock =
        stockFilter === "Todos" ||
        (stockFilter === "Bajo stock" && available > 0 && available <= product.minimumStock) ||
        (stockFilter === "Sin stock" && available <= 0);
      return (
        matchesQuery &&
        matchesStock &&
        (category === "Todas" || product.category === category) &&
        (brand === "Todas" || product.brand === brand) &&
        (supplier === "Todos" || product.supplier === supplier) &&
        (aisle === "Todos" || product.aisle === aisle)
      );
    });
    const marginOf = (product: InventoryProduct) =>
      product.retailPrice ? (product.retailPrice - product.cost) / product.retailPrice : 0;
    return [...list].sort((a, b) =>
      sort === "Menor disponible"
        ? a.stock - a.reserved - (b.stock - b.reserved)
        : sort === "Mayor valor"
          ? b.cost * b.stock - a.cost * a.stock
          : sort === "Mayor margen"
            ? marginOf(b) - marginOf(a)
            : sort === "Más unidades"
              ? b.stock - a.stock
              : a.name.localeCompare(b.name),
    );
  }, [products, query, stockFilter, category, brand, supplier, aisle, sort]);

  const inventoryValue = products.reduce((sum, product) => sum + product.cost * product.stock, 0);
  const lowStock = products.filter(
    (product) => product.stock - product.reserved <= product.minimumStock,
  ).length;
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);

  const updateField = <K extends keyof NewProduct>(field: K, value: NewProduct[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submitManual = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingId) {
      const original = products.find((item) => item.id === editingId)!;
      onUpdateProduct?.({ ...original, ...form, stock: original.stock });
      setForm(emptyProduct);
      setEditingId(null);
      setManualOpen(false);
      onToast(`${form.name} actualizado`);
      return;
    }
    const product: InventoryProduct = {
      ...form,
      id: `prod-${Date.now()}`,
      reserved: 0,
    };
    onAddProducts([product]);
    setForm(emptyProduct);
    setManualOpen(false);
    onToast(`${product.name} agregado al inventario`);
  };

  const downloadTemplate = () => {
    const header =
      "sku,nombre,categoria,marca,unidad,stock,stock_minimo,costo,precio_mostrador,pasillo,estante,proveedor\n";
    const example =
      'PVC-TEE-100,"Tee PVC hidráulica 1 pulgada",Conexiones PVC,Rexolite,pieza,40,10,18.5,29.9,A,06,Conexiones del Centro\n';
    const url = URL.createObjectURL(new Blob([header, example], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_inventario_99.csv";
    link.click();
    URL.revokeObjectURL(url);
    onToast("Plantilla CSV descargada");
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const values = (line: string) =>
      line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((value) => value.replace(/^"|"$/g, "").trim());
    const headers = values(lines[0]).map((header) => header.toLowerCase());
    const field = (row: string[], key: string) => row[headers.indexOf(key)] || "";
    return lines.slice(1).map((line, index) => {
      const row = values(line);
      const stock = Number(field(row, "stock")) || 0;
      const cost = Number(field(row, "costo")) || 0;
      const retail = Number(field(row, "precio_mostrador")) || 0;
      return {
        id: `bulk-${Date.now()}-${index}`,
        sku: field(row, "sku") || `SKU-${Date.now()}-${index}`,
        barcode: field(row, "codigo_barras"),
        name: field(row, "nombre") || "Producto sin nombre",
        category: field(row, "categoria") || "Sin categoría",
        brand: field(row, "marca"),
        description: field(row, "descripcion"),
        baseUnit: field(row, "unidad") || "pieza",
        saleUnit: field(row, "unidad") || "pieza",
        conversion: 1,
        stock,
        reserved: 0,
        minimumStock: Number(field(row, "stock_minimo")) || 0,
        maximumStock: Number(field(row, "stock_maximo")) || stock * 2,
        cost,
        retailPrice: retail,
        wholesalePrice: Number(field(row, "precio_mayoreo")) || retail,
        contractorPrice: Number(field(row, "precio_contratista")) || retail,
        tax: Number(field(row, "iva")) || 16,
        aisle: field(row, "pasillo"),
        shelf: field(row, "estante"),
        supplier: field(row, "proveedor"),
        status: "Activo" as const,
      };
    });
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      onToast("Usa un archivo CSV basado en la plantilla");
      return;
    }
    const rows = parseCsv(await file.text());
    setBulkRows(rows);
    setBulkFileName(file.name);
  };

  const confirmBulk = () => {
    onAddProducts(bulkRows);
    onToast(`${bulkRows.length} productos importados correctamente`);
    setBulkRows([]);
    setBulkFileName("");
    setBulkOpen(false);
  };

  return (
    <>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-400">
            Operación <ChevronRight size={13} /> <span className="text-slate-700">Inventario</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">Inventario</h1>
          <p className="mt-2 text-sm text-slate-500">
            Controla existencias, medidas, precios y ubicaciones físicas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="secondary-button flex items-center gap-2 bg-white"
            onClick={() => setBulkOpen(true)}
          >
            <Upload size={16} /> Carga masiva
          </button>
          <button className="primary-button" onClick={() => setManualOpen(true)}>
            <PackagePlus size={17} /> Agregar producto
          </button>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Productos activos",
            value: products.filter((product) => product.status === "Activo").length.toLocaleString(),
            detail: `${unique(products.map((product) => product.category)).length} categorías`,
            icon: Boxes,
            action: () => {
              setStockFilter("Todos");
              clearAdvanced();
            },
          },
          {
            label: "Unidades en almacén",
            value: totalUnits.toLocaleString(),
            detail: `${products.reduce((sum, product) => sum + product.reserved, 0)} apartadas para pedidos`,
            icon: PackagePlus,
            action: () => {
              setStockFilter("Todos");
              clearAdvanced();
              setSort("Más unidades");
            },
          },
          {
            label: "Valor de inventario",
            value: money(inventoryValue),
            detail: "A costo promedio · ver mayor valor",
            icon: FileSpreadsheet,
            action: () => {
              setStockFilter("Todos");
              clearAdvanced();
              setSort("Mayor valor");
            },
          },
          {
            label: "Alertas de stock",
            value: String(lowStock),
            detail: "En mínimo o por debajo",
            icon: TriangleAlert,
            action: () => {
              setStockFilter("Todos");
              clearAdvanced();
              setSort("Menor disponible");
              setStockFilter("Bajo stock");
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

      <nav className="mt-7 flex gap-1 border-b border-slate-200">
        {(["Productos", "Kits"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`relative px-5 py-3 text-xs font-semibold transition ${view === item ? "text-[#285e56]" : "text-slate-400 hover:text-slate-600"}`}
          >
            {item}
            <span className="ml-1.5 text-[10px] opacity-60">{item === "Kits" ? kits.length : products.length}</span>
            {view === item && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2f7468]" />}
          </button>
        ))}
      </nav>

      {view === "Kits" ? (
        <KitsPanel kits={kits} products={products} onSave={(kit) => onSaveKit?.(kit)} onToast={onToast} />
      ) : (
      <section className="panel mt-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            {(["Todos", "Bajo stock", "Sin stock"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setStockFilter(item)}
                className={`rounded-lg px-3 py-2 ${stockFilter === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
              >
                {item}
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
                placeholder="Buscar nombre, SKU, código o marca..."
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
                  <div className="mt-4 space-y-3">
                    {[
                      ["Categoría", category, setCategory, "Todas", unique(products.map((p) => p.category))],
                      ["Marca", brand, setBrand, "Todas", unique(products.map((p) => p.brand))],
                      ["Proveedor", supplier, setSupplier, "Todos", unique(products.map((p) => p.supplier))],
                      ["Pasillo", aisle, setAisle, "Todos", unique(products.map((p) => p.aisle))],
                    ].map(([label, value, setter, all, options]) => (
                      <label key={label as string} className="form-label">
                        {label as string}
                        <select
                          value={value as string}
                          onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                          className="form-input"
                        >
                          <option>{all as string}</option>
                          {(options as string[]).map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <label className="form-label">
                      Ordenar por
                      <select value={sort} onChange={(e) => setSort(e.target.value as InventorySort)} className="form-input">
                        {(["Nombre A-Z", "Menor disponible", "Mayor valor", "Mayor margen", "Más unidades"] as InventorySort[]).map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button className="primary-button mt-4 w-full" onClick={() => setFiltersOpen(false)}>
                    Ver {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
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
                category !== "Todas" && category,
                brand !== "Todas" && `Marca: ${brand}`,
                supplier !== "Todos" && supplier,
                aisle !== "Todos" && `Pasillo ${aisle}`,
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
                <th className="px-5 py-3.5">Producto</th>
                <th className="py-3.5">Existencia</th>
                <th className="py-3.5">Ubicación</th>
                <th className="py-3.5">Costo</th>
                <th className="py-3.5">Precio mostrador</th>
                <th className="py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const available = product.stock - product.reserved;
                const isLow = available <= product.minimumStock;
                return (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 text-xs transition hover:bg-[#fafcfb]"
                  >
                    <td className="px-5 py-4">
                      <button className="flex items-center gap-3 text-left" onClick={() => openDetail(product)}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf4f2] text-[#2f7468]">
                          <Boxes size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-72 truncate font-semibold text-slate-800">
                            {product.name}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {product.sku} · {product.brand || "Sin marca"} · {product.category}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="py-4">
                      <p className={`font-semibold ${isLow ? "text-[#c9664f]" : ""}`}>
                        {available < 0 ? `Faltan ${-available}` : available} {product.saleUnit}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {product.stock} en almacén · {product.reserved} apartados
                      </p>
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                        <MapPin size={11} /> {product.aisle || "—"}-{product.shelf || "—"}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500">{money(product.cost)}</td>
                    <td className="py-4 font-semibold">{money(product.retailPrice)}</td>
                    <td className="py-4">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${isLow ? "bg-[#fff0eb] text-[#c9664f]" : "bg-[#eaf6ef] text-[#347652]"}`}
                      >
                        {isLow ? "Bajo stock" : product.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                          onClick={() => openDetail(product)}
                          title="Ver ficha y movimientos"
                          aria-label={`Ver ${product.name}`}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#2f7468]"
                          onClick={() => openEdit(product)}
                          title="Editar producto"
                          aria-label={`Editar ${product.name}`}
                        >
                          <PenLine size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="grid place-items-center px-5 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <Boxes size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold">No encontramos productos</p>
            <p className="mt-1 text-xs text-slate-400">Cambia la búsqueda o agrega un producto.</p>
          </div>
        )}
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Mostrando {filtered.length} de {products.length} productos
        </div>
      </section>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-4 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <p className="eyebrow">{editingId ? "Editar producto" : "Alta manual"}</p>
                <h2 className="mt-1 text-xl font-semibold">{editingId ? form.name : "Nuevo producto"}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Registra los datos comerciales, físicos y de inventario.
                </p>
              </div>
              <button
                className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                onClick={closeManual}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitManual}>
              <div className="space-y-7 p-6">
                <FormSection
                  title="Información general"
                  description="Datos para identificar y encontrar el producto."
                >
                  <Field label="Nombre del producto *" wide>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      className="form-input"
                      placeholder='Ej. Tubo PVC hidráulico 1" x 6 m'
                    />
                  </Field>
                  <Field label="SKU *">
                    <input
                      required
                      value={form.sku}
                      onChange={(e) => updateField("sku", e.target.value)}
                      className="form-input"
                      placeholder="PVC-TUB-100"
                    />
                  </Field>
                  <Field label="Código de barras">
                    <input
                      value={form.barcode}
                      onChange={(e) => updateField("barcode", e.target.value)}
                      className="form-input"
                      placeholder="750..."
                    />
                  </Field>
                  <Field label="Categoría *">
                    <input
                      required
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="form-input"
                      placeholder="PVC hidráulico"
                    />
                  </Field>
                  <Field label="Marca">
                    <input
                      value={form.brand}
                      onChange={(e) => updateField("brand", e.target.value)}
                      className="form-input"
                      placeholder="Marca"
                    />
                  </Field>
                  <Field label="Descripción" wide>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      className="min-h-20 w-full rounded-xl border border-[#dfe6e4] bg-[#f9fbfa] p-3 text-xs outline-none focus:border-[#2f7468]"
                      placeholder="Especificaciones y notas del producto..."
                    />
                  </Field>
                </FormSection>

                <FormSection
                  title="Unidades y existencias"
                  description="Configura productos completos o fraccionados."
                >
                  <Field label="Unidad base">
                    <select
                      value={form.baseUnit}
                      onChange={(e) => updateField("baseUnit", e.target.value)}
                      className="form-input"
                    >
                      <option>pieza</option>
                      <option>metro</option>
                      <option>litro</option>
                      <option>kilogramo</option>
                    </select>
                  </Field>
                  <Field label="Unidad de venta">
                    <select
                      value={form.saleUnit}
                      onChange={(e) => updateField("saleUnit", e.target.value)}
                      className="form-input"
                    >
                      <option>pieza</option>
                      <option>tramo</option>
                      <option>rollo</option>
                      <option>metro</option>
                      <option>caja</option>
                    </select>
                  </Field>
                  <NumberField
                    label="Conversión a unidad base"
                    value={form.conversion}
                    onChange={(value) => updateField("conversion", value)}
                  />
                  {editingId ? (
                    <Field label="Existencia actual">
                      <div className="flex h-[42px] items-center rounded-[10px] border border-dashed border-[#dfe6e4] px-3 text-xs text-slate-500">
                        {form.stock} · se cambia con Entrada o Ajuste
                      </div>
                    </Field>
                  ) : (
                    <NumberField
                      label="Existencia inicial"
                      value={form.stock}
                      onChange={(value) => updateField("stock", value)}
                    />
                  )}
                  <NumberField
                    label="Stock mínimo"
                    value={form.minimumStock}
                    onChange={(value) => updateField("minimumStock", value)}
                  />
                  <NumberField
                    label="Stock máximo"
                    value={form.maximumStock}
                    onChange={(value) => updateField("maximumStock", value)}
                  />
                </FormSection>

                <FormSection
                  title="Costos y precios"
                  description="Define los niveles comerciales e impuestos."
                >
                  <NumberField
                    label="Costo unitario"
                    value={form.cost}
                    onChange={(value) => updateField("cost", value)}
                    money
                  />
                  <NumberField
                    label="Precio mostrador *"
                    value={form.retailPrice}
                    onChange={(value) => updateField("retailPrice", value)}
                    money
                  />
                  <NumberField
                    label="Precio mayoreo"
                    value={form.wholesalePrice}
                    onChange={(value) => updateField("wholesalePrice", value)}
                    money
                  />
                  <NumberField
                    label="Precio contratista"
                    value={form.contractorPrice}
                    onChange={(value) => updateField("contractorPrice", value)}
                    money
                  />
                  <NumberField
                    label="IVA (%)"
                    value={form.tax}
                    onChange={(value) => updateField("tax", value)}
                  />
                </FormSection>

                <FormSection
                  title="Ubicación y abastecimiento"
                  description="Información clave para surtido y reposición."
                >
                  <Field label="Pasillo *">
                    <input
                      required
                      value={form.aisle}
                      onChange={(e) => updateField("aisle", e.target.value.toUpperCase())}
                      className="form-input"
                      placeholder="A"
                    />
                  </Field>
                  <Field label="Estante *">
                    <input
                      required
                      value={form.shelf}
                      onChange={(e) => updateField("shelf", e.target.value.toUpperCase())}
                      className="form-input"
                      placeholder="02"
                    />
                  </Field>
                  <Field label="Proveedor principal" wide>
                    <input
                      value={form.supplier}
                      onChange={(e) => updateField("supplier", e.target.value)}
                      className="form-input"
                      placeholder="Nombre del proveedor"
                    />
                  </Field>
                </FormSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-white px-6 py-4">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeManual}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  <Check size={16} /> {editingId ? "Guardar cambios" : "Guardar producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102521]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Importación masiva</p>
                <h2 className="mt-1 text-xl font-semibold">Cargar catálogo</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Importa productos desde un archivo CSV.
                </p>
              </div>
              <button
                className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500"
                onClick={() => setBulkOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f2f8f6] p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white text-[#2f7468]">
                  <FileSpreadsheet size={17} />
                </span>
                <div>
                  <p className="text-xs font-semibold">Usa la plantilla de 99</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Evita errores de columnas y formato.
                  </p>
                </div>
              </div>
              <button className="link-button" onClick={downloadTemplate}>
                <Download size={14} /> Descargar
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              className="mt-4 grid min-h-44 w-full place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-[#fafcfb] p-6 text-center transition hover:border-[#82aaa2]"
              onClick={() => fileInput.current?.click()}
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
            >
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-[#2f7468] shadow-sm">
                  <Upload size={19} />
                </span>
                <p className="mt-3 text-sm font-semibold">
                  {bulkFileName || "Arrastra tu CSV o haz clic para buscar"}
                </p>
                <p className="mt-1 text-xs text-slate-400">Máximo 5 MB · formato UTF-8</p>
              </div>
            </button>

            {bulkRows.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between bg-[#fafcfb] px-4 py-3">
                  <p className="text-xs font-semibold">Vista previa</p>
                  <span className="rounded-lg bg-[#eaf6ef] px-2.5 py-1 text-[10px] font-semibold text-[#347652]">
                    {bulkRows.length} filas válidas
                  </span>
                </div>
                <div className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
                  {bulkRows.slice(0, 8).map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <div>
                        <strong>{row.name}</strong>
                        <span className="ml-2 text-[10px] text-slate-400">{row.sku}</span>
                      </div>
                      <span className="text-slate-500">
                        {row.stock} {row.baseUnit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button className="secondary-button" onClick={() => setBulkOpen(false)}>
                Cancelar
              </button>
              <button
                className="primary-button disabled:opacity-40"
                disabled={bulkRows.length === 0}
                onClick={confirmBulk}
              >
                Importar {bulkRows.length || ""} productos
              </button>
            </div>
          </div>
        </div>
      )}
      {detail && (() => {
        const product = detail;
        const available = product.stock - product.reserved;
        const isLow = available <= product.minimumStock;
        const productMovements = movements.filter((movement) => movement.sku === product.sku);
        const scaleMax = Math.max(product.maximumStock, product.stock, 1);
        const margin = (price: number) => (price ? ((price - product.cost) / price) * 100 : 0);
        return (
          <>
            <button className="fixed inset-0 z-40 bg-[#102521]/40 backdrop-blur-[2px]" onClick={() => setDetailId(null)} aria-label="Cerrar ficha" />
            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
              <div className="border-b border-slate-100 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#edf4f2] text-[#2f7468]">
                      <Boxes size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold leading-snug">{product.name}</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {product.sku} · {product.brand || "Sin marca"} · {product.category}
                      </p>
                    </div>
                  </div>
                  <button className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={() => setDetailId(null)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    ["Existencia", `${product.stock}`],
                    ["Apartado", `${product.reserved}`],
                    ["Disponible", `${available}`],
                    ["Valor", money(product.cost * product.stock)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#f6f8f7] p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className={`mt-1 text-sm font-semibold ${label === "Disponible" && isLow ? "text-[#c9664f]" : ""}`}>
                        {label === "Disponible" && available < 0 ? `Faltan ${-available}` : value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="relative h-2 overflow-visible rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${isLow ? "bg-[#e5785f]" : "bg-[#82aa58]"}`}
                      style={{ width: `${Math.min(100, (Math.max(0, available) / scaleMax) * 100)}%` }}
                    />
                    <span className="absolute -top-1 h-4 w-0.5 bg-[#c9664f]" style={{ left: `${(product.minimumStock / scaleMax) * 100}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                    <span>Mínimo {product.minimumStock} {product.saleUnit}</span>
                    <span>{isLow ? `Reponer ${Math.max(0, product.maximumStock - available)} para llegar al máximo` : "Existencia sana"}</span>
                    <span>Máximo {product.maximumStock}</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="primary-button min-h-10" onClick={() => openAdjust("Entrada")}>
                    <PackagePlus size={15} /> Entrada
                  </button>
                  <button className="secondary-button flex min-h-10 items-center justify-center gap-2 bg-white" onClick={() => openAdjust("Conteo")}>
                    <ClipboardCheck size={15} /> Ajuste / conteo
                  </button>
                  <button className="secondary-button flex min-h-10 items-center justify-center gap-2 bg-white" onClick={() => openEdit(product)}>
                    <PenLine size={15} /> Editar
                  </button>
                </div>
                <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                  {(["Detalle", "Movimientos"] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setTab(item)}
                      className={`flex-1 rounded-lg px-2 py-2 ${tab === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
                    >
                      {item}
                      {item === "Movimientos" && <span className="ml-1 text-[10px] opacity-60">{productMovements.length}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {tab === "Detalle" ? (
                  <>
                    <section>
                      <p className="eyebrow">Precios y margen</p>
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 text-xs">
                        {[
                          ["Costo unitario", product.cost, null],
                          ["Mostrador", product.retailPrice, margin(product.retailPrice)],
                          ["Mayoreo", product.wholesalePrice, margin(product.wholesalePrice)],
                          ["Contratista", product.contractorPrice, margin(product.contractorPrice)],
                        ].map(([label, value, pct]) => (
                          <div key={label as string} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 last:border-0">
                            <span className="text-slate-500">{label}</span>
                            <span className="flex items-center gap-3">
                              {pct !== null && (
                                <span className={`text-[10px] font-semibold ${(pct as number) < 10 ? "text-[#c9664f]" : "text-[#347652]"}`}>
                                  {(pct as number).toFixed(1)}% margen
                                </span>
                              )}
                              <strong>{money(value as number)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">Precios con IVA {product.tax}% incluido.</p>
                    </section>
                    <section className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        ["Ubicación", `Pasillo ${product.aisle || "—"} · Estante ${product.shelf || "—"}`],
                        ["Proveedor", product.supplier || "Sin proveedor"],
                        ["Unidades", `Base: ${product.baseUnit} · Venta: ${product.saleUnit}${product.conversion !== 1 ? ` (1 = ${product.conversion} ${product.baseUnit})` : ""}`],
                        ["Código de barras", product.barcode || "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-100 p-3">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                          <p className="mt-1 font-semibold">{value}</p>
                        </div>
                      ))}
                    </section>
                    {product.description && (
                      <section>
                        <p className="eyebrow">Descripción</p>
                        <p className="mt-3 rounded-xl bg-[#f6f8f7] p-4 text-xs leading-relaxed text-slate-500">{product.description}</p>
                      </section>
                    )}
                  </>
                ) : (
                  <section>
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      <div className="grid grid-cols-[1fr_92px_70px_70px] gap-2 bg-[#fafcfb] px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                        <span>Movimiento</span>
                        <span>Tipo</span>
                        <span className="text-right">Cantidad</span>
                        <span className="text-right">Existencia</span>
                      </div>
                      {productMovements.map((movement) => (
                        <div key={movement.id} className="grid grid-cols-[1fr_92px_70px_70px] items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{movement.reference}</p>
                            <p className="truncate text-[10px] text-slate-400">
                              {movement.date} · {movement.user}
                              {movement.note ? ` · ${movement.note}` : ""}
                            </p>
                          </div>
                          <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-semibold ${kindStyles[movement.kind]}`}>{movement.kind}</span>
                          <span className={`text-right font-semibold ${movement.qty < 0 ? "text-[#c9664f]" : movement.kind === "Apartado" || movement.kind === "Liberación" ? "text-slate-500" : "text-[#347652]"}`}>
                            {movement.qty > 0 && movement.kind !== "Apartado" && movement.kind !== "Liberación" ? "+" : ""}
                            {movement.qty}
                          </span>
                          <span className="text-right text-slate-500">{movement.stockAfter ?? "—"}</span>
                        </div>
                      ))}
                      {productMovements.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-400">Sin movimientos.</p>}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">
                      Apartado y Liberación no cambian la existencia física: reservan o liberan material para pedidos.
                    </p>
                  </section>
                )}
              </div>
            </aside>
          </>
        );
      })()}

      {adjustKind && detail && (
        <AdjustModal
          product={detail}
          initialKind={adjustKind}
          onClose={() => setAdjustKind(null)}
          onConfirm={(input) => {
            onAdjust?.(detail.sku, input);
            setAdjustKind(null);
          }}
        />
      )}
    </>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-[10px] text-slate-400">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`form-label ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  money: isMoney = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  money?: boolean;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        {isMoney && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
        )}
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`form-input ${isMoney ? "pl-7" : ""}`}
        />
      </div>
    </Field>
  );
}

function AdjustModal({
  product,
  initialKind,
  onClose,
  onConfirm,
}: {
  product: InventoryProduct;
  initialKind: AdjustInput["kind"];
  onClose: () => void;
  onConfirm: (input: AdjustInput) => void;
}) {
  const [kind, setKind] = useState<AdjustInput["kind"]>(initialKind);
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState(String(product.cost));
  const [supplier, setSupplier] = useState(product.supplier);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const value = Number(qty);
  const difference = kind === "Conteo" && qty !== "" ? value - product.stock : 0;
  const valid =
    qty !== "" &&
    value >= 0 &&
    (kind === "Entrada" ? value > 0 && Number(unitCost) >= 0 && reference.trim() : kind === "Merma" ? value > 0 && value <= product.stock && note.trim() : note.trim());
  const newCost =
    kind === "Entrada" && value > 0
      ? (product.stock * product.cost + value * Number(unitCost || 0)) / (product.stock + value)
      : product.cost;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#102521]/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="eyebrow">Movimiento de inventario</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug">{product.name}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {product.sku} · existencia actual {product.stock} {product.saleUnit}
            </p>
          </div>
          <button className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-3 gap-2">
            {([
              ["Entrada", "Entrada por compra"],
              ["Conteo", "Conteo físico"],
              ["Merma", "Merma / daño"],
            ] as [AdjustInput["kind"], string][]).map(([item, label]) => (
              <button
                key={item}
                onClick={() => {
                  setKind(item);
                  setQty("");
                }}
                className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold ${
                  kind === item ? "border-[#2f7468] bg-[#edf4f2] text-[#2f7468]" : "border-slate-200 text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="form-label">
            {kind === "Entrada" ? "Cantidad recibida *" : kind === "Conteo" ? "Cantidad contada físicamente *" : "Cantidad dañada o perdida *"}
            <div className="relative">
              <input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="form-input pr-16 text-base font-semibold" autoFocus />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{product.saleUnit}</span>
            </div>
          </label>
          {kind === "Entrada" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="form-label">
                  Costo unitario
                  <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="form-input" />
                </label>
                <label className="form-label">
                  Factura / remisión *
                  <input value={reference} onChange={(e) => setReference(e.target.value)} className="form-input" placeholder="Ej. F-20931" />
                </label>
              </div>
              <label className="form-label">
                Proveedor
                <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="form-input" />
              </label>
            </>
          )}
          {kind !== "Entrada" && (
            <label className="form-label">
              Motivo *
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-input"
                placeholder={kind === "Conteo" ? "Ej. Inventario cíclico pasillo A" : "Ej. Tramos quebrados en maniobra"}
              />
            </label>
          )}
          <div className="rounded-xl bg-[#f6f8f7] p-3 text-xs">
            {kind === "Entrada" && (
              <p className="flex justify-between">
                <span className="text-slate-500">Nueva existencia · costo promedio</span>
                <strong>
                  {product.stock + (value || 0)} · {money(newCost)}
                </strong>
              </p>
            )}
            {kind === "Conteo" && (
              <p className="flex justify-between">
                <span className="text-slate-500">Diferencia contra sistema</span>
                <strong className={difference < 0 ? "text-[#c9664f]" : difference > 0 ? "text-[#347652]" : ""}>
                  {qty === "" ? "—" : `${difference > 0 ? "+" : ""}${difference} ${product.saleUnit}`}
                </strong>
              </p>
            )}
            {kind === "Merma" && (
              <p className="flex justify-between">
                <span className="text-slate-500">Nueva existencia · pérdida a costo</span>
                <strong>
                  {Math.max(0, product.stock - (value || 0))} · {money((value || 0) * product.cost)}
                </strong>
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-[#fafcfb] p-5">
          <button className="secondary-button bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!valid}
            onClick={() =>
              onConfirm(
                kind === "Entrada"
                  ? { kind, qty: value, unitCost: Number(unitCost), supplier, reference: reference.trim() }
                  : kind === "Conteo"
                    ? { kind, counted: value, note: note.trim() }
                    : { kind, qty: value, note: note.trim() },
              )
            }
          >
            <Check size={15} /> Registrar
          </button>
        </div>
      </div>
    </div>
  );
}
