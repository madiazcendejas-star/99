import { Printer, X } from "lucide-react";
import type { Order, OrderItem } from "./OrdersModule";
import { company } from "./QuoteDocument";

const stateOf = (item: OrderItem) => {
  const qty = item.pickedQty ?? 0;
  if (qty >= item.quantity) return "Completa";
  if (qty > 0) return "Parcial";
  return "Sin surtir";
};

export default function PickingPrintView({ order, onClose }: { order: Order; onClose: () => void }) {
  const items = [...order.items].sort((a, b) =>
    `${a.aisle}-${a.shelf}`.localeCompare(`${b.aisle}-${b.shelf}`),
  );
  const requested = items.reduce((sum, item) => sum + item.quantity, 0);
  const picked = items.reduce((sum, item) => sum + (item.pickedQty ?? 0), 0);
  const complete = items.filter((item) => stateOf(item) === "Completa").length;
  const shortItems = items.filter((item) => stateOf(item) !== "Completa");
  const fillRate = Math.round((picked / Math.max(1, requested)) * 100);

  return (
    <div className="print-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Picking {order.id}</p>
          <p className="text-[10px] text-white/50">
            Tamaño carta (8.5 × 11 in) · listo para imprimir o guardar como PDF
          </p>
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
        <article className="print-sheet mx-auto flex flex-col bg-white px-[0.55in] py-[0.5in] text-[#162523] shadow-2xl">
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#183b36] text-base font-black text-[#b8f34a]">
                99
              </span>
              <div>
                <p className="text-[16px] font-bold leading-tight">{company.commercialName}</p>
                <p className="mt-0.5 text-[9px] text-slate-500">{company.legalName}</p>
                <p className="text-[9px] text-slate-500">Almacén principal · {company.address}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[19px] font-bold tracking-[0.14em] text-[#2f7468]">HOJA DE SURTIDO</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Picking list
              </p>
              <p className="mt-2 inline-block rounded-md bg-[#183b36] px-3 py-1 text-[13px] font-bold text-white">
                {order.id}
              </p>
            </div>
          </header>

          <div className="mt-4 h-[3px] rounded-full bg-[#2f7468]" />

          <section className="mt-4 grid grid-cols-3 gap-3 text-[9.5px]">
            {[
              {
                title: "Cliente",
                rows: [
                  ["", order.customer],
                  ["Origen", order.source],
                ],
              },
              {
                title: "Entrega",
                rows: [
                  ["Tipo", order.fulfillment],
                  ["Ruta", order.route || "—"],
                  ["Requerida", order.requiredAt],
                ],
              },
              {
                title: "Control",
                rows: [
                  ["Creada", order.date],
                  ["Surtida", order.signedAt || "—"],
                  ["Prioridad", order.priority],
                ],
              },
            ].map((block) => (
              <div key={block.title} className="rounded-lg border border-slate-200 p-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">
                  {block.title}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {block.rows.map(([label, value]) =>
                    label ? (
                      <p key={label} className="flex justify-between gap-2">
                        <span className="text-slate-500">{label}</span>
                        <span className="text-right font-semibold">{value}</span>
                      </p>
                    ) : (
                      <p key={value} className="text-[11.5px] font-bold">
                        {value}
                      </p>
                    ),
                  )}
                </div>
              </div>
            ))}
          </section>

          <table className="mt-4 w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[8px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Ubicación</th>
                <th className="px-2 py-2">Código</th>
                <th className="px-2 py-2">Descripción</th>
                <th className="px-2 py-2 text-center">Solicitado</th>
                <th className="px-2 py-2 text-center">Surtido</th>
                <th className="px-2 py-2">Unidad</th>
                <th className="rounded-r-md px-2 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const state = stateOf(item);
                return (
                  <tr
                    key={item.id}
                    className={
                      state === "Completa" ? (index % 2 ? "bg-[#f6f8f7]" : "") : "bg-[#fff4ef]"
                    }
                  >
                    <td className="px-2 py-2 text-center text-slate-500">{index + 1}</td>
                    <td className="px-2 py-2 font-bold text-[#2f7468]">
                      {item.aisle}-{item.shelf}
                    </td>
                    <td className="px-2 py-2 font-mono text-[8.5px] text-slate-600">{item.sku}</td>
                    <td className="px-2 py-2 font-medium">{item.name}</td>
                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                    <td className="px-2 py-2 text-center text-[11px] font-bold">{item.pickedQty ?? 0}</td>
                    <td className="px-2 py-2 text-slate-600">{item.unit}</td>
                    <td
                      className={`px-2 py-2 text-center font-semibold ${
                        state === "Completa"
                          ? "text-[#347652]"
                          : state === "Parcial"
                            ? "text-[#9a6b18]"
                            : "text-[#c9664f]"
                      }`}
                    >
                      {state === "Completa" ? "✓ Completa" : state}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 grid grid-cols-[1fr_220px] gap-4 text-[9.5px]">
            <div className="rounded-lg bg-[#f6f8f7] p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Observaciones
              </p>
              <p className="mt-1 leading-relaxed text-slate-600">{order.notes}</p>
              {shortItems.length > 0 && (
                <p className="mt-2 font-semibold text-[#a95845]">
                  Faltantes:{" "}
                  {shortItems
                    .map((item) => `${item.sku} (${item.quantity - (item.pickedQty ?? 0)} ${item.unit})`)
                    .join(", ")}
                </p>
              )}
            </div>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="py-0.5 text-slate-500">Partidas completas</td>
                  <td className="py-0.5 text-right font-semibold">
                    {complete} de {items.length}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500">Unidades solicitadas</td>
                  <td className="py-0.5 text-right font-semibold">{requested}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-slate-500">Unidades surtidas</td>
                  <td className="py-0.5 text-right font-semibold">{picked}</td>
                </tr>
                <tr className="bg-[#edf4f2] text-[12px] font-bold text-[#183b36]">
                  <td className="rounded-l-md px-2 py-1.5">Cumplimiento</td>
                  <td className="rounded-r-md px-2 py-1.5 text-right">{fillRate}%</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-auto grid grid-cols-2 gap-14 pt-10 text-center text-[9.5px]">
            <div>
              <div className="flex h-16 items-end justify-center">
                {order.signature ? (
                  <img src={order.signature} alt={`Firma de ${order.signedBy}`} className="max-h-16" />
                ) : (
                  <span className="font-serif text-xl italic text-[#183b36]">{order.signedBy}</span>
                )}
              </div>
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-semibold">{order.signedBy}</p>
                <p className="text-slate-500">Responsable de surtido · {order.signedAt}</p>
              </div>
            </div>
            <div>
              <div className="h-16" />
              <div className="border-t border-slate-400 pt-1.5">
                <p className="font-semibold">
                  {order.fulfillment === "Ruta" ? "Recibe para ruta (chofer)" : "Recibe el cliente"}
                </p>
                <p className="text-slate-500">Nombre, firma, fecha y hora</p>
              </div>
            </div>
          </section>

          <footer className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
            <span>
              {company.legalName} · Documento de control interno
            </span>
            <span>Generado con 99 ERP · Página 1 de 1</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
