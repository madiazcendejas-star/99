import { useState } from "react";
import { Check, Copy, Lock, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";

// ---------- Catálogo de permisos ----------
export type PermissionKey =
  | "ver.inicio"
  | "ver.cotizaciones"
  | "ver.ventas"
  | "ver.pos"
  | "ver.corte"
  | "ver.inventario"
  | "ver.compras"
  | "ver.ordenes"
  | "ver.rutas"
  | "ver.clientes"
  | "ver.colaboradores"
  | "ver.reportes"
  | "ver.configuracion"
  | "pos.descuentos"
  | "ventas.devoluciones"
  | "ventas.autorizar"
  | "corte.cerrar"
  | "compras.aprobar"
  | "colaboradores.nomina"
  | "reportes.utilidades"
  | "configuracion.roles";

export const PERMISSION_GROUPS: { module: string; view: PermissionKey; nav: string; actions: { key: PermissionKey; label: string; hint: string }[] }[] = [
  { module: "Inicio", view: "ver.inicio", nav: "Inicio", actions: [] },
  { module: "Cotizaciones", view: "ver.cotizaciones", nav: "Cotizaciones", actions: [] },
  {
    module: "Ventas",
    view: "ver.ventas",
    nav: "Ventas",
    actions: [
      { key: "ventas.devoluciones", label: "Registrar devoluciones", hint: "Botón Devolución en ventas y punto de venta" },
      { key: "ventas.autorizar", label: "Autorizar con PIN", hint: "Devoluciones fuera de plazo o de monto alto" },
    ],
  },
  {
    module: "Punto de venta",
    view: "ver.pos",
    nav: "Punto de venta",
    actions: [{ key: "pos.descuentos", label: "Dar descuentos", hint: "En punto de venta y cotizador, hasta el % máximo del rol" }],
  },
  { module: "Caja", view: "ver.corte", nav: "Caja", actions: [{ key: "corte.cerrar", label: "Hacer el corte del día", hint: "Arqueo y cierre del turno al final del día" }] },
  { module: "Inventario", view: "ver.inventario", nav: "Inventario", actions: [] },
  { module: "Compras", view: "ver.compras", nav: "Compras", actions: [{ key: "compras.aprobar", label: "Aprobar órdenes de compra", hint: "Sin este permiso solo crea borradores" }] },
  { module: "Órdenes", view: "ver.ordenes", nav: "Órdenes", actions: [] },
  { module: "Rutas", view: "ver.rutas", nav: "Rutas", actions: [] },
  { module: "Clientes", view: "ver.clientes", nav: "Clientes", actions: [] },
  {
    module: "Colaboradores",
    view: "ver.colaboradores",
    nav: "Colaboradores",
    actions: [{ key: "colaboradores.nomina", label: "Ver sueldos y pagar nómina", hint: "Sin este permiso no ve sueldos, costos ni la pestaña Nómina" }],
  },
  { module: "Reportes", view: "ver.reportes", nav: "Reportes", actions: [{ key: "reportes.utilidades", label: "Ver utilidades y estado de resultados", hint: "Costos, márgenes, utilidad bruta y neta" }] },
  { module: "Configuración", view: "ver.configuracion", nav: "Configuración", actions: [{ key: "configuracion.roles", label: "Administrar roles y permisos", hint: "Crear, editar y eliminar roles" }] },
];
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => [g.view, ...g.actions.map((a) => a.key)]);

export type Role = {
  id: string;
  name: string;
  description: string;
  locked?: boolean;
  permissions: PermissionKey[];
  maxDiscount: number;
};

export const ADMIN_ROLE = "Administrador";
export const NO_ACCESS_ROLE = "Sin acceso";

export const initialRoles: Role[] = [
  { id: "role-admin", name: ADMIN_ROLE, description: "Acceso total al sistema. No se puede modificar.", locked: true, permissions: ALL_PERMISSIONS, maxDiscount: 100 },
  {
    id: "role-gerente",
    name: "Gerente",
    description: "Opera la sucursal y autoriza.",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "configuracion.roles" && p !== "colaboradores.nomina"),
    maxDiscount: 20,
  },
  {
    id: "role-vendedor",
    name: "Vendedor",
    description: "Cotiza, vende y da seguimiento a clientes.",
    permissions: ["ver.inicio", "ver.cotizaciones", "ver.ventas", "ver.pos", "ver.inventario", "ver.clientes", "pos.descuentos", "ventas.devoluciones"],
    maxDiscount: 10,
  },
  {
    id: "role-cajero",
    name: "Cajero",
    description: "Cobra en mostrador y hace el corte.",
    permissions: ["ver.inicio", "ver.ventas", "ver.pos", "ver.corte", "ver.clientes", "pos.descuentos", "ventas.devoluciones", "corte.cerrar"],
    maxDiscount: 5,
  },
  {
    id: "role-almacen",
    name: "Almacenista",
    description: "Surte, recibe compras y controla existencias.",
    permissions: ["ver.inicio", "ver.inventario", "ver.compras", "ver.ordenes"],
    maxDiscount: 0,
  },
  { id: "role-chofer", name: "Chofer", description: "Consulta sus hojas de ruta y registra entregas.", permissions: ["ver.rutas"], maxDiscount: 0 },
  { id: "role-none", name: NO_ACCESS_ROLE, description: "Colaborador sin usuario en el sistema.", locked: true, permissions: [], maxDiscount: 0 },
];

