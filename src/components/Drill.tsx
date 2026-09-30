// One practice item of any kind: multiple choice, multi-select, ordering, sorting,
// generated numeric problems with error diagnosis, and question-bank flashcards.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { STATIC_BY_ID, QUESTIONS, TOPIC_BY_ID, STATE_LABEL, type QItem, type TopicState } from '../lib/state';
import { makeGen, GENERATORS, TAG_LABELS, type GenOut } from '../drills/generators';
import type { StaticDrill } from '../drills/types';
import { Icon, Inline, shuffled, hashStr } from './ui';

export interface Outcome { ref: string; topic: string; ok: boolean; tag?: string | null; prompt: string; given?: string; correct?: string; gen?: boolean }
export interface Feedback { xp: number; errorOpened?: boolean; errorResolved?: boolean; before?: TopicState; after?: TopicState }

interface Props {
  item: QItem;
  firstTry: boolean;
  onAnswer: (o: Outcome) => Feedback;
  onGrade: (qid: string, g: 1 | 2 | 3 | 4) => number;
  onNext: () => void;
  nonce?: number;
  hideTopic?: boolean;
}

export function Drill(p: Props) {
  const { item } = p;
  if (item.kind === 'card') return <CardDrill key={item.id + p.nonce} {...p} />;
  if (item.kind === 'gen') return <GenDrill key={item.id + item.seed + String(p.nonce)} {...p} />;
  const d = STATIC_BY_ID[item.id];
  if (!d) return <div className="empty">This item is no longer in the bank.</div>;
  return <StaticDrillView key={d.id + String(p.nonce)} d={d} {...p} />;
}

function TopicTag({ topic, hide }: { topic: string | null; hide?: boolean }) {
  if (!topic || hide) return null;
  const t = TOPIC_BY_ID[topic];
  return <Link to={`/topic/${topic}`} className="chip id" title={t?.title}>{topic} · {t?.cluster}</Link>;
}

function useKeys(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler); ref.current = handler;
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT') && e.key !== 'Enter') return;
      ref.current(e);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);
}

function FeedbackBox({ ok, why, fb, extra, onNext }: { ok: boolean; why: string; fb: Feedback | null; extra?: ReactNode; onNext: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus({ preventScroll: true }); }, []);
  const promoted = fb?.before && fb.after && fb.before !== fb.after;
  return (
    <div className={`feedback ${ok ? 'ok' : 'no'}`} role="status">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <h4 style={{ color: ok ? 'var(--good)' : 'var(--bad)' }}>{ok ? 'Correct' : 'Not quite'}</h4>
        <div className="row small" style={{ gap: 8 }}>
          {fb && fb.xp > 0 && <span className="chip" style={{ color: 'var(--good)' }}>+{fb.xp} XP</span>}
          {fb?.errorOpened && <span className="chip weak">Added to error log</span>}
          {fb?.errorResolved && <span className="chip" style={{ color: 'var(--good)' }}>Error resolved</span>}
          {promoted && <span className="chip p1">{STATE_LABEL[fb!.before!]} → {STATE_LABEL[fb!.after!]}</span>}
        </div>
      </div>
      {extra}
      <p><Inline t={why} /></p>
      <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <button ref={btn} className="btn primary" onClick={onNext}>Continue <Icon n="arrowR" s={15} /></button>
      </div>
    </div>
  );
}

