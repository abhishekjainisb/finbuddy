// Runs a queue of practice items. Wrong answers come back once at the end of the
// round (the second attempt earns less XP), and the summary shows what moved.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { recordAttempt, gradeCard, STATE_LABEL, TOPIC_BY_ID, type QItem, type Attempt, type TopicState } from '../lib/state';
import { Drill, type Outcome, type Feedback } from './Drill';
import { Bar, Icon, Ring, Inline } from './ui';

export interface SessionResult { ok: number; total: number; xp: number; byTopic: Record<string, [number, number]>; moves: { topic: string; from: TopicState; to: TopicState }[]; opened: number; resolved: number; cards: number; misses: { prompt: string; correct?: string; topic: string }[] }

export function Session({ items, src, title, exitTo, requeue = true, onComplete, again, hideTopic, footer }: {
  items: QItem[]; src: Attempt['src']; title: string; exitTo: string; requeue?: boolean;
  onComplete?: (r: SessionResult) => void; again?: () => void; hideTopic?: boolean; footer?: ReactNode;
}) {
  const { mutate } = useStore();
  const [queue, setQueue] = useState<{ item: QItem; first: boolean }[]>(() => items.map((item) => ({ item, first: true })));
  const [pos, setPos] = useState(0);
  const [nonce, setNonce] = useState(0);
  const res = useRef<SessionResult>({ ok: 0, total: 0, xp: 0, byTopic: {}, moves: [], opened: 0, resolved: 0, cards: 0, misses: [] });
  const [done, setDone] = useState(items.length === 0);

  const cur = queue[pos];
  const onAnswer = (o: Outcome): Feedback => {
    const r = mutate((d) => recordAttempt(d, { ...o, firstTry: cur.first, src }));
    const R = res.current;
    if (cur.first && !o.ok) R.misses.push({ prompt: o.prompt, correct: o.correct, topic: o.topic });
    if (cur.first) { R.total++; if (o.ok) R.ok++; const bt = (R.byTopic[o.topic] ||= [0, 0]); bt[1]++; if (o.ok) bt[0]++; }
    R.xp += r.xp; if (r.errorOpened) R.opened++; if (r.errorResolved) R.resolved++;
    if (r.stateBefore !== r.stateAfter) {
      const m = R.moves.find((x) => x.topic === o.topic);
      if (m) m.to = r.stateAfter; else R.moves.push({ topic: o.topic, from: r.stateBefore, to: r.stateAfter });
    }
    if (!o.ok && requeue && cur.first) setQueue((q) => [...q, { item: cur.item.kind === 'gen' ? { ...cur.item, seed: cur.item.seed + 7777 } : cur.item, first: false }]);
    return { xp: r.xp, errorOpened: r.errorOpened, errorResolved: r.errorResolved, before: r.stateBefore, after: r.stateAfter };
  };
  const onGrade = (qid: string, g: 1 | 2 | 3 | 4) => {
    const xp = mutate((d) => gradeCard(d, qid, g));
    res.current.xp += xp; res.current.cards++;
    return xp;
  };
  const next = () => {
    if (pos + 1 >= queue.length) { setDone(true); onComplete?.(res.current); return; }
    setPos(pos + 1); setNonce((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (done) return <Summary r={res.current} title={title} exitTo={exitTo} again={again} footer={footer} />;
  const progress = pos / queue.length;
  return (
    <div className="player">
      <div className="player-top">
        <Link to={exitTo} className="btn ghost sm" aria-label="Leave session"><Icon n="x" s={16} /></Link>
        <Bar v={progress} good />
        <span className="small muted tnum">{pos + 1}/{queue.length}</span>
      </div>
      <div className="stepcard">
        <Drill item={cur.item} firstTry={cur.first} onAnswer={onAnswer} onGrade={onGrade} onNext={next} nonce={nonce} hideTopic={hideTopic} />
      </div>
      <div className="small muted" style={{ textAlign: 'center' }}>{title}. Keys: <span className="kbd">1</span>-<span className="kbd">4</span> to answer, <span className="kbd">Enter</span> to continue.</div>
    </div>
  );
}

function Summary({ r, title, exitTo, again, footer }: { r: SessionResult; title: string; exitTo: string; again?: () => void; footer?: ReactNode }) {
  const acc = r.total ? r.ok / r.total : 0;
  const topics = useMemo(() => Object.entries(r.byTopic).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]), [r]);
  return (
    <div className="stepcard stack" style={{ gap: 18 }}>
      <div className="row" style={{ gap: 22 }}>
        <Ring v={r.total ? acc : 1} size={108}>
          <div><b style={{ fontSize: 24 }}>{r.total ? Math.round(acc * 100) + '%' : 'Done'}</b><div className="small muted">{r.total ? `${r.ok}/${r.total} first try` : ''}</div></div>
        </Ring>
        <div className="stack" style={{ gap: 4 }}>
          <div className="kicker">Round complete</div>
          <h2 className="serif" style={{ fontSize: 24, color: 'var(--navy)' }}>{acc >= 0.8 ? 'Strong round.' : acc >= 0.5 ? 'Solid. The misses are now in your error log.' : r.total ? 'Useful round. Every miss is logged for review.' : title}</h2>
          <div className="row small">
            <span className="chip" style={{ color: 'var(--good)' }}>+{r.xp} XP</span>
            {r.cards > 0 && <span className="chip">{r.cards} bank card{r.cards > 1 ? 's' : ''} graded</span>}
            {r.opened > 0 && <span className="chip weak">{r.opened} new error{r.opened > 1 ? 's' : ''}</span>}
            {r.resolved > 0 && <span className="chip" style={{ color: 'var(--good)' }}>{r.resolved} error{r.resolved > 1 ? 's' : ''} resolved</span>}
          </div>
        </div>
      </div>
      {r.moves.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="kicker">Topics that moved</div>
          {r.moves.map((m) => (
            <Link key={m.topic} to={`/topic/${m.topic}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="chip id">{m.topic}</span><span className="small">{TOPIC_BY_ID[m.topic]?.cluster}</span>
              <span className="chip">{STATE_LABEL[m.from]}</span><Icon n="arrowR" s={14} /><span className="chip p1">{STATE_LABEL[m.to]}</span>
            </Link>
          ))}
        </div>
      )}
      {topics.length > 1 && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="kicker">By topic</div>
          {topics.map(([t, [ok, n]]) => (
            <div key={t} className="row" style={{ flexWrap: 'nowrap' }}>
              <Link to={`/topic/${t}`} className="chip id" style={{ minWidth: 70 }}>{t}</Link>
              <div style={{ flex: 1 }}><Bar v={ok / n} good={ok / n >= 0.8} /></div>
              <span className="small tnum" style={{ width: 40, textAlign: 'right' }}>{ok}/{n}</span>
            </div>
          ))}
        </div>
      )}
      {r.misses.length > 0 && (
        <details className="card" style={{ padding: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What you missed ({r.misses.length})</summary>
          <div className="stack" style={{ marginTop: 10, gap: 10 }}>
            {r.misses.slice(0, 8).map((m, i) => (
              <div key={i} className="small" style={{ borderTop: i ? '1px solid var(--line2)' : 0, paddingTop: i ? 10 : 0 }}>
                <div><Inline t={m.prompt.length > 200 ? m.prompt.slice(0, 200) + '…' : m.prompt} /></div>
                {m.correct && <div style={{ color: 'var(--good)', marginTop: 4 }}><b>Answer:</b> <Inline t={m.correct} /></div>}
              </div>
            ))}
          </div>
        </details>
      )}
      {footer}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Link to={exitTo} className="btn">Done</Link>
        {again && <button className="btn primary" onClick={again}><Icon n="shuffle" s={15} /> Another round</button>}
      </div>
    </div>
  );
}