export const can = (roles: Role[], roleName: string, key: PermissionKey) => {
  if (roleName === ADMIN_ROLE) return true;
  return roles.find((r) => r.name === roleName)?.permissions.includes(key) ?? false;
};
export const maxDiscountOf = (roles: Role[], roleName: string) =>
  roleName === ADMIN_ROLE ? 100 : can(roles, roleName, "pos.descuentos") ? roles.find((r) => r.name === roleName)?.maxDiscount ?? 0 : 0;

// ---------- Pantalla de roles (Configuración) ----------
export function RolesSettings({
  roles,
  usage,
  onSave,
  onDelete,
  onToast,
}: {
  roles: Role[];
  usage: Record<string, string[]>;
  onSave: (role: Role, previousName?: string) => void;
  onDelete: (role: Role) => void;
  onToast: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(roles[1]?.id ?? roles[0].id);
  const original = roles.find((r) => r.id === selectedId) ?? roles[0];
  const [draft, setDraft] = useState<Role>(original);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (draft.id !== original.id) setDraft(original);
  const locked = Boolean(draft.locked);
  const isAdmin = draft.name === ADMIN_ROLE && locked;
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const has = (key: PermissionKey) => isAdmin || draft.permissions.includes(key);
  const toggle = (key: PermissionKey, on: boolean, group?: (typeof PERMISSION_GROUPS)[number]) => {
    if (locked) return;
    setDraft((d) => {
      let perms = on ? [...new Set([...d.permissions, key])] : d.permissions.filter((p) => p !== key);
      // Quitar la vista de un módulo quita también sus acciones
      if (!on && group && key === group.view) perms = perms.filter((p) => !group.actions.some((a) => a.key === p));
      if (on && group && key !== group.view) perms = [...new Set([...perms, group.view])];
      return { ...d, permissions: perms };
    });
  };
  const nameTaken = roles.some((r) => r.id !== draft.id && r.name.trim().toLowerCase() === draft.name.trim().toLowerCase());
  const users = usage[original.name] ?? [];

  return (
    <div className="space-y-4">
      <section className="panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setSelectedId(r.id);
                setConfirmDelete(false);
              }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${selectedId === r.id ? "border-[#2f7468] bg-[#f2f8f6]" : "border-slate-200 hover:border-[#9cc3ba]"}`}
            >
              <span className={`grid size-6 place-items-center rounded-md ${r.name === ADMIN_ROLE ? "bg-[#183b36] text-[#b8f34a]" : "bg-[#edf4f2] text-[#2f7468]"}`}>
                {r.locked ? <Lock size={11} /> : <ShieldCheck size={12} />}
              </span>
              <span>
                <span className="block font-semibold">{r.name}</span>
                <span className="block text-[9px] text-slate-400">
                  {r.name === ADMIN_ROLE ? "Todo" : `${r.permissions.length} permisos`} · {(usage[r.name] ?? []).length} {(usage[r.name] ?? []).length === 1 ? "persona" : "personas"}
                </span>
              </span>
            </button>
          ))}
          <button
            className="primary-button ml-auto min-h-9 px-3 text-[11px]"
            onClick={() => {
              const role: Role = { id: `role-${Date.now()}`, name: "Nuevo rol", description: "", permissions: ["ver.inicio"], maxDiscount: 0 };
              onSave(role);
              setSelectedId(role.id);
              setDraft(role);
            }}
          >
            <Plus size={13} /> Nuevo rol
          </button>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-[320px] flex-1">
            {locked ? (
              <>
                <p className="eyebrow flex items-center gap-1">
                  <Lock size={11} /> Rol del sistema
                </p>
                <h2 className="mt-1 text-xl font-semibold">{draft.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{draft.description}</p>
              </>
            ) : (
              <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <label className="form-label">
                  Nombre del rol
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`form-input ${nameTaken ? "border-[#e5785f]" : ""}`} />
                </label>
                <label className="form-label">
                  Descripción
                  <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="form-input" placeholder="Para qué sirve este rol" />
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!isAdmin && draft.name !== NO_ACCESS_ROLE && (
              <button
                className="secondary-button flex min-h-9 items-center gap-1.5 bg-white"
                onClick={() => {
                  const copy: Role = { ...draft, id: `role-${Date.now()}`, name: `${draft.name} (copia)`, locked: false };
                  onSave(copy);
                  setSelectedId(copy.id);
                  setDraft(copy);
                  onToast(`Rol duplicado: ${copy.name}`);
                }}
              >
                <Copy size={13} /> Duplicar
              </button>
            )}
            {!locked && (
              <button className="secondary-button flex min-h-9 items-center gap-1.5 bg-white text-[#c9664f]" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Eliminar
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <p className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-[#183b36] px-4 py-3 text-xs text-white">
            <Lock size={14} className="text-[#b8f34a]" /> El Administrador tiene acceso a todo por defecto y no se puede modificar ni eliminar.
          </p>
        )}
        {confirmDelete && (
          <div className="mx-5 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0b4a5] bg-[#fff0eb] px-4 py-3 text-xs text-[#a95845]">
            <span className="flex-1">
              ¿Eliminar el rol <strong>{original.name}</strong>?{users.length ? ` ${users.join(", ")} quedará${users.length > 1 ? "n" : ""} como "Sin acceso".` : ""}
            </span>
            <button className="secondary-button min-h-8 bg-white" onClick={() => setConfirmDelete(false)}>
              No
            </button>
            <button
              className="primary-button min-h-8 bg-[#c9664f]"
              onClick={() => {
                onDelete(original);
                setSelectedId(roles[0].id);
                setConfirmDelete(false);
                onToast(`Rol ${original.name} eliminado`);
              }}
            >
              Sí, eliminar
            </button>
          </div>
        )}

        <div className="grid gap-x-6 gap-y-1 p-5 md:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => {
            const visible = has(group.view);
            return (
              <div key={group.module} className={`rounded-xl border px-4 py-3 ${visible ? "border-[#cfe3dd] bg-[#fbfdfc]" : "border-slate-100"}`}>
                <label className={`flex items-center justify-between gap-3 text-xs font-semibold ${locked ? "" : "cursor-pointer"}`}>
                  <span>{group.module}</span>
                  <span className="flex items-center gap-2 text-[10px] font-normal text-slate-400">
                    {visible ? "Puede entrar" : "Sin acceso"}
                    <input type="checkbox" disabled={locked} checked={visible} onChange={(e) => toggle(group.view, e.target.checked, group)} className="size-4 accent-[#2f7468]" aria-label={`Acceso a ${group.module}`} />
                  </span>
                </label>
                {group.actions.map((action) => (
                  <label key={action.key} className={`mt-2 flex items-start gap-2.5 border-t border-slate-100 pt-2 text-[11px] ${!visible && !locked ? "opacity-50" : ""} ${locked ? "" : "cursor-pointer"}`}>
                    <input type="checkbox" disabled={locked} checked={has(action.key)} onChange={(e) => toggle(action.key, e.target.checked, group)} className="mt-0.5 size-3.5 accent-[#2f7468]" aria-label={action.label} />
                    <span>
                      {action.label}
                      <span className="block text-[9px] text-slate-400">{action.hint}</span>
                      {action.key === "pos.descuentos" && has("pos.descuentos") && (
                        <span className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-600">
                          Hasta
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={locked}
                            value={isAdmin ? 100 : draft.maxDiscount}
                            onChange={(e) => setDraft({ ...draft, maxDiscount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                            className="h-7 w-14 rounded-md border border-slate-200 text-center font-semibold outline-none focus:border-[#2f7468]"
                            aria-label="Descuento máximo"
                            onClick={(e) => e.stopPropagation()}
                          />
                          % por venta
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-[#fafcfb] px-5 py-4">
          <p className="flex flex-1 items-center gap-1.5 text-[11px] text-slate-500">
            <UserRound size={13} /> {users.length ? `Con este rol: ${users.join(", ")}` : "Nadie tiene este rol todavía. Asígnalo en Colaboradores."}
          </p>
          {!locked && (
            <>
              <button className="secondary-button bg-white disabled:opacity-40" disabled={!dirty} onClick={() => setDraft(original)}>
                Descartar
              </button>
              <button
                className="primary-button disabled:opacity-40"
                disabled={!dirty || !draft.name.trim() || nameTaken}
                onClick={() => {
                  onSave({ ...draft, name: draft.name.trim() }, original.name);
                  onToast(`Rol ${draft.name.trim()} guardado`);
                }}
              >
                <Check size={15} /> Guardar cambios
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
