// Step-based lesson player. The guide section is split into short steps; quick
// checks sit between them; finishing marks the section's topics as read.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import {
  LESSONS, LESSON_BY_ID, TOPIC_BY_ID, DRILLS_BY_TOPIC, addXp, XP, recordAttempt, topicState, whatNext, STATE_LABEL,
  type Block, type Lesson, type QItem,
} from '../lib/state';
import { Blocks } from '../components/Blocks';
import { Drill, type Outcome } from '../components/Drill';
import { Bar, Icon, StateDot, hashStr } from '../components/ui';
import { UNITS } from './Learn';
import { LabLink } from './Lab';

type Step = { kind: 'content'; blocks: Block[] } | { kind: 'check'; item: QItem } | { kind: 'end' };

const weight = (b: Block): number => {
  if (b.kind === 'table') return 380 + b.rows.length * 70;
  if (b.kind === 'fig') return 480;
  if (b.kind === 'facts') return 600;
  if (b.kind === 'box') return b.items.reduce((a: number, x: Block) => a + weight(x), 120);
  return (b.text || '').length;
};

export function buildSteps(l: Lesson): Step[] {
  const chunks: Block[][] = []; let cur: Block[] = []; let w = 0;
  const flush = () => { if (cur.length) chunks.push(cur); cur = []; w = 0; };
  for (const b of l.blocks) {
    const bw = weight(b);
    const bigBox = b.kind === 'box' && bw > 420;
    if (bigBox || (w >= 450 && w + bw > 1150)) flush();
    cur.push(b); w += bw;
    if (bigBox) flush();
  }
  flush();
  // merge a trailing tiny chunk into the one before
  for (let i = chunks.length - 1; i > 0; i--) if (chunks[i].reduce((a, b) => a + weight(b), 0) < 180 && chunks[i][0].kind !== 'box') { chunks[i - 1].push(...chunks[i]); chunks.splice(i, 1); }
  const steps: Step[] = chunks.map((blocks) => ({ kind: 'content', blocks }));
  const pool = l.topics.flatMap((t) => DRILLS_BY_TOPIC[t] || []);
  const seed = hashStr(l.id);
  const pickN = Math.min(pool.length, steps.length >= 5 ? 3 : steps.length >= 3 ? 2 : 1);
  const picks = [...pool].sort((a, b) => ((hashStr(a.id) ^ seed) % 997) - ((hashStr(b.id) ^ seed) % 997)).slice(0, pickN);
  // spread checks after content steps, the last one right before the end
  const n = steps.length;
  picks.map((d, k) => ({ d, at: Math.max(1, Math.round(((k + 1) * n) / picks.length)) }))
    .reverse().forEach(({ d, at }) => steps.splice(at, 0, { kind: 'check', item: { kind: 'static', id: d.id, topic: d.topic } }));
  steps.push({ kind: 'end' });
  return steps;
}

export default function LessonPage() {
  const { id } = useParams();
  const l = id ? LESSON_BY_ID[id] : undefined;
  if (!l) return <div className="content"><div className="empty">Section not found. <Link to="/learn">Back to Learn</Link></div></div>;
  return <Player key={l.id} l={l} />;
}

