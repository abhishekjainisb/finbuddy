import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import {
  scopeTopics, readinessFor, tracksOf, dayKey, addDays, streakOf, levelOf, LEVELS, stateCounts, overallAccuracy, topicState, isWeak, STATE_LABEL, STATE_ORDER, weekXp,
} from '../lib/state';
import { Bar, PageHead, StateDot, Ring } from '../components/ui';

const COLORS: Record<string, string> = { new: 'var(--s-new)', read: 'var(--s-read)', drilled: 'var(--s-drilled)', proven: 'var(--s-proven)', mastered: 'var(--s-mastered)' };

export default function Progress() {
  const { s, mutate } = useStore();
  const [params] = useSearchParams();
  const today = dayKey();
  const st = streakOf(s); const lv = levelOf(s.xp.total);
  const SCOPE = scopeTopics(s); const READINESS = readinessFor(s);
  const counts = stateCounts(s); const acc = overallAccuracy(s);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { const f = params.get('focus'); if (f) setTimeout(() => document.getElementById(f)?.scrollIntoView({ behavior: 'smooth' }), 150); }, [params]);

  const days30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const maxXp = Math.max(s.profile?.dailyTarget || 50, ...days30.map((d) => s.xp.days[d] || 0));
  const tgt = s.profile?.dailyTarget || 50;
  // 18-week calendar ending this week (columns are weeks, Monday on top)
  const cal = useMemo(() => {
    const dow = (new Date().getDay() + 6) % 7; const end = addDays(today, 6 - dow);
    return Array.from({ length: 18 * 7 }, (_, i) => addDays(end, i - 18 * 7 + 1));
  }, [today]);
  const clusters = useMemo(() => {
    const m: Record<string, { ok: number; n: number; ids: string[] }> = {};
    for (const t of SCOPE) { const x = (m[t.cluster] ||= { ok: 0, n: 0, ids: [] }); x.ids.push(t.id); const r = s.topics[t.id]?.recent || []; x.ok += r.reduce((a, b) => a + b, 0); x.n += r.length; }
    return Object.entries(m);
  }, [s.topics, SCOPE]);
  const allR = [...READINESS.technicals, ...READINESS.other]; const rDone = allR.filter((r) => s.readiness[r.id]).length;

  return (
    <div className="content">
      <PageHead kicker="Evidence of progress" title="Progress" sub="Topic states only move on evidence: drills right across days, questions answered aloud, spacing. Reading alone gets a topic to Read." />
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card stat"><span>Total XP</span><b className="tnum">{s.xp.total.toLocaleString('en-IN')}</b><span>{weekXp(s)} in the last 7 days</span></div>
        <div className="card stat"><span>Level</span><b>{lv.name}</b><Bar v={lv.pct} /><span>{lv.next ? `${lv.to - s.xp.total} XP to ${lv.next}` : 'Top level'}</span></div>
        <div className="card stat"><span>Streak</span><b className="tnum">{st.current}d</b><span>best {st.best}d · 20 XP keeps a day</span></div>
        <div className="card stat"><span>Accuracy, 14 days</span><b className="tnum">{acc === null ? 'n/a' : Math.round(acc * 100) + '%'}</b><span>{s.attempts.length} answers logged</span></div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="kicker">XP, last 30 days</div>
          <svg viewBox="0 0 300 120" style={{ width: '100%', height: 150, marginTop: 10 }} role="img" aria-label="Daily XP chart">
            <line x1="0" x2="300" y1={110 - (tgt / maxXp) * 100} y2={110 - (tgt / maxXp) * 100} stroke="var(--c-drill)" strokeDasharray="3 3" strokeWidth="0.8" />
            {days30.map((d, i) => { const v = s.xp.days[d] || 0; const h = (v / maxXp) * 100; return (
              <rect key={d} x={i * 10 + 1} y={110 - h} width="8" height={Math.max(h, v ? 1.5 : 0.6)} rx="1.5" fill={v >= tgt ? 'var(--good)' : v >= 20 ? 'var(--navy2)' : 'var(--line)'} onMouseEnter={() => setHover(`${d}: ${v} XP`)} onMouseLeave={() => setHover(null)} />
            ); })}
            <text x="298" y={106 - (tgt / maxXp) * 100} textAnchor="end" fontSize="7" fill="var(--c-drill)">target {tgt}</text>
          </svg>
          <div className="small muted">{hover || 'Green: target hit. Blue: streak day. Hover a bar for the number.'}</div>
        </div>
        <div className="card">
          <div className="kicker">Activity calendar</div>
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <div className="cal">{cal.map((d) => { const v = s.xp.days[d] || 0; return <i key={d} title={`${d}: ${v} XP`} className={d > today ? '' : v >= tgt ? 'l3' : v >= 20 ? 'l2' : v > 0 ? 'l1' : ''} style={d > today ? { opacity: 0.3 } : undefined} />; })}</div>
          </div>
          <div className="row small muted" style={{ marginTop: 10 }}>Less <div className="cal" style={{ gridTemplateRows: '12px', display: 'inline-grid' }}><i /><i className="l1" /><i className="l2" /><i className="l3" /></div> More</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="kicker">Mastery map · {SCOPE.length} topics: common core + {tracksOf(s).map((t) => t.short).join(' + ')}</div><h3>{counts.proven + counts.mastered} proven or mastered</h3></div>
          <div className="row small" style={{ gap: 12 }}>{STATE_ORDER.map((k) => <span key={k} className="row" style={{ gap: 5 }}><StateDot st={k} />{counts[k]} {STATE_LABEL[k].toLowerCase()}</span>)}</div>
        </div>
        <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', margin: '12px 0 16px' }}>
          {STATE_ORDER.map((k) => <div key={k} style={{ width: `${(counts[k] / SCOPE.length) * 100}%`, background: COLORS[k], transition: 'width .5s' }} />)}
        </div>
        <div className="heat">
          {SCOPE.map((t) => { const ts = topicState(s, t.id); return (
            <Link key={t.id} to={`/topic/${t.id}`} style={{ ['--hc' as any]: COLORS[ts], outline: isWeak(s, t.id) ? '2px solid var(--bad)' : undefined }} title={`${t.title}: ${STATE_LABEL[ts]}`}>
              <b>{t.id}</b>{t.cluster}
            </Link>
          ); })}
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="kicker" style={{ marginBottom: 10 }}>Recent accuracy by cluster</div>
          <div className="stack" style={{ gap: 8 }}>
            {clusters.map(([c, x]) => (
              <div key={c} className="row" style={{ flexWrap: 'nowrap' }}>
                <span className="small" style={{ width: 190, flex: 'none' }}>{c}</span>
                <div style={{ flex: 1 }}>{x.n ? <Bar v={x.ok / x.n} good={x.ok / x.n >= 0.8} /> : <div className="bar" />}</div>
                <span className="small tnum muted" style={{ width: 44, textAlign: 'right' }}>{x.n ? Math.round((x.ok / x.n) * 100) + '%' : '·'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="kicker">Level ladder</div>
          <div className="stack" style={{ gap: 10, marginTop: 12 }}>
            {LEVELS.map((l, i) => (
              <div key={l.name} className="row" style={{ flexWrap: 'nowrap', opacity: i <= lv.idx ? 1 : 0.5 }}>
                <Ring v={i < lv.idx ? 1 : i === lv.idx ? lv.pct : 0} size={34} stroke={4}><span className="small" style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span></Ring>
                <b style={{ flex: 1 }}>{l.name}</b><span className="small muted tnum">{l.at.toLocaleString('en-IN')} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" id="readiness">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="kicker">Guide H3 · before process week</div><h3>Readiness checklist</h3></div>
          <Ring v={rDone / allR.length} size={56} stroke={6}><b className="small tnum">{rDone}/{allR.length}</b></Ring>
        </div>
        <div className="grid g2" style={{ marginTop: 10 }}>
          {([['Technicals', READINESS.technicals], ['Everything else', READINESS.other]] as const).map(([h, arr]) => (
            <div key={h}>
              <div className="kicker" style={{ margin: '8px 0 4px' }}>{h}</div>
              {arr.map((r) => {
                const topic = 'topic' in r ? (r as any).topic as string : null;
                const proven = topic ? ['proven', 'mastered'].includes(topicState(s, topic)) : null;
                return (
                  <label key={r.id} className="check" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!s.readiness[r.id]} onChange={() => mutate((d) => { d.readiness[r.id] = !d.readiness[r.id]; })} style={{ marginTop: 4 }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontSize: 14 }}>{r.text}</span>
                      {topic && <span className="small muted" style={{ display: 'block' }}>Evidence: <Link to={`/topic/${topic}`}>{topic}</Link> is {STATE_LABEL[topicState(s, topic)].toLowerCase()}{proven ? '' : '; prove it before you tick this'}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
