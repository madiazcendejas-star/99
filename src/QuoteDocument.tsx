import { Printer, X } from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import type { Customer } from "./CustomersModule";
import type { QuoteLine } from "./QuoteBuilder";
import type { Discount } from "./Discount";

export type PrintableQuote = {
  id: string;
  client: string;
  contact: string;
  amount: number;
  date: string;
  expiresAt: string;
  owner: string;
  priceList?: string;
  lines?: QuoteLine[];
  subtotal?: number;
  tax?: number;
  notes?: string;
  discount?: Discount;
  discountAmount?: number;
};

export { company } from "./config";
import { company, policies } from "./config";

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ---------- Importe con letra (pesos mexicanos) ----------
const UNITS = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const TEENS = [
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
];
const TENS = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const HUNDREDS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

const belowThousand = (n: number): string => {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const t = Math.floor(rest / 10);
  const u = rest % 10;
  let text = "";
  if (rest < 10) text = UNITS[rest];
  else if (rest < 20) text = TEENS[rest - 10];
  else if (rest === 20) text = "VEINTE";
  else if (rest < 30) text = `VEINTI${UNITS[u]}`;
  else text = u ? `${TENS[t]} Y ${UNITS[u]}` : TENS[t];
  return [HUNDREDS[h], text].filter(Boolean).join(" ");
};

export const amountInWords = (value: number) => {
  const integer = Math.floor(value);
  const cents = Math.round((value - integer) * 100);
  const millions = Math.floor(integer / 1_000_000);
  const thousands = Math.floor((integer % 1_000_000) / 1000);
  const rest = integer % 1000;
  const parts: string[] = [];
  if (millions) parts.push(millions === 1 ? "UN MILLÓN" : `${belowThousand(millions)} MILLONES`);
  if (thousands) parts.push(thousands === 1 ? "MIL" : `${belowThousand(thousands)} MIL`);
  if (rest) parts.push(belowThousand(rest));
  const words = parts.join(" ") || "CERO";
  const currency = integer === 1 ? "PESO" : millions && !thousands && !rest ? "DE PESOS" : "PESOS";
  return `${words} ${currency} ${String(cents).padStart(2, "0")}/100 M.N.`;
};