function Player({ l }: { l: Lesson }) {
  const { s, mutate, toast } = useStore();
  const nav = useNavigate();
  const steps = useMemo(() => buildSteps(l), [l]);
  const ls = s.lessons[l.id];
  const [mode, setMode] = useState<'steps' | 'page'>('steps');
  const [i, setI] = useState(() => (ls && !ls.done ? Math.min(ls.step, steps.length - 1) : 0));
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const unit = UNITS.find((u) => u.id === l.unit)!;
  const idx = LESSONS.indexOf(l); const nextL = LESSONS[idx + 1];
  const step = steps[i];
  const blocked = step.kind === 'check' && !answered[i];

  const complete = () => mutate((d) => {
    const cur = d.lessons[l.id] || { step: 0, done: false };
    if (!cur.done) {
      const before = l.topics.map((t) => topicState(d, t));
      d.lessons[l.id] = { step: steps.length - 1, done: true, at: Date.now() };
      addXp(d, XP.lessonDone);
      toast(`${l.id} finished. +${XP.lessonDone} XP`, 'good');
      l.topics.forEach((t, k) => { const a = topicState(d, t); if (a !== before[k]) toast(`${t} is now ${STATE_LABEL[a]}`, 'info'); });
    } else d.lessons[l.id] = { ...cur, at: Date.now() };
  });

  const go = (to: number) => {
    if (to < 0 || to >= steps.length) return;
    setI(to);
    if (steps[to].kind === 'end') complete();
    else mutate((d) => {
      const cur = d.lessons[l.id] || { step: 0, done: false };
      if (to > cur.step && !cur.done) { addXp(d, XP.step); d.lessons[l.id] = { ...cur, step: to, at: Date.now() }; }
      else d.lessons[l.id] = { ...cur, at: Date.now() };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (mode !== 'steps' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tg.tagName)) return;
      if (e.key === 'ArrowRight' && !blocked) go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });

  const onAnswer = (o: Outcome) => {
    const r = mutate((d) => recordAttempt(d, { ...o, firstTry: true, src: 'lesson' }));
    return { xp: r.xp, errorOpened: r.errorOpened, errorResolved: r.errorResolved, before: r.stateBefore, after: r.stateAfter };
  };

  const header = (
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
      <Link to={`/learn/${l.unit}`} className="btn ghost sm" style={{ paddingLeft: 0 }}><Icon n="arrowL" s={15} /> {unit.id} {unit.title}</Link>
      <div className="seg">
        <button className={mode === 'steps' ? 'on' : ''} onClick={() => setMode('steps')}>Steps</button>
        <button className={mode === 'page' ? 'on' : ''} onClick={() => setMode('page')}>Full page</button>
      </div>
    </div>
  );
  const title = (
    <div style={{ marginBottom: 14 }}>
      <div className="kicker">{unit.kicker} · guide p. {l.page}</div>
      <h1 className="sec-title" style={{ fontSize: 26, marginTop: 6 }}><span className="sec-id">{l.id}</span>{l.title}</h1>
      <div className="row small" style={{ gap: 6 }}>
        {l.priority === 1 && <span className="chip p1">P1 · most tested</span>}
        {l.topics.map((t) => <Link key={t} to={`/topic/${t}`} className="chip" title={TOPIC_BY_ID[t]?.title}><StateDot st={topicState(s, t)} /> {t}</Link>)}
      </div>
    </div>
  );

  if (mode === 'page') {
    return (
      <div className="content narrow">
        {header}{title}
        <LabLink topics={l.topics} style={{ marginBottom: 14 }} />
        <div className="card" style={{ padding: '24px 26px' }}>
          <Blocks blocks={l.blocks} taskKey={l.id} />
          <div className="row" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            {!ls?.done && <button className="btn primary" onClick={complete}><Icon n="check" s={15} /> Mark as read</button>}
            {l.topics[0] && <Link className="btn" to={`/practice/run?topic=${l.topics.join(',')}`}><Icon n="target" s={15} /> Practise</Link>}
            {nextL && <Link className="btn" to={`/lesson/${nextL.id}`}>Next: {nextL.id} <Icon n="arrowR" s={15} /></Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content narrow">
      {header}
      <div className="player-top" style={{ marginBottom: 14 }}>
        <Bar v={(i + 1) / steps.length} good />
        <span className="small muted tnum">{i + 1}/{steps.length}</span>
      </div>
      {i === 0 && title}
      {i === 0 && <LabLink topics={l.topics} style={{ marginBottom: 14 }} />}
      <div className="stepcard" key={i}>
        {i > 0 && step.kind === 'content' && <div className="kicker" style={{ marginBottom: 10 }}>{l.id} {l.title}</div>}
        {step.kind === 'content' && <Blocks blocks={step.blocks} taskKey={`${l.id}:${i}`} />}
        {step.kind === 'check' && (
          <>
            <div className="kicker" style={{ marginBottom: 10, color: 'var(--c-drill)' }}>Quick check</div>
            <Drill item={step.item} firstTry onAnswer={(o) => { const r = onAnswer(o); setAnswered((a) => ({ ...a, [i]: true })); return r; }} onGrade={() => 0} onNext={() => go(i + 1)} hideTopic />
          </>
        )}
        {step.kind === 'end' && <EndCard l={l} nextId={nextL?.id} onReview={() => setI(0)} />}
      </div>
      {step.kind !== 'end' && (
        <div className="player-nav" style={{ marginTop: 14 }}>
          <button className="btn" disabled={i === 0} onClick={() => go(i - 1)}><Icon n="arrowL" s={15} /> Back</button>
          <span className="small muted hide-sm">Use ← and → to move</span>
          {step.kind === 'check' && !answered[i] ? <button className="btn ghost" onClick={() => { setAnswered((a) => ({ ...a, [i]: true })); go(i + 1); }}>Skip check</button>
            : step.kind === 'content' && <button className="btn primary" onClick={() => go(i + 1)}>{steps[i + 1]?.kind === 'end' ? 'Finish section' : 'Continue'} <Icon n="arrowR" s={15} /></button>}
        </div>
      )}
      {step.kind === 'end' && <div className="row" style={{ marginTop: 14 }}><button className="btn ghost sm" onClick={() => nav(`/learn/${l.unit}`)}>Back to {l.unit}</button></div>}
    </div>
  );
}

function EndCard({ l, nextId, onReview }: { l: Lesson; nextId?: string; onReview: () => void }) {
  const { s } = useStore();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="kicker" style={{ color: 'var(--good)' }}>Section complete</div>
      <h2 className="serif" style={{ fontSize: 26, color: 'var(--navy)' }}>{l.id} {l.title}</h2>
      <p className="muted" style={{ margin: 0 }}>Reading is the smallest part. The topics below move to Proven once you get drills right across two days and answer a bank question aloud.</p>
      {l.topics.map((t) => {
        const st = topicState(s, t);
        return (
          <div key={t} className="card row" style={{ flexWrap: 'nowrap' }}>
            <StateDot st={st} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{TOPIC_BY_ID[t]?.title} <span className="chip id">{t}</span></div>
              <div className="small muted">{STATE_LABEL[st]} · {whatNext(s, t)}</div>
            </div>
            <Link to={`/practice/run?topic=${t}`} className="btn primary sm"><Icon n="play" s={13} /> Drill</Link>
          </div>
        );
      })}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onReview}>Read again</button>
        {nextId && <Link to={`/lesson/${nextId}`} className="btn primary">Next: {nextId} {LESSON_BY_ID[nextId].title} <Icon n="arrowR" s={15} /></Link>}
      </div>
    </div>
  );
}
