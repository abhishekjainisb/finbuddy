// IB 400: interview question set. Content loads lazily (src/data/ib400.json); the
// learner's marks, notes and spaced-review schedule live in UserState.ib.
import { addDays, addXp, dayKey, recordAttempt, SRS_DAYS, TOPIC_BY_ID, type UserState } from './state';

export interface IbSection { id: string; label: string; part: string; n: number }
export interface IbItem { id: string; s: string; q: string; p: string[]; a: string; t: string; in: string; tp: string }
export interface IbData { sections: IbSection[]; items: IbItem[] }
export interface IbCard { star?: 1; flag?: 1; nailed?: 1; note?: string; seen?: number; last?: string; due?: string; box?: number; score?: number }

let cache: Promise<IbData> | null = null;
export const loadIb = () => (cache ||= import('../data/ib400.json').then((m) => m.default as unknown as IbData));

export const ibCard = (s: UserState, id: string): IbCard => s.ib?.[id] || {};
const put = (s: UserState, id: string, f: (c: IbCard) => void) => { s.ib ||= {}; const c = { ...(s.ib[id] || {}) }; f(c); s.ib[id] = c; };

export function toggleMark(s: UserState, id: string, k: 'star' | 'flag' | 'nailed') {
  put(s, id, (c) => { if (c[k]) delete c[k]; else c[k] = 1; });
}
export function setNote(s: UserState, id: string, note: string) {
  put(s, id, (c) => { const n = note.trim().slice(0, 280); if (n) c.note = n; else delete c.note; });
}

// Score = key points hit / total. All points: the gap grows (1, 3, 7, 14, 30, 60 days).
// Half or more: same gap. Less than half: back to tomorrow. Technical questions also
// count toward the tracker topic (and misses go to the error log), once per question per day.
export function reviewIb(s: UserState, it: IbItem, hit: number): { xp: number; days: number; score: number } {
  const total = it.p.length; const score = total ? hit / total : 0; const today = dayKey();
  const c = ibCard(s, it.id); const first = c.last !== today;
  let box = c.box ?? -1;
  if (score >= 0.999) box = Math.min(box + 1, SRS_DAYS.length - 1);
  else if (score >= 0.5) box = Math.max(box, 0);
  else box = -1;
  const days = box < 0 ? 1 : SRS_DAYS[box];
  put(s, it.id, (x) => { x.box = Math.max(box, 0); x.due = addDays(today, days); x.last = today; x.seen = (x.seen || 0) + 1; x.score = Math.round(score * 100) / 100; if (box < 0) x.box = 0; });
  let xp = 0;
  if (first) {
    if (it.tp && TOPIC_BY_ID[it.tp]) {
      const r = recordAttempt(s, {
        ref: `ib:${it.id}`, topic: it.tp, ok: score >= 0.75, tag: score >= 0.75 ? null : 'concept', firstTry: true, src: 'drill',
        prompt: `IB 400: ${it.q}`, given: `Hit ${hit} of ${total} key points`, correct: it.p.join('; '),
      });
      xp = r.xp;
      if (score < 0.75 && score >= 0.5) xp += addXp(s, 3);
    } else xp = addXp(s, score >= 0.75 ? 6 : 3);
  }
  return { xp, days, score };
}

export function ibStats(s: UserState, ids?: string[]) {
  const t = dayKey(); const all = s.ib || {};
  const keys = ids || Object.keys(all);
  let seen = 0, nailed = 0, due = 0, star = 0, flag = 0;
  for (const id of keys) {
    const c = all[id]; if (!c) continue;
    if (c.seen) seen++; if (c.nailed) nailed++; if (c.star) star++; if (c.flag) flag++;
    if (c.due && c.due <= t && !c.nailed) due++;
  }
  return { seen, nailed, due, star, flag };
}
export const ibDueIds = (s: UserState) => {
  const t = dayKey();
  return Object.entries(s.ib || {}).filter(([, c]) => c.due && c.due <= t && !c.nailed).sort((a, b) => (a[1].due! < b[1].due! ? -1 : 1)).map(([id]) => id);
};