// ---------- Vista de impresión ----------
export default function QuotePrintView({
  quote,
  customer,
  onClose,
}: {
  quote: PrintableQuote;
  customer?: Customer;
  onClose: () => void;
}) {
  const total = quote.amount;
  const tax = quote.tax ?? total - total / 1.16;
  const subtotal = total - tax;
  const lines = quote.lines || [];
  const hasLineDiscounts = lines.some((line) => (line.discountAmount ?? 0) > 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + (line.discountAmount ?? 0), 0);
  const globalDiscount = quote.discountAmount ?? 0;
  const grossAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const creditTerms = customer
    ? customer.creditDays
      ? `Crédito a ${customer.creditDays} días`
      : "Contado"
    : "Contado";

  return (
    <div className="print-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Cotización {quote.id}</p>
          <p className="text-[10px] text-white/50">Tamaño carta (8.5 × 11 in) · listo para imprimir o guardar como PDF</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/80 hover:bg-white/10"
            onClick={onClose}
          >
            <X size={15} /> Cerrar
          </button>
          <button
            className="flex min-h-10 items-center gap-2 rounded-xl bg-[#b8f34a] px-4 text-xs font-semibold text-[#183b36] hover:bg-[#c6f76a]"
            onClick={() => window.print()}
          >
            <Printer size={15} /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="py-8">
        <article className="print-sheet mx-auto flex flex-col bg-white px-[0.6in] py-[0.55in] text-[#162523] shadow-2xl">
          {/* Encabezado */}
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <CompanyLogo className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#183b36] text-lg font-black text-[#b8f34a]" />
              <div>
                <p className="text-[18px] font-bold leading-tight">{company.commercialName}</p>
                <p className="mt-0.5 text-[9.5px] text-slate-500">{company.legalName}</p>
                <p className="text-[9.5px] text-slate-500">RFC {company.rfc}</p>
                <p className="text-[9.5px] text-slate-500">{company.address}</p>
                <p className="text-[9.5px] text-slate-500">
                  Tel. {company.phone} · {company.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-bold tracking-[0.2em] text-[#2f7468]">COTIZACIÓN</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  <tr>
                    <td className="pr-3 text-right text-slate-500">Folio</td>
                    <td className="text-right font-bold">{quote.id}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 text-right text-slate-500">Fecha</td>
                    <td className="text-right font-semibold">{quote.date}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 text-right text-slate-500">Válida hasta</td>
                    <td className="text-right font-semibold">{longDate(quote.expiresAt)}</td>
                  </tr>
                  <tr>
                    <td className="pr-3 text-right text-slate-500">Vendedor</td>
                    <td className="text-right font-semibold">{quote.owner}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </header>

          <div className="mt-5 h-[3px] rounded-full bg-[#2f7468]" />

          {/* Cliente y condiciones */}
          <section className="mt-5 grid grid-cols-[1.4fr_1fr] gap-4 text-[10px]">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">
                Cliente
              </p>
              <p className="mt-1.5 text-[12px] font-bold">{quote.client}</p>
              <p className="mt-0.5 text-slate-600">At'n: {quote.contact}</p>
              {customer && (
                <div className="mt-1.5 space-y-0.5 text-slate-500">
                  <p>RFC: {customer.rfc || "—"}</p>
                  <p>
                    {customer.address}
                    {customer.city ? `, ${customer.city}` : ""}
                  </p>
                  <p>
                    Tel. {customer.phone}
                    {customer.email ? ` · ${customer.email}` : ""}
                  </p>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">
                Condiciones comerciales
              </p>
              <dl className="mt-1.5 space-y-1">
                {[
                  ["Lista de precios", quote.priceList || customer?.type || "Mostrador"],
                  ["Condiciones de pago", creditTerms],
                  ["Moneda", "Pesos mexicanos (MXN)"],
                  ["Entrega", "Sujeta a disponibilidad"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* Partidas */}
          <table className="mt-5 w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[8.5px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2.5 py-2 text-center">#</th>
                <th className="px-2.5 py-2">Código</th>
                <th className="px-2.5 py-2">Descripción</th>
                <th className="px-2.5 py-2 text-center">Cant.</th>
                <th className="px-2.5 py-2">Unidad</th>
                <th className="px-2.5 py-2 text-right">P. unitario</th>
                {hasLineDiscounts && <th className="px-2.5 py-2 text-right">Desc.</th>}
                <th className="rounded-r-md px-2.5 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {lines.length ? (
                lines.map((line, index) => (
                  <tr key={line.sku} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                    <td className="px-2.5 py-2 text-center text-slate-500">{index + 1}</td>
                    <td className="px-2.5 py-2 font-mono text-[9px] text-slate-600">{line.sku}</td>
                    <td className="px-2.5 py-2 font-medium">
                    {line.name}
                    {line.components && (
                      <span className="mt-0.5 block text-[8px] font-normal leading-snug text-slate-500">
                        Incluye: {line.components.map((c) => `${c.quantity * line.quantity} ${c.unit} ${c.name}`).join(" · ")}
                      </span>
                    )}
                  </td>
                    <td className="px-2.5 py-2 text-center font-semibold">{line.quantity}</td>
                    <td className="px-2.5 py-2 text-slate-600">{line.unit}</td>
                    <td className="px-2.5 py-2 text-right">{money(line.unitPrice)}</td>
                  {hasLineDiscounts && (
                    <td className="px-2.5 py-2 text-right text-[#c9664f]">
                      {line.discountAmount ? `−${money(line.discountAmount)}` : "—"}
                      {line.discount?.type === "%" && <span className="block text-[8px] text-slate-400">{line.discount.value}%</span>}
                    </td>
                  )}
                    <td className="px-2.5 py-2 text-right font-semibold">{money(line.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-2.5 py-3 text-slate-500" colSpan={7}>
                    Partidas según cotización histórica.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          {/* Totales */}
          <section className="mt-4 grid grid-cols-[1fr_230px] items-start gap-5">
            <div className="rounded-lg bg-[#f6f8f7] p-3 text-[9.5px]">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Importe con letra
              </p>
              <p className="mt-1 font-semibold leading-relaxed">({amountInWords(total)})</p>
              {quote.notes && (
                <p className="mt-2 text-slate-600">
                  <strong>Referencia:</strong> {quote.notes}
                </p>
              )}
            </div>
            <div>
            <table className="w-full text-[10.5px]">
              <tbody>
                {(lineDiscounts > 0 || globalDiscount > 0) && (
                  <>
                    <tr>
                      <td className="py-1 text-slate-500">Importe</td>
                      <td className="py-1 text-right">{money(grossAmount)}</td>
                    </tr>
                    {lineDiscounts > 0 && (
                      <tr className="text-[#c9664f]">
                        <td className="py-1">Descuentos por partida</td>
                        <td className="py-1 text-right">−{money(lineDiscounts)}</td>
                      </tr>
                    )}
                    {globalDiscount > 0 && (
                      <tr className="text-[#c9664f]">
                        <td className="py-1">Descuento global{quote.discount?.type === "%" ? ` (${quote.discount.value}%)` : ""}</td>
                        <td className="py-1 text-right">−{money(globalDiscount)}</td>
                      </tr>
                    )}
                  </>
                )}
                <tr>
                  <td className="py-1 text-slate-500">Subtotal</td>
                  <td className="py-1 text-right">{money(subtotal)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-500">IVA 16%</td>
                  <td className="py-1 text-right">{money(tax)}</td>
                </tr>
                <tr className="bg-[#edf4f2] text-[13px] font-bold text-[#183b36]">
                  <td className="rounded-l-md px-2 py-2">Total</td>
                  <td className="rounded-r-md px-2 py-2 text-right">{money(total)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 rounded-md border border-[#cfe3dd] bg-[#f2f8f6] px-2.5 py-2 text-[8.5px] leading-snug text-[#285e56]">
              <strong>Todos nuestros precios incluyen IVA.</strong> El desglose de subtotal e IVA se muestra únicamente
              con fines fiscales; no se cobra IVA adicional al total.
            </p>
            </div>
          </section>

          {/* Términos */}
          <section className="mt-6 text-[9px] leading-relaxed text-slate-600">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">
              Términos y condiciones
            </p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>Precios expresados en pesos mexicanos e incluyen IVA.</li>
              <li>
                Cotización válida hasta el {longDate(quote.expiresAt)}. Precios sujetos a cambio
                sin previo aviso después de esa fecha.
              </li>
              <li>Existencias sujetas a disponibilidad al momento de confirmar el pedido.</li>
              <li>
                Para confirmar, firme esta cotización o responda por escrito indicando el folio{" "}
                {quote.id}.
              </li>
            </ol>
          </section>

          {/* Firmas */}
          <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
            <div>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-semibold">{quote.owner}</p>
                <p className="text-slate-500">Ejecutivo de ventas · {company.commercialName}</p>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-semibold">Aceptación del cliente</p>
                <p className="text-slate-500">Nombre, firma y fecha</p>
              </div>
            </div>
          </section>

          <footer className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
            <span>
              {company.legalName} · {company.phone} · {company.email}
            </span>
            <span>Generado con 99 ERP · Página 1 de 1</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
