// App-wide store: loads state from the chosen backend, applies changes immutably,
// saves with a short debounce, publishes the leaderboard row, and raises the
// celebratory toasts (XP, level up, streak, plan gates, topic promotions).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { pickBackend, type Backend } from './backend';
import {
  emptyState, levelOf, streakOf, weekStatus, boardEntry, addXp, XP, dayKey, STREAK_MIN,
  type UserState,
} from './state';

export interface Toast { id: number; text: string; kind: 'info' | 'good' | 'bad' | 'level' }
interface Ctx {
  s: UserState;
  backend: Backend;
  mutate: <R>(fn: (d: UserState) => R) => R;
  toast: (text: string, kind?: Toast['kind']) => void;
  replace: (s: UserState) => void;
  saving: boolean;
}
const StoreCtx = createContext<Ctx | null>(null);
export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('store missing');
  return c;
}

export type Boot = { phase: 'loading' } | { phase: 'login'; backend: Backend } | { phase: 'ready'; backend: Backend; state: UserState };

export function useBoot() {
  const [boot, setBoot] = useState<Boot>({ phase: 'loading' });
  const load = useCallback(async (b?: Backend) => {
    const backend = b || (await pickBackend());
    let st: UserState | null = null;
    try { st = await backend.load(); } catch { st = null; }
    if (backend.needsLogin) { setBoot({ phase: 'login', backend }); return; }
    setBoot({ phase: 'ready', backend, state: st && st.v === 1 ? { ...emptyState(), ...st } : emptyState() });
  }, []);
  useEffect(() => { load(); }, [load]);
  return { boot, reload: load };
}

export function StoreProvider({ backend, initial, children }: { backend: Backend; initial: UserState; children: ReactNode }) {
  const [s, setS] = useState<UserState>(initial);
  const ref = useRef(s);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const boardTimer = useRef<number | undefined>(undefined);
  const loggedUpTo = useRef<number>(Date.now());
  const tid = useRef(1);
  const warned = useRef(false);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = tid.current++;
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'level' ? 4200 : 2600);
  }, []);

  const persist = useCallback((next: UserState) => {
    window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await backend.save(next);
        if (backend.logAttempts) {
          const fresh = next.attempts.filter((a) => a.t > loggedUpTo.current);
          if (fresh.length) { loggedUpTo.current = fresh[fresh.length - 1].t; await backend.logAttempts(fresh); }
        }
      } catch {
        // retried on the next change; tell the student once so they are not surprised later
        if (!warned.current) { warned.current = true; toast('Could not save just now. Keep this tab open; the next answer retries.', 'bad'); }
      }
      setSaving(false);
    }, 700);
    if (backend.canBoard) {
      window.clearTimeout(boardTimer.current);
      boardTimer.current = window.setTimeout(() => {
        backend.publishBoard(next.profile?.board ? boardEntry(next) : null).catch(() => {});
      }, 2500);
    }
  }, [backend, toast]);

  const mutate = useCallback(<R,>(fn: (d: UserState) => R): R => {
    const prev = ref.current;
    const d: UserState = structuredClone(prev);
    const r = fn(d);
    // plan gates clear themselves the moment their checks pass
    for (let n = 1; n <= 8; n++) {
      if (d.gates[n] || !d.profile) continue;
      if (weekStatus(d, n).complete) { d.gates[n] = Date.now(); addXp(d, XP.gate); toast(`Week ${n} gate cleared. +${XP.gate} XP`, 'level'); }
    }
    const lb = levelOf(prev.xp.total), la = levelOf(d.xp.total);
    if (la.idx > lb.idx) toast(`Promoted to ${la.name}`, 'level');
    const today = dayKey();
    if ((prev.xp.days[today] || 0) < STREAK_MIN && (d.xp.days[today] || 0) >= STREAK_MIN) {
      const st = streakOf(d);
      toast(st.current > 1 ? `Streak extended: ${st.current} days` : 'Streak started. Come back tomorrow.', 'good');
    }
    const tgt = d.profile?.dailyTarget || 50;
    if ((prev.xp.days[today] || 0) < tgt && (d.xp.days[today] || 0) >= tgt) toast(`Daily target hit: ${tgt} XP`, 'good');
    ref.current = d; setS(d); persist(d);
    return r;
  }, [persist, toast]);

  const replace = useCallback((n: UserState) => { ref.current = n; setS(n); persist(n); }, [persist]);

  useEffect(() => () => { window.clearTimeout(saveTimer.current); }, []);
  // flush on tab hide so a quick close does not lose the last answer
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'hidden') backend.save(ref.current).catch(() => {}); };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [backend]);

  const value = useMemo(() => ({ s, backend, mutate, toast, replace, saving }), [s, backend, mutate, toast, replace, saving]);
  return (
    <StoreCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind === 'good' ? 'good' : t.kind === 'bad' ? 'bad' : ''}`}>{t.kind === 'level' ? '★ ' : ''}{t.text}</div>)}
      </div>
    </StoreCtx.Provider>
  );
}

// theme is a per-device convenience; storage may be blocked, so every access is guarded
export function getTheme(): 'light' | 'dark' | 'auto' {
  try { return (localStorage.getItem('fcprep.theme') as any) || 'auto'; } catch { return 'auto'; }
}
export function applyTheme(t: 'light' | 'dark' | 'auto') {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('fcprep.theme', t); } catch { /* ignore */ }
}
