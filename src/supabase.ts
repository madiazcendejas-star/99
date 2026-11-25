// Cliente mínimo de Supabase (Auth + REST) sobre fetch, sin dependencias.
// La seguridad la garantiza la base de datos (RLS): con la clave publicable solo se ve
// lo que el usuario con sesión tiene permitido.
import { SUPABASE_KEY, SUPABASE_URL } from "./entorno";

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // segundos (epoch)
  user: { id: string; email: string };
};

const STORAGE = "99erp.sesion";
let session: Session | null = null;
try {
  const saved = localStorage.getItem(STORAGE);
  if (saved) session = JSON.parse(saved);
} catch {
  session = null;
}

const save = (s: Session | null) => {
  session = s;
  try {
    if (s) localStorage.setItem(STORAGE, JSON.stringify(s));
    else localStorage.removeItem(STORAGE);
  } catch {
    /* navegador sin almacenamiento: la sesión dura mientras la página esté abierta */
  }
};

export class SupabaseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const authFetch = async (path: string, body: unknown) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new SupabaseError(data.error_description || data.msg || data.message || "No se pudo iniciar sesión", res.status);
  return data;
};

const toSession = (data: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }): Session => ({
  access_token: data.access_token,
  refresh_token: data.refresh_token,
  expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  user: { id: data.user.id, email: data.user.email },
});

export const auth = {
  current: () => session,
  async signIn(email: string, password: string) {
    const data = await authFetch("token?grant_type=password", { email: email.trim().toLowerCase(), password });
    save(toSession(data));
    return session!;
  },
  async refresh() {
    if (!session) return null;
    try {
      const data = await authFetch("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
      save(toSession(data));
    } catch {
      save(null);
    }
    return session;
  },
  async signOut() {
    const token = session?.access_token;
    save(null);
    if (token)
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } }).catch(() => undefined);
  },
  /** Correo para restablecer la contraseña (Supabase lo envía) */
  async resetPassword(email: string) {
    await authFetch("recover", { email: email.trim().toLowerCase() });
  },
};

const token = async () => {
  if (session && session.expires_at - 60 < Date.now() / 1000) await auth.refresh();
  return session?.access_token;
};

const headers = async (extra?: Record<string, string>) => {
  const t = await token();
  return { apikey: SUPABASE_KEY, ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
};

const check = async (res: Response) => {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new SupabaseError(data.message || data.hint || `Error ${res.status}`, res.status);
};

/** Lee una tabla o vista completa (pide de 1000 en 1000 hasta terminar) */
export async function select<T = Record<string, unknown>>(table: string, query = "select=*"): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: await headers({ Range: `${from}-${from + size - 1}`, "Range-Unit": "items" }),
    });
    await check(res);
    const rows = (await res.json()) as T[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

/** Llama una función de la base de datos (rpc) */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: await headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(args),
  });
  await check(res);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Inserta filas y devuelve lo insertado */
export async function insert<T = Record<string, unknown>>(table: string, rows: unknown, opts: { upsertOn?: string; minimal?: boolean } = {}): Promise<T[]> {
  const q = opts.upsertOn ? `?on_conflict=${opts.upsertOn}` : "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${q}`, {
    method: "POST",
    headers: await headers({
      "Content-Type": "application/json",
      Prefer: `return=${opts.minimal ? "minimal" : "representation"}${opts.upsertOn ? ",resolution=merge-duplicates" : ""}`,
    }),
    body: JSON.stringify(rows),
  });
  await check(res);
  return opts.minimal ? [] : ((await res.json()) as T[]);
}

/** Actualiza las filas que cumplen el filtro (por ejemplo "id=eq.123") */
export async function update(table: string, filter: string, patch: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: await headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(patch),
  });
  await check(res);
}

export async function remove(table: string, filter: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: await headers({ Prefer: "return=minimal" }) });
  await check(res);
}

/** Alta de cuenta (primer acceso de un colaborador ya registrado por su administrador) */
export async function signUp(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new SupabaseError(data.msg || data.error_description || data.message || "No se pudo crear la cuenta", res.status);
  return data as { access_token?: string; user?: { id: string } };
}
