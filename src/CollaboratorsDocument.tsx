import { Printer, X } from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import { amountInWords, company } from "./QuoteDocument";
import { money, type Collaborator, type PayrollRun } from "./CollaboratorsModule";

export default function PayrollPrintView({ run, collaborators, onClose }: { run: PayrollRun; collaborators: Collaborator[]; onClose: () => void }) {
  const total = run.lines.reduce((s, l) => s + l.net, 0);
  const cost = run.lines.reduce((s, l) => s + l.employerCost, 0);
  return (
    <div className="print-overlay fixed inset-0 z-[80] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Nómina {run.id}</p>
          <p className="text-[10px] text-white/50">Resumen + {run.lines.length} recibos · tamaño carta</p>
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
      <div className="space-y-8 py-8">
        <article className="print-sheet mx-auto flex flex-col bg-white px-[0.6in] py-[0.55in] text-[#162523] shadow-2xl">
          <Header title="NÓMINA" subtitle={`${run.label} · ${run.frequency}`} />
          <section className="mt-5 grid grid-cols-3 gap-3 text-[10px]">
            {[
              ["Colaboradores", String(run.lines.length)],
              ["Total neto pagado", money(total)],
              ["Costo para la empresa", money(cost)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-slate-200 p-3">
                <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#2f7468]">{l}</p>
                <p className="mt-1 text-[14px] font-bold">{v}</p>
              </div>
            ))}
          </section>
          <table className="mt-5 w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[8px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2 py-2">Colaborador</th>
                <th className="px-2 py-2 text-right">Sueldo</th>
                <th className="px-2 py-2 text-right">Faltas</th>
                <th className="px-2 py-2 text-right">Comisión</th>
                <th className="px-2 py-2 text-right">Bono</th>
                <th className="px-2 py-2 text-right">Préstamo</th>
                <th className="px-2 py-2 text-right">Neto</th>
                <th className="rounded-r-md px-2 py-2 text-right">Costo empresa</th>
              </tr>
            </thead>
            <tbody>
              {run.lines.map((l, i) => (
                <tr key={l.collaboratorId} className={i % 2 ? "bg-[#f6f8f7]" : ""}>
                  <td className="px-2 py-1.5 font-medium">
                    {l.name}
                    <span className="block text-[8px] text-slate-500">{l.position}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">{money(l.base)}</td>
                  <td className="px-2 py-1.5 text-right">{l.absenceDiscount ? `−${money(l.absenceDiscount)}` : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{l.commission ? money(l.commission) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{l.bonus ? money(l.bonus) : "—"}</td>
                  <td className="px-2 py-1.5 text-right">{l.advance ? `−${money(l.advance)}` : "—"}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{money(l.net)}</td>
                  <td className="px-2 py-1.5 text-right">{money(l.employerCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[9px] text-slate-500">
            Pagada el {run.paidAt} por {run.paidBy} · {run.method}. Control administrativo interno; no sustituye el recibo de nómina timbrado (CFDI).
          </p>
          <Footer />
        </article>

        {run.lines.map((l) => {
          const c = collaborators.find((x) => x.id === l.collaboratorId);
          const perceptions = l.base - l.absenceDiscount + l.commission + l.bonus;
          return (
            <article key={l.collaboratorId} className="print-sheet mx-auto flex flex-col bg-white px-[0.6in] py-[0.55in] text-[#162523] shadow-2xl">
              <Header title="RECIBO DE PAGO" subtitle={`${run.label} · ${run.id}`} />
              <section className="mt-5 grid grid-cols-2 gap-4 text-[10px]">
                <div className="rounded-lg border border-slate-200 p-3.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Colaborador</p>
                  <p className="mt-1.5 text-[12px] font-bold">{l.name}</p>
                  <p className="text-slate-500">
                    {l.position} · {c?.area}
                  </p>
                  <p className="text-slate-500">
                    {c?.id} · ingreso {c?.startISO}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Pago</p>
                  <dl className="mt-1.5 space-y-1">
                    {[
                      ["Periodicidad", run.frequency],
                      ["Forma de pago", run.method === "Efectivo" ? "Efectivo" : `Transferencia · ${c?.bank || "—"}`],
                      ["Fecha de pago", run.paidAt],
                    ].map(([a, b]) => (
                      <div key={a} className="flex justify-between gap-3">
                        <dt className="text-slate-500">{a}</dt>
                        <dd className="text-right font-semibold">{b}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
              <section className="mt-5 grid grid-cols-2 gap-4 text-[10.5px]">
                <div>
                  <p className="rounded-t-md bg-[#183b36] px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-wider text-white">Percepciones</p>
                  <table className="w-full">
                    <tbody>
                      <Row label="Sueldo del periodo" value={l.base} />
                      {l.absenceDiscount > 0 && <Row label={`Faltas (${l.absences} días)`} value={-l.absenceDiscount} />}
                      {l.commission > 0 && <Row label={`Comisión sobre ventas (${c?.commissionRate ?? 0} %)`} value={l.commission} />}
                      {l.bonus > 0 && <Row label="Bono" value={l.bonus} />}
                      <Row label="Total percepciones" value={perceptions} strong />
                    </tbody>
                  </table>
                </div>
                <div>
                  <p className="rounded-t-md bg-[#183b36] px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-wider text-white">Deducciones</p>
                  <table className="w-full">
                    <tbody>
                      {l.advance > 0 ? <Row label="Descuento préstamo / adelanto" value={l.advance} /> : <Row label="Sin deducciones" value={0} />}
                      <Row label="Total deducciones" value={l.advance} strong />
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="mt-5 flex items-center justify-between rounded-lg bg-[#edf4f2] px-4 py-3">
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Neto a recibir</p>
                  <p className="mt-0.5 text-[9px] text-slate-600">({amountInWords(l.net)})</p>
                </div>
                <p className="text-[22px] font-bold text-[#183b36]">{money(l.net)}</p>
              </section>
              <p className="mt-4 text-[9px] leading-relaxed text-slate-500">
                Recibí de {company.legalName} la cantidad neta indicada por concepto de los servicios prestados en el periodo, sin reservarme acción alguna por los conceptos aquí
                señalados. Documento de control interno; no sustituye el CFDI de nómina.
              </p>
              <section className="mt-auto grid grid-cols-2 gap-14 pt-12 text-center text-[9.5px]">
                <div className="border-t border-slate-400 pt-1.5">
                  <p className="font-semibold">{run.paidBy}</p>
                  <p className="text-slate-500">Entregó · {company.commercialName}</p>
                </div>
                <div className="border-t border-slate-400 pt-1.5">
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-slate-500">Firma de conformidad</p>
                </div>
              </section>
              <Footer />
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr className={strong ? "border-t border-slate-300 font-bold" : ""}>
      <td className="px-3 py-1.5">{label}</td>
      <td className={`px-3 py-1.5 text-right ${value < 0 ? "text-[#c9664f]" : ""}`}>{money(value)}</td>
    </tr>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <CompanyLogo className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#183b36] text-lg font-black text-[#b8f34a]" />
          <div>
            <p className="text-[18px] font-bold leading-tight">{company.commercialName}</p>
            <p className="mt-0.5 text-[9.5px] text-slate-500">{company.legalName}</p>
            <p className="text-[9.5px] text-slate-500">RFC {company.rfc}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-bold tracking-[0.14em] text-[#2f7468]">{title}</p>
          <p className="text-[10px] font-semibold text-slate-500">{subtitle}</p>
        </div>
      </header>
      <div className="mt-5 h-[3px] rounded-full bg-[#2f7468]" />
    </>
  );
}

function Footer() {
  return (
    <footer className="mt-6 flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
      <span>{company.legalName}</span>
      <span>Generado con 99 ERP</span>
    </footer>
  );
}