// ---------- static drills
function StaticDrillView({ d, firstTry, onAnswer, onNext, hideTopic }: Props & { d: StaticDrill }) {
  const seed = useMemo(() => hashStr(d.id) ^ (Date.now() & 0xffff), [d.id]);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const done = ok !== null;

  // mcq / multi
  const order = useMemo(() => ('options' in d ? shuffled(d.options.map((_, i) => i), seed) : []), [d, seed]);
  const [pick, setPick] = useState<number | null>(null);
  const [multi, setMulti] = useState<Set<number>>(new Set());
  // order
  const [seq, setSeq] = useState<number[]>(() => {
    if (d.kind !== 'order') return [];
    let s = shuffled(d.items.map((_, i) => i), seed);
    if (s.every((v, i) => v === i)) s = [...s.slice(1), s[0]];
    return s;
  });
  // sort
  const sortOrder = useMemo(() => (d.kind === 'sort' ? shuffled(d.items.map((_, i) => i), seed) : []), [d, seed]);
  const [bins, setBins] = useState<Record<number, number>>({});

  const finish = (good: boolean, tag: string | null, given: string, correct: string) => {
    setOk(good);
    setFb(onAnswer({ ref: d.id, topic: d.topic, ok: good, tag: good ? null : tag, prompt: d.q, given, correct }));
  };
  const checkMcq = (i: number) => {
    if (done || d.kind !== 'mcq') return;
    setPick(i);
    const good = i === d.answer;
    finish(good, d.tags?.[i] || 'concept', d.options[i], d.options[d.answer]);
  };
  const checkMulti = () => {
    if (d.kind !== 'multi') return;
    const want = new Set(d.answers);
    const good = want.size === multi.size && [...want].every((x) => multi.has(x));
    finish(good, 'concept', [...multi].map((i) => d.options[i]).join('; ') || '(none)', d.answers.map((i) => d.options[i]).join('; '));
  };
  const checkOrder = () => {
    if (d.kind !== 'order') return;
    const good = seq.every((v, i) => v === i);
    finish(good, 'concept', seq.map((i) => d.items[i]).join(' → '), d.items.join(' → '));
  };
  const checkSort = () => {
    if (d.kind !== 'sort') return;
    const good = d.items.every((it, i) => bins[i] === it[1]);
    const wrong = d.items.map((it, i) => (bins[i] !== it[1] ? `${it[0]}: ${d.buckets[bins[i]] ?? '?'}` : null)).filter(Boolean);
    finish(good, 'concept', wrong.join('; '), d.items.map((it) => `${it[0]}: ${d.buckets[it[1]]}`).join('; '));
  };

  useKeys((e) => {
    if (done) return;
    const n = parseInt(e.key);
    if (d.kind === 'mcq' && n >= 1 && n <= order.length) { e.preventDefault(); checkMcq(order[n - 1]); }
    if (d.kind === 'multi' && n >= 1 && n <= order.length) { e.preventDefault(); const k = order[n - 1]; setMulti((m) => { const x = new Set(m); if (x.has(k)) x.delete(k); else x.add(k); return x; }); }
    if (e.key === 'Enter') {
      if (d.kind === 'multi' && multi.size) checkMulti();
      if (d.kind === 'order') checkOrder();
      if (d.kind === 'sort' && Object.keys(bins).length === d.items.length) checkSort();
    }
  });

  const move = (from: number, to: number) => setSeq((s) => { if (to < 0 || to >= s.length) return s; const x = [...s]; const [v] = x.splice(from, 1); x.splice(to, 0, v); return x; });

  return (
    <div>
      <div className="row" style={{ marginBottom: 10, gap: 8 }}>
        <TopicTag topic={d.topic} hide={hideTopic} />
        <span className="chip">{d.kind === 'mcq' ? 'Choose one' : d.kind === 'multi' ? 'Choose all that apply' : d.kind === 'order' ? 'Put in order' : 'Sort into groups'}</span>
        {!firstTry && <span className="chip weak">Second look</span>}
      </div>
      <div className="q"><Inline t={d.q} /></div>

      {(d.kind === 'mcq' || d.kind === 'multi') && (
        <div className="opts">
          {order.map((oi, k) => {
            const isAns = d.kind === 'mcq' ? oi === d.answer : d.answers.includes(oi);
            const chosen = d.kind === 'mcq' ? pick === oi : multi.has(oi);
            let cls = 'opt';
            if (done) { if (isAns) cls += ' right'; else if (chosen) cls += ' wrong'; }
            else if (chosen) cls += ' sel';
            return (
              <button key={oi} className={cls} disabled={done} aria-pressed={chosen}
                onClick={() => d.kind === 'mcq' ? checkMcq(oi) : setMulti((m) => { const x = new Set(m); if (x.has(oi)) x.delete(oi); else x.add(oi); return x; })}>
                <span className="k">{done && isAns ? <Icon n="check" s={13} /> : done && chosen ? <Icon n="x" s={13} /> : k + 1}</span>
                <span><Inline t={d.options[oi]} /></span>
              </button>
            );
          })}
          {d.kind === 'multi' && !done && <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn primary" disabled={!multi.size} onClick={checkMulti}>Check</button></div>}
        </div>
      )}

      {d.kind === 'order' && (
        <>
          <OrderList items={d.items} seq={seq} move={move} done={done} />
          {!done && <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}><span className="small muted">Drag the handle, or use the arrows.</span><button className="btn primary" onClick={checkOrder}>Check order</button></div>}
        </>
      )}

      {d.kind === 'sort' && (
        <>
          <div className="sortgrid">
            {sortOrder.map((ii) => {
              const it = d.items[ii]; const b = bins[ii];
              const cls = done ? (b === it[1] ? 'right' : 'wrong') : '';
              return (
                <div key={ii} className={`sortrow ${cls}`}>
                  <div><Inline t={it[0]} />{done && b !== it[1] && <div className="small" style={{ color: 'var(--good)', fontWeight: 600 }}>→ {d.buckets[it[1]]}</div>}</div>
                  <div className="seg" role="radiogroup">
                    {d.buckets.map((bk, bi) => (
                      <button key={bi} className={b === bi ? 'on' : ''} disabled={done} role="radio" aria-checked={b === bi} onClick={() => setBins((x) => ({ ...x, [ii]: bi }))}>{bk}</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {!done && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}><span className="small muted" style={{ marginRight: 'auto' }}>{Object.keys(bins).length}/{d.items.length} placed</span><button className="btn primary" disabled={Object.keys(bins).length < d.items.length} onClick={checkSort}>Check</button></div>}
        </>
      )}

      {done && <FeedbackBox ok={!!ok} why={d.why} fb={fb} onNext={onNext}
        extra={!ok && d.kind === 'mcq' && pick !== null && d.tags?.[pick] ? <p className="small" style={{ marginBottom: 6 }}><b>Likely slip:</b> {TAG_LABELS[d.tags[pick]!] || d.tags[pick]}</p> : undefined} />}
    </div>
  );
}

function OrderList({ items, seq, move, done }: { items: string[]; seq: number[]; move: (a: number, b: number) => void; done: boolean }) {
  const [drag, setDrag] = useState<number | null>(null);
  const [dy, setDy] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const start = useRef({ y: 0, idx: 0 });
  const onDown = (e: React.PointerEvent, idx: number) => {
    if (done) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, idx }; setDrag(idx); setDy(0);
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag === null) return;
    const y = e.clientY; setDy(y - start.current.y);
    const rects = refs.current.map((r) => r?.getBoundingClientRect());
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]; if (!r || i === drag) continue;
      const mid = r.top + r.height / 2;
      if ((i < drag && y < mid) || (i > drag && y > mid)) {
        move(drag, i); start.current.y += (i < drag ? -1 : 1) * (r.height + 8); setDy(y - start.current.y); setDrag(i); break;
      }
    }
  };
  const onUp = () => { setDrag(null); setDy(0); };
  return (
    <div className="ordlist" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {seq.map((v, i) => {
        const cls = done ? (v === i ? 'right' : 'wrong') : drag === i ? 'drag' : '';
        return (
          <div key={v} ref={(el) => { refs.current[i] = el; }} className={`orditem ${cls}`} style={drag === i ? { transform: `translateY(${dy}px)`, zIndex: 2, position: 'relative' } : undefined}>
            {!done && <span className="grip" onPointerDown={(e) => onDown(e, i)} aria-hidden="true"><Icon n="grip" s={16} /></span>}
            <span className="n">{done ? (v === i ? <Icon n="check" s={12} /> : v + 1) : i + 1}</span>
            <span className="t"><Inline t={items[v]} /></span>
            {!done && (
              <span className="mv">
                <button aria-label="Move up" onClick={() => move(i, i - 1)} disabled={i === 0}>▲</button>
                <button aria-label="Move down" onClick={() => move(i, i + 1)} disabled={i === seq.length - 1}>▼</button>
              </span>
            )}
          </div>
        );
      })}
      {done && <div className="small muted">Numbers on wrong rows show where each item belongs.</div>}
    </div>
  );
}

// ---------- generated numeric drills
export function parseNum(v: string): number | undefined {
  let t = v.trim().replace(/rs\.?/i, '').replace(/[,\s%x×]/gi, '');
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t === '' || t === '-' || t === '.') return undefined;
  const n = Number(t.replace('−', '-'));
  return Number.isFinite(n) ? (neg ? -n : n) : undefined;
}
export const within = (v: number | undefined, ans: number, tol?: number) => v !== undefined && Math.abs(v - ans) <= Math.max(tol ?? 0.02, Math.abs(ans) * 0.01);
const show = (x: number) => x.toLocaleString('en-IN', { maximumFractionDigits: Math.abs(x) < 10 ? 3 : 2 });

function GenDrill({ item, firstTry, onAnswer, onNext, hideTopic }: Props) {
  const g = item as Extract<QItem, { kind: 'gen' }>;
  const out: GenOut = useMemo(() => makeGen(g.id, g.seed), [g.id, g.seed]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<boolean | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus({ preventScroll: true }); }, []);
  const parsed = Object.fromEntries(out.fields.map((f) => [f.key, parseNum(vals[f.key] || '')]));
  const filled = out.fields.every((f) => parsed[f.key] !== undefined);
  const check = (reveal = false) => {
    if (ok !== null) return;
    const good = !reveal && out.fields.every((f) => within(parsed[f.key], f.answer, f.tol));
    const t = good ? null : reveal ? 'concept' : (out.diagnose?.(parsed) || 'arithmetic');
    setTag(t); setOk(good);
    setFb(onAnswer({
      ref: 'gen:' + g.id, topic: g.topic, ok: good, tag: t, gen: true, prompt: out.q,
      given: out.fields.map((f) => `${f.label}: ${vals[f.key] || '?'}`).join('; '),
      correct: out.fields.map((f) => `${f.label}: ${show(f.answer)}${f.unit ? ' ' + f.unit : ''}`).join('; '),
    }));
  };
  return (
    <div>
      <div className="row" style={{ marginBottom: 10, gap: 8 }}>
        <TopicTag topic={g.topic} hide={hideTopic} />
        <span className="chip"><Icon n="sigma" s={12} /> {GENERATORS[g.id]?.title || 'Numbers'}</span>
        <span className="chip">Fresh numbers every time</span>
        {!firstTry && <span className="chip weak">Second look</span>}
      </div>
      <div className="q"><Inline t={out.q} /></div>
      <form className="numfields" onSubmit={(e) => { e.preventDefault(); if (filled) check(); }}>
        {out.fields.map((f, i) => {
          const st = ok === null ? '' : within(parsed[f.key], f.answer, f.tol) ? 'right' : 'wrong';
          return (
            <div key={f.key} className={`numfield ${st}`}>
              <label htmlFor={`f-${f.key}`}>{f.label}{f.unit ? <span className="muted"> ({f.unit})</span> : null}</label>
              <div className="numin">
                <button type="button" className="pm" tabIndex={-1} disabled={ok !== null} aria-label="Flip the sign" title="Flip the sign (phone keypads have no minus key)"
                  onClick={() => setVals((v) => { const x = (v[f.key] || '').trim(); return { ...v, [f.key]: x.startsWith('-') || x.startsWith('−') ? x.slice(1) : '-' + x }; })}>±</button>
                <input id={`f-${f.key}`} ref={i === 0 ? first : undefined} type="text" inputMode="decimal" autoComplete="off" value={vals[f.key] || ''} disabled={ok !== null}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))} placeholder="0" />
              </div>
              {ok !== null && st === 'wrong' && <div className="ans">Answer: <b>{show(f.answer)}</b></div>}
            </div>
          );
        })}
        {ok === null && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn ghost sm" onClick={() => check(true)}>Show me</button>
            <div className="row"><span className="small muted hide-sm">Within 1% counts. Press Enter to check.</span><button className="btn primary" disabled={!filled} type="submit">Check</button></div>
          </div>
        )}
      </form>
      {ok !== null && <FeedbackBox ok={ok} why={out.why} fb={fb} onNext={onNext}
        extra={!ok && tag && tag !== 'concept' ? <p className="small" style={{ marginBottom: 6 }}><b>Diagnosis:</b> {TAG_LABELS[tag] || tag}</p> : undefined} />}
    </div>
  );
}

