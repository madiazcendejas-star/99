// Entorno de ejecución: sin variables de Supabase el sistema corre en MODO DEMOSTRACIÓN
// (datos de ejemplo en el navegador, fecha fija 18 nov 2026). Con VITE_SUPABASE_URL y
// VITE_SUPABASE_PUBLISHABLE_KEY corre CONECTADO: datos reales de la empresa y fecha de hoy.
const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}) as Record<string, string | undefined>;

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
export const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? "";
export const LIVE = !!(SUPABASE_URL && SUPABASE_KEY);

const localISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const now = new Date();

export const TODAY_ISO = LIVE ? localISO(now) : "2026-11-18";
export const TOMORROW_ISO = LIVE ? localISO(new Date(now.getTime() + 86_400_000)) : "2026-11-19";
/** Desde cuándo hay movimientos detallados (en demostración, antes de esta fecha hay historia sintética) */
export const DETAIL_FROM = LIVE ? "2000-01-01" : "2026-11-16";
/** Primera fecha que se puede consultar en reportes */
export const HISTORY_FROM = LIVE ? "2024-01-01" : "2026-09-01";

/** Meses abreviados fijos (toLocaleDateString puede dar "sept", que los reportes no leen) */
export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-11-18" → "18 nov 2026" */
export const fechaTexto = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[(m || 1) - 1]} ${y}`;
};
/** "2026-11-18" → "18 nov" */
export const fechaCorta = (iso: string) => fechaTexto(iso).replace(/ \d{4}$/, "");
export const TODAY_TEXT = fechaTexto(TODAY_ISO);

/** Id para registros nuevos: en modo conectado un UUID (lo que espera la base de datos) */
export const nuevoId = (demo: string) => (LIVE && typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : demo);
export const esUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
/** Cómo mostrar un id en pantalla (los UUID se abrevian) */
export const idVisible = (id: string) => (esUuid(id) ? id.slice(0, 8).toUpperCase() : id);
