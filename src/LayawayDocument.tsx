import { Printer, X } from "lucide-react";
import { amountInWords, company } from "./QuoteDocument";
import { EXTENSION_DAYS, LAYAWAY_DAYS, balanceOf, displayDate, money, paidOf, type Layaway, type WalletMovement } from "./LayawayModule";

function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · {subtitle}</p>
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
              <p className="text-[20px] font-bold tracking-[0.14em] text-[#2f7468]">{title}</p>
            </div>
          </header>
          <div className="mt-5 h-[3px] rounded-full bg-[#2f7468]" />
          {children}
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

export function LayawayPrintView({ layaway, onClose }: { layaway: Layaway; onClose: () => void }) {
  const paid = paidOf(layaway);
  return (
    <Sheet title="APARTADO" subtitle={`Comprobante de apartado ${layaway.id}`} onClose={onClose}>
      <section className="mt-5 grid grid-cols-2 gap-4 text-[10px]">
        <div className="rounded-lg border border-slate-200 p-3.5">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Cliente</p>
          <p className="mt-1.5 text-[12px] font-bold">{layaway.client}</p>
          <p className="mt-0.5 text-slate-500">Tel. {layaway.phone}</p>
          {layaway.notes && <p className="mt-1 text-slate-500">{layaway.notes}</p>}
        </div>
        <div className="rounded-lg border border-slate-200 p-3.5">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Apartado</p>
          <dl className="mt-1.5 space-y-1">
            {[
              ["Folio", layaway.id],
              ["Fecha", layaway.createdAt],
              ["Liquidar antes del", displayDate(layaway.dueISO)],
              ["Estado", layaway.status],
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
            <th className="rounded-l-md px-2.5 py-2">Código</th>
            <th className="px-2.5 py-2">Descripción</th>
            <th className="px-2.5 py-2 text-center">Cant.</th>
            <th className="px-2.5 py-2 text-right">P. unitario</th>
            <th className="rounded-r-md px-2.5 py-2 text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {layaway.items.map((item, index) => (
            <tr key={item.sku} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
              <td className="px-2.5 py-2 font-mono text-[9px] text-slate-600">{item.sku}</td>
              <td className="px-2.5 py-2 font-medium">
                {item.name}
                {item.components && <span className="block text-[8px] font-normal text-slate-500">Incluye: {item.components.map((c) => `${c.quantity * item.quantity} ${c.unit} ${c.name}`).join(" · ")}</span>}
              </td>
              <td className="px-2.5 py-2 text-center font-semibold">
                {item.quantity} {item.unit}
              </td>
              <td className="px-2.5 py-2 text-right">{money(item.unitPrice)}</td>
              <td className="px-2.5 py-2 text-right font-semibold">{money(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="mt-4 grid grid-cols-[1fr_250px] items-start gap-5 text-[10px]">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Pagos recibidos</p>
          <table className="mt-1.5 w-full">
            <tbody>
              {layaway.payments.map((p, i) => (
                <tr key={p.id}>
                  <td className="py-0.5">{i === 0 ? "Pago inicial" : `Abono ${i}`}</td>
                  <td className="py-0.5 text-slate-500">{p.method}</td>
                  <td className="py-0.5 text-[8.5px] text-slate-400">{p.date}</td>
                  <td className="py-0.5 text-right font-semibold">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <table className="w-full text-[10.5px]">
          <tbody>
            <tr>
              <td className="py-1 text-slate-500">Total</td>
              <td className="py-1 text-right">{money(layaway.total)}</td>
            </tr>
            <tr className="text-[#347652]">
              <td className="py-1">Abonado</td>
              <td className="py-1 text-right">−{money(paid)}</td>
            </tr>
            <tr className="bg-[#edf4f2] text-[13px] font-bold text-[#183b36]">
              <td className="rounded-l-md px-2 py-2">Saldo por liquidar</td>
              <td className="rounded-r-md px-2 py-2 text-right">{money(balanceOf(layaway))}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section className="mt-6 rounded-lg border border-[#f0d9a3] bg-[#fffaf0] p-3.5 text-[9px] leading-relaxed text-[#6f5418]">
        <p className="text-[8.5px] font-bold uppercase tracking-[0.16em]">Condiciones del apartado</p>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
          <li>Se aparta con un pago mínimo del 20 % y se cuenta con {LAYAWAY_DAYS} días naturales para liquidar.</li>
          <li>Puede abonar las veces que quiera dentro del plazo. Al liquidar, el material se entrega en mostrador.</li>
          <li>Si el apartado se cancela o vence, lo abonado <strong>no se devuelve en efectivo</strong>: queda como saldo a favor en su monedero para futuras compras.</li>
          <li>La tienda puede otorgar una prórroga de {EXTENSION_DAYS} días a solicitud del cliente.</li>
          <li>Precios con IVA incluido. Conserve este comprobante.</li>
        </ol>
      </section>
      <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
        <div className="border-t border-slate-400 pt-1.5">
          <p className="font-semibold">{layaway.createdBy}</p>
          <p className="text-slate-500">Atendió · {company.commercialName}</p>
        </div>
        <div className="border-t border-slate-400 pt-1.5">
          <p className="font-semibold">{layaway.client}</p>
          <p className="text-slate-500">Cliente · acepto las condiciones</p>
        </div>
      </section>
    </Sheet>
  );
}

export function WalletPrintView({ client, balance, movements, onClose }: { client: string; balance: number; movements: WalletMovement[]; onClose: () => void }) {
  const last = movements[movements.length - 1];
  return (
    <Sheet title="SALDO A FAVOR" subtitle={`Monedero de ${client}`} onClose={onClose}>
      <section className="mt-5 grid grid-cols-[1.2fr_1fr] gap-4 text-[10px]">
        <div className="rounded-lg border border-slate-200 p-3.5">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Titular del monedero</p>
          <p className="mt-1.5 text-[13px] font-bold">{client}</p>
          {last && (
            <p className="mt-1 text-slate-500">
              Último movimiento: {last.kind} · {last.reference} · {last.date}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-[#183b36] p-4 text-white">
          <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#b8f34a]">Saldo disponible</p>
          <p className="mt-1 text-[24px] font-bold">{money(balance)}</p>
          <p className="text-[8.5px] text-white/60">({amountInWords(balance)})</p>
        </div>
      </section>
      <table className="mt-5 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-[#183b36] text-left text-[8.5px] uppercase tracking-wider text-white">
            <th className="rounded-l-md px-2.5 py-2">Fecha</th>
            <th className="px-2.5 py-2">Movimiento</th>
            <th className="px-2.5 py-2">Referencia</th>
            <th className="px-2.5 py-2 text-right">Importe</th>
            <th className="rounded-r-md px-2.5 py-2 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m, index) => (
            <tr key={m.id} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
              <td className="px-2.5 py-1.5 text-slate-500">{m.date}</td>
              <td className="px-2.5 py-1.5 font-medium">{m.kind}</td>
              <td className="px-2.5 py-1.5 text-slate-600">
                {m.reference}
                {m.method ? ` · ${m.method}` : ""}
              </td>
              <td className={`px-2.5 py-1.5 text-right font-semibold ${m.amount >= 0 ? "text-[#347652]" : "text-[#c9664f]"}`}>
                {m.amount >= 0 ? "+" : ""}
                {money(m.amount)}
              </td>
              <td className="px-2.5 py-1.5 text-right font-semibold">{money(m.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="mt-6 rounded-lg bg-[#f6f8f7] p-3.5 text-[9px] leading-relaxed text-slate-600">
        <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Uso del saldo a favor</p>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
          <li>El saldo se aplica como forma de pago en cualquier compra, total o parcialmente, y se descuenta de su monedero.</li>
          <li>Proviene de anticipos, devoluciones o apartados cancelados y no es reembolsable en efectivo.</li>
          <li>Presente este comprobante o mencione el nombre del titular al pagar.</li>
        </ol>
      </section>
      <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
        <div className="border-t border-slate-400 pt-1.5">
          <p className="font-semibold">{company.commercialName}</p>
          <p className="text-slate-500">Sello y firma</p>
        </div>
        <div className="border-t border-slate-400 pt-1.5">
          <p className="font-semibold">{client}</p>
          <p className="text-slate-500">Titular</p>
        </div>
      </section>
    </Sheet>
  );
}
