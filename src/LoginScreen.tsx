import { useEffect, useState } from "react";
import { Delete, Eye, EyeOff, KeyRound, Lock, LogOut, UserRound } from "lucide-react";
import CompanyLogo from "./CompanyLogo";
import { company } from "./config";

export type LoginUser = { id: string; name: string; role: string; email: string; pin?: string };

/** Contraseña del modo demostración (en producción la valida Supabase Auth) */
export const DEMO_PASSWORD = "demo";
const MAX_TRIES = 5;
const WAIT_SECONDS = 30;

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Limita intentos fallidos: después de 5 errores espera 30 segundos */
function useThrottle() {
  const [fails, setFails] = useState(0);
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (until <= now) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [until, now]);
  const wait = Math.max(0, Math.ceil((until - now) / 1000));
  return {
    wait,
    fail: () => {
      const next = fails + 1;
      if (next >= MAX_TRIES) {
        setFails(0);
        setUntil(Date.now() + WAIT_SECONDS * 1000);
        setNow(Date.now());
      } else setFails(next);
      return next;
    },
    reset: () => setFails(0),
  };
}

function PinPad({ value, onChange, onComplete, disabled }: { value: string; onChange: (v: string) => void; onComplete: (pin: string) => void; disabled?: boolean }) {
  const press = (d: string) => {
    if (disabled || value.length >= 4) return;
    const next = value + d;
    onChange(next);
    if (next.length === 4) setTimeout(() => onComplete(next), 120);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") onChange(value.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div>
      <div className="mb-5 flex justify-center gap-3" aria-label="PIN">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`size-3.5 rounded-full border-2 ${i < value.length ? "border-[#2f7468] bg-[#2f7468]" : "border-slate-300"}`} />
        ))}
      </div>
      <div className="mx-auto grid max-w-[240px] grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className="h-14 rounded-2xl bg-[#f3f6f5] text-lg font-semibold text-[#183b36] transition hover:bg-[#e3ece9] disabled:opacity-40">
            {d}
          </button>
        ))}
        <span />
        <button type="button" disabled={disabled} onClick={() => press("0")} className="h-14 rounded-2xl bg-[#f3f6f5] text-lg font-semibold text-[#183b36] transition hover:bg-[#e3ece9] disabled:opacity-40">
          0
        </button>
        <button type="button" aria-label="Borrar" onClick={() => onChange(value.slice(0, -1))} className="grid h-14 place-items-center rounded-2xl text-slate-400 hover:bg-slate-50">
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}

