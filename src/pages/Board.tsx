import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import type { BoardRow } from '../lib/backend';
import { boardEntry } from '../lib/state';
import { Icon, PageHead } from '../components/ui';

type Metric = 'weekXp' | 'xp' | 'proven' | 'streak';
const LABEL: Record<Metric, string> = { weekXp: 'XP this week', xp: 'All-time XP', proven: 'Topics proven', streak: 'Streak' };

export default function Board() {
  const { s, backend, mutate } = useStore();
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [metric, setMetric] = useState<Metric>('weekXp');
  useEffect(() => backend.subscribeBoard(setRows), [backend]);
  useEffect(() => {
    const need = rows.filter((r) => !r.name && !(r.id in names)).map((r) => r.id);
    if (need.length) backend.names(need).then((n) => setNames((x) => ({ ...x, ...n }))).catch(() => {});
  }, [rows, backend, names]);
  const on = !!s.profile?.board;
  // make sure your own row reflects the latest numbers even before the next publish lands
  const merged = [...rows.filter((r) => r.id !== backend.uid), ...(on && backend.uid ? [{ id: backend.uid, name: s.profile?.name, ...boardEntry(s) } as BoardRow] : [])];
  // a weekly number is only current if the row was refreshed in the last 7 days
  const val = (r: BoardRow) => (metric === 'weekXp' && Date.now() - r.updated > 7 * 864e5 ? 0 : (r[metric] as number));
  const sorted = merged.sort((a, b) => val(b) - val(a) || b.xp - a.xp);
  const fresh = sorted.filter((r) => Date.now() - r.updated < 30 * 864e5);
  return (
    <div className="content narrow">
      <PageHead kicker="Cohort" title="Leaderboard" sub="Opt-in only. Shows XP, streak and topics proven; never answers or error logs. Weekly XP resets the race every seven days, so a late start can still top it." />
      {!backend.canBoard ? (
        <div className="empty">The leaderboard needs a synced account. In this preview your progress is saved on this device only.</div>
      ) : <>
        <div className="card row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
          <span><b>{on ? 'You are on the board' : 'You are hidden'}</b><br /><span className="small muted">{on ? `Showing as ${s.profile?.name}` : 'Turn on to appear to the cohort'}</span></span>
          <button className={`btn ${on ? '' : 'primary'}`} onClick={() => mutate((d) => { if (d.profile) d.profile.board = !d.profile.board; })}>{on ? 'Hide me' : 'Join the board'}</button>
        </div>
        <div className="seg" style={{ marginBottom: 12 }}>{(Object.keys(LABEL) as Metric[]).map((k) => <button key={k} className={metric === k ? 'on' : ''} onClick={() => setMetric(k)}>{LABEL[k]}</button>)}</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="lb">
            <tbody>
              {fresh.map((r, i) => {
                const me = r.id === backend.uid;
                const nm = r.name || names[r.id] || 'Someone';
                return (
                  <tr key={r.id} className={me ? 'me' : ''}>
                    <td className="rank">{i < 3 ? <span style={{ color: ['#c9a227', '#9aa0ad', '#b0703c'][i] }}><Icon n="trophy" s={16} /></span> : i + 1}</td>
                    <td><b>{nm}</b>{me ? ' (you)' : ''}<div className="small muted">{r.level} · {r.streak}d streak</div></td>
                    <td style={{ textAlign: 'right' }}><b style={{ fontSize: 17 }}>{val(r).toLocaleString('en-IN')}</b><div className="small muted">{LABEL[metric].toLowerCase()}</div></td>
                  </tr>
                );
              })}
              {!fresh.length && <tr><td style={{ padding: 20 }} className="muted">No one on the board yet. Be first.</td></tr>}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
