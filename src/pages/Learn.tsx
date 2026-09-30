import { Link, useParams } from 'react-router-dom';
import unitsJson from '../data/units.json';
import { useStore } from '../lib/store';
import { tracksOf, LESSON_BY_ID, TOPIC_BY_ID, topicState, isWeak, STATE_LABEL, QUESTIONS_BY_TOPIC, DRILLS_BY_TOPIC } from '../lib/state';
import { GEN_BY_TOPIC } from '../drills/generators';
import { PARTS } from '../data/startHere';
import { Icon, Bar, PageHead, StateDot, Inline, Back } from '../components/ui';

export interface Unit { id: string; part: string; kicker: string; title: string; intro: string; page: number; sections: string[] }
export const UNITS = unitsJson as Unit[];
export const PART_COLOR: Record<string, string> = { A: 'var(--pA)', B: 'var(--pB)', C: 'var(--pC)', D: 'var(--pD)', E: 'var(--pE)', F: 'var(--pF)' };
const unitTopics = (u: Unit) => [...new Set(u.sections.flatMap((id) => LESSON_BY_ID[id]?.topics || []))];

export default function Learn() {
  const { s } = useStore();
  const all = UNITS.flatMap((u) => u.sections); const done = all.filter((id) => s.lessons[id]?.done).length;
  return (
    <div className="content">
      <PageHead kicker="The guide, as lessons" title="Learn" sub="Each section is a short, stepped lesson with checks along the way. Finishing a lesson marks its topics as read; drills and the bank move them to proven." right={<div className="stat" style={{ minWidth: 180 }}><b className="tnum">{done}/{all.length}</b><span>sections finished</span><Bar v={done / all.length} good /></div>} />
      <Link to="/start" className="card raised row" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 22, borderLeft: '4px solid var(--navy)' }}>
        <Icon n="flag" s={22} />
        <div style={{ flex: 1 }}><div className="kicker">Before you begin</div><h3 className="serif" style={{ fontSize: 19 }}>Start here: how to choose a track and use this guide</h3></div>
        <Icon n="arrowR" />
      </Link>
      {PARTS.map((part) => {
        const units = UNITS.filter((u) => u.part === part.id);
        return (
          <section key={part.id} style={{ marginBottom: 26 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <span className="chip" style={{ background: PART_COLOR[part.id], color: '#fff', borderColor: 'transparent' }}>Part {part.id}</span>
              <h2 className="serif" style={{ fontSize: 22 }}>{part.name}</h2>
              {!part.live && <span className="chip"><Icon n="lock" s={12} /> Phase 2</span>}
              {tracksOf(s).some((tr) => tr.units.some((u) => u.startsWith(part.id))) && <span className="chip p1">Your track</span>}
            </div>
            {part.live ? (
              <div className="grid g3">
                {units.map((u) => {
                  const ts = unitTopics(u); const d = u.sections.filter((id) => s.lessons[id]?.done).length;
                  return (
                    <Link key={u.id} to={`/learn/${u.id}`} className="unitcard" style={{ ['--pc' as any]: PART_COLOR[u.part] }}>
                      <div className="kicker">{u.id} · {u.sections.length} sections</div>
                      <h3>{u.title}</h3>
                      <div className="dots">{ts.map((t) => <i key={t} className={`st-${topicState(s, t)}`} title={`${t}: ${STATE_LABEL[topicState(s, t)]}`} style={isWeak(s, t) ? { outline: '2px solid var(--bad)', outlineOffset: 1 } : undefined} />)}</div>
                      <Bar v={d / u.sections.length} good />
                      <div className="small muted">{d}/{u.sections.length} read</div>
                    </Link>
                  );
                })}
              </div>
            ) : <p className="muted small" style={{ margin: 0 }}>{part.blurb}</p>}
          </section>
        );
      })}
      <div className="row small muted" style={{ gap: 14 }}>
        {(['new', 'read', 'drilled', 'proven', 'mastered'] as const).map((k) => <span key={k} className="row" style={{ gap: 5 }}><StateDot st={k} />{STATE_LABEL[k]}</span>)}
        <span className="row" style={{ gap: 5 }}><i className="dot" style={{ outline: '2px solid var(--bad)' }} />Weak</span>
      </div>
    </div>
  );
}

export function UnitPage() {
  const { id } = useParams();
  const { s } = useStore();
  const u = UNITS.find((x) => x.id === id);
  if (!u) return <div className="content"><div className="empty">Unit not found. <Link to="/learn">Back to Learn</Link></div></div>;
  const idx = UNITS.indexOf(u); const prev = UNITS[idx - 1]; const next = UNITS[idx + 1];
  return (
    <div className="content">
      <Back to="/learn" label="All units" />
      <PageHead kicker={u.kicker} title={u.title} sub={<Inline t={u.intro} />} />
      <div className="stack">
        {u.sections.map((sid) => {
          const l = LESSON_BY_ID[sid]; if (!l) return null;
          const ls = s.lessons[sid];
          const nDrills = l.topics.reduce((a, t) => a + (DRILLS_BY_TOPIC[t]?.length || 0) + (GEN_BY_TOPIC[t]?.length || 0), 0);
          const nQ = l.topics.reduce((a, t) => a + (QUESTIONS_BY_TOPIC[t]?.length || 0), 0);
          return (
            <div key={sid} className="card row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 14 }}>
              <span className={`tick ${ls?.done ? 'on' : ''}`} style={{ marginTop: 3 }}>{ls?.done ? '✓' : ''}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/lesson/${sid}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}><span className="sec-id">{sid}</span>{l.title}</div>
                </Link>
                <div className="row small" style={{ marginTop: 6, gap: 8 }}>
                  {l.priority === 1 && <span className="chip p1">P1 · most tested</span>}
                  {l.topics.map((t) => <Link key={t} to={`/topic/${t}`} className="chip" title={TOPIC_BY_ID[t]?.title}><StateDot st={topicState(s, t)} /> {t}</Link>)}
                  <span className="muted">{nDrills} drills · {nQ} bank questions · guide p. {l.page}</span>
                </div>
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <Link to={`/lesson/${sid}`} className={`btn sm ${ls?.done ? '' : 'primary'}`}>{ls?.done ? 'Review' : ls ? 'Resume' : 'Start'}</Link>
                {l.topics[0] && <Link to={`/practice/run?topic=${l.topics.join(',')}`} className="btn sm hide-sm" title="Practise this section"><Icon n="target" s={14} /></Link>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 20 }}>
        {prev ? <Link to={`/learn/${prev.id}`} className="btn"><Icon n="arrowL" s={15} /> {prev.id} {prev.title}</Link> : <span />}
        {next && <Link to={`/learn/${next.id}`} className="btn">{next.id} {next.title} <Icon n="arrowR" s={15} /></Link>}
      </div>
    </div>
  );
}
