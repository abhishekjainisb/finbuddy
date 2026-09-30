import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { currentWeek, weekStatus, addDays, dayKey, XP, addXp } from '../lib/state';

const fmtRange = (a: string, b: string) => { const f = (k: string) => new Date(k + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); return `${f(a)} to ${f(b)}`; };
import { WEEKS, RHYTHM, EFFORT, type Check } from '../data/plan';
import { Bar, Icon, PageHead, Ring } from '../components/ui';
import { UNITS } from './Learn';

export default function Plan() {
  const { s } = useStore();
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const cw = currentWeek(s);
  const [sel, setSel] = useState(() => {
    if (focus?.startsWith('note-')) { const id = focus.slice(5); const w = WEEKS.find((w) => w.checks.some((c) => c.kind === 'note' && c.id === id)); if (w) return w.n; }
    return cw;
  });
  const ws = weekStatus(s, sel);
  const start = s.profile?.startDate || dayKey(s.created);
  useEffect(() => { if (focus) setTimeout(() => document.getElementById(focus)?.focus(), 200); }, [focus]);

  return (
    <div className="content">
      <PageHead kicker="Part H of the guide" title="8-week plan" sub="Each week ends with an exit gate. The portal checks most gates from your progress automatically; clear one and it awards XP." />
      <div className="weekrail" style={{ marginBottom: 18 }}>
        {WEEKS.map((w) => {
          const st = weekStatus(s, w.n);
          return (
            <button key={w.n} className={`${sel === w.n ? 'on' : ''} ${w.n === cw ? 'cur' : ''} ${st.complete ? 'done' : ''}`} onClick={() => setSel(w.n)}>
              <div>Week {w.n}</div>
              <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{st.complete ? 'cleared' : `${st.done}/${st.total}`}{w.n === cw ? ' · now' : ''}</div>
            </button>
          );
        })}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16 }}>
        <div className="card raised">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <div>
              <div className="kicker">Week {sel} · {fmtRange(addDays(start, (sel - 1) * 7), addDays(start, sel * 7 - 1))}</div>
              <h2 className="serif" style={{ fontSize: 24, color: 'var(--navy)', marginTop: 4 }}>{ws.week.goal}</h2>
            </div>
            <Ring v={ws.done / ws.total} size={70} stroke={7}><b className="tnum">{ws.done}/{ws.total}</b></Ring>
          </div>
          <div className="prose small" style={{ marginTop: 12 }}>
            <p><b>Common core:</b> {ws.week.common}</p>
            <p><b>Investment banking:</b> {ws.week.ib}</p>
            <p><b>Exit criteria:</b> {ws.week.exit}</p>
          </div>
          <div className="row small" style={{ gap: 6, marginBottom: 6 }}>
            {ws.week.chapters.map((u) => <Link key={u} to={`/learn/${u}`} className="chip">{u} {UNITS.find((x) => x.id === u)?.title}</Link>)}
          </div>
          <div className="kicker" style={{ margin: '16px 0 4px' }}>Exit gate {s.gates[sel] ? `· cleared ${new Date(s.gates[sel]).toLocaleDateString('en-IN')}` : ''}</div>
          {ws.week.checks.map((c, i) => <CheckRow key={i} c={c} st={ws.checks[i]} />)}
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="kicker">A normal week</div>
            <div className="stack" style={{ gap: 8, marginTop: 10 }}>
              {RHYTHM.map((r) => {
                const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === r.day || (r.day === 'Weekend' && [0, 6].includes(new Date().getDay()));
                return (
                  <div key={r.day} style={{ padding: '8px 10px', borderRadius: 8, background: isToday ? 'var(--wash2)' : undefined }}>
                    <div className="row small" style={{ justifyContent: 'space-between' }}><b>{r.day}{isToday ? ' · today' : ''}</b><span className="muted">{r.focus}</span></div>
                    <div className="small muted">{r.example}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="kicker">How much effort</div>
            {EFFORT.map((e) => <p key={e.who} className="small" style={{ margin: '8px 0 0', fontWeight: e.who === s.profile?.background ? 700 : 400 }}><b>{e.who}:</b> {e.text}</p>)}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .content > .grid[style] { grid-template-columns: 1fr !important; } }`}</style>
      {sel < 8 && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn" onClick={() => setSel(sel + 1)}>Week {sel + 1} <Icon n="arrowR" s={15} /></button></div>}
      <p className="small muted">Gates clear themselves when all checks pass (+{XP.gate} XP each). Manual items are on your honour.</p>
    </div>
  );
}

function CheckRow({ c, st }: { c: Check; st: ReturnType<typeof weekStatus>['checks'][number] }) {
  const { s, mutate, toast } = useStore();
  const [draft, setDraft] = useState(c.kind === 'note' ? s.notes[c.id] || '' : '');
  const [link, setLink] = useState(c.kind === 'manual' ? s.manual[c.id]?.link || '' : '');
  return (
    <div className="check">
      <span className={`tick ${st.ok ? 'on' : ''}`}>{st.ok ? '✓' : ''}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{st.label}</div>
        {c.kind !== 'note' && <div className="small muted" style={{ wordBreak: 'break-word' }}>{st.detail}</div>}
        {st.progress && !st.ok && <div style={{ marginTop: 6, maxWidth: 320 }}><Bar v={st.progress[0] / st.progress[1]} /></div>}
        {c.kind === 'note' && (
          <div className="stack" style={{ marginTop: 8, gap: 6 }}>
            <textarea id={`note-${c.id}`} value={draft} placeholder={c.placeholder} onChange={(e) => setDraft(e.target.value)}
              onBlur={() => { if (draft !== (s.notes[c.id] || '')) mutate((d) => { d.notes[c.id] = draft; }); }} />
            <div className="row small muted" style={{ justifyContent: 'space-between' }}>
              <span>{draft.trim().length} characters · 120+ clears the check</span>
              <button className="btn sm" onClick={() => { mutate((d) => { d.notes[c.id] = draft; }); toast('Saved', 'good'); }}>Save</button>
            </div>
          </div>
        )}
        {c.kind === 'manual' && (
          <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Optional: link to your file (Drive, OneDrive)" style={{ fontSize: 13, padding: '6px 10px' }}
              onBlur={() => mutate((d) => { d.manual[c.id] = { ...(d.manual[c.id] || { done: false }), link }; })} />
            <button className={`btn sm ${s.manual[c.id]?.done ? 'good' : ''}`} onClick={() => mutate((d) => {
              const m = d.manual[c.id] || { done: false };
              const first = !m.at;
              d.manual[c.id] = { ...m, link, done: !m.done, at: m.at || Date.now() };
              if (!m.done && first) { addXp(d, XP.manual); toast(`+${XP.manual} XP`, 'good'); }
            })}>{s.manual[c.id]?.done ? 'Done' : 'Mark done'}</button>
          </div>
        )}
      </div>
      {st.action && !st.ok && c.kind !== 'note' && <Link to={st.action.to} className="btn sm">{st.action.label}</Link>}
    </div>
  );
}
