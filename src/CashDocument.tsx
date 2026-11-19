import { Printer, X } from "lucide-react";
import { company } from "./QuoteDocument";
import type { Sale } from "./SalesModule";
import { DENOMINATIONS, isOutflow, money, type CashSession, type CashSummary } from "./CashModule";

export default function CashPrintView({
  session,
  summary,
  sales,
  mode,
  onClose,
}: {
  session: CashSession;
  summary: CashSummary;
  sales: Sale[];
  mode: "X" | "Z";
  onClose: () => void;
}) {
  const counted = mode === "Z" ? session.counted : undefined;
  const now = `18 nov 2026 · ${new Date().toTimeString().slice(0, 5)}`;
  const rows = counted
    ? [
        ["Efectivo", summary.expectedCash, counted.cash],
        ["Tarjeta", summary.byMethod.Tarjeta, counted.card],
        ["Transferencia", summary.byMethod.Transferencia, counted.transfer],
      ]
    : [];
  const diffText = (diff: number) => (Math.abs(diff) < 0.01 ? "Cuadra" : diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(-diff)}`);
  const denoms = DENOMINATIONS.filter((d) => (counted?.denominations[d.key] ?? 0) > 0);

  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">
            Vista de impresión · {mode === "Z" ? "Corte de caja" : "Corte parcial"} {session.id}
          </p>
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
              </div>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-bold tracking-[0.14em] text-[#2f7468]">{mode === "Z" ? "CORTE DE CAJA" : "CORTE PARCIAL"}</p>
              <p className="text-[10px] font-semibold text-slate-500">{mode === "Z" ? "Cierre de turno (Z)" : "Lectura sin cierre (X)"}</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  {[
                    ["Folio", session.id],
                    ["Caja", session.register],
                    ["Cajero", session.cashier],
                    ["Apertura", session.openedAt],
                    [mode === "Z" ? "Cierre" : "Emitido", mode === "Z" ? session.closedAt || "—" : now],
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
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Ventas del turno</p>
              <dl className="mt-2 space-y-1">
                {(["Efectivo", "Tarjeta", "Transferencia", "Contra entrega"] as const).map((method) => (
                  <div key={method} className="flex justify-between">
                    <dt className="text-slate-500">{method === "Contra entrega" ? "Contra entrega (por cobrar)" : method}</dt>
                    <dd className="font-semibold">{money(summary.byMethod[method])}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-1 text-[11px] font-bold">
                  <dt>Total vendido</dt>
                  <dd>{money(summary.salesTotal)}</dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Tickets · canceladas</dt>
                  <dd>
                    {summary.tickets} · {summary.cancelled}
                  </dd>
                </div>
                <div className="flex justify-between text-slate-500">
                  <dt>Descuentos otorgados</dt>
                  <dd>{money(summary.discounts)}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Cuadre de efectivo</p>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Fondo inicial</dt>
                  <dd className="font-semibold">{money(session.openingFund)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">+ Ventas en efectivo</dt>
                  <dd className="font-semibold">{money(summary.byMethod.Efectivo)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">+ Entradas de efectivo</dt>
                  <dd className="font-semibold">{money(summary.inflows)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">− Retiros, gastos y viáticos</dt>
                  <dd className="font-semibold">{money(summary.outflows)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-[11px] font-bold">
                  <dt>Efectivo esperado</dt>
                  <dd>{money(summary.expectedCash)}</dd>
                </div>
                {counted && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Fondo que se queda</dt>
                      <dd className="font-semibold">{money(session.leftFund ?? 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Retiro para depósito</dt>
                      <dd className="font-semibold">{money(session.deposit ?? 0)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </section>

          {counted && (
            <section className="mt-4 grid grid-cols-[1.3fr_1fr] gap-4 text-[10px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#183b36] text-left text-[8.5px] uppercase tracking-wider text-white">
                    <th className="rounded-l-md px-2.5 py-2">Forma de pago</th>
                    <th className="px-2.5 py-2 text-right">Esperado</th>
                    <th className="px-2.5 py-2 text-right">Contado</th>
                    <th className="rounded-r-md px-2.5 py-2 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, expected, value], index) => {
                    const diff = (value as number) - (expected as number);
                    return (
                      <tr key={label as string} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                        <td className="px-2.5 py-2 font-medium">{label}</td>
                        <td className="px-2.5 py-2 text-right">{money(expected as number)}</td>
                        <td className="px-2.5 py-2 text-right">{money(value as number)}</td>
                        <td className={`px-2.5 py-2 text-right font-semibold ${Math.abs(diff) < 0.01 ? "" : diff > 0 ? "text-[#3973a8]" : "text-[#c9664f]"}`}>{diffText(diff)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Arqueo por denominación</p>
                {denoms.length ? (
                  <table className="mt-1.5 w-full">
                    <tbody>
                      {denoms.map((d) => (
                        <tr key={d.key}>
                          <td className="py-0.5 text-slate-500">
                            {d.kind} {d.value >= 1 ? `$${d.value}` : "50¢"}
                          </td>
                          <td className="py-0.5 text-center">× {counted.denominations[d.key]}</td>
                          <td className="py-0.5 text-right font-semibold">{money(counted.denominations[d.key] * d.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-1.5 text-slate-500">Capturado como total: {money(counted.cash)}</p>
                )}
              </div>
            </section>
          )}

          {session.movements.length > 0 && (
            <section className="mt-4 text-[10px]">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Movimientos de efectivo</p>
              <table className="mt-1.5 w-full border-collapse">
                <tbody>
                  {session.movements.map((m, index) => (
                    <tr key={m.id} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                      <td className="px-2.5 py-1.5 text-slate-500">{m.at}</td>
                      <td className="px-2.5 py-1.5">{m.kind}</td>
                      <td className="px-2.5 py-1.5">{m.concept}</td>
                      <td className="px-2.5 py-1.5 text-slate-500">{m.user}</td>
                      <td className={`px-2.5 py-1.5 text-right font-semibold ${isOutflow(m.kind) ? "text-[#c9664f]" : "text-[#347652]"}`}>
                        {isOutflow(m.kind) ? "−" : "+"}
                        {money(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {sales.length > 0 && (
            <section className="mt-4 text-[10px]">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Detalle de ventas</p>
              <table className="mt-1.5 w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[8.5px] uppercase tracking-wider text-slate-400">
                    <th className="px-2.5 py-1.5">Folio</th>
                    <th className="px-2.5 py-1.5">Hora</th>
                    <th className="px-2.5 py-1.5">Cliente</th>
                    <th className="px-2.5 py-1.5">Forma de pago</th>
                    <th className="px-2.5 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale, index) => (
                    <tr key={sale.id} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                      <td className="px-2.5 py-1.5 font-semibold">{sale.id}</td>
                      <td className="px-2.5 py-1.5 text-slate-500">{sale.time}</td>
                      <td className="px-2.5 py-1.5">{sale.client}</td>
                      <td className="px-2.5 py-1.5 text-slate-500">{sale.payments ? sale.payments.map((p) => p.method).join(" + ") : sale.payment}</td>
                      <td className={`px-2.5 py-1.5 text-right font-semibold ${sale.status === "Cancelada" ? "text-slate-400 line-through" : ""}`}>{money(sale.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {mode === "Z" && session.notes && (
            <p className="mt-4 rounded-lg bg-[#f6f8f7] p-3 text-[9.5px]">
              <strong>Observaciones:</strong> {session.notes}
            </p>
          )}
          {mode === "X" && (
            <p className="mt-4 rounded-lg bg-[#fff6df] p-3 text-[9.5px] text-[#8a651e]">
              Lectura parcial informativa: el turno sigue abierto y los importes pueden cambiar hasta el corte final.
            </p>
          )}

          <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{session.cashier}</p>
              <p className="text-slate-500">Cajero · entrega</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="min-h-[14px] font-semibold" />
              <p className="text-slate-500">Supervisor · recibe y valida</p>
            </div>
          </section>

          <footer className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
            <span>
              {company.legalName} · {company.phone}
            </span>
            <span>Generado con 99 ERP · Página 1 de 1</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
