// Progress model: everything the portal tracks for one student, plus the rules
// that turn raw activity into topic states, XP, streaks, levels and plan gates.
import lessonsJson from '../data/lessons.json';
import trackerJson from '../data/tracker.json';
import questionsJson from '../data/questions.json';
import { CORE_DRILLS } from '../drills/core';
import { IB_DRILLS } from '../drills/ib';
import { TRACK_DRILLS } from '../drills/tracks';
import { TRACK_DEFS, trackByName, topicInTrack, type TrackDef } from '../data/tracks';
import { GEN_BY_TOPIC } from '../drills/generators';
import type { StaticDrill } from '../drills/types';
import { WEEKS, READINESS, type Check } from '../data/plan';

export type Block = any;
export interface Lesson { id: string; unit: string; title: string; topics: string[]; priority: number; page: number; blocks: Block[] }
export interface Topic { id: string; priority: number; cluster: string; title: string; output: string; page: number }
export interface Question { id: string; sec: string; secTitle: string; n: number; q: string; a: string; level: string; topic: string | null; bank: string; fit?: boolean }

export const LESSONS = lessonsJson as Lesson[];
export const TRACKER = trackerJson as Topic[];
export const QUESTIONS = questionsJson as Question[];
export const STATIC: StaticDrill[] = [...CORE_DRILLS, ...IB_DRILLS, ...TRACK_DRILLS];
export const STATIC_BY_ID: Record<string, StaticDrill> = Object.fromEntries(STATIC.map((d) => [d.id, d]));
export const CORE_TOPICS = TRACKER.filter((t) => t.id.startsWith('CORE'));

// ---------- tracks: the common core plus the student's primary and adjacent tracks
export function tracksOf(s: UserState): TrackDef[] {
  const p = trackByName(s.profile?.primary);
  const a = s.profile?.adjacent ? TRACK_DEFS.find((t) => t.name === s.profile!.adjacent && t.name !== p.name) : undefined;
  return a ? [p, a] : [p];
}
export function scopeTopics(s: UserState): Topic[] {
  const ts = tracksOf(s);
  return TRACKER.filter((t) => t.id.startsWith('CORE') || ts.some((tr) => topicInTrack(t.id, tr)));
}
export const scopeIds = (s: UserState) => scopeTopics(s).map((t) => t.id);
export function readinessFor(s: UserState) {
  const ts = tracksOf(s);
  return { technicals: [...READINESS.technicals, ...ts.map((t) => t.readiness)], other: READINESS.other };
}
export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(TRACKER.map((t) => [t.id, t]));
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
export const LESSONS_BY_TOPIC: Record<string, Lesson[]> = {};
for (const l of LESSONS) for (const t of l.topics) (LESSONS_BY_TOPIC[t] ||= []).push(l);
export const DRILLS_BY_TOPIC: Record<string, StaticDrill[]> = {};
for (const d of STATIC) (DRILLS_BY_TOPIC[d.topic] ||= []).push(d);
export const QUESTIONS_BY_TOPIC: Record<string, Question[]> = {};
for (const q of QUESTIONS) if (q.topic) (QUESTIONS_BY_TOPIC[q.topic] ||= []).push(q);

export type TopicState = 'new' | 'read' | 'drilled' | 'proven' | 'mastered';
export const STATE_ORDER: TopicState[] = ['new', 'read', 'drilled', 'proven', 'mastered'];
export const STATE_LABEL: Record<TopicState, string> = { new: 'Not started', read: 'Read', drilled: 'Drilled', proven: 'Proven', mastered: 'Mastered' };

