import { useState } from 'react';
import { useStore } from '../lib/store';
import { emptyState, type Profile } from '../lib/state';
import { READING_PATHS } from '../data/startHere';
import { TRACKS, TARGETS } from './Onboarding';
import { PageHead } from '../components/ui';

export default function ProfilePage() {
  const { s, mutate, replace, backend, toast } = useStore();
  const [p, setP] = useState<Profile>(s.profile!);
  const [reset, setReset] = useState(0);
  const set = (k: keyof Profile, v: any) => setP((x) => ({ ...x, [k]: v }));
  const firms = p.firms.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const dirty = JSON.stringify(p) !== JSON.stringify(s.profile);
  return (
    <div className="content narrow">
      <PageHead kicker="You" title="Profile" sub="Your track, targets and rhythm drive the plan, the focus topics and Today's 10." />
      <div className="card stack" style={{ gap: 14 }}>
        {backend.link ? (
          <div className="card row" style={{ background: 'var(--wash)', flexWrap: 'nowrap' }}>
            <span className="tick on">✓</span>
            <div style={{ flex: 1 }}><b>{backend.link.name}</b><div className="small muted">PGID {backend.link.pgid} · linked to {backend.email || 'your account'}</div></div>
          </div>
        ) : (
          <label className="field" htmlFor="pf-name">Name<input id="pf-name" type="text" value={p.name} onChange={(e) => set('name', e.target.value)} /></label>
        )}
        <div className="grid g2">
          <label className="field" htmlFor="pf-bg">Background<select id="pf-bg" value={p.background} onChange={(e) => set('background', e.target.value)}>{READING_PATHS.map((r) => <option key={r.who}>{r.who}</option>)}</select></label>
          <label className="field" htmlFor="pf-start">Plan start date<input id="pf-start" type="date" value={p.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
          <label className="field" htmlFor="pf-track">Primary track<select id="pf-track" value={p.primary} onChange={(e) => setP((x) => ({ ...x, primary: e.target.value, adjacent: x.adjacent === e.target.value ? '' : x.adjacent }))}>{TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <label className="field" htmlFor="pf-adj">Secondary track<select id="pf-adj" value={p.adjacent} onChange={(e) => set('adjacent', e.target.value)}><option value="">None for now</option>{TRACKS.map((t) => <option key={t} value={t} disabled={t === p.primary}>{t === p.primary ? `${t} (your primary)` : t}</option>)}</select></label>
        </div>
        <div className="small muted" style={{ marginTop: -4 }}>Every track stays open in Practice, whatever you pick here.</div>
        <label className="field" htmlFor="pf-firms">Target firms ({firms.length}; five or more clears the week-1 check)<textarea id="pf-firms" value={p.firms} onChange={(e) => set('firms', e.target.value)} /></label>
        <div className="field">Daily XP target
          <div className="seg">{TARGETS.map(([v, l]) => <button key={v} className={p.dailyTarget === v ? 'on' : ''} onClick={() => set('dailyTarget', v)}>{l} · {v}</button>)}</div>
        </div>
        <label className="row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={p.board} onChange={(e) => set('board', e.target.checked)} /> Show me on the cohort leaderboard</label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn primary" disabled={!dirty || p.name.trim().length < 2} onClick={() => { mutate((d) => { d.profile = { ...p, name: (backend.link?.name || p.name).trim(), pgid: backend.link?.pgid || p.pgid }; }); toast('Profile saved', 'good'); }}>Save changes</button>
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16, gap: 10 }}>
        <div className="kicker">Your data</div>
        <div className="small">{backend.kind === 'local' ? 'Stored in this browser only. Clearing site data erases it.' : backend.kind === 'artifact' ? 'Stored privately against your Claude account. Only the leaderboard row is visible to others, and only if you opt in.' : 'Stored on the Finance Club server under row-level security: only you can read your progress.'}</div>
        <div className="small muted">{s.attempts.length} answers · {Object.keys(s.errors).length} errors logged · {Object.keys(s.cards).length} bank cards · started {new Date(s.created).toLocaleDateString('en-IN')}</div>
        <div className="row">
          <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(s)).then(() => toast('Copied your progress as JSON', 'good'), () => toast('Copy was blocked by the browser', 'bad')); }}>Copy my data</button>
          {backend.signOut && <button className="btn sm" onClick={async () => { await backend.signOut!(); location.reload(); }}>Sign out</button>}
          {reset === 0 && <button className="btn sm" style={{ color: 'var(--bad)' }} onClick={() => setReset(1)}>Reset progress</button>}
          {reset === 1 && <>
            <span className="small" style={{ color: 'var(--bad)' }}>This erases XP, streaks, errors and cards. Your profile stays.</span>
            <button className="btn sm" onClick={() => setReset(0)}>Cancel</button>
            <button className="btn sm" style={{ background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' }} onClick={() => { replace({ ...emptyState(), profile: s.profile }); setReset(0); toast('Progress reset', 'info'); }}>Erase</button>
          </>}
        </div>
      </div>
    </div>
  );
}
