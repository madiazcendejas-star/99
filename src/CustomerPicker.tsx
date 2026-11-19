import { useEffect, useMemo, useRef, useState } from "react";
import { Check, UserPlus, UserRound, Wallet, X } from "lucide-react";
import type { Customer } from "./CustomersModule";

const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Buscador de clientes: al escribir muestra las coincidencias (nombre, contacto, teléfono o RFC).
 * Flechas ↑ ↓ para moverse, Enter para elegir, Esc para cerrar.
 */
export default function CustomerPicker({
  value,
  onChange,
  customers,
  placeholder = "Buscar cliente por nombre, teléfono o RFC",
  allowGeneral = false,
  allowFreeText = true,
  compact = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (name: string) => void;
  customers: Customer[];
  placeholder?: string;
  allowGeneral?: boolean;
  allowFreeText?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value === "Público general" ? "" : value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);
  const selected = customers.find((c) => c.businessName === value);
  // Si el valor cambia desde fuera (p. ej. al terminar una venta) se refleja en el campo
  useEffect(() => {
    const next = value === "Público general" ? "" : value;
    setText((current) => (current === next ? current : next));
  }, [value]);

  const matches = useMemo(() => {
    const q = normalize(text.trim());
    const list = q
      ? customers.filter((c) => normalize(`${c.businessName} ${c.contactName} ${c.phone} ${c.rfc}`).includes(q))
      : [...customers].sort((a, b) => (b.creditBalance ?? 0) - (a.creditBalance ?? 0) || a.businessName.localeCompare(b.businessName));
    return list.slice(0, 7);
  }, [customers, text]);
  const exact = customers.some((c) => normalize(c.businessName) === normalize(text.trim()));
  const options: { kind: "customer" | "general" | "free"; customer?: Customer }[] = [
    ...(allowGeneral && !text.trim() ? [{ kind: "general" as const }] : []),
    ...matches.map((customer) => ({ kind: "customer" as const, customer })),
    ...(allowFreeText && text.trim() && !exact ? [{ kind: "free" as const }] : []),
  ];

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    const name = option.kind === "general" ? "Público general" : option.kind === "free" ? text.trim() : option.customer!.businessName;
    onChange(name);
    setText(name === "Público general" ? "" : name);
    setOpen(false);
  };

  const highlight = (label: string) => {
    const q = text.trim();
    if (!q) return label;
    const index = normalize(label).indexOf(normalize(q));
    if (index < 0) return label;
    return (
      <>
        {label.slice(0, index)}
        <mark className="rounded bg-[#e6f6c8] px-0.5 text-inherit">{label.slice(index, index + q.length)}</mark>
        {label.slice(index + q.length)}
      </>
    );
  };

  return (
    <div className="relative">
      <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
      <input
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
          if (!e.target.value.trim()) onChange(allowGeneral ? "Público general" : "");
          else if (allowFreeText) onChange(e.target.value);
        }}
        onFocus={() => {
          window.clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => (blurTimer.current = window.setTimeout(() => setOpen(false), 150))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(options.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            choose(active);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={`w-full rounded-xl border border-slate-200 pl-9 pr-8 text-xs outline-none focus:border-[#2f7468] ${compact ? "h-10 bg-slate-50" : "form-input"}`}
        placeholder={allowGeneral ? "Público general · escribe para buscar cliente" : placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label="Cliente"
      />
      {text && (
        <button
          type="button"
          className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-500"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setText("");
            onChange(allowGeneral ? "Público general" : "");
            setOpen(true);
          }}
          aria-label="Borrar cliente"
        >
          <X size={12} />
        </button>
      )}
      {open && options.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="listbox">
          {!text.trim() && <p className="border-b border-slate-100 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">Escribe para buscar · ↑ ↓ y Enter</p>}
          {options.map((option, index) => (
            <button
              key={option.kind === "customer" ? option.customer!.id : option.kind}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs ${index === active ? "bg-[#f2f8f6]" : ""}`}
            >
              {option.kind === "customer" ? (
                <>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#edf4f2] text-[10px] font-bold text-[#2f7468]">
                    {option.customer!.businessName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{highlight(option.customer!.businessName)}</span>
                    <span className="block truncate text-[10px] text-slate-400">
                      {option.customer!.type} · {highlight(option.customer!.phone)}
                      {option.customer!.contactName && option.customer!.contactName !== option.customer!.businessName ? ` · ${option.customer!.contactName}` : ""}
                    </span>
                  </span>
                  {(option.customer!.creditBalance ?? 0) > 0 && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-[#eaf6ef] px-1.5 py-0.5 text-[9px] font-semibold text-[#347652]">
                      <Wallet size={10} /> {money(option.customer!.creditBalance ?? 0)}
                    </span>
                  )}
                  {selected?.id === option.customer!.id && <Check size={13} className="shrink-0 text-[#2f7468]" />}
                </>
              ) : option.kind === "general" ? (
                <>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                    <UserRound size={13} />
                  </span>
                  <span className="flex-1 font-semibold text-slate-600">Público general</span>
                </>
              ) : (
                <>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#fff6df] text-[#9a6b18]">
                    <UserPlus size={13} />
                  </span>
                  <span className="flex-1">
                    Usar <strong>"{text.trim()}"</strong> <span className="text-slate-400">(no registrado)</span>
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
