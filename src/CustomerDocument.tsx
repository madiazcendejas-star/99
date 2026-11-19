import { Printer, X } from "lucide-react";
import type { Customer } from "./CustomersModule";
import { company } from "./QuoteDocument";

const money = (value: number) =>
  value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export type StatementRow = {
  id: string;
  date: string;
  concept: string;
  amount: number;
  paid: number;
  balance: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
};

export default function StatementPrintView({
  customer,
  rows,
  onClose,
}: {
  customer: Customer;
  rows: StatementRow[];
  onClose: () => void;
}) {
  const balance = rows.reduce((sum, row) => sum + row.balance, 0);
  const overdue = rows.filter((row) => row.daysOverdue > 0).reduce((sum, row) => sum + row.balance, 0);
  const available = Math.max(0, customer.creditLimit - balance);

  return (
    <div className="print-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#2b3633]/80 backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#183b36] px-6 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Vista de impresión · Estado de cuenta {customer.businessName}</p>
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
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#183b36] text-lg font-black text-[#b8f34a]">
                99
              </span>
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
              <p className="text-[20px] font-bold tracking-[0.16em] text-[#2f7468]">ESTADO DE CUENTA</p>
              <table className="ml-auto mt-2 text-[10px]">
                <tbody>
                  {[
                    ["Cliente", customer.id],
                    ["Fecha de corte", "19 nov 2026"],
                    ["Condición", customer.creditDays ? `Crédito ${customer.creditDays} días` : "Contado"],
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

          <section className="mt-5 grid grid-cols-[1.3fr_1fr] gap-4 text-[10px]">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#2f7468]">Cliente</p>
              <p className="mt-1.5 text-[12px] font-bold">{customer.businessName}</p>
              <div className="mt-1 space-y-0.5 text-slate-500">
                <p>
                  At'n: {customer.contactName} · RFC {customer.rfc || "—"}
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
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Saldo total", money(balance), balance > 0],
                ["Saldo vencido", money(overdue), overdue > 0],
                ["Límite de crédito", customer.creditLimit ? money(customer.creditLimit) : "Contado", false],
                ["Crédito disponible", customer.creditLimit ? money(available) : "—", false],
              ].map(([label, value, alert]) => (
                <div key={label as string} className="rounded-lg bg-[#f6f8f7] p-2.5">
                  <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className={`mt-0.5 text-[12px] font-bold ${alert ? "text-[#c9664f]" : ""}`}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          <table className="mt-5 w-full border-collapse text-[9.5px]">
            <thead>
              <tr className="bg-[#183b36] text-left text-[8px] uppercase tracking-wider text-white">
                <th className="rounded-l-md px-2.5 py-2">Fecha</th>
                <th className="px-2.5 py-2">Folio</th>
                <th className="px-2.5 py-2">Concepto</th>
                <th className="px-2.5 py-2">Vence</th>
                <th className="px-2.5 py-2 text-right">Importe</th>
                <th className="px-2.5 py-2 text-right">Pagado</th>
                <th className="px-2.5 py-2 text-right">Saldo</th>
                <th className="rounded-r-md px-2.5 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className={index % 2 ? "bg-[#f6f8f7]" : ""}>
                  <td className="whitespace-nowrap px-2.5 py-2">{row.date}</td>
                  <td className="whitespace-nowrap px-2.5 py-2 font-semibold">{row.id}</td>
                  <td className="px-2.5 py-2 text-slate-600">{row.concept}</td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-slate-600">{row.dueDate}</td>
                  <td className="px-2.5 py-2 text-right">{money(row.amount)}</td>
                  <td className="px-2.5 py-2 text-right">{money(row.paid)}</td>
                  <td className="px-2.5 py-2 text-right font-semibold">{money(row.balance)}</td>
                  <td
                    className={`px-2.5 py-2 text-center font-semibold ${
                      row.daysOverdue > 0 ? "text-[#c9664f]" : row.balance > 0 ? "text-[#9a6b18]" : "text-[#347652]"
                    }`}
                  >
                    {row.status}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2.5 py-4 text-center text-slate-500">
                    Sin movimientos en el periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-b border-slate-200" />

          <section className="mt-4 flex justify-end">
            <table className="w-[240px] text-[10.5px]">
              <tbody>
                <tr>
                  <td className="py-1 text-slate-500">Total facturado en el periodo</td>
                  <td className="py-1 text-right">{money(rows.reduce((sum, row) => sum + row.amount, 0))}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-500">Pagos recibidos</td>
                  <td className="py-1 text-right">{money(rows.reduce((sum, row) => sum + row.paid, 0))}</td>
                </tr>
                <tr className="bg-[#edf4f2] text-[13px] font-bold text-[#183b36]">
                  <td className="rounded-l-md px-2 py-2">Saldo a pagar</td>
                  <td className="rounded-r-md px-2 py-2 text-right">{money(balance)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <p className="mt-5 text-[8.5px] leading-relaxed text-slate-500">
            Si su pago ya fue realizado, haga caso omiso de este aviso. Para aclaraciones comuníquese al {company.phone}{" "}
            o escriba a {company.email} indicando los folios correspondientes.
          </p>

          <footer className="mt-auto flex justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
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
