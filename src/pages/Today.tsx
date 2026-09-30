import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import {
  LESSONS, PILOT, TOPIC_BY_ID, dayKey, streakOf, levelOf, currentWeek, weekStatus, isWeak, topicState, dueCards,
  openErrors, stateCounts, focusTopics, whatNext, addDays, STATE_LABEL,
} from '../lib/state';
import { Icon, Ring, Bar, FactsGrid, StateDot } from '../components/ui';

export function nextLesson(s: ReturnType<typeof useStore>['s']) {
  const started = LESSONS.filter((l) => s.lessons[l.id] && !s.lessons[l.id].done).sort((a, b) => (s.lessons[b.id].at || 0) - (s.lessons[a.id].at || 0));
  if (started[0]) return { l: started[0], resume: true };
  const w = weekStatus(s, currentWeek(s)).week;
  const inWeek = LESSONS.find((l) => w.chapters.includes(l.unit) && !s.lessons[l.id]?.done);
  const any = inWeek || LESSONS.find((l) => !s.lessons[l.id]?.done);
  return any ? { l: any, resume: false } : null;
}

export default function Today() {
  const { s } = useStore();
  const p = s.profile!;
  const today = dayKey();
  const xpToday = s.xp.days[today] || 0;
  const st = streakOf(s); const lv = levelOf(s.xp.total);
  const wk = currentWeek(s); const ws = weekStatus(s, wk);
  const due = dueCards(s).length; const open = openErrors(s).length;
  const weak = PILOT.filter((t) => isWeak(s, t.id)).slice(0, 5);
  const focus = focusTopics(s).slice(0, 5);
  const counts = stateCounts(s);
  const nl = nextLesson(s);
  const hr = new Date().getHours();
  const hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <div className="content">
      <div className="hero" style={{ marginBottom: 18 }}>
        <div>
          <div className="kicker" style={{ color: 'inherit', opacity: 0.75 }}>Week {wk} of 8 · {ws.week.goal}</div>
          <h2 style={{ marginTop: 6 }}>{hello}, {p.name.split(' ')[0]}.</h2>
          <p>{xpToday >= p.dailyTarget ? 'Daily target done. Anything more is compounding.' : `${p.dailyTarget - xpToday} XP to today's target. Ten mixed questions usually gets you there.`}</p>
          <div className="row" style={{ marginTop: 16 }}>
            <Link to="/practice/run?mode=daily" className="btn lg"><Icon n="play" s={16} /> Start today's 10</Link>
            {nl && <Link to={`/lesson/${nl.l.id}`} className="btn lg" style={{ background: 'transparent', color: 'inherit', borderColor: 'color-mix(in srgb, currentColor 35%, transparent)' }}>{nl.resume ? 'Resume' : 'Read'} {nl.l.id}</Link>}
          </div>
        </div>
        <Ring v={xpToday / p.dailyTarget} size={124} stroke={11} color="#8fd3c3">
          <div><b style={{ fontSize: 26 }} className="tnum">{xpToday}</b><div className="small" style={{ opacity: 0.8 }}>of {p.dailyTarget} XP</div></div>
        </Ring>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <span className="row" style={{ gap: 6 }}><Icon n="flame" s={16} className="" /> Streak</span>
          <b>{st.current} day{st.current === 1 ? '' : 's'}</b>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>{last7.map((d) => <i key={d} title={`${d}: ${s.xp.days[d] || 0} XP`} style={{ width: 16, height: 16, borderRadius: 4, background: (s.xp.days[d] || 0) >= 20 ? 'var(--c-drill)' : 'var(--wash2)', display: 'block' }} />)}</div>
          <span>{st.todayDone ? 'Safe for today' : 'Earn 20 XP today to keep it'} · best {st.best}</span>
        </div>
        <div className="card stat">
          <span>Level</span><b>{lv.name}</b>
          <Bar v={lv.pct} /><span>{lv.next ? `${lv.to - s.xp.total} XP to ${lv.next}` : 'Top of the ladder'}</span>
        </div>
        <Link to="/bank" className="card stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span>Bank cards due</span><b>{due}</b><span>Spaced review: answer aloud, grade yourself</span>
        </Link>
        <Link to="/errors" className="card stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span>Open errors</span><b style={{ color: open ? 'var(--bad)' : undefined }}>{open}</b><span>Resolve by getting each right on two different days</span>
        </Link>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div><div className="kicker">This week's exit gate</div><h3>{ws.week.exit}</h3></div>
            <Ring v={ws.done / ws.total} size={56} stroke={6}><b className="small tnum">{ws.done}/{ws.total}</b></Ring>
          </div>
          <div style={{ marginTop: 8 }}>
            {ws.checks.map((c, i) => (
              <div key={i} className="check">
                <span className={`tick ${c.ok ? 'on' : ''}`}>{c.ok ? '✓' : ''}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                  <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.detail}</div>
                  {c.progress && !c.ok && <div style={{ marginTop: 6 }}><Bar v={c.progress[0] / c.progress[1]} /></div>}
                </div>
                {c.action && !c.ok && <Link to={c.action.to} className="btn sm">{c.action.label}</Link>}
              </div>
            ))}
          </div>
          <Link to="/plan" className="btn ghost sm" style={{ marginTop: 6 }}>Open the plan <Icon n="arrowR" s={14} /></Link>
        </div>

        <div className="card">
          <div className="kicker">{weak.length ? 'Weak spots' : 'Focus this week'}</div>
          <h3>{weak.length ? 'Fix these before adding new material' : 'Topics this week asks you to move'}</h3>
          <div className="stack" style={{ marginTop: 12, gap: 8 }}>
            {(weak.length ? weak.map((t) => t.id) : focus).map((id) => {
              const t = TOPIC_BY_ID[id]; const ts = topicState(s, id);
              return (
                <div key={id} className="row" style={{ flexWrap: 'nowrap' }}>
                  <StateDot st={ts} />
                  <Link to={`/topic/${id}`} style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.cluster} <span className="chip id">{id}</span></div>
                    <div className="small muted">{STATE_LABEL[ts]} · {whatNext(s, id)}</div>
                  </Link>
                  <Link to={`/practice/run?topic=${id}`} className="btn sm"><Icon n="play" s={13} /></Link>
                </div>
              );
            })}
            {!weak.length && !focus.length && <div className="empty">Everything this week is proven. Take a mock or push ahead.</div>}
          </div>
          <div className="row small" style={{ marginTop: 14, gap: 12 }}>
            {(['read', 'drilled', 'proven', 'mastered'] as const).map((k) => <span key={k} className="row" style={{ gap: 5 }}><StateDot st={k} />{counts[k]} {STATE_LABEL[k].toLowerCase()}</span>)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="kicker">Market pulse</div><h3>Numbers an interviewer may ask you today</h3></div>
          <Link to="/library?tab=markets" className="btn ghost sm">All figures <Icon n="arrowR" s={14} /></Link>
        </div>
        <div style={{ marginTop: 12 }}><FactsGrid keys={['repo', 'gsec10', 'cpi', 'usdinr']} /></div>
      </div>
    </div>
  );
}
