import { Printer, X } from "lucide-react";
import { policies } from "./config";
import CompanyLogo from "./CompanyLogo";
import { amountInWords, company } from "./QuoteDocument";
import type { Customer } from "./CustomersModule";
import { money, type SaleReturn } from "./ReturnsModule";

export default function ReturnPrintView({
  ret,
  customer,
  onClose,
}: {
  ret: SaleReturn;
  customer?: Customer;
  onClose: () => void;
}) {
  const tax = ret.total - ret.total / 1.16;
  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Nota de devolución {ret.id}</p>
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
              <p className="text-[20px] font-bold tracking-[0.14em] text-[#2f7468]">NOTA DE DEVOLUCIÓN</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  {[
                    ["Folio", ret.id],
                    ["Fecha", `${ret.date} · ${ret.time} h`],
                    ["Venta de origen", ret.saleId],
                    ["Atendió", ret.user],
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
              <p className="mt-1.5 text-[12px] font-bold">{ret.client}</p>
              {customer && (
                <div className="mt-1 space-y-0.5 text-slate-500">
                  <p>RFC: {customer.rfc || "—"}</p>
                  <p>Tel. {customer.phone}</p>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Detalle</p>
              <dl className="mt-1.5 space-y-1">
                {[
                  ["Motivo", ret.reason],
                  ["Reembolso", ret.refundAmount > 0 ? `${ret.refundMethod} · ${money(ret.refundAmount)}` : "—"],
                  ["Aplicado a saldo por cobrar", ret.appliedToBalance > 0 ? money(ret.appliedToBalance) : "—"],
                  ["Autorizó", ret.authorizedBy ? `${ret.authorizedBy} (${ret.authReason})` : "No requirió"],
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
                <th className="px-2.5 py-2">Código</th>
                <th className="px-2.5 py-2">Descripción</th>
                <th className="px-2.5 py-2 text-center">Cant.</th>
                <th className="px-2.5 py-2">Estado</th>
                <th className="px-2.5 py-2 text-right">P. pagado</th>
                <th className="rounded-r-md px-2.5 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {ret.lines.map((line, index) => (
                <tr key={line.sku} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                  <td className="px-2.5 py-2 text-center text-slate-500">{index + 1}</td>
                  <td className="px-2.5 py-2 font-mono text-[9px] text-slate-600">{line.sku}</td>
                  <td className="px-2.5 py-2 font-medium">{line.name}</td>
                  <td className="px-2.5 py-2 text-center font-semibold">
                    {line.quantity} {line.unit}
                  </td>
                  <td className={`px-2.5 py-2 ${line.condition === "Dañado" ? "text-[#c9664f]" : "text-slate-600"}`}>{line.condition}</td>
                  <td className="px-2.5 py-2 text-right">{money(line.unitPrice)}</td>
                  <td className="px-2.5 py-2 text-right font-semibold">{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 grid grid-cols-[1fr_230px] items-start gap-5">
            <div className="rounded-lg bg-[#f6f8f7] p-3 text-[9.5px]">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Importe con letra</p>
              <p className="mt-1 font-semibold leading-relaxed">({amountInWords(ret.total)})</p>
              {ret.notes && (
                <p className="mt-2 text-slate-600">
                  <strong>Observaciones:</strong> {ret.notes}
                </p>
              )}
            </div>
            <table className="w-full text-[10.5px]">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-500">Subtotal</td>
                  <td className="py-1 text-right">{money(ret.total - tax)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-500">IVA 16%</td>
                  <td className="py-1 text-right">{money(tax)}</td>
                </tr>
                <tr className="bg-[#fff0eb] text-[13px] font-bold text-[#c9664f]">
                  <td className="rounded-l-md px-2 py-2">Total devuelto</td>
                  <td className="rounded-r-md px-2 py-2 text-right">{money(ret.total)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-6 text-[9px] leading-relaxed text-slate-600">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Política de devoluciones</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>Se aceptan devoluciones dentro de los {policies.returnDays} días posteriores a la compra presentando la nota de venta.</li>
              <li>No se aceptan materiales cortados, instalados o pedidos especiales.</li>
              <li>El reembolso se realiza por el mismo medio de pago o como saldo a favor para compras futuras.</li>
              <li>Este documento no es un comprobante fiscal. Si la venta fue facturada se emitirá la nota de crédito correspondiente.</li>
            </ol>
          </section>

          <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{ret.user}</p>
              <p className="text-slate-500">Recibió · {company.commercialName}</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{ret.client}</p>
              <p className="text-slate-500">Cliente · nombre y firma de conformidad</p>
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
