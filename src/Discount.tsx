import { useState } from "react";
import { BadgePercent, X } from "lucide-react";

/** Descuento por porcentaje o por cantidad fija (en pesos, IVA incluido) */
export type Discount = { type: "%" | "$"; value: number };

const round = (value: number) => Math.round(value * 100) / 100;

/** Importe a descontar sobre una base; nunca negativo ni mayor que la base */
export const discountAmount = (base: number, discount?: Discount) => {
  if (!discount || !discount.value || base <= 0) return 0;
  const raw = discount.type === "%" ? (base * Math.min(100, discount.value)) / 100 : discount.value;
  return round(Math.max(0, Math.min(base, raw)));
};

export const discountLabel = (discount?: Discount) =>
  !discount || !discount.value
    ? ""
    : discount.type === "%"
      ? `${discount.value}%`
      : discount.value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/** Línea con descuento parcial: devuelve importe bruto, descuento y neto */
export const lineTotals = (unitPrice: number, quantity: number, discount?: Discount) => {
  const gross = round(unitPrice * quantity);
  const amount = discountAmount(gross, discount);
  return { gross, discount: amount, net: round(gross - amount) };
};

/** Totales de un documento: descuentos por partida + descuento global (precios con IVA incluido) */
export const documentTotals = (
  lines: { gross: number; discount: number; net: number }[],
  global?: Discount,
) => {
  const gross = round(lines.reduce((sum, line) => sum + line.gross, 0));
  const lineDiscounts = round(lines.reduce((sum, line) => sum + line.discount, 0));
  const afterLines = round(gross - lineDiscounts);
  const globalDiscount = discountAmount(afterLines, global);
  const total = round(afterLines - globalDiscount);
  const tax = round(total - total / 1.16);
  return { gross, lineDiscounts, afterLines, globalDiscount, totalDiscount: round(lineDiscounts + globalDiscount), total, tax, subtotal: round(total - tax) };
};

const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/**
 * Control compacto de descuento: botón que se despliega en un selector % / $ y un campo.
 * `base` es el importe sobre el que se aplica (para mostrar cuánto se descuenta y limitar el valor).
 */
export function DiscountControl({
  value,
  base,
  onChange,
  label = "Descuento",
  compact = false,
  maxPercent = 100,
}: {
  /** Tope de descuento del rol del usuario (0 = no puede dar descuentos) */
  maxPercent?: number;
  value?: Discount;
  base: number;
  onChange: (discount?: Discount) => void;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(value?.value));
  if (maxPercent <= 0) return null;
  const type = value?.type ?? "%";
  const amount = discountAmount(base, value);

  if (!open) {
    return (
      <button
        type="button"
        className="flex items-center gap-1 text-[10px] font-semibold text-[#2f7468] hover:underline"
        onClick={() => setOpen(true)}
      >
        <BadgePercent size={compact ? 11 : 13} /> {compact ? "Descuento" : `Agregar ${label.toLowerCase()}`}
      </button>
    );
  }

  const setValue = (raw: string, nextType = type) => {
    const number = Math.max(0, Number(raw) || 0);
    const limited = nextType === "%" ? Math.min(maxPercent, number) : Math.min((base * maxPercent) / 100, number);
    onChange(raw === "" ? { type: nextType, value: 0 } : { type: nextType, value: limited });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!compact && <span className="text-[10px] font-semibold text-slate-500">{label}</span>}
      <div className="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
        {(["%", "$"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setValue(String(value?.value ?? ""), item)}
            className={`rounded-md px-2 py-1 ${type === item ? "bg-white text-[#285e56] shadow-sm" : "text-slate-400"}`}
            aria-label={item === "%" ? "Descuento por porcentaje" : "Descuento por cantidad"}
          >
            {item}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={0}
        step={type === "%" ? 1 : 0.01}
        max={type === "%" ? 100 : base}
        value={value?.value ? String(value.value) : ""}
        onChange={(e) => setValue(e.target.value)}
        placeholder={type === "%" ? "0 %" : "$0.00"}
        className={`h-7 rounded-lg border border-slate-200 bg-white px-2 text-right text-xs font-semibold outline-none focus:border-[#2f7468] ${compact ? "w-16" : "w-20"}`}
        aria-label={label}
      />
      {amount > 0 && <span className="text-[10px] font-semibold text-[#c9664f]">−{money(amount)}</span>}
      {maxPercent < 100 && <span className="text-[9px] text-slate-400">máx {maxPercent} %</span>}
      <button
        type="button"
        className="grid size-6 place-items-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-[#c9664f]"
        onClick={() => {
          onChange(undefined);
          setOpen(false);
        }}
        aria-label="Quitar descuento"
      >
        <X size={12} />
      </button>
    </div>
  );
}
