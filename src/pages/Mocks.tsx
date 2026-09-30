import { useState } from 'react';
import { useStore } from '../lib/store';
import { dayKey, addXp, XP, type Mock } from '../lib/state';
import { RUBRIC } from '../data/plan';
import { Icon, PageHead, fmtDate } from '../components/ui';

const KINDS = ['Technical', 'Fit and story', 'Stock or deal pitch', 'Case or guesstimate', 'Full round'];
const avg = (m: Mock) => { const v = Object.values(m.scores); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };

export default function Mocks() {
  const { s, mutate, toast } = useStore();
  const blank = (): Mock => ({ id: 'm' + Date.now(), date: dayKey(), kind: 'Technical', scores: Object.fromEntries(RUBRIC.map((r) => [r.id, 3])), notes: '', partner: '' });
  const [m, setM] = useState<Mock>(blank);
  const [open, setOpen] = useState(s.mocks.length === 0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const mocks = [...s.mocks].sort((a, b) => b.date.localeCompare(a.date));
  const last3 = mocks.slice(0, 3);
  const critAvg = RUBRIC.map((r) => ({ r, v: last3.length ? last3.reduce((a, x) => a + (x.scores[r.id] || 0), 0) / last3.length : 0 }));
  const weakest = last3.length ? [...critAvg].sort((a, b) => a.v - b.v)[0] : null;
  const save = () => {
    mutate((d) => { d.mocks.push(m); addXp(d, XP.mock); });
    toast(`Mock logged. +${XP.mock} XP`, 'good'); setM(blank()); setOpen(false);
  };
  const W = 300, H = 90;
  const chron = [...mocks].reverse();
  return (
    <div className="content">
      <PageHead kicker="From week 4: one a week" title="Mock interviews" sub="Score each mock on the guide's seven-criterion rubric. Averages over your last three mocks show which criterion to work on next."
        right={<button className="btn primary" onClick={() => setOpen(!open)}><Icon n={open ? 'x' : 'mic'} s={15} /> {open ? 'Close' : 'Log a mock'}</button>} />
      {open && (
        <div className="card raised stack" style={{ marginBottom: 18, gap: 14 }}>
          <div className="grid g3">
            <label className="field">Date<input type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} /></label>
            <label className="field">Type<select value={m.kind} onChange={(e) => setM({ ...m, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="field">Interviewer or partner<input type="text" value={m.partner} onChange={(e) => setM({ ...m, partner: e.target.value })} placeholder="Optional" /></label>
          </div>
          {RUBRIC.map((r) => (
            <div key={r.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 14 }}>{r.label}</b><span className="chip p1 tnum">{m.scores[r.id]}/5</span></div>
              <div className="seg" style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', marginTop: 6 }}>
                {[1, 2, 3, 4, 5].map((v) => <button key={v} className={m.scores[r.id] === v ? 'on' : ''} onClick={() => setM({ ...m, scores: { ...m.scores, [r.id]: v } })}>{v}</button>)}
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>{m.scores[r.id] <= 2 ? `1: ${r.a1}` : m.scores[r.id] >= 4 ? `5: ${r.a5}` : `3: ${r.a3}`}</div>
            </div>
          ))}
          <label className="field">What to fix before the next one<textarea value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} placeholder="The question that tripped you, what a better answer sounds like, and one habit to change." /></label>
          <div className="row" style={{ justifyContent: 'flex-end' }}><span className="small muted" style={{ marginRight: 'auto' }}>Average {avg(m).toFixed(1)}/5</span><button className="btn primary" onClick={save}>Save mock</button></div>
        </div>
      )}
      {mocks.length > 0 && (
        <div className="grid g2" style={{ marginBottom: 18 }}>
          <div className="card">
            <div className="kicker">Average over last {last3.length}</div>
            <div className="stack" style={{ gap: 8, marginTop: 10 }}>
              {critAvg.map(({ r, v }) => (
                <div key={r.id} className="row" style={{ flexWrap: 'nowrap' }}>
                  <span className="small" style={{ width: 170, flex: 'none', fontWeight: weakest?.r.id === r.id ? 700 : 400, color: weakest?.r.id === r.id ? 'var(--bad)' : undefined }}>{r.label}</span>
                  <div className="bar" style={{ flex: 1 }}><i style={{ width: `${(v / 5) * 100}%`, background: v >= 4 ? 'var(--good)' : v >= 3 ? 'var(--navy2)' : 'var(--bad)' }} /></div>
                  <span className="small tnum" style={{ width: 30, textAlign: 'right' }}>{v.toFixed(1)}</span>
                </div>
              ))}
            </div>
            {weakest && <div className="banner" style={{ marginTop: 12 }}><b>Work on {weakest.r.label.toLowerCase()} next.</b> A 5 looks like: {weakest.r.a5.toLowerCase()}.</div>}
          </div>
          <div className="card">
            <div className="kicker">Trend, average score per mock</div>
            <svg viewBox={`0 0 ${W} ${H + 12}`} style={{ width: '100%', height: 140, marginTop: 10 }}>
              {[1, 3, 5].map((y) => <g key={y}><line x1="16" x2={W} y1={H - ((y - 1) / 4) * (H - 10)} y2={H - ((y - 1) / 4) * (H - 10)} stroke="var(--line)" strokeWidth="0.6" /><text x="4" y={H - ((y - 1) / 4) * (H - 10) + 3} fontSize="8" fill="var(--muted)">{y}</text></g>)}
              {chron.length > 1 && <polyline fill="none" stroke="var(--navy2)" strokeWidth="2" points={chron.map((x, i) => `${16 + (i / (chron.length - 1)) * (W - 24)},${H - ((avg(x) - 1) / 4) * (H - 10)}`).join(' ')} />}
              {chron.map((x, i) => <circle key={x.id} cx={chron.length > 1 ? 16 + (i / (chron.length - 1)) * (W - 24) : W / 2} cy={H - ((avg(x) - 1) / 4) * (H - 10)} r="3.5" fill="var(--navy2)"><title>{x.date}: {avg(x).toFixed(1)}</title></circle>)}
            </svg>
          </div>
        </div>
      )}
      <div className="stack">
        {mocks.map((x) => (
          <div key={x.id} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><b>{x.kind}</b> <span className="small muted">· {fmtDate(x.date)}{x.partner ? ` · with ${x.partner}` : ''}</span></div>
              <div className="row">
                <span className="chip p1 tnum">{avg(x).toFixed(1)}/5</span>
                {confirm === x.id
                  ? <><button className="btn sm" onClick={() => setConfirm(null)}>Keep</button><button className="btn sm" style={{ color: 'var(--bad)' }} onClick={() => { mutate((d) => { d.mocks = d.mocks.filter((y) => y.id !== x.id); }); setConfirm(null); }}>Delete</button></>
                  : <button className="btn ghost sm" onClick={() => setConfirm(x.id)} aria-label="Delete mock"><Icon n="x" s={14} /></button>}
              </div>
            </div>
            <div className="row small" style={{ gap: 6, marginTop: 8 }}>{RUBRIC.map((r) => <span key={r.id} className="chip">{r.label}: {x.scores[r.id]}</span>)}</div>
            {x.notes && <p className="small" style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{x.notes}</p>}
          </div>
        ))}
        {!mocks.length && !open && <div className="empty">No mocks yet. Book a peer for 45 minutes this weekend.</div>}
      </div>
    </div>
  );
}
