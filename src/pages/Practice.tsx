import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import {
  TRACKER, scopeTopics, tracksOf, TOPIC_BY_ID, LESSONS_BY_TOPIC, DRILLS_BY_TOPIC, QUESTIONS_BY_TOPIC, STATE_LABEL, STATE_ORDER, topicQueue, dailyQueue, topicState,
  isWeak, whatNext, openErrors, accuracy, STATIC_BY_ID, atLeast, DIAG_IDS, addXp, XP, LESSON_BY_ID, dayKey, daysBetween,
  type QItem, type TopicState,
} from '../lib/state';
import { GENERATORS, GEN_BY_TOPIC, TAG_LABELS } from '../drills/generators';
import { Session, type SessionResult } from '../components/Session';
import { Bar, Icon, PageHead, StateDot, Back, shuffled } from '../components/ui';
import { UNITS, PART_COLOR } from './Learn';
import { TRACK_DEFS, topicInTrack } from '../data/tracks';

const clusterOf = (id: string) => TOPIC_BY_ID[id]?.cluster || id;

export default function Practice() {
  const { s } = useStore();
  const [tab, setTab] = useState<'topics' | 'lab' | 'mixed'>('topics');
  const [filter, setFilter] = useState<'all' | 'weak' | 'todo'>('all');
  // which set of topics: the student's own (core + their tracks), or one specific track
  const [area, setArea] = useState<string>('mine');
  const mine = tracksOf(s);
  const base = area === 'mine' ? scopeTopics(s) : area === 'core' ? TRACKER.filter((t) => t.id.startsWith('CORE'))
    : TRACKER.filter((t) => topicInTrack(t.id, TRACK_DEFS.find((d) => d.short === area) || TRACK_DEFS[0]));
  const topics = base.filter((t) => {
    if (filter === 'weak') return isWeak(s, t.id);
    if (filter === 'todo') return !atLeast(topicState(s, t.id), 'proven');
    return true;
  });
  const clusters = [...new Set(topics.map((t) => t.cluster))];
  return (
    <div className="content">
      <PageHead kicker="Drill" title="Practice" sub="Short rounds. Wrong answers come back at the end of the round and go into your error log, tagged by the kind of slip." />
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <Link to="/practice/run?mode=daily" className="card raised stack" style={{ textDecoration: 'none', color: 'inherit', borderTop: '4px solid var(--navy)' }}>
          <Icon n="bolt" s={22} /><h3>Today's 10</h3><span className="small muted">Due bank cards, open errors, weak and this-week topics, in one round.</span>
        </Link>
        <Link to="/practice/run?mode=errors" className="card raised stack" style={{ textDecoration: 'none', color: 'inherit', borderTop: '4px solid var(--bad)' }}>
          <Icon n="alert" s={22} /><h3>Error rematch</h3><span className="small muted">{openErrors(s).length} open errors. Right on two different days resolves each one.</span>
        </Link>
        <Link to="/practice/run?mode=mixed" className="card raised stack" style={{ textDecoration: 'none', color: 'inherit', borderTop: '4px solid var(--c-worked)' }}>
          <Icon n="shuffle" s={22} /><h3>Mixed interview round</h3><span className="small muted">12 items across everything you have read, like a technical round.</span>
        </Link>
      </div>
      <div className="tabs" role="tablist">
        {([['topics', 'By topic'], ['lab', 'Number lab'], ['mixed', 'By chapter']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'topics' && <>
        <div className="row" style={{ marginBottom: 14, gap: 8 }}>
          <select value={area} onChange={(e) => setArea(e.target.value)} style={{ width: 'auto' }} aria-label="Which topics">
            <option value="mine">My topics: core + {mine.map((m) => m.short).join(' + ')}</option>
            <option value="core">Common core</option>
            {TRACK_DEFS.map((d) => <option key={d.short} value={d.short}>{d.name}</option>)}
          </select>
          <div className="seg">
            {([['all', 'All'], ['todo', 'Not proven'], ['weak', 'Weak']] as const).map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
        </div>
        {!topics.length && <div className="empty">Nothing here. {filter === 'weak' ? 'No weak topics right now.' : ''}</div>}
        {clusters.map((c) => (
          <div key={c} style={{ marginBottom: 16 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>{c}</div>
            <div className="grid g2">
              {topics.filter((t) => t.cluster === c).map((t) => {
                const st = topicState(s, t.id); const stat = s.topics[t.id];
                const n = (DRILLS_BY_TOPIC[t.id]?.length || 0) + (GEN_BY_TOPIC[t.id]?.length || 0);
                return (
                  <div key={t.id} className="card row" style={{ flexWrap: 'nowrap', padding: 14, alignItems: 'flex-start' }}>
                    <StateDot st={st} />
                    <Link to={`/topic/${t.id}`} style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>{t.title}</div>
                      <div className="row small muted" style={{ gap: 6, marginTop: 4 }}>
                        <span className="chip id">{t.id}</span>{t.priority === 1 && <span className="chip p1">P1</span>}
                        {isWeak(s, t.id) && <span className="chip weak">weak</span>}
                        <span>{STATE_LABEL[st]}{stat ? ` · ${Math.round(accuracy(stat.recent) * 100)}% recent` : ''}</span>
                      </div>
                    </Link>
                    {n > 0 ? <Link to={`/practice/run?topic=${t.id}`} className="btn sm primary" title={`${n} items`}><Icon n="play" s={13} /></Link> : <span className="small muted">bank only</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </>}
      {tab === 'lab' && <>
        <p className="muted" style={{ marginTop: 0 }}>Every problem is generated fresh, so you cannot memorise the answer. Wrong answers are diagnosed: forgot the tax effect, wrong sign on working capital, used revenue instead of COGS, and so on.</p>
        <div className="grid g3">
          {Object.entries(GENERATORS).map(([id, g]) => {
            const tried = s.attempts.filter((a) => a.ref === 'gen:' + id); const ok = tried.filter((a) => a.ok).length;
            return (
              <Link key={id} to={`/practice/run?gen=${id}`} className="card stack" style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="chip id">{g.topic}</span><Icon n="sigma" s={16} /></div>
                <b>{g.title}</b>
                <span className="small muted">{clusterOf(g.topic)}</span>
                {tried.length > 0 ? <><Bar v={ok / tried.length} good /><span className="small muted">{ok}/{tried.length} right</span></> : <span className="small muted">Not tried yet</span>}
              </Link>
            );
          })}
        </div>
      </>}
      {tab === 'mixed' && (
        <div className="grid g3">
          {UNITS.filter((u) => u.part === 'A' || mine.some((m) => m.units.includes(u.id))).map((u) => {
            const ts = [...new Set(u.sections.flatMap((sid) => LESSON_BY_ID[sid]?.topics || []))].filter((t) => DRILLS_BY_TOPIC[t]?.length);
            return (
              <Link key={u.id} to={`/practice/run?topic=${ts.join(',')}&n=10&label=${encodeURIComponent(u.id + ' ' + u.title)}`} className="unitcard" style={{ ['--pc' as any]: PART_COLOR[u.part] }}>
                <div className="kicker">{u.id} · {ts.length} topics</div><h3>{u.title}</h3>
                <div className="dots">{ts.map((t) => <i key={t} className={`st-${topicState(s, t)}`} />)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- the session route: /practice/run?mode=daily|errors|mixed  or ?topic=ID[,ID]  or ?gen=ID
export function PracticeRun() {
  const { s } = useStore();
  const [q] = useSearchParams();
  const [round, setRound] = useState(0);
  const mode = q.get('mode'); const topic = q.get('topic'); const gen = q.get('gen'); const n = Number(q.get('n')) || 0;
  const { items, title } = useMemo(() => {
    const seed = Date.now();
    if (mode === 'daily') return { items: dailyQueue(s, 10), title: "Today's 10" };
    if (mode === 'errors') {
      const it: QItem[] = openErrors(s).sort((a, b) => a.last - b.last).slice(0, 12).map((e) => e.ref.startsWith('gen:') ? { kind: 'gen', id: e.ref.slice(4), topic: e.topic, seed: seed + e.first % 1000 } : { kind: 'static', id: e.ref, topic: e.topic });
      return { items: it.filter((x) => x.kind === 'gen' ? GENERATORS[x.id] : STATIC_BY_ID[x.id]), title: 'Error rematch' };
    }
    if (mode === 'mixed') {
      const scope = scopeTopics(s);
      const read = scope.map((t) => t.id).filter((t) => atLeast(topicState(s, t), 'read') && DRILLS_BY_TOPIC[t]?.length);
      const pool = read.length >= 3 ? read : scope.filter((t) => t.priority === 1 && DRILLS_BY_TOPIC[t.id]?.length).map((t) => t.id);
      const it = shuffled(pool, seed).slice(0, 12).map((t) => topicQueue(s, t, 2)[0]).filter(Boolean);
      return { items: it, title: 'Mixed interview round' };
    }
    if (gen && GENERATORS[gen]) return { items: Array.from({ length: 5 }, (_, i): QItem => ({ kind: 'gen', id: gen, topic: GENERATORS[gen].topic, seed: seed + i * 7919 })), title: GENERATORS[gen].title };
    if (topic) {
      const ids = topic.split(',').filter((t) => TOPIC_BY_ID[t]);
      if (ids.length === 1) return { items: topicQueue(s, ids[0], n || 8), title: `${ids[0]} ${clusterOf(ids[0])}` };
      const per = Math.max(2, Math.ceil((n || 10) / ids.length));
      const it = shuffled(ids.flatMap((t) => topicQueue(s, t, per)), seed).slice(0, n || 10);
      return { items: it, title: q.get('label') || 'Mixed topics' };
    }
    return { items: dailyQueue(s, 10), title: "Today's 10" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, mode, topic, gen]);
  const exitTo = topic && !topic.includes(',') ? `/topic/${topic}` : mode === 'errors' ? '/errors' : '/practice';
  return (
    <div className="content narrow">
      {items.length === 0
        ? <div className="empty stack" style={{ alignItems: 'center' }}><b>Nothing to practise here yet.</b><span>{mode === 'errors' ? 'No open errors. Good.' : 'This topic is covered by the question bank only.'}</span><Link className="btn" to={exitTo}>Back</Link></div>
        : <Session key={`${round}|${q.toString()}`} items={items} src={mode === 'daily' ? 'daily' : 'drill'} title={title} exitTo={exitTo} again={() => setRound((r) => r + 1)} />}
    </div>
  );
}

// ---------- topic detail
export function TopicPage() {
  const { id } = useParams();
  const { s } = useStore();
  const t = id ? TOPIC_BY_ID[id] : undefined;
  if (!t) return <div className="content"><div className="empty">Topic not found.</div></div>;
  const st = topicState(s, t.id); const stat = s.topics[t.id];
  const lessons = LESSONS_BY_TOPIC[t.id] || []; const qs = QUESTIONS_BY_TOPIC[t.id] || [];
  const errs = openErrors(s, t.id);
  const nDrill = (DRILLS_BY_TOPIC[t.id]?.length || 0) + (GEN_BY_TOPIC[t.id]?.length || 0);
  const idx = STATE_ORDER.indexOf(st);
  const spacing = stat?.firstOk && stat.days.length ? daysBetween(stat.firstOk, dayKey()) : 0;
  return (
    <div className="content">
      <Back to="/practice" label="All topics" />
      <PageHead kicker={`${t.id} · ${t.cluster}${t.priority === 1 ? ' · P1' : ''}`} title={t.title} sub={<>Evidence to produce: <b>{t.output}</b></>} />
      <div className="card raised" style={{ marginBottom: 16 }}>
        <div className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
          {STATE_ORDER.map((k: TopicState, i) => (
            <div key={k} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div style={{ height: 4, background: i <= idx ? 'var(--navy2)' : 'var(--wash2)', margin: '0 0 10px' }} />
              <i className={`dot st-${k}`} style={{ width: 16, height: 16, boxShadow: i === idx ? '0 0 0 4px color-mix(in srgb, var(--navy2) 25%, transparent)' : undefined, opacity: i <= idx ? 1 : 0.35 }} />
              <div className="small" style={{ fontWeight: i === idx ? 700 : 500, color: i <= idx ? 'var(--ink)' : 'var(--faint)' }}>{STATE_LABEL[k]}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          <div><b>Next:</b> {whatNext(s, t.id)}</div>
          {isWeak(s, t.id) && <span className="chip weak">Weak: recent accuracy under 60% or 2+ open errors</span>}
        </div>
        <div className="grid g4" style={{ marginTop: 14 }}>
          <div className="stat"><b className="tnum">{stat?.attempts || 0}</b><span>attempts</span></div>
          <div className="stat"><b className="tnum">{stat ? Math.round(accuracy(stat.recent) * 100) + '%' : 'n/a'}</b><span>last {stat?.recent.length || 0} accuracy</span></div>
          <div className="stat"><b className="tnum">{stat?.days.length || 0}</b><span>days with a correct answer</span></div>
          <div className="stat"><b className="tnum">{spacing}d</b><span>since first correct (7 to master)</span></div>
        </div>
      </div>
      <div className="grid g2">
        <div className="card stack">
          <div className="kicker">Read</div>
          {lessons.map((l) => <Link key={l.id} to={`/lesson/${l.id}`} className="row" style={{ color: 'inherit', textDecoration: 'none' }}><span className={`tick ${s.lessons[l.id]?.done ? 'on' : ''}`}>{s.lessons[l.id]?.done ? '✓' : ''}</span><b>{l.id}</b> {l.title}</Link>)}
          {!lessons.length && <span className="small muted">Covered in the guide on p. {t.page}.</span>}
          <div className="kicker" style={{ marginTop: 10 }}>Drill</div>
          {nDrill ? <Link to={`/practice/run?topic=${t.id}`} className="btn primary"><Icon n="play" s={15} /> Practise ({nDrill} item types)</Link> : <span className="small muted">No drills; use the bank questions.</span>}
          {(GEN_BY_TOPIC[t.id] || []).map((g) => <Link key={g} to={`/practice/run?gen=${g}`} className="btn sm"><Icon n="sigma" s={13} /> {GENERATORS[g].title}</Link>)}
        </div>
        <div className="card stack">
          <div className="kicker">Prove: say it out loud ({qs.length})</div>
          {qs.map((q) => {
            const c = s.cards[q.id];
            return <Link key={q.id} to={`/bank?focus=${q.id}`} className="row" style={{ color: 'inherit', textDecoration: 'none', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <span className={`tick ${(c?.grade || 0) >= 3 ? 'on' : ''}`}>{(c?.grade || 0) >= 3 ? '✓' : ''}</span><span className="small">{q.q}</span></Link>;
          })}
          {!qs.length && <span className="small muted">No bank questions mapped to this topic.</span>}
          {errs.length > 0 && <>
            <div className="kicker" style={{ marginTop: 10 }}>Open errors ({errs.length})</div>
            {errs.map((e) => <div key={e.id} className="small"><span className="chip weak">{TAG_LABELS[e.tag] || e.tag}</span> {e.prompt.slice(0, 90)}{e.prompt.length > 90 ? '…' : ''}</div>)}
            <Link to="/errors" className="btn sm">Open error log</Link>
          </>}
        </div>
      </div>
    </div>
  );
}

// ---------- diagnostic: 20 core questions, scored by chapter
export function Diagnostic() {
  const { s, mutate, toast } = useStore();
  const [go, setGo] = useState(false);
  const items: QItem[] = DIAG_IDS.filter((i) => STATIC_BY_ID[i]).map((i) => ({ kind: 'static', id: i, topic: STATIC_BY_ID[i].topic }));
  const unitOf = (topic: string) => LESSONS_BY_TOPIC[topic]?.[0]?.unit || 'A';
  const finish = (r: SessionResult) => mutate((d) => {
    const byUnit: Record<string, [number, number]> = {};
    for (const [t, [ok, n]] of Object.entries(r.byTopic)) { const u = unitOf(t); const x = (byUnit[u] ||= [0, 0]); x[0] += ok; x[1] += n; }
    const first = !d.diag;
    d.diag = { score: r.ok, total: r.total, at: Date.now(), byUnit };
    if (first) { addXp(d, XP.diag); toast(`Diagnostic recorded. +${XP.diag} XP`, 'good'); }
  });
  if (go) return <div className="content narrow"><Session items={items} src="diag" title="Diagnostic" exitTo="/diagnostic" requeue={false} onComplete={finish} footer={<Link to="/diagnostic" className="btn primary">See my chapter breakdown</Link>} /></div>;
  const d = s.diag;
  return (
    <div className="content narrow">
      <PageHead kicker="Week 1" title="Diagnostic" sub="Twenty questions across the common core. It tells you where to start, not how good you are. Take it cold; do not look anything up." />
      {d && (
        <div className="card raised stack" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><div><div className="kicker">Last result</div><h3>{d.score}/{d.total} on {new Date(d.at).toLocaleDateString('en-IN')}</h3></div></div>
          {Object.entries(d.byUnit).sort().map(([u, [ok, n]]) => {
            const unit = UNITS.find((x) => x.id === u);
            return (
              <div key={u} className="row" style={{ flexWrap: 'nowrap' }}>
                <Link to={`/learn/${u}`} style={{ width: 210, color: 'inherit' }} className="small"><b>{u}</b> {unit?.title}</Link>
                <div style={{ flex: 1 }}><Bar v={ok / n} good={ok / n >= 0.7} /></div>
                <span className="small tnum">{ok}/{n}</span>
                {ok / n < 0.7 && <Link to={`/learn/${u}`} className="btn sm">Start here</Link>}
              </div>
            );
          })}
        </div>
      )}
      <button className="btn primary lg" onClick={() => setGo(true)}><Icon n="play" s={16} /> {d ? 'Retake the diagnostic' : 'Start: 20 questions, about 12 minutes'}</button>
    </div>
  );
}
