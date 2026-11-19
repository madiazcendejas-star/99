import { Printer, X } from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import type { Order } from "./OrdersModule";
import type { RoutePlan } from "./RoutesModule";
import { liquidation, WAREHOUSE } from "./RoutesModule";
import { company } from "./QuoteDocument";

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function RoutePrintView({
  route,
  orders,
  onClose,
}: {
  route: RoutePlan;
  orders: Order[];
  onClose: () => void;
}) {
  const totals = liquidation(route);
  const started = route.status !== "Programada";
  const closed = route.status === "Cerrada";

  return (
    <div className="print-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Hoja de ruta {route.id}</p>
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
        <article className="print-sheet mx-auto flex flex-col bg-white px-[0.5in] py-[0.5in] text-[#162523] shadow-2xl">
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <CompanyLogo className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#183b36] text-base font-black text-[#b8f34a]" />
              <div>
                <p className="text-[16px] font-bold leading-tight">{company.commercialName}</p>
                <p className="mt-0.5 text-[9px] text-slate-500">{company.legalName}</p>
                <p className="text-[9px] text-slate-500">Salida: {WAREHOUSE.name} · {WAREHOUSE.address}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[19px] font-bold tracking-[0.14em] text-[#2f7468]">HOJA DE RUTA</p>
              <p className="mt-2 inline-block rounded-md bg-[#183b36] px-3 py-1 text-[13px] font-bold text-white">{route.id}</p>
              {route.extraordinary && (
                <p className="mt-1 text-[8.5px] font-bold uppercase tracking-wider text-[#9a6b18]">Ruta extraordinaria</p>
              )}
            </div>
          </header>

          <div className="mt-4 h-[3px] rounded-full bg-[#2f7468]" />

          <section className="mt-4 grid grid-cols-4 gap-2.5 text-[9.5px]">
            {[
              ["Fecha", route.date],
              ["Salida", route.startedAt ? route.startedAt.split("· ")[1] + " h (real)" : `${route.departureTime} h`],
              ["Chofer", route.driver],
              ["Camioneta", route.vehicle],
              ["Zona", route.zone],
              ["Recorrido est.", route.distanceKm ? `~${route.distanceKm} km` : "—"],
              ["Viáticos entregados", money(route.viatics)],
              ["Estado", route.status + (route.closedAt ? ` · ${route.closedAt.split("· ")[1]} h` : "")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 px-2.5 py-2">
                <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                <p className="mt-0.5 truncate font-semibold">{value}</p>
              </div>
            ))}
          </section>

          <table className="mt-4 w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[7.5px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Orden</th>
                <th className="px-2 py-2">Cliente y dirección</th>
                <th className="px-2 py-2 text-center">Part.</th>
                <th className="px-2 py-2 text-right">Por cobrar</th>
                <th className="px-2 py-2 text-right">Cobrado</th>
                <th className="px-2 py-2">Estado</th>
                <th className="rounded-r-md px-2 py-2">Recibió (nombre y firma)</th>
              </tr>
            </thead>
            <tbody>
              {route.stops.map((stop, index) => {
                const order = orders.find((item) => item.id === stop.orderId);
                return (
                  <tr key={stop.orderId} className={`align-top ${index % 2 ? "bg-[#f6f8f7]" : ""}`}>
                    <td className="px-2 py-2.5 text-center font-bold text-[#2f7468]">{stop.sequence}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold">{stop.orderId}</td>
                    <td className="px-2 py-2.5">
                      <p className="font-semibold">{stop.customer}</p>
                      <p className="text-[8.5px] text-slate-500">
                        {stop.address}
                        {stop.city ? `, ${stop.city}` : ""}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-center">{order?.items.length ?? "—"}</td>
                    <td className="px-2 py-2.5 text-right">{stop.amountDue ? money(stop.amountDue) : "—"}</td>
                    <td className="px-2 py-2.5 text-right font-semibold">
                      {stop.status === "Entregada" ? (
                        <>
                          {money(stop.collected || 0)}
                          <span className="block text-[7.5px] font-normal text-slate-500">{stop.collectMethod}</span>
                          {stop.shortReason && (
                            <span className="block text-[7.5px] font-normal text-[#c9664f]">
                              Faltan {money(stop.shortAmount ?? 0)} · {stop.shortReason}
                            </span>
                          )}
                        </>
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      {started ? (
                        <span
                          className={
                            stop.status === "Entregada"
                              ? "font-semibold text-[#347652]"
                              : stop.status === "No entregada"
                                ? "font-semibold text-[#c9664f]"
                                : "text-slate-500"
                          }
                        >
                          {stop.status}
                          {stop.resolution && <span className="block text-[7.5px] font-normal">{stop.resolution}</span>}
                          {stop.failReason && stop.status === "No entregada" && (
                            <span className="block text-[7.5px] font-normal text-slate-500">{stop.failReason}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">☐ Entregada<br />☐ No entregada</span>
                      )}
                    </td>
                    <td className="w-[1.6in] px-2 py-2.5">
                      {stop.receivedBy ? (
                        <span className="text-[8.5px]">{stop.receivedBy}</span>
                      ) : (
                        <span className="mt-5 block border-b border-slate-300" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 grid grid-cols-2 gap-4 text-[9.5px]">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Gastos del chofer</p>
              <table className="mt-1.5 w-full">
                <tbody>
                  {route.expenses.map((item) => (
                    <tr key={item.id}>
                      <td className="py-0.5">{item.concept}</td>
                      <td className="py-0.5 text-[8px] text-slate-500">{item.receipt ? "Con comprobante" : "Sin comprobante"}</td>
                      <td className="py-0.5 text-right font-semibold">{money(item.amount)}</td>
                    </tr>
                  ))}
                  {route.expenses.length === 0 &&
                    [1, 2, 3].map((row) => (
                      <tr key={row}>
                        <td className="py-1.5" colSpan={3}>
                          <span className="block border-b border-dashed border-slate-300" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg bg-[#f6f8f7] p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Liquidación</p>
              <table className="mt-1.5 w-full">
                <tbody>
                  <tr>
                    <td className="py-0.5 text-slate-500">Viáticos entregados</td>
                    <td className="py-0.5 text-right">{money(route.viatics)}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-slate-500">+ Cobrado en efectivo</td>
                    <td className="py-0.5 text-right">{started ? money(totals.cash) : "________"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 text-slate-500">− Gastos comprobados</td>
                    <td className="py-0.5 text-right">{started ? money(totals.withReceipt) : "________"}</td>
                  </tr>
                  <tr className="text-[11px] font-bold">
                    <td className="pt-1.5">Debe entregar</td>
                    <td className="pt-1.5 text-right">{started ? money(totals.mustDeliver) : "________"}</td>
                  </tr>
                  {closed && (
                    <>
                      <tr>
                        <td className="py-0.5 text-slate-500">Efectivo recibido</td>
                        <td className="py-0.5 text-right font-semibold">{money(route.cashReturned ?? 0)}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 text-slate-500">Diferencia</td>
                        <td className={`py-0.5 text-right font-semibold ${(totals.difference ?? 0) < -0.5 ? "text-[#c9664f]" : ""}`}>
                          {money(totals.difference ?? 0)}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="pt-1 text-[8px] text-slate-500">Cobrado transferencia / tarjeta</td>
                    <td className="pt-1 text-right text-[8px] text-slate-500">{money(totals.other)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {route.notes && (
            <section className="mt-3 rounded-lg border border-slate-200 p-3 text-[9.5px]">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Notas para el chofer</p>
              <p className="mt-1 leading-relaxed text-slate-600">{route.notes}</p>
            </section>
          )}

          <section className="mt-auto grid grid-cols-2 gap-14 pt-10 text-center text-[9.5px]">
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">{route.driver}</p>
              <p className="text-slate-500">Chofer · recibe carga y viáticos</p>
            </div>
            <div className="border-t border-slate-400 pt-1.5">
              <p className="font-semibold">Administración / Almacén</p>
              <p className="text-slate-500">{closed ? "Recibe liquidación" : "Autoriza salida"}</p>
            </div>
          </section>

          <footer className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
            <span>{company.legalName} · Documento de control logístico</span>
            <span>Generado con 99 ERP · Página 1 de 1</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