/** Elige colaborador y escribe su PIN */
function PinLogin({ users, onLogin, preselected, title }: { users: LoginUser[]; onLogin: (id: string) => void; preselected?: string; title: string }) {
  const [selected, setSelected] = useState<string | undefined>(preselected);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const throttle = useThrottle();
  const user = users.find((u) => u.id === selected);
  const check = (value: string) => {
    if (!user) return;
    if (user.pin && value === user.pin) {
      throttle.reset();
      onLogin(user.id);
    } else {
      const n = throttle.fail();
      setError(n >= MAX_TRIES ? "" : `PIN incorrecto · te quedan ${MAX_TRIES - n} intentos`);
      setPin("");
    }
  };
  if (!user)
    return (
      <div>
        <p className="mb-4 text-center text-sm font-semibold">{title}</p>
        <div className="grid max-h-[340px] grid-cols-2 gap-2 overflow-y-auto">
          {users.map((u) => (
            <button
              key={u.id}
              disabled={!u.pin}
              onClick={() => {
                setSelected(u.id);
                setError("");
              }}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-[#2f7468] hover:bg-[#f3f8f6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dce8e5] text-xs font-bold text-[#235f55]">{initials(u.name)}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{u.name}</span>
                <span className="block text-[10px] text-slate-400">{u.pin ? u.role : "Sin PIN asignado"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div>
      <div className="mb-5 flex flex-col items-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#dce8e5] text-base font-bold text-[#235f55]">{initials(user.name)}</span>
        <p className="mt-2 text-sm font-semibold">{user.name}</p>
        <p className="text-[11px] text-slate-400">Escribe tu PIN de 4 dígitos</p>
      </div>
      <PinPad value={pin} onChange={setPin} onComplete={check} disabled={throttle.wait > 0} />
      <p className="mt-4 min-h-4 text-center text-[11px] font-semibold text-[#c9664f]">{throttle.wait > 0 ? `Demasiados intentos. Espera ${throttle.wait} s.` : error}</p>
      {!preselected && (
        <button className="mx-auto mt-2 block text-[11px] font-semibold text-slate-500 hover:text-[#2f7468]" onClick={() => setSelected(undefined)}>
          ← Elegir otro colaborador
        </button>
      )}
    </div>
  );
}

function Frame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6] p-4">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <CompanyLogo className="grid size-14 place-items-center rounded-2xl bg-[#183b36] text-lg font-black text-[#b8f34a]" />
          <h1 className="mt-3 text-xl font-semibold text-[#162523]">{company.commercialName}</h1>
          <p className="text-xs text-slate-400">{company.branch}</p>
        </div>
        <div className="panel p-7">{children}</div>
        {footer}
        <p className="mt-6 text-center text-[10px] text-slate-400">
          <span className="font-bold text-[#183b36]">99</span> erp
        </p>
      </div>
    </div>
  );
}

/** Pantalla de inicio de sesión: correo y contraseña, o PIN en un equipo donde ya se entró */
export function LoginScreen({ users, onLogin, deviceReady }: { users: LoginUser[]; onLogin: (id: string) => void; deviceReady: boolean }) {
  const [mode, setMode] = useState<"password" | "pin">(deviceReady ? "pin" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const throttle = useThrottle();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (throttle.wait > 0) return;
    const user = users.find((u) => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
    if (user && password === DEMO_PASSWORD) {
      throttle.reset();
      onLogin(user.id);
      return;
    }
    const n = throttle.fail();
    setError(n >= MAX_TRIES ? "" : "Correo o contraseña incorrectos.");
  };
  const withEmail = users.filter((u) => u.email);
  return (
    <Frame
      footer={
        mode === "password" && (
          <div className="mt-4 rounded-2xl border border-dashed border-[#cfe3dd] bg-white/60 p-4 text-[11px] text-slate-500">
            <p className="font-semibold text-[#2f7468]">Modo demostración</p>
            <p className="mt-1">
              La contraseña de todos es <strong>{DEMO_PASSWORD}</strong>. Toca un usuario para llenar su correo:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {withEmail.map((u) => (
                <button key={u.id} type="button" className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:text-[#2f7468]" onClick={() => setEmail(u.email)}>
                  {u.name.split(" ")[0]} · {u.role}
                </button>
              ))}
            </div>
          </div>
        )
      }
    >
      <div className="mb-6 flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        <button className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 ${mode === "password" ? "bg-white text-[#183b36] shadow-sm" : "text-slate-500"}`} onClick={() => setMode("password")}>
          <UserRound size={14} /> Correo y contraseña
        </button>
        <button
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 ${mode === "pin" ? "bg-white text-[#183b36] shadow-sm" : "text-slate-500"} disabled:opacity-40`}
          disabled={!deviceReady}
          title={deviceReady ? "" : "El PIN se habilita en este equipo después del primer inicio de sesión con correo"}
          onClick={() => setMode("pin")}
        >
          <KeyRound size={14} /> PIN
        </button>
      </div>
      {mode === "password" ? (
        <form onSubmit={submit} className="space-y-4">
          <label className="form-label">
            Correo
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="tu@empresa.mx" />
          </label>
          <label className="form-label">
            Contraseña
            <div className="relative">
              <input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-input pr-10" />
              <button type="button" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <p className="min-h-4 text-[11px] font-semibold text-[#c9664f]">{throttle.wait > 0 ? `Demasiados intentos. Espera ${throttle.wait} s.` : error}</p>
          <button type="submit" disabled={throttle.wait > 0} className="primary-button w-full justify-center disabled:opacity-50">
            Entrar
          </button>
          <p className="text-center text-[10px] text-slate-400">¿Olvidaste tu contraseña? Pide al administrador que la restablezca.</p>
        </form>
      ) : (
        <PinLogin users={users} onLogin={onLogin} title="¿Quién eres?" />
      )}
    </Frame>
  );
}

/** Pantalla de bloqueo por inactividad: el mismo usuario desbloquea con su PIN, o se cambia de usuario */
export function LockScreen({
  user,
  users,
  onUnlock,
  onLogout,
  startSwitching = false,
}: {
  user: LoginUser;
  users: LoginUser[];
  onUnlock: (id: string) => void;
  onLogout: () => void;
  startSwitching?: boolean;
}) {
  const [switching, setSwitching] = useState(startSwitching);
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#f4f7f6]">
      <Frame
        footer={
          <div className="mt-4 flex justify-center gap-4 text-[11px] font-semibold text-slate-500">
            <button className="hover:text-[#2f7468]" onClick={() => setSwitching(!switching)}>
              {switching ? `Volver a ${user.name.split(" ")[0]}` : "Cambiar de usuario"}
            </button>
            <button className="flex items-center gap-1 hover:text-[#c9664f]" onClick={onLogout}>
              <LogOut size={12} /> Cerrar sesión
            </button>
          </div>
        }
      >
        <p className="mb-5 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <Lock size={12} /> Sistema bloqueado
        </p>
        {switching ? (
          <PinLogin users={users} onLogin={onUnlock} title="¿Quién va a usar el sistema?" />
        ) : user.pin ? (
          <PinLogin key={user.id} users={users} onLogin={onUnlock} preselected={user.id} title="" />
        ) : (
          <p className="text-center text-xs text-slate-500">
            {user.name} no tiene PIN. Cierra sesión y vuelve a entrar con tu correo, o pide al administrador que te asigne uno en Colaboradores.
          </p>
        )}
      </Frame>
    </div>
  );
}
