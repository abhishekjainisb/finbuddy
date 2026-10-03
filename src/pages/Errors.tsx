import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { TOPIC_BY_ID, dayKey, type ErrorItem } from '../lib/state';
import { TAG_LABELS } from '../drills/generators';
import { Bar, Icon, PageHead, Inline, fmtDate } from '../components/ui';

export default function Errors() {
  const { s, mutate, toast } = useStore();
  const [view, setView] = useState<'open' | 'resolved'>('open');
  const [tag, setTag] = useState<string>('all');
  const all = Object.values(s.errors);
  const open = all.filter((e) => !e.resolved); const resolved = all.filter((e) => e.resolved);
  const base = view === 'open' ? open : resolved;
  const list = base.filter((e) => tag === 'all' || e.tag === tag).sort((a, b) => (view === 'open' ? b.times - a.times || b.last - a.last : (b.resolved || 0) - (a.resolved || 0)));
  const byTag: Record<string, number> = {};
  for (const e of open) byTag[e.tag] = (byTag[e.tag] || 0) + 1;
  const tags = Object.entries(byTag).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...tags.map((t) => t[1]));
  const reviewedAgo = s.errorsReviewedAt ? Math.floor((Date.now() - s.errorsReviewedAt) / 864e5) : null;
  return (
    <div className="content">
      <PageHead kicker="Track errors, not hours" title="Error log" sub="Every miss lands here with what you answered, the right answer and the kind of slip. An error resolves when you get it right on two different days after the miss."
        right={<div className="row">
          <button className="btn" onClick={() => mutate((d) => { d.errorsReviewedAt = Date.now(); toast('Error log marked as reviewed', 'good'); })}><Icon n="check" s={15} /> Mark reviewed</button>
          <Link to="/practice/run?mode=errors" className={`btn primary ${open.length ? '' : 'disabled'}`} aria-disabled={!open.length}><Icon n="play" s={15} /> Rematch open errors</Link>
        </div>} />
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><b className="tnum" style={{ color: open.length ? 'var(--bad)' : undefined }}>{open.length}</b><span>open</span></div>
        <div className="card stat"><b className="tnum" style={{ color: 'var(--good)' }}>{resolved.length}</b><span>resolved</span></div>
        <div className="card stat"><b>{reviewedAgo === null ? 'Never' : reviewedAgo === 0 ? 'Today' : `${reviewedAgo}d ago`}</b><span>last full review (the weekly gate wants one every 7 days)</span></div>
      </div>
      {tags.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>Your slip pattern (open errors)</div>
          <div className="stack" style={{ gap: 8 }}>
            {tags.map(([t, n]) => (
              <button key={t} onClick={() => setTag(tag === t ? 'all' : t)} className="row" style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', opacity: tag === 'all' || tag === t ? 1 : 0.45 }}>
                <span className="small" style={{ width: 280, maxWidth: '45%' }}>{TAG_LABELS[t] || t}</span>
                <div style={{ flex: 1 }}><div className="bar"><i style={{ width: `${(n / max) * 100}%`, background: 'var(--bad)' }} /></div></div>
                <span className="small tnum" style={{ width: 24, textAlign: 'right' }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="tabs">
        <button className={view === 'open' ? 'on' : ''} onClick={() => setView('open')}>Open ({open.length})</button>
        <button className={view === 'resolved' ? 'on' : ''} onClick={() => setView('resolved')}>Resolved ({resolved.length})</button>
        {tag !== 'all' && <button onClick={() => setTag('all')}>Filter: {TAG_LABELS[tag] || tag} ✕</button>}
      </div>
      <div className="stack">
        {list.map((e) => <ErrorCard key={e.id} e={e} />)}
        {!list.length && <div className="empty">{view === 'open' ? 'No open errors. Drill something new; misses are how the log earns its keep.' : 'Nothing resolved yet.'}</div>}
      </div>
    </div>
  );
}

function ErrorCard({ e }: { e: ErrorItem }) {
  const { mutate } = useStore();
  const [x, setX] = useState(false);
  const t = TOPIC_BY_ID[e.topic];
  const today = dayKey();
  const retry = e.ref.startsWith('gen:') ? `/practice/run?gen=${e.ref.slice(4)}` : e.ref.startsWith('ib:') ? `/ib400?study=q:${e.ref.slice(3)}` : e.ref.startsWith('lab:') ? '/lab?m=predict' : `/practice/run?topic=${e.topic}`;
  return (
    <div className="card" style={{ borderLeft: `3px solid ${e.resolved ? 'var(--good)' : 'var(--bad)'}` }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row small" style={{ gap: 6, marginBottom: 6 }}>
            <Link to={`/topic/${e.topic}`} className="chip id" title={t?.title}>{e.topic} · {t?.cluster}</Link>
            <select value={e.tag} onChange={(ev) => mutate((d) => { d.errors[e.id].tag = ev.target.value; })} style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} aria-label="Error type">
              {Object.entries(TAG_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {e.times > 1 && <span className="chip weak">missed {e.times}×</span>}
          </div>
          <button onClick={() => setX(!x)} style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, fontSize: 14.5 }}><Inline t={x ? e.prompt : e.prompt.length > 160 ? e.prompt.slice(0, 160) + '…' : e.prompt} /></button>
          {(x || e.prompt.length <= 160) && <div className="grid g2" style={{ marginTop: 10, gap: 10 }}>
            <div className="feedback no" style={{ margin: 0, padding: '8px 12px' }}><div className="small"><b>You said</b></div><p className="small"><Inline t={e.given || '(not recorded)'} /></p></div>
            <div className="feedback ok" style={{ margin: 0, padding: '8px 12px' }}><div className="small"><b>Answer</b></div><p className="small"><Inline t={e.correct || 'See the explanation when you retry'} /></p></div>
          </div>}
        </div>
        {!e.resolved && <Link to={retry} className="btn sm primary"><Icon n="play" s={13} /> Retry</Link>}
      </div>
      <div className="row small muted" style={{ marginTop: 10, gap: 14 }}>
        <span>First missed {fmtDate(e.first)}</span>
        {e.resolved ? <span style={{ color: 'var(--good)', fontWeight: 600 }}>Resolved {fmtDate(e.resolved)}</span> : (
          <span className="row" style={{ gap: 6 }}>Right on {e.okDays.length}/2 days <span style={{ width: 70 }}><Bar v={e.okDays.length / 2} good /></span>
            {e.okDays.includes(today) && <span>· come back tomorrow for the second</span>}</span>
        )}
      </div>
    </div>
  );
}
