import { Printer, X } from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import type { Customer } from "./CustomersModule";
import type { Sale } from "./SalesModule";
import { amountInWords, company } from "./QuoteDocument";

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export type ReceivedPayment = { label: string; method: string; amount: number; when: string };

export default function SalePrintView({
  sale,
  customer,
  received,
  pending,
  deliveryLabel,
  onClose,
}: {
  sale: Sale;
  customer?: Customer;
  received: ReceivedPayment[];
  pending: number;
  deliveryLabel: string;
  onClose: () => void;
}) {
  const total = sale.amount;
  const tax = total - total / 1.16;
  const lines = sale.lines || [];
  const hasLineDiscounts = lines.some((line) => (line.discountAmount ?? 0) > 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + (line.discountAmount ?? 0), 0);
  const globalDiscount = sale.discountAmount ?? 0;
  const grossAmount = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const statusColor =
    sale.status === "Pagada" ? "text-[#347652]" : sale.status === "Cancelada" ? "text-[#c9664f]" : "text-[#9a6b18]";

  return (
    <div className="print-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Venta {sale.id}</p>
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
        <article className="print-sheet relative mx-auto flex flex-col overflow-hidden bg-white px-[0.6in] py-[0.55in] text-[#162523] shadow-2xl">
          {sale.status === "Cancelada" && (
            <span className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -rotate-[24deg] rounded-xl border-4 border-[#e5785f]/40 px-8 py-2 text-[54px] font-black tracking-[0.2em] text-[#e5785f]/25">
              CANCELADA
            </span>
          )}
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
              <p className="text-[20px] font-bold tracking-[0.16em] text-[#2f7468]">NOTA DE VENTA</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  {[
                    ["Folio", sale.id],
                    ["Fecha", `${sale.date} · ${sale.time} h`],
                    ["Tipo", sale.type === "Pedido" ? "Pedido" : "Mostrador"],
                    ["Vendedor", sale.seller],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="pr-3 text-right text-slate-500">{label}</td>
                      <td className="text-right font-semibold">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </header>

          <div className="mt-5 h-[3px] rounded-full bg-[#2f7468]" />

          <section className="mt-5 grid grid-cols-[1.4fr_1fr] gap-4 text-[10px]">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Cliente</p>
              <p className="mt-1.5 text-[12px] font-bold">{sale.client}</p>
              {customer ? (
                <div className="mt-1 space-y-0.5 text-slate-500">
                  <p>
                    {customer.contactName} · RFC {customer.rfc || "—"}
                  </p>
                  <p>
                    {customer.address}
                    {customer.city ? `, ${customer.city}` : ""}
                  </p>
                  <p>
                    Tel. {customer.phone}
                    {customer.email ? ` · ${customer.email}` : ""}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-slate-500">Venta al público en general</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Estado</p>
              <dl className="mt-1.5 space-y-1">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Pago</dt>
                  <dd className={`text-right font-bold ${statusColor}`}>{sale.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Forma de pago</dt>
                  <dd className="text-right font-semibold">
                    {sale.payments ? sale.payments.map((p) => p.method).join(" + ") : sale.payment}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Entrega</dt>
                  <dd className="text-right font-semibold">{deliveryLabel}</dd>
                </div>
                {(sale.quoteId || sale.orderId) && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Referencias</dt>
                    <dd className="text-right font-semibold">
                      {[sale.quoteId && `Cot. ${sale.quoteId}`, sale.orderId && `Orden ${sale.orderId}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

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
              {lines.map((line, index) => (
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
              ))}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 grid grid-cols-[1fr_230px] items-start gap-5">
            <div className="space-y-3">
              <div className="rounded-lg bg-[#f6f8f7] p-3 text-[9.5px]">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Importe con letra</p>
                <p className="mt-1 font-semibold leading-relaxed">({amountInWords(total)})</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 text-[9.5px]">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Pagos recibidos</p>
                {received.length ? (
                  <table className="mt-1.5 w-full">
                    <tbody>
                      {received.map((item, index) => (
                        <tr key={index}>
                          <td className="py-0.5">{item.label}</td>
                          <td className="py-0.5 text-slate-500">{item.method}</td>
                          <td className="py-0.5 text-[8.5px] text-slate-400">{item.when}</td>
                          <td className="py-0.5 text-right font-semibold">{money(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-1 text-slate-500">Sin pagos registrados.</p>
                )}
              </div>
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
                        <td className="py-1">Descuento global{sale.discount?.type === "%" ? ` (${sale.discount.value}%)` : ""}</td>
                        <td className="py-1 text-right">−{money(globalDiscount)}</td>
                      </tr>
                    )}
                  </>
                )}
                <tr>
                  <td className="py-1 text-slate-500">Subtotal</td>
                  <td className="py-1 text-right">{money(total - tax)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-500">IVA 16%</td>
                  <td className="py-1 text-right">{money(tax)}</td>
                </tr>
                <tr className="bg-[#edf4f2] text-[13px] font-bold text-[#183b36]">
                  <td className="rounded-l-md px-2 py-2">Total</td>
                  <td className="rounded-r-md px-2 py-2 text-right">{money(total)}</td>
                </tr>
                <tr>
                  <td className="pt-2 text-slate-500">Pagado</td>
                  <td className="pt-2 text-right">{money(received.reduce((sum, item) => sum + item.amount, 0))}</td>
                </tr>
                <tr className="font-bold">
                  <td className="py-1">Saldo pendiente</td>
                  <td className={`py-1 text-right ${pending > 0 ? "text-[#c9664f]" : ""}`}>{money(pending)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 rounded-md border border-[#cfe3dd] bg-[#f2f8f6] px-2.5 py-2 text-[8.5px] leading-snug text-[#285e56]">
              <strong>Todos nuestros precios incluyen IVA.</strong> El desglose de subtotal e IVA se muestra únicamente
              con fines fiscales; no se cobra IVA adicional al total.
            </p>
            </div>
          </section>

          <p className="mt-5 text-[8.5px] leading-relaxed text-slate-500">
            Este documento es una nota de venta y no constituye un comprobante fiscal digital (CFDI). Si requiere
            factura, solicítela con su folio {sale.id} dentro del mes de la compra. Revise su material al recibirlo: no
            se aceptan devoluciones de material cortado o instalado.
          </p>

          <section className="mt-auto grid grid-cols-2 gap-14 pt-10 text-center text-[9.5px]">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{sale.seller}</p>
              <p className="text-slate-500">Atendió · {company.commercialName}</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">Recibí de conformidad</p>
              <p className="text-slate-500">Nombre, firma y fecha</p>
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
