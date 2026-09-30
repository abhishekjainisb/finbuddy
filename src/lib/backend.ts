// Storage backends. The same app runs on three:
//  - supabase: the production portal (Microsoft/Google SSO or email code, Postgres with row-level security)
//  - artifact: the claude.ai preview (per-person private data + a shared leaderboard)
//  - local:    a browser-only fallback (progress stays on this device)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserState, BoardEntry, Attempt } from './state';

export type PgidStatus = 'free' | 'mine' | 'taken' | 'not_found' | 'invalid' | 'too_many' | 'signed_out';
export interface BoardRow extends BoardEntry { id: string; name?: string }
export interface Backend {
  kind: 'supabase' | 'artifact' | 'local';
  uid: string | null;
  canBoard: boolean;
  load(): Promise<UserState | null>;
  save(s: UserState): Promise<void>;
  publishBoard(e: BoardEntry | null): Promise<void>;
  subscribeBoard(cb: (rows: BoardRow[]) => void): () => void;
  names(ids: string[]): Promise<Record<string, string>>;
  logAttempts?(a: Attempt[]): Promise<void>;
  // sign-in (supabase only): Microsoft or Google SSO, or a code sent by email
  needsLogin?: boolean;
  needsLink?: boolean;
  link?: { pgid: string; name: string } | null;
  email?: string | null;
  signInOAuth?(provider: 'azure' | 'google'): Promise<void>;
  sendEmailOtp?(email: string): Promise<void>;
  verifyEmailOtp?(email: string, code: string): Promise<void>;
  lookupPgid?(pgid: string): Promise<{ status: PgidStatus; name?: string }>;
  claimPgid?(pgid: string): Promise<{ ok: boolean; status: string; pgid?: string; name?: string }>;
  signOut?(): Promise<void>;
}

const LS_KEY = 'fcprep.state.v1';
function lsGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }

export function localBackend(): Backend {
  return {
    kind: 'local', uid: 'local', canBoard: false,
    async load() { const r = lsGet(LS_KEY); return r ? JSON.parse(r) : null; },
    async save(s) { lsSet(LS_KEY, JSON.stringify(s)); },
    async publishBoard() {},
    subscribeBoard(cb) { cb([]); return () => {}; },
    async names() { return {}; },
  };
}

// ---------- claude.ai artifact runtime
// A stored document may be at most 256 KiB. Keep well under it by trimming the
// oldest raw attempts and the text of long-resolved errors; nothing that drives
// a topic state is dropped (topic stats keep their own counters).
const LIMIT = 200_000;
export function compact(s: UserState): Record<string, unknown> {
  let c: UserState = JSON.parse(JSON.stringify(s));
  const size = () => JSON.stringify(c).length;
  if (size() <= LIMIT) return c as any;
  c.attempts = c.attempts.slice(-200);
  const old = Date.now() - 30 * 864e5;
  for (const e of Object.values(c.errors)) if (e.resolved && e.resolved < old) { e.prompt = e.prompt.slice(0, 120); e.given = undefined; e.correct = undefined; }
  if (size() > LIMIT) c.attempts = c.attempts.slice(-60);
  if (size() > LIMIT) c = { ...c, errors: Object.fromEntries(Object.entries(c.errors).filter(([, e]) => !e.resolved)) };
  return JSON.parse(JSON.stringify(c));
}
declare global { interface Window { claude?: { use: (n: string) => Promise<any> } } }
export async function artifactBackend(): Promise<Backend | null> {
  // the viewer injects window.claude after the page script starts; give it a moment
  // outside a claude.ai frame there is no runtime to wait for: fall back to local at once
  let framed = true; try { framed = window.self !== window.top; } catch { framed = true; }
  if (!framed && !window.claude?.use) return null;
  for (let i = 0; i < 30 && !window.claude?.use; i++) await new Promise((r) => setTimeout(r, 100));
  if (!window.claude?.use) return null;
  const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
  if (!db || !user) return null;
  const uid: string | null = await user.id();
  if (!uid) return null;
  const stateRef = db.doc(`data/users/${uid}/state`);
  let writing: Promise<void> = Promise.resolve();
  let readOnly = false;
  return {
    kind: 'artifact', uid, canBoard: true,
    async load() {
      const snap = await stateRef.get();
      return snap.exists ? (snap.data() as UserState) : null;
    },
    async save(s) {
      if (readOnly) return;
      let failed: any = null;
      writing = writing.then(() => stateRef.set(compact(s))).catch((e: any) => {
        if (['not_granted', 'revoked', 'capability_disabled', 'capability_removed'].includes(e?.code)) readOnly = true;
        failed = e;
      });
      await writing;
      if (failed) throw failed;
    },
    async publishBoard(e) {
      if (readOnly) return;
      const ref = db.doc(`board/${uid}`);
      try { if (e) await ref.set({ ...e }); else await ref.delete(); } catch { /* not allowed for this viewer */ }
    },
    subscribeBoard(cb) {
      const unsub = db.collection('board').orderBy('weekXp', 'desc').limit(100).onSnapshot(
        (q: any) => cb(q.docs.map((d: any) => ({ id: d.id, ...(d.data() as BoardEntry) }))),
        () => cb([]),
      );
      return unsub;
    },
    async names(ids) {
      const ps = await user.profiles(ids);
      return Object.fromEntries(ids.map((id) => [id, ps[id]?.name || '']));
    },
  };
}

