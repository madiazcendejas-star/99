import { Printer, X } from "lucide-react";
import { policies } from "./config";
import CompanyLogo from "./CompanyLogo";
import { amountInWords, company } from "./QuoteDocument";
import { balanceOf, displayDate, money, type SpecialOrder } from "./SpecialOrdersModule";

export default function SpecialOrderPrintView({ order, onClose }: { order: SpecialOrder; onClose: () => void }) {
  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Recibo de anticipo {order.id}</p>
          <p className="text-[10px] text-white/50">Tamaño carta (8.5 × 11 in) · listo para imprimir o guardar como PDF</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-semibold text-white/80 hover:bg-white/10" onClick={onClose}>
            <X size={15} /> Cerrar
          </button>
          <button className="flex min-h-10 items-center gap-2 rounded-xl bg-[#b8f34a] px-4 text-xs font-semibold text-[#183b36] hover:bg-[#c6f76a]" onClick={() => window.print()}>
            <Printer size={15} /> Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <div className="py-8">
        <article className="print-sheet mx-auto flex flex-col bg-white px-[0.6in] py-[0.55in] text-[#162523] shadow-2xl">
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
              <p className="text-[20px] font-bold tracking-[0.14em] text-[#2f7468]">PEDIDO ESPECIAL</p>
              <p className="text-[10px] font-semibold text-slate-500">Recibo de anticipo</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  {[
                    ["Folio", order.id],
                    ["Fecha", order.createdAt],
                    ["Fecha promesa", displayDate(order.promiseISO)],
                    ["Atendió", order.createdBy],
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

          <section className="mt-5 grid grid-cols-2 gap-4 text-[10px]">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Cliente</p>
              <p className="mt-1.5 text-[12px] font-bold">{order.client}</p>
              <p className="mt-0.5 text-slate-500">Tel. {order.phone}</p>
              {order.notes && <p className="mt-1 text-slate-500">{order.notes}</p>}
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Pago</p>
              <dl className="mt-1.5 space-y-1">
                {[
                  ["Total del pedido", money(order.total)],
                  [`Anticipo (${order.depositMethod.toLowerCase()})`, money(order.deposit)],
                  ["Saldo al recoger", money(balanceOf(order))],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <table className="mt-5 w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[8.5px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2.5 py-2 text-center">#</th>
                <th className="px-2.5 py-2">Descripción</th>
                <th className="px-2.5 py-2">Especificación</th>
                <th className="px-2.5 py-2 text-center">Cant.</th>
                <th className="px-2.5 py-2 text-right">P. unitario</th>
                <th className="rounded-r-md px-2.5 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item.sku} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                  <td className="px-2.5 py-2 text-center text-slate-500">{index + 1}</td>
                  <td className="px-2.5 py-2 font-medium">{item.name}</td>
                  <td className="px-2.5 py-2 text-slate-600">{item.inCatalog ? item.sku : item.spec || "—"}</td>
                  <td className="px-2.5 py-2 text-center font-semibold">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-2.5 py-2 text-right">{money(item.unitPrice)}</td>
                  <td className="px-2.5 py-2 text-right font-semibold">{money(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 grid grid-cols-[1fr_230px] items-start gap-5">
            <div className="rounded-lg bg-[#f6f8f7] p-3 text-[9.5px]">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Anticipo recibido con letra</p>
              <p className="mt-1 font-semibold leading-relaxed">({amountInWords(order.deposit)})</p>
            </div>
            <table className="w-full text-[10.5px]">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-500">Total del pedido</td>
                  <td className="py-1 text-right">{money(order.total)}</td>
                </tr>
                <tr className="text-[#347652]">
                  <td className="py-1">Anticipo</td>
                  <td className="py-1 text-right">−{money(order.deposit)}</td>
                </tr>
                <tr className="bg-[#edf4f2] text-[13px] font-bold text-[#183b36]">
                  <td className="rounded-l-md px-2 py-2">Saldo pendiente</td>
                  <td className="rounded-r-md px-2 py-2 text-right">{money(balanceOf(order))}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-6 rounded-lg border border-[#f0d9a3] bg-[#fffaf0] p-3.5 text-[9px] leading-relaxed text-[#6f5418]">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em]">Condiciones del pedido especial</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>El anticipo mínimo es del {policies.specialDepositPct} % del total y <strong>no es reembolsable</strong> si el cliente cancela el pedido.</li>
              <li>La fecha promesa depende del proveedor; le avisaremos por teléfono o WhatsApp cuando su pedido llegue.</li>
              <li>A partir del aviso, el cliente cuenta con {policies.specialPickupDays} días naturales para recoger y liquidar el saldo.</li>
              <li>Los productos de pedido especial no admiten cambios ni devoluciones.</li>
              <li>Todos nuestros precios incluyen IVA.</li>
            </ol>
          </section>

          <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{order.createdBy}</p>
              <p className="text-slate-500">Recibió el anticipo · {company.commercialName}</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{order.client}</p>
              <p className="text-slate-500">Cliente · acepto las condiciones</p>
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
