import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { dayKey, type Profile } from '../lib/state';
import { READING_PATHS, TRACK_FIT, ONE_PAGE } from '../data/startHere';
import { Icon, Bar } from '../components/ui';

import { TRACK_DEFS } from '../data/tracks';
export const TRACKS = TRACK_DEFS.map((t) => t.name);
export const LIVE_TRACKS = TRACKS;
export const TARGETS = [[30, 'Light', 'about 15 min'], [50, 'Steady', 'about 25 min'], [80, 'Serious', 'about 40 min'], [120, 'All in', 'an hour+']] as const;

export default function Onboarding() {
  const { mutate, backend } = useStore();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const linked = backend.link || null;
  const [p, setP] = useState<Profile>({ name: linked?.name || '', pgid: linked?.pgid, background: '', primary: 'Investment banking', adjacent: '', firms: '', startDate: dayKey(), dailyTarget: 50, board: true });
  const set = (k: keyof Profile, v: any) => setP((x) => ({ ...x, [k]: v }));
  const firms = p.firms.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const path = READING_PATHS.find((r) => r.who === p.background);
  const canNext = [!!linked || p.name.trim().length > 1, !!p.background, !!p.primary, true][step];
  const finish = (to: string) => { mutate((d) => { d.profile = { ...p, name: (linked?.name || p.name).trim() }; }); nav(to); };
  const STEPS = ['You', 'Background', 'Track', 'Rhythm'];

  return (
    <div className="content narrow" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))' }}>
      <div className="row" style={{ marginBottom: 18 }}>
        <div className="brand-mark">FC</div>
        <div><div className="kicker">ISB Finance Club · Co'27</div><b>FinBuddy</b></div>
      </div>
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        {STEPS.map((l, i) => <span key={l} className={`chip ${i === step ? 'p1' : ''}`} style={{ opacity: i > step ? 0.5 : 1 }}>{i + 1}. {l}</span>)}
      </div>
      <Bar v={(step + 1) / STEPS.length} good />
      <div className="stepcard stack" style={{ gap: 16, marginTop: 16 }}>
        {step === 0 && <>
          <h1 className="serif" style={{ fontSize: 30, color: 'var(--navy)' }}>{linked ? `Welcome, ${linked.name.split(' ')[0]}.` : 'Read. Drill. Prove. Track.'}</h1>
          {linked && <div className="card row" style={{ background: 'var(--wash)', flexWrap: 'nowrap' }}><Icon n="user" /><div><b>{linked.name}</b><div className="small muted">PGID {linked.pgid} · linked to {backend.email || 'your account'}</div></div></div>}
          <p className="muted" style={{ margin: 0 }}>{ONE_PAGE}</p>
          {!linked && <label className="field" htmlFor="ob-name">Your name<input id="ob-name" type="text" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="As your peers know you" autoFocus /></label>}
        </>}
        {step === 1 && <>
          <h2 className="serif" style={{ fontSize: 24, color: 'var(--navy)' }}>Where are you starting from?</h2>
          <div className="stack">
            {READING_PATHS.map((r) => (
              <button key={r.who} className={`opt ${p.background === r.who ? 'sel' : ''}`} onClick={() => set('background', r.who)}>
                <span className="k">{p.background === r.who ? <Icon n="check" s={13} /> : ''}</span>
                <span><b>{r.who}</b> <span className="muted">{r.from}</span></span>
              </button>
            ))}
          </div>
          {path && <div className="callout angle" style={{ margin: 0 }}>
            <div className="ctitle">Your reading path</div>
            <div className="prose small"><p><b>Start with:</b> {path.start}<br /><b>Skim:</b> {path.skim}<br /><b>Watch for:</b> {path.blind}<br /><b>Focus:</b> {path.focus}</p></div>
          </div>}
        </>}
        {step === 2 && <>
          <h2 className="serif" style={{ fontSize: 24, color: 'var(--navy)' }}>Pick one primary track</h2>
          <div className="stack" style={{ gap: 8 }}>
            {TRACK_DEFS.map((tr) => (
              <button key={tr.name} className={`opt ${p.primary === tr.name ? 'sel' : ''}`} onClick={() => setP((x) => ({ ...x, primary: tr.name, adjacent: x.adjacent === tr.name ? '' : x.adjacent }))}>
                <span className="k">{p.primary === tr.name ? <Icon n="check" s={13} /> : ''}</span>
                <span style={{ flex: 1 }}><b>{tr.name}</b><span className="small muted" style={{ display: 'block' }}>{tr.blurb}</span></span>
              </button>
            ))}
          </div>
          <label className="field" htmlFor="ob-adj">Adjacent track (optional)
            <select id="ob-adj" value={p.adjacent} onChange={(e) => set('adjacent', e.target.value)}>
              <option value="">None for now</option>
              {TRACK_DEFS.filter((t) => t.name !== p.primary).map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </label>
          <div className="small muted">Most successful candidates prepare one primary track and one adjacent track that shares most of the preparation: IB with PE, PE with equity research, corporate finance with consulting. Your plan, practice and progress follow these choices; you can change them later in Profile.</div>
          <details>
            <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>Not sure? What you enjoy tells you more than prestige</summary>
            <div className="tablewrap" style={{ marginTop: 8 }}><table className="gt"><thead><tr><th>If you enjoy</th><th>Look at</th><th>Try this first</th></tr></thead>
              <tbody>{TRACK_FIT.map((r) => <tr key={r[1]}><td>{r[0]}</td><td><b>{r[1]}</b></td><td>{r[2]}</td></tr>)}</tbody></table></div>
          </details>
          <label className="field" htmlFor="ob-firms">Five target firms (one per line or comma separated)
            <textarea id="ob-firms" value={p.firms} onChange={(e) => set('firms', e.target.value)} placeholder={'Kotak Investment Banking\nAxis Capital\nJM Financial\nAvendus\nGoldman Sachs'} />
          </label>
          <div className="stack small" style={{ gap: 6 }}><div className="row" style={{ flexWrap: 'nowrap' }}><div style={{ flex: 1 }}><Bar v={Math.min(firms.length, 5) / 5} good /></div><span className="tnum">{firms.length}/5</span></div><span className="muted">You can finish this in week 1; it is part of the week-1 gate.</span></div>
        </>}
        {step === 3 && <>
          <h2 className="serif" style={{ fontSize: 24, color: 'var(--navy)' }}>Set your rhythm</h2>
          <label className="field" htmlFor="ob-start">Plan start date (week 1 begins here)<input id="ob-start" type="date" value={p.startDate} onChange={(e) => set('startDate', e.target.value || dayKey())} /></label>
          <div className="field">Daily XP target
            <div className="grid g4">
              {TARGETS.map(([v, l, t]) => (
                <button key={v} className={`opt ${p.dailyTarget === v ? 'sel' : ''}`} style={{ flexDirection: 'column', gap: 2 }} onClick={() => set('dailyTarget', v)}>
                  <b>{l}</b><span className="small muted">{v} XP · {t}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="row" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={p.board} onChange={(e) => set('board', e.target.checked)} style={{ marginTop: 4 }} />
            <span><b>Show me on the cohort leaderboard</b><br /><span className="small muted">Shares your name, XP, streak and topics proven. Never your answers or error log. {backend.kind === 'local' ? 'The leaderboard needs a synced account; on this device it stays off.' : ''}</span></span>
          </label>
          <div className="small muted">How XP works: correct first try 10, generated numeric problem 12, lesson finished 15, error resolved 15, mock logged 25, plan gate 60. A streak day needs 20 XP.</div>
        </>}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon n="arrowL" s={15} /> Back</button>
          {step < 3 ? <button className="btn primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Next <Icon n="arrowR" s={15} /></button> : (
            <div className="row">
              <button className="btn" onClick={() => finish('/')}>Go to Today</button>
              <button className="btn primary" onClick={() => finish('/diagnostic')}>Take the diagnostic <Icon n="arrowR" s={15} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