// ---------- question bank flashcard: answer aloud, then grade yourself
function CardDrill({ item, onGrade, onNext, hideTopic }: Props) {
  const q = QUESTIONS.find((x) => x.id === item.id);
  const [shown, setShown] = useState(false);
  const [sec, setSec] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => { if (!run) return; const t = window.setInterval(() => setSec((x) => x + 1), 1000); return () => window.clearInterval(t); }, [run]);
  useKeys((e) => {
    if (e.key === ' ' && !shown) { e.preventDefault(); setShown(true); setRun(false); }
    if (shown && ['1', '2', '3', '4'].includes(e.key)) { onGrade(item.id, Number(e.key) as 1); onNext(); }
  });
  if (!q) return <div className="empty">Question not found.</div>;
  const limit = q.level === 'BASIC' ? 60 : 120;
  return (
    <div>
      <div className="row" style={{ marginBottom: 10, gap: 8 }}>
        <TopicTag topic={q.topic} hide={hideTopic} />
        <span className="chip">{q.level.toLowerCase()}</span>
        <span className="chip id">{q.sec} · Q{q.n}</span>
      </div>
      <div className="q serif" style={{ fontSize: 21, fontWeight: 600 }}>{q.q}</div>
      {!shown && (
        <div className="flash stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <div className="small muted">Answer out loud as if the interviewer is waiting. Aim for {limit === 60 ? 'under a minute' : 'about two minutes'}.</div>
          <div className="timer" style={{ color: sec > limit ? 'var(--bad)' : undefined }}>{String(Math.floor(sec / 60)).padStart(1, '0')}:{String(sec % 60).padStart(2, '0')}</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setRun((r) => !r)}><Icon n={run ? 'x' : 'timer'} s={15} /> {run ? 'Pause' : sec ? 'Resume' : 'Start timer'}</button>
            <button className="btn primary" onClick={() => { setShown(true); setRun(false); }}>Show model answer <span className="kbd hide-sm">space</span></button>
          </div>
        </div>
      )}
      {shown && (
        <div className="stack">
          <div className="callout worked" style={{ margin: 0 }}>
            <div className="ctitle">Model answer{sec ? ` · you took ${sec}s` : ''}</div>
            <div className="prose"><p><Inline t={q.a} /></p></div>
          </div>
          <div className="small muted">How close was yours? Grading schedules the next review.</div>
          <div className="grades">
            {([[1, 'Missed', 'again tomorrow'], [2, 'Shaky', 'soon'], [3, 'Good', 'in a few days'], [4, 'Easy', 'much later']] as const).map(([g, l, s]) => (
              <button key={g} className={`g${g}`} onClick={() => { onGrade(q.id, g); onNext(); }}>{l}<small>{s}</small></button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
