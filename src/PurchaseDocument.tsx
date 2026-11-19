import { Printer, X } from "lucide-react";
import { amountInWords, company, longDate } from "./QuoteDocument";
import type { PurchaseOrder, Supplier } from "./PurchasesModule";

const money = (value: number) => value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function PurchasePrintView({
  po,
  supplier,
  onClose,
}: {
  po: PurchaseOrder;
  supplier?: Supplier;
  onClose: () => void;
}) {
  const subtotal = po.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const showReceived = po.lines.some((l) => l.received !== undefined);

  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Orden de compra {po.id}</p>
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
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#183b36] text-lg font-black text-[#b8f34a]">99</span>
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
              <p className="text-[20px] font-bold tracking-[0.16em] text-[#2f7468]">ORDEN DE COMPRA</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  {[
                    ["Folio", po.id],
                    ["Fecha", longDate(po.dateISO)],
                    ["Fecha requerida", longDate(po.requiredISO)],
                    ["Estado", po.status],
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
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Proveedor</p>
              <p className="mt-1.5 text-[12px] font-bold">{po.supplierName}</p>
              {supplier && (
                <div className="mt-1 space-y-0.5 text-slate-500">
                  <p>At'n: {supplier.contact}</p>
                  <p>RFC: {supplier.rfc || "—"}</p>
                  <p>
                    {supplier.address}
                    {supplier.city ? `, ${supplier.city}` : ""}
                  </p>
                  <p>
                    Tel. {supplier.phone}
                    {supplier.email ? ` · ${supplier.email}` : ""}
                  </p>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Entregar en</p>
              <p className="mt-1.5 text-[12px] font-bold">Almacén {company.commercialName}</p>
              <p className="mt-1 text-slate-500">{company.address}</p>
              <dl className="mt-2 space-y-1">
                {[
                  ["Condiciones de pago", supplier?.creditDays ? `Crédito a ${supplier.creditDays} días` : "Contado"],
                  ["Horario de recepción", "Lun a sáb · 8:00 a 15:00"],
                  ["Moneda", "Pesos mexicanos (MXN)"],
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
                {showReceived && <th className="px-2.5 py-2 text-center">Recibido</th>}
                <th className="px-2.5 py-2">Unidad</th>
                <th className="px-2.5 py-2 text-right">Costo unit.</th>
                <th className="rounded-r-md px-2.5 py-2 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l, index) => (
                <tr key={l.sku} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                  <td className="px-2.5 py-2 text-center text-slate-500">{index + 1}</td>
                  <td className="px-2.5 py-2 font-mono text-[9px] text-slate-600">{l.sku}</td>
                  <td className="px-2.5 py-2 font-medium">{l.name}</td>
                  <td className="px-2.5 py-2 text-center font-semibold">{l.quantity}</td>
                  {showReceived && <td className="px-2.5 py-2 text-center font-semibold">{l.received ?? 0}</td>}
                  <td className="px-2.5 py-2 text-slate-600">{l.unit}</td>
                  <td className="px-2.5 py-2 text-right">{money(l.unitCost)}</td>
                  <td className="px-2.5 py-2 text-right font-semibold">{money(l.quantity * l.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 grid grid-cols-[1fr_230px] items-start gap-5">
            <div className="rounded-lg bg-[#f6f8f7] p-3 text-[9.5px]">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Importe con letra</p>
              <p className="mt-1 font-semibold leading-relaxed">({amountInWords(total)})</p>
              {po.notes && (
                <p className="mt-2 text-slate-600">
                  <strong>Notas:</strong> {po.notes}
                </p>
              )}
            </div>
            <table className="w-full text-[10.5px]">
              <tbody>
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
          </section>

          <section className="mt-6 text-[9px] leading-relaxed text-slate-600">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Condiciones de la compra</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>Favor de indicar el folio {po.id} en la factura, la remisión y el empaque.</li>
              <li>La mercancía se recibe contra esta orden; las cantidades o productos no solicitados podrán rechazarse.</li>
              <li>Facturar a nombre de {company.legalName}, RFC {company.rfc}.</li>
              <li>Notificar cualquier cambio de precio o fecha de entrega antes de surtir.</li>
            </ol>
          </section>

          <section className="mt-auto grid grid-cols-3 gap-10 pt-12 text-center text-[9.5px]">
            {[
              [po.createdBy, "Elaboró"],
              [po.approvedBy || "", "Autorizó"],
              ["", `Recibió · ${po.supplierName}`],
            ].map(([name, role]) => (
              <div key={role} className="border-t border-slate-400 pt-1.5">
                <p className="min-h-[14px] font-semibold">{name}</p>
                <p className="text-slate-500">{role}</p>
              </div>
            ))}
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