export interface Attempt { t: number; ref: string; topic: string; ok: boolean; tag?: string | null; src: 'drill' | 'daily' | 'diag' | 'lesson' }
export interface ErrorItem { id: string; topic: string; ref: string; prompt: string; given?: string; correct?: string; tag: string; times: number; first: number; last: number; okDays: string[]; resolved?: number; reviewed?: number }
export interface Card { box: number; due: string; reps: number; lapses: number; last?: string; grade?: number }
export interface Mock { id: string; date: string; kind: string; scores: Record<string, number>; notes: string; partner?: string }
export interface Profile { name: string; pgid?: string; section?: string; background: string; primary: string; adjacent: string; firms: string; startDate: string; dailyTarget: number; board: boolean }
export interface TopicStat { attempts: number; correct: number; days: string[]; firstOk?: string; recent: number[] }
export interface UserState {
  v: 1;
  created: number;
  profile?: Profile;
  lessons: Record<string, { step: number; done: boolean; at?: number }>;
  topics: Record<string, TopicStat>;
  attempts: Attempt[];
  errors: Record<string, ErrorItem>;
  cards: Record<string, Card>;
  xp: { total: number; days: Record<string, number> };
  notes: Record<string, string>;
  manual: Record<string, { done: boolean; link?: string; at?: number }>;
  readiness: Record<string, boolean>;
  mocks: Mock[];
  diag?: { score: number; total: number; at: number; byUnit: Record<string, [number, number]> };
  gates: Record<string, number>;
  errorsReviewedAt?: number;
}

export const emptyState = (): UserState => ({
  v: 1, created: Date.now(), lessons: {}, topics: {}, attempts: [], errors: {}, cards: {},
  xp: { total: 0, days: {} }, notes: {}, manual: {}, readiness: {}, mocks: [], gates: {},
});

// ---------- dates (local calendar days, India time for everyone in the cohort)
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n).getTime());
};
export const daysBetween = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number); const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000);
};

// ---------- XP, levels, streaks
export const XP = { step: 2, lessonDone: 15, correctFirst: 10, correctRetry: 4, genCorrect: 12, card: 3, errorResolved: 15, mock: 25, gate: 60, diag: 30, manual: 10 };
export const DAILY_DRILL_CAP = 300;
export const LEVELS = [
  { name: 'Analyst', at: 0 }, { name: 'Associate', at: 600 }, { name: 'Vice President', at: 1800 },
  { name: 'Director', at: 4000 }, { name: 'Managing Director', at: 7500 },
];
export function levelOf(xp: number) {
  let i = 0; for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].at) i = k;
  const next = LEVELS[i + 1];
  return { idx: i, name: LEVELS[i].name, next: next?.name, from: LEVELS[i].at, to: next?.at ?? LEVELS[i].at, pct: next ? (xp - LEVELS[i].at) / (next.at - LEVELS[i].at) : 1 };
}
export const STREAK_MIN = 20;
export function streakOf(s: UserState, today = dayKey()) {
  let n = 0; let d = today;
  if ((s.xp.days[d] || 0) < STREAK_MIN) d = addDays(d, -1);
  while ((s.xp.days[d] || 0) >= STREAK_MIN) { n++; d = addDays(d, -1); }
  let best = 0, run = 0;
  const keys = Object.keys(s.xp.days).sort();
  let prev: string | null = null;
  for (const k of keys) {
    if ((s.xp.days[k] || 0) < STREAK_MIN) { run = 0; prev = k; continue; }
    run = prev && daysBetween(prev, k) === 1 && (s.xp.days[prev] || 0) >= STREAK_MIN ? run + 1 : 1;
    best = Math.max(best, run); prev = k;
  }
  return { current: n, best: Math.max(best, n), todayDone: (s.xp.days[today] || 0) >= STREAK_MIN };
}
export function addXp(s: UserState, n: number) {
  const d = dayKey();
  s.xp.total += n; s.xp.days[d] = (s.xp.days[d] || 0) + n;
  return n;
}
export function weekXp(s: UserState) {
  let n = 0; const t = dayKey();
  for (let i = 0; i < 7; i++) n += s.xp.days[addDays(t, -i)] || 0;
  return n;
}