// ---------- Supabase (production)
export function supabaseBackend(url: string, key: string): Backend & { client: SupabaseClient } {
  // PKCE keeps the OAuth return in the query string (?code=), clear of the hash router
  const client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
  const b: Backend & { client: SupabaseClient } = {
    kind: 'supabase', uid: null, canBoard: true, needsLogin: true, client,
    async load() {
      const { data: sess } = await client.auth.getSession();
      b.uid = sess.session?.user.id ?? null; b.needsLogin = !b.uid; b.email = sess.session?.user.email ?? null;
      cleanUrl();
      if (!b.uid) return null;
      // signed in but not yet linked to a PGID: a verified ISB email links itself;
      // anyone else (Google, a personal email) confirms their PGID by hand
      const { data: link } = await client.rpc('my_link');
      let row = Array.isArray(link) ? link[0] : link;
      if (!row) {
        const { data: auto } = await client.rpc('auto_link');
        if (auto?.ok) row = { pgid: auto.pgid, name: auto.name };
      }
      if (!row) { b.needsLogin = true; b.needsLink = true; b.link = null; return null; }
      b.needsLink = false; b.link = { pgid: row.pgid, name: row.name };
      const { data } = await client.from('user_state').select('state').eq('user_id', b.uid).maybeSingle();
      return (data?.state as UserState) ?? null;
    },
    async save(s) {
      if (!b.uid) return;
      const { error } = await client.from('user_state').upsert({ user_id: b.uid, state: s, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (s.profile) await client.from('profiles').upsert({ id: b.uid, name: b.link?.name || s.profile.name, background: s.profile.background, primary_track: s.profile.primary, board_opt_in: s.profile.board, updated_at: new Date().toISOString() });
    },
    async publishBoard(e) {
      if (!b.uid) return;
      if (e) await client.from('leaderboard').upsert({ user_id: b.uid, xp: e.xp, week_xp: e.weekXp, proven: e.proven, streak: e.streak, level: e.level, updated_at: new Date(e.updated).toISOString() });
      else await client.from('leaderboard').delete().eq('user_id', b.uid);
    },
    subscribeBoard(cb) {
      let alive = true;
      const pull = async () => {
        const { data } = await client.from('leaderboard_public').select('*').order('week_xp', { ascending: false }).limit(100);
        if (alive) cb((data || []).map((r: any) => ({ id: r.user_id, name: r.name, xp: r.xp, weekXp: r.week_xp, proven: r.proven, streak: r.streak, level: r.level, updated: Date.parse(r.updated_at) })));
      };
      pull(); const t = setInterval(pull, 30000);
      return () => { alive = false; clearInterval(t); };
    },
    async names() { return {}; },
    async logAttempts(a) {
      if (!b.uid || !a.length) return;
      await client.from('attempts').insert(a.map((x) => ({ user_id: b.uid, t: new Date(x.t).toISOString(), ref: x.ref, topic: x.topic, ok: x.ok, tag: x.tag, src: x.src })));
    },
    async signInOAuth(provider) {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + window.location.pathname, scopes: provider === 'azure' ? 'email openid profile' : undefined, queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined },
      });
      if (error) throw error;
    },
    async sendEmailOtp(email) {
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
    },
    async verifyEmailOtp(email, code) {
      const { data, error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error; b.uid = data.user?.id ?? null; b.needsLogin = !b.uid; b.email = data.user?.email ?? null;
    },
    async lookupPgid(pgid) {
      const { data, error } = await client.rpc('lookup_pgid', { p: pgid });
      if (error) throw error;
      return data as { status: PgidStatus; name?: string };
    },
    async claimPgid(pgid) {
      const { data, error } = await client.rpc('claim_pgid', { p: pgid });
      if (error) throw error;
      const r = data as { ok: boolean; status: string; pgid?: string; name?: string };
      if (r.ok && r.pgid && r.name) { b.link = { pgid: r.pgid, name: r.name }; b.needsLink = false; b.needsLogin = false; }
      return r;
    },
    async signOut() { await client.auth.signOut(); b.uid = null; b.needsLogin = true; b.link = null; },
  };
  return b;
}

// drop the ?code= left behind by an OAuth return so a refresh does not replay it
export let authReturnError = '';
function cleanUrl() {
  try {
    const u = new URL(window.location.href);
    const desc = u.searchParams.get('error_description') || new URLSearchParams(u.hash.replace(/^#\/?/, '')).get('error_description');
    if (desc) authReturnError = desc.replace(/\+/g, ' ');
    if (u.searchParams.has('code') || u.searchParams.has('error') || u.searchParams.has('error_description')) {
      ['code', 'error', 'error_code', 'error_description', 'state'].forEach((k) => u.searchParams.delete(k));
      window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash);
    }
  } catch { /* ignore */ }
}

export async function pickBackend(): Promise<Backend> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) return supabaseBackend(url, key);
  try {
    const a = await Promise.race([artifactBackend(), new Promise<null>((r) => setTimeout(() => r(null), 11000))]);
    if (a) return a;
  } catch { /* fall through */ }
  return localBackend();
}
