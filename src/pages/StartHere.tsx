import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { ONE_PAGE, INTRO, PARTS, READING_PATHS, CHAPTER_PATTERN, THREE_QUESTIONS, ROLES, INDIA_LENS, TRACK_FIT, TRACK_TRAPS, WEEK1_DRILL } from '../data/startHere';
import { Icon, PageHead, Inline } from '../components/ui';
import { PART_COLOR } from './Learn';

export default function StartHere() {
  const { s } = useStore();
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const picks = TRACK_FIT.filter((_, i) => liked[i]);
  return (
    <div className="content narrow">
      <PageHead kicker="Part 0" title="Start here" sub={INTRO} />
      <div className="callout core"><div className="ctitle">The plan on one page</div><div className="prose"><p>{ONE_PAGE}</p></div></div>

      <h2 className="serif" style={{ fontSize: 22, margin: '26px 0 10px', color: 'var(--navy)' }}>How the guide is organised</h2>
      <div className="grid g2">
        {PARTS.map((p) => (
          <div key={p.id} className="card row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', borderLeft: `4px solid ${PART_COLOR[p.id]}` }}>
            <b style={{ color: PART_COLOR[p.id], fontSize: 18 }}>{p.id}</b>
            <div><b>{p.name}</b> {!p.live && <span className="chip">phase 2</span>}<div className="small muted">{p.blurb}</div></div>
          </div>
        ))}
      </div>

      <h2 className="serif" style={{ fontSize: 22, margin: '26px 0 10px', color: 'var(--navy)' }}>Three questions that separate the roles</h2>
      <div className="stack">{THREE_QUESTIONS.map(([q, a]) => <div key={q} className="card"><b>{q}</b><div className="small" style={{ marginTop: 4 }}>{a}</div></div>)}</div>

      <h2 className="serif" style={{ fontSize: 22, margin: '26px 0 10px', color: 'var(--navy)' }}>The four core tracks</h2>
      <div className="tablewrap"><table className="gt"><thead><tr><th></th>{ROLES.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{ROLES.rows.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td>{r.slice(1).map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>

      <div className="callout india"><div className="ctitle">India lens</div><div className="prose">{INDIA_LENS.map(([b, t]) => <p key={b}><b>{b}</b> {t}</p>)}</div></div>

      <h2 className="serif" style={{ fontSize: 22, margin: '26px 0 6px', color: 'var(--navy)' }}>Which track fits you?</h2>
      <p className="muted small" style={{ marginTop: 0 }}>Tick what you genuinely enjoy. Then do the matching task this week; how it felt is better evidence than any description.</p>
      <div className="stack">
        {TRACK_FIT.map(([enjoy, track, test], i) => (
          <label key={track} className={`opt ${liked[i] ? 'sel' : ''}`} style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={!!liked[i]} onChange={() => setLiked((x) => ({ ...x, [i]: !x[i] }))} style={{ marginTop: 4 }} />
            <span><span>{enjoy}</span>{liked[i] && <span className="small" style={{ display: 'block', marginTop: 4 }}><b>{track}.</b> Try: {test}.</span>}</span>
          </label>
        ))}
      </div>
      {picks.length > 0 && <div className="banner" style={{ marginTop: 10 }}>Leaning towards <b>{picks.map((p) => p[1]).join(' and ')}</b>. {s.profile?.primary && !picks.some((p) => p[1] === s.profile!.primary) ? <>Your profile says {s.profile.primary}; <Link to="/profile">change it</Link> if this shifted your view.</> : 'That matches your profile.'}</div>}
      <div className="callout traps"><div className="ctitle">Common traps in choosing a track</div><div className="prose">{TRACK_TRAPS.map(([b, t]) => <p key={b}><b>{b}</b> {t}</p>)}</div></div>

      <h2 className="serif" style={{ fontSize: 22, margin: '26px 0 10px', color: 'var(--navy)' }}>Your reading path</h2>
      <div className="stack">
        {READING_PATHS.map((r) => {
          const me = r.who === s.profile?.background;
          return (
            <details key={r.who} open={me} className="card" style={{ borderColor: me ? 'var(--navy2)' : undefined }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{r.who} <span className="muted" style={{ fontWeight: 400 }}>{r.from}</span>{me && <span className="chip p1" style={{ marginLeft: 8 }}>you</span>}</summary>
              <div className="small" style={{ marginTop: 8, lineHeight: 1.7 }}><b>Start with:</b> {r.start}<br /><b>Skim:</b> {r.skim}<br /><b>Blind spot:</b> {r.blind}<br /><b>Focus:</b> {r.focus}</div>
            </details>
          );
        })}
      </div>

      <h2 className="serif" style={{ fontSize: 22, margin: '26px 0 10px', color: 'var(--navy)' }}>How every chapter is built</h2>
      <div className="stack">{CHAPTER_PATTERN.map(([h, t], i) => <div key={h} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><span className="tick on" style={{ background: 'var(--navy)', borderColor: 'var(--navy)' }}>{i + 1}</span><span><b>{h}.</b> {t}</span></div>)}</div>

      <div className="callout drill" style={{ marginTop: 22 }}><div className="ctitle">Week 1 drill</div><div className="prose"><p><Inline t={WEEK1_DRILL} /></p></div>
        <div className="row" style={{ marginBottom: 10 }}><Link to="/profile" className="btn sm">Record track and firms</Link><Link to="/diagnostic" className="btn sm primary"><Icon n="play" s={13} /> Take the diagnostic</Link></div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}><Link to="/learn/A1" className="btn primary">Begin with A1 Financial statements <Icon n="arrowR" s={15} /></Link></div>
    </div>
  );
}