// ---------- topic state
export function accuracy(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
export function lessonDoneForTopic(s: UserState, topic: string) {
  const ls = LESSONS_BY_TOPIC[topic] || [];
  return ls.length > 0 && ls.every((l) => s.lessons[l.id]?.done);
}
export function openErrors(s: UserState, topic?: string) {
  return Object.values(s.errors).filter((e) => !e.resolved && (!topic || e.topic === topic));
}
export function topicState(s: UserState, topic: string): TopicState {
  const st = s.topics[topic];
  const read = lessonDoneForTopic(s, topic);
  if (!st || st.correct === 0) return read ? 'read' : 'new';
  const drilled = st.correct >= 3 && accuracy(st.recent.slice(-5)) >= 0.6;
  if (!drilled) return read ? 'read' : 'new';
  const qs = QUESTIONS_BY_TOPIC[topic] || [];
  const bankOk = qs.length === 0 || qs.some((q) => (s.cards[q.id]?.grade || 0) >= 3);
  const proven = st.days.length >= 2 && accuracy(st.recent.slice(-6)) >= 0.8 && bankOk;
  if (!proven) return 'drilled';
  const spaced = st.firstOk ? daysBetween(st.firstOk, st.days[st.days.length - 1]) >= 7 : false;
  const mastered = spaced && openErrors(s, topic).length === 0 && accuracy(st.recent.slice(-4)) === 1;
  return mastered ? 'mastered' : 'proven';
}
export function isWeak(s: UserState, topic: string) {
  const st = s.topics[topic];
  if (openErrors(s, topic).length >= 2) return true;
  return !!st && st.recent.length >= 3 && accuracy(st.recent.slice(-5)) < 0.6;
}
export const atLeast = (a: TopicState, b: TopicState) => STATE_ORDER.indexOf(a) >= STATE_ORDER.indexOf(b);
export function whatNext(s: UserState, topic: string): string {
  const st = topicState(s, topic); const stat = s.topics[topic];
  if (st === 'new') return 'Read the lesson';
  if (st === 'read') return `Get ${Math.max(0, 3 - (stat?.correct || 0))} more drills right`;
  if (st === 'drilled') {
    const needs: string[] = [];
    if ((stat?.days.length || 0) < 2) needs.push('drill again on another day');
    if (accuracy(stat?.recent.slice(-6) || []) < 0.8) needs.push('reach 80% on your last 6');
    const qs = QUESTIONS_BY_TOPIC[topic] || [];
    if (qs.length && !qs.some((q) => (s.cards[q.id]?.grade || 0) >= 3)) needs.push('answer a bank question aloud and grade it Good');
    return needs.length ? 'To prove it: ' + needs.join(', ') : 'Keep going';
  }
  if (st === 'proven') return 'To master it: get it right again 7+ days after your first correct answer, with no open errors';
  return 'Mastered. It will come back in your daily review.';
}

// ---------- recording activity
export interface AttemptResult { xp: number; errorOpened?: boolean; errorResolved?: boolean; stateBefore: TopicState; stateAfter: TopicState }
export function recordAttempt(s: UserState, a: { ref: string; topic: string; ok: boolean; tag?: string | null; prompt: string; given?: string; correct?: string; firstTry: boolean; gen?: boolean; src: Attempt['src'] }): AttemptResult {
  const before = topicState(s, a.topic);
  const d = dayKey();
  s.attempts.push({ t: Date.now(), ref: a.ref, topic: a.topic, ok: a.ok, tag: a.tag ?? null, src: a.src });
  if (s.attempts.length > 400) s.attempts = s.attempts.slice(-400);
  const st = (s.topics[a.topic] ||= { attempts: 0, correct: 0, days: [], recent: [] });
  st.attempts++; st.recent = [...st.recent, a.ok ? 1 : 0].slice(-8);
  let xp = 0; let errorOpened = false; let errorResolved = false;
  const drillXpToday = s.attempts.filter((x) => x.ok && dayKey(x.t) === d).length * 10;
  if (a.ok) {
    st.correct++;
    if (!st.days.includes(d)) st.days = [...st.days, d].slice(-20);
    if (!st.firstOk) st.firstOk = d;
    if (drillXpToday <= DAILY_DRILL_CAP) xp += addXp(s, a.firstTry ? (a.gen ? XP.genCorrect : XP.correctFirst) : XP.correctRetry);
    const e = s.errors[a.ref];
    if (e && !e.resolved) {
      if (!e.okDays.includes(d) && d !== dayKey(e.last)) e.okDays = [...e.okDays, d];
      if (e.okDays.length >= 2) { e.resolved = Date.now(); errorResolved = true; xp += addXp(s, XP.errorResolved); }
    }
  } else {
    const e = s.errors[a.ref];
    if (e) {
      e.times++; e.last = Date.now(); e.okDays = []; e.tag = a.tag || e.tag; e.given = a.given ?? e.given; e.correct = a.correct ?? e.correct; e.prompt = a.prompt || e.prompt; e.resolved = undefined;
    } else {
      s.errors[a.ref] = { id: a.ref, topic: a.topic, ref: a.ref, prompt: a.prompt, given: a.given, correct: a.correct, tag: a.tag || 'concept', times: 1, first: Date.now(), last: Date.now(), okDays: [] };
      errorOpened = true;
    }
  }
  return { xp, errorOpened, errorResolved, stateBefore: before, stateAfter: topicState(s, a.topic) };
}

export const SRS_DAYS = [1, 3, 7, 14, 30, 60];
export function gradeCard(s: UserState, qid: string, grade: 1 | 2 | 3 | 4) {
  const today = dayKey();
  const c = s.cards[qid] || { box: 0, due: today, reps: 0, lapses: 0 };
  let box = c.box;
  if (grade === 1) { box = 0; c.lapses++; }
  else if (grade === 3) box = Math.min(box + 1, SRS_DAYS.length - 1);
  else if (grade === 4) box = Math.min(box + 2, SRS_DAYS.length - 1);
  const wait = grade === 1 ? 1 : grade === 2 ? Math.max(1, Math.round(SRS_DAYS[box] / 2)) : SRS_DAYS[box];
  s.cards[qid] = { box, due: addDays(today, wait), reps: c.reps + 1, lapses: c.lapses, last: today, grade };
  return addXp(s, XP.card);
}
export function dueCards(s: UserState) {
  const t = dayKey();
  return Object.entries(s.cards).filter(([, c]) => c.due <= t).map(([id]) => id);
}

// ---------- plan gates
export function currentWeek(s: UserState) {
  const start = s.profile?.startDate || dayKey(s.created);
  const d = daysBetween(start, dayKey());
  return Math.max(1, Math.min(8, Math.floor(d / 7) + 1));
}
export interface CheckStatus { ok: boolean; label: string; detail: string; progress?: [number, number]; action?: { label: string; to: string } }
export function checkStatus(s: UserState, c: Check): CheckStatus {
  switch (c.kind) {
    case 'diagnostic': return { ok: !!s.diag, label: '20-question diagnostic recorded', detail: s.diag ? `Scored ${s.diag.score}/${s.diag.total}` : 'Takes about 12 minutes', action: s.diag ? undefined : { label: 'Take it', to: '/diagnostic' } };
    case 'targets': {
      const firms = (s.profile?.firms || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
      const ok = !!s.profile?.primary && firms.length >= 5;
      return { ok, label: 'Primary track and five target firms', detail: ok ? `${s.profile?.primary}; ${firms.length} firms` : `${firms.length}/5 firms listed`, progress: [Math.min(firms.length, 5), 5], action: ok ? undefined : { label: 'Add firms', to: '/profile' } };
    }
    case 'note': { const v = (s.notes[c.id] || '').trim(); return { ok: v.length >= 120, label: c.label, detail: v ? `${v.length} characters written` : 'Not started', action: { label: v ? 'Edit' : 'Write', to: `/plan?focus=note-${c.id}` } }; }
    case 'topics': {
      const n = c.ids.filter((id) => atLeast(topicState(s, id), c.state)).length;
      return { ok: n === c.ids.length, label: `${c.ids.length} topic${c.ids.length > 1 ? 's' : ''} at ${STATE_LABEL[c.state]}`, detail: c.ids.join(', '), progress: [n, c.ids.length] };
    }
    case 'manual': { const m = s.manual[c.id]; return { ok: !!m?.done, label: c.label, detail: m?.link ? m.link : c.hint || '' }; }
    case 'mocks': {
      const from = addDays(s.profile?.startDate || dayKey(s.created), (c.fromWeek - 1) * 7);
      const n = s.mocks.filter((m) => m.date >= from).length;
      return { ok: n >= c.min, label: `${c.min} mock${c.min > 1 ? 's' : ''} logged with rubric scores`, detail: `${n} logged since week ${c.fromWeek}`, progress: [Math.min(n, c.min), c.min], action: { label: 'Log a mock', to: '/mocks' } };
    }
    case 'errorsReviewed': {
      const open = openErrors(s); const stale = open.filter((e) => Date.now() - e.last > 7 * 864e5);
      const ok = !!s.errorsReviewedAt && Date.now() - s.errorsReviewedAt < 7 * 864e5 && stale.length === 0;
      return { ok, label: 'Error log reviewed; nothing stale', detail: `${open.length} open, ${stale.length} untouched for 7+ days`, action: { label: 'Open error log', to: '/errors' } };
    }
    case 'bank': { const n = Object.values(s.cards).reduce((a, c) => a + c.reps, 0); return { ok: n >= c.min, label: `${c.min} question bank reviews`, detail: `${n} done`, progress: [Math.min(n, c.min), c.min], action: { label: 'Review', to: '/bank' } }; }
    case 'readiness': {
      const R = readinessFor(s); const all = [...R.technicals, ...R.other]; const n = all.filter((r) => s.readiness[r.id]).length;
      return { ok: n === all.length, label: 'Readiness checklist complete', detail: `${n}/${all.length}`, progress: [n, all.length], action: { label: 'Open checklist', to: '/progress?focus=readiness' } };
    }
  }
}
// A week's gate is the common checks plus the primary track's checks for that week.
export function planWeek(s: UserState, n: number) {
  const w = WEEKS[n - 1]; const tr = tracksOf(s)[0]; const tw = tr.weeks[n - 1];
  return { ...w, track: tr, trackText: tw?.text || '', chapters: [...new Set([...w.chapters, ...(tw?.chapters || [])])], checks: [...w.checks, ...(tw?.checks || [])] };
}
export function weekStatus(s: UserState, n: number) {
  const w = planWeek(s, n); const cs = w.checks.map((c) => checkStatus(s, c));
  return { week: w, checks: cs, done: cs.filter((c) => c.ok).length, total: cs.length, complete: cs.every((c) => c.ok) };
}

// ---------- summary numbers
export function stateCounts(s: UserState, topics = scopeIds(s)) {
  const m: Record<TopicState, number> = { new: 0, read: 0, drilled: 0, proven: 0, mastered: 0 };
  for (const t of topics) m[topicState(s, t)]++;
  return m;
}
export function overallAccuracy(s: UserState, days = 14) {
  const since = Date.now() - days * 864e5;
  const a = s.attempts.filter((x) => x.t >= since);
  return a.length ? a.filter((x) => x.ok).length / a.length : null;
}
export interface BoardEntry { xp: number; weekXp: number; proven: number; streak: number; level: string; updated: number }
export function boardEntry(s: UserState): BoardEntry {
  const c = stateCounts(s);
  return { xp: s.xp.total, weekXp: weekXp(s), proven: c.proven + c.mastered, streak: streakOf(s).current, level: levelOf(s.xp.total).name, updated: Date.now() };
}

// ---------- practice queues
export type QItem = { kind: 'static'; id: string; topic: string } | { kind: 'gen'; id: string; topic: string; seed: number } | { kind: 'card'; id: string; topic: string | null };
const shuffle = <T,>(a: T[], seed = Date.now()) => { const r = [...a]; let x = seed % 2147483647; for (let i = r.length - 1; i > 0; i--) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export function topicQueue(s: UserState, topic: string, n = 8): QItem[] {
  const st = (DRILLS_BY_TOPIC[topic] || []).map((d) => ({ kind: 'static' as const, id: d.id, topic }));
  const gens = (GEN_BY_TOPIC[topic] || []).map((g, i) => ({ kind: 'gen' as const, id: g, topic, seed: Date.now() + i * 7919 }));
  // unseen or wrong first
  const seen = new Set(s.attempts.filter((a) => a.ok).map((a) => a.ref));
  const fresh = st.filter((d) => !seen.has(d.id)); const old = st.filter((d) => seen.has(d.id));
  // static items first (unseen before seen), with a generated numeric problem slotted in every third place
  const statics = [...shuffle(fresh), ...shuffle(old)];
  const out: QItem[] = []; let g = 0; let k = 0;
  while (out.length < n && (k < statics.length || gens.length)) {
    if (gens.length && (out.length % 3 === 1 || k >= statics.length)) { const base = gens[g % gens.length]; out.push({ ...base, seed: base.seed + 104729 * g }); g++; }
    else if (k < statics.length) out.push(statics[k++]);
    if (!gens.length && k >= statics.length) break;
  }
  return out.slice(0, n);
}
export function focusTopics(s: UserState): string[] {
  const w = planWeek(s, currentWeek(s)); const scope = scopeTopics(s);
  const ids = new Set<string>();
  for (const c of w.checks) if (c.kind === 'topics') c.ids.forEach((i) => ids.add(i));
  for (const u of w.chapters) scope.filter((t) => LESSONS_BY_TOPIC[t.id]?.some((l) => l.unit === u)).forEach((t) => ids.add(t.id));
  return [...ids].filter((t) => !atLeast(topicState(s, t), 'proven'));
}
export function dailyQueue(s: UserState, n = 10): QItem[] {
  const out: QItem[] = [];
  for (const id of dueCards(s).slice(0, 3)) out.push({ kind: 'card', id, topic: QUESTIONS.find((q) => q.id === id)?.topic || null });
  const errs = openErrors(s).sort((a, b) => a.last - b.last).slice(0, 3);
  for (const e of errs) {
    if (STATIC_BY_ID[e.ref]) out.push({ kind: 'static', id: e.ref, topic: e.topic });
    else if (e.ref.startsWith('gen:')) out.push({ kind: 'gen', id: e.ref.slice(4), topic: e.topic, seed: Date.now() + out.length });
  }
  const scope = scopeIds(s);
  const weak = scope.filter((t) => isWeak(s, t));
  const pool = [...new Set([...weak, ...focusTopics(s), ...scope.filter((t) => atLeast(topicState(s, t), 'read') && !atLeast(topicState(s, t), 'mastered'))])];
  const topics = pool.length ? pool : ['CORE-01', 'CORE-04', 'CORE-17'];
  let i = 0;
  while (out.length < n && i < 60) {
    const t = topics[i % topics.length];
    const q = topicQueue(s, t, 3)[Math.floor(i / topics.length) % 3];
    if (q && !out.some((o) => o.kind === q.kind && o.id === q.id && q.kind !== 'gen')) out.push(q);
    i++;
  }
  return out.slice(0, n);
}
export const DIAG_IDS = ['c01a', 'c02b', 'c03b', 'c04b', 'c05c', 'c06a', 'c07d', 'c10b', 'c11a', 'c14b', 'c15b', 'c17a', 'c17c', 'c18b', 'c19c', 'c20a', 'c22a', 'c24a', 'c26a', 'c21b'];
