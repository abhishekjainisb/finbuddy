// IB 400: 400 investment banking interview questions in 28 sections. The learning loop
// is answer first (aloud or typed), then reveal, tick the key points you actually hit,
// and let the score schedule the next visit. Students mark questions to revisit.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { TOPIC_BY_ID, dayKey } from '../lib/state';
import { loadIb, ibCard, ibStats, ibDueIds, toggleMark, setNote, reviewIb, type IbData, type IbItem } from '../lib/ib';
import { PageHead, Icon, Bar } from '../components/ui';

type Filter = 'all' | 'new' | 'due' | 'star' | 'flag' | 'nailed';
const FILTERS: [Filter, string][] = [['all', 'All'], ['new', 'Not seen'], ['due', 'Due'], ['star', '⭐ Important'], ['flag', '🚩 Revisit'], ['nailed', '✅ Nailed']];
const PARTS = ['Technical', 'Deals and restructuring', 'Fit'];
const LAB_TOPICS = new Set(['CORE-01', 'CORE-02', 'CORE-03', 'CORE-04', 'CORE-05', 'CORE-06']);

export default function Ib400() {
  const [data, setData] = useState<IbData | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { loadIb().then(setData, () => setErr('Could not load the questions. Check your connection and refresh.')); }, []);
  const [params, setParams] = useSearchParams();
  if (err) return <div className="content"><div className="empty">{err}</div></div>;
  if (!data) return <div className="content"><div className="empty">Loading 400 questions…</div></div>;
  const study = params.get('study');
  if (study) return <StudyRoute data={data} spec={study} filter={(params.get('f') as Filter) || 'all'} onExit={() => setParams({})} />;
  return <Overview data={data} />;
}

function matches(s: ReturnType<typeof useStore>['s'], id: string, f: Filter) {
  const c = ibCard(s, id); const t = dayKey();
  if (f === 'all') return true;
  if (f === 'new') return !c.seen;
  if (f === 'due') return !!c.due && c.due <= t && !c.nailed;
  if (f === 'star') return !!c.star;
  if (f === 'flag') return !!c.flag;
  return !!c.nailed;
}

// ---------- overview: sections with progress, filters and search
function Overview({ data }: { data: IbData }) {
  const { s } = useStore();
  const [f, setF] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const st = ibStats(s); const due = ibDueIds(s);
  const byS = useMemo(() => { const m: Record<string, IbItem[]> = {}; for (const it of data.items) (m[it.s] ||= []).push(it); return m; }, [data]);
  const needle = q.trim().toLowerCase();
  const hits = needle.length >= 3 ? data.items.filter((it) => (it.q + ' ' + it.p.join(' ')).toLowerCase().includes(needle)).slice(0, 40) : null;
  const listMode = f !== 'all' && f !== 'new';
  return (
    <div className="content">
      <PageHead kicker="Interview bank" title="IB 400" sub="400 investment banking interview questions in 28 sections, rewritten for ISB and Indian IB. Answer first, then check yourself against the key points. What you miss comes back." />

      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Stat n={st.seen} of={data.items.length} l="seen" />
        <Stat n={st.nailed} l="nailed" />
        <Stat n={st.star} l="marked important" />
        <Stat n={st.flag} l="marked to revisit" />
      </div>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Link to={`/ib400?study=due`} className={`card raised stack ${due.length ? '' : 'dim'}`} style={{ textDecoration: 'none', color: 'inherit', borderTop: '4px solid var(--navy)' }}>
          <Icon n="cal" s={22} /><h3>Revisit due ({due.length})</h3><span className="small muted">{due.length ? 'Questions scheduled for today, weakest first.' : 'Nothing due. Answer a few and they come back on schedule.'}</span>
        </Link>
        <Link to="/ib400?study=rapid" className="card raised stack" style={{ textDecoration: 'none', color: 'inherit', borderTop: '4px solid var(--bad)' }}>
          <Icon n="timer" s={22} /><h3>Rapid fire</h3><span className="small muted">10 random technical questions, 60 seconds each, like a real technical round.</span>
        </Link>
        <Link to="/ib400?study=flagged" className="card raised stack" style={{ textDecoration: 'none', color: 'inherit', borderTop: '4px solid var(--c-traps)' }}>
          <Icon n="flag" s={22} /><h3>My marked ({st.flag + st.star})</h3><span className="small muted">Everything you marked to revisit or as important, in one round.</span>
        </Link>
      </div>

      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>How to get the most out of this</summary>
        <ol className="small" style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.65 }}>
          <li><b>Say your answer out loud first</b> (or type it). Reading a model answer feels like knowing it; interviews test recall.</li>
          <li><b>Reveal, then tick only the key points you actually said.</b> Your score sets when it comes back: 1, 3, 7, 14, 30 or 60 days.</li>
          <li><b>Mark as you go:</b> ⭐ important for your final revision, 🚩 confusing and worth another look, ✅ nailed (taken out of rotation). Add a note with your own example.</li>
          <li>Technical answers count toward your topics on Progress, and misses land in your error log.</li>
        </ol>
      </details>

      <div className="card stack" style={{ gap: 10, marginBottom: 16 }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions, e.g. goodwill, WACC, accretion" aria-label="Search questions" />
        <div className="seg ibfilters">{FILTERS.map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div>
      </div>

      {hits && <QuestionList title={`${hits.length} matching question${hits.length === 1 ? '' : 's'}`} items={hits} data={data} />}

      {!hits && listMode && (() => {
        const items = data.items.filter((it) => matches(s, it.id, f));
        return items.length
          ? <QuestionList title={`${items.length} question${items.length === 1 ? '' : 's'}`} items={items} data={data} studyAll={`/ib400?study=filter&f=${f}`} />
          : <div className="empty">Nothing here yet. Mark questions while you study and they collect here.</div>;
      })()}

      {!hits && !listMode && PARTS.map((part) => (
        <div key={part} style={{ marginBottom: 18 }}>
          <div className="kicker" style={{ margin: '4px 0 8px' }}>{part}</div>
          <div className="grid g2" style={{ gap: 8 }}>
            {data.sections.filter((x) => x.part === part).map((sec) => {
              const ids = (byS[sec.id] || []).map((i) => i.id); const ss = ibStats(s, ids);
              const fresh = ids.filter((id) => !ibCard(s, id).seen).length;
              return (
                <div key={sec.id} className="card row ibsec" style={{ flexWrap: 'nowrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{sec.label}</b>
                    <div className="small muted">{sec.n} questions · {ss.seen} seen · {ss.nailed} nailed{ss.due ? ` · ${ss.due} due` : ''}{ss.star ? ` · ⭐ ${ss.star}` : ''}{ss.flag ? ` · 🚩 ${ss.flag}` : ''}</div>
                    <div style={{ marginTop: 6 }}><Bar v={ss.seen / sec.n} good /></div>
                  </div>
                  <Link to={`/ib400?study=${sec.id}${f === 'new' ? '&f=new' : ''}`} className={`btn sm ${ss.seen ? '' : 'primary'}`}>{f === 'new' ? `New (${fresh})` : ss.seen ? 'Continue' : 'Start'}</Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ n, of, l }: { n: number; of?: number; l: string }) {
  return <div className="card"><div style={{ fontSize: 26, fontWeight: 800 }} className="tnum">{n}{of ? <span className="small muted">/{of}</span> : null}</div><div className="small muted">{l}</div></div>;
}

function QuestionList({ title, items, data, studyAll }: { title: string; items: IbItem[]; data: IbData; studyAll?: string }) {
  const { s } = useStore();
  const label = (sid: string) => data.sections.find((x) => x.id === sid)?.label || '';
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}><b>{title}</b>{studyAll && <Link to={studyAll} className="btn sm primary"><Icon n="play" s={13} /> Study these</Link>}</div>
      {items.map((it) => { const c = ibCard(s, it.id); return (
        <Link key={it.id} to={`/ib400?study=q:${it.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', padding: 14 }}>
          <div className="small muted">{label(it.s)}{c.star ? ' · ⭐' : ''}{c.flag ? ' · 🚩' : ''}{c.nailed ? ' · ✅' : ''}{c.score !== undefined ? ` · last ${Math.round(c.score * 100)}%` : ''}</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{it.q}</div>
          {c.note && <div className="small" style={{ marginTop: 4, color: 'var(--ink2)' }}>Note: {c.note}</div>}
        </Link>
      ); })}
    </div>
  );
}

// ---------- study session
function StudyRoute({ data, spec, filter, onExit }: { data: IbData; spec: string; filter: Filter; onExit: () => void }) {
  const { s } = useStore();
  const [nonce] = useState(() => Date.now());
  const { items, title, rapid } = useMemo(() => {
    const by = Object.fromEntries(data.items.map((i) => [i.id, i]));
    if (spec.startsWith('q:')) return { items: [by[spec.slice(2)]].filter(Boolean), title: 'One question', rapid: false };
    if (spec === 'due') return { items: ibDueIds(s).map((id) => by[id]).filter(Boolean).slice(0, 20), title: 'Revisit due', rapid: false };
    if (spec === 'flagged') return { items: data.items.filter((i) => ibCard(s, i.id).flag || ibCard(s, i.id).star), title: 'My marked questions', rapid: false };
    if (spec === 'filter') return { items: data.items.filter((i) => matches(s, i.id, filter)), title: FILTERS.find((x) => x[0] === filter)?.[1] || 'Questions', rapid: false };
    if (spec === 'rapid') {
      const pool = data.items.filter((i) => !i.s.startsWith('fit') && !ibCard(s, i.id).nailed);
      return { items: [...pool].sort(() => Math.random() - 0.5).slice(0, 10), title: 'Rapid fire', rapid: true };
    }
    const sec = data.sections.find((x) => x.id === spec);
    let list = data.items.filter((i) => i.s === spec);
    if (filter === 'new') list = list.filter((i) => !ibCard(s, i.id).seen);
    else { const unseen = list.filter((i) => !ibCard(s, i.id).seen && !ibCard(s, i.id).nailed); const rest = list.filter((i) => ibCard(s, i.id).seen && !ibCard(s, i.id).nailed); list = [...unseen, ...rest]; }
    return { items: list, title: sec?.label || 'Section', rapid: false };
    // the queue is fixed when the session starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, spec, filter, nonce]);
  if (!items.length) return (
    <div className="content narrow"><div className="empty stack" style={{ alignItems: 'center' }}><b>Nothing to study here right now.</b><span>{spec === 'due' ? 'No questions are due. Come back tomorrow, or start a section.' : 'No questions match.'}</span><button className="btn" onClick={onExit}>Back to IB 400</button></div></div>
  );
  return <Study items={items} title={title} rapid={rapid} sections={data.sections} onExit={onExit} />;
}

function Study({ items, title, rapid, sections, onExit }: { items: IbItem[]; title: string; rapid: boolean; sections: IbData['sections']; onExit: () => void }) {
  const { s, mutate } = useStore();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [draft, setDraft] = useState('');
  const [log, setLog] = useState<{ id: string; score: number; xp: number }[]>([]);
  const it = items[i];
  const c = it ? ibCard(s, it.id) : {};
  const [note, setNoteText] = useState(c.note || '');
  const fit = it?.s.startsWith('fit');
  const secs = rapid ? 60 : fit ? 90 : 60;
  const [left, setLeft] = useState<number | null>(rapid ? secs : null);
  const tick = useRef<number | undefined>(undefined);
  useEffect(() => { setShown(false); setTicks(it ? it.p.map(() => false) : []); setDraft(''); setNoteText(it ? ibCard(s, it.id).note || '' : ''); setLeft(rapid ? secs : null); window.scrollTo({ top: 0 }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [i]);
  useEffect(() => {
    if (left === null || shown) return;
    if (left <= 0) { if (rapid) setShown(true); return; }
    tick.current = window.setTimeout(() => setLeft((x) => (x === null ? null : x - 1)), 1000);
    return () => window.clearTimeout(tick.current);
  }, [left, shown, rapid]);

  if (i >= items.length) {
    const avg = log.length ? log.reduce((a, b) => a + b.score, 0) / log.length : 0; const xp = log.reduce((a, b) => a + b.xp, 0);
    return (
      <div className="content narrow"><div className="card raised stack" style={{ gap: 12 }}>
        <div className="kicker">{title} · done</div>
        <h2 className="serif" style={{ fontSize: 28, color: 'var(--navy)', margin: 0 }}>{log.length} answered · {Math.round(avg * 100)}% of key points</h2>
        <div className="small muted">+{xp} XP. Anything you scored under half on comes back tomorrow; full marks push it out to the next interval.</div>
        <div className="row"><button className="btn primary" onClick={onExit}>Back to IB 400</button><Link className="btn" to="/ib400?study=due">Revisit due</Link></div>
      </div></div>
    );
  }
  const secLabel = sections.find((x) => x.id === it.s)?.label || '';
  const hit = ticks.filter(Boolean).length;
  const mark = (k: 'star' | 'flag' | 'nailed') => mutate((d) => toggleMark(d, it.id, k));
  const save = () => {
    const r = mutate((d) => reviewIb(d, it, hit));
    setLog((l) => [...l, { id: it.id, score: r.score, xp: r.xp }]);
    setI(i + 1);
  };
  const topic = it.tp && TOPIC_BY_ID[it.tp];
  return (
    <div className="content narrow">
      <div className="player-top" style={{ marginBottom: 12 }}>
        <button className="btn ghost sm" onClick={onExit} aria-label="Leave"><Icon n="x" s={16} /></button>
        <Bar v={i / items.length} good />
        <span className="small muted tnum">{i + 1}/{items.length}</span>
      </div>
      <div className="stepcard stack" style={{ gap: 14, minHeight: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div className="kicker">{title === secLabel ? secLabel : `${title} · ${secLabel}`}</div>
          {left !== null
            ? <span className={`chip ${left <= 10 ? 'weak' : ''} tnum`}><Icon n="timer" s={13} /> {Math.max(0, left)}s</span>
            : !shown && <button className="btn ghost sm" onClick={() => setLeft(secs)}><Icon n="timer" s={14} /> {secs}s timer</button>}
        </div>
        <h2 className="serif ib-q">{it.q}</h2>
        <div className="row ibmarks" style={{ gap: 6 }}>
          <button className={`chip ${c.star ? 'on' : ''}`} onClick={() => mark('star')} aria-pressed={!!c.star}>⭐ Important</button>
          <button className={`chip ${c.flag ? 'on' : ''}`} onClick={() => mark('flag')} aria-pressed={!!c.flag}>🚩 Revisit</button>
          <button className={`chip ${c.nailed ? 'on' : ''}`} onClick={() => mark('nailed')} aria-pressed={!!c.nailed}>✅ Nailed</button>
          {c.seen ? <span className="small muted">Seen {c.seen}x{c.score !== undefined ? ` · last ${Math.round(c.score * 100)}%` : ''}</span> : null}
        </div>

        {!shown && <>
          <p className="small muted" style={{ margin: 0 }}>{fit ? 'Answer out loud as you would in the room: headline first, one specific example, under a minute.' : 'Say your answer out loud, or jot it below. Then reveal and check yourself honestly.'}</p>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Optional: type your answer here (not saved)" rows={3} />
          <button className="btn primary lg" onClick={() => { setShown(true); setLeft(null); }}>Reveal the answer</button>
          <button className="btn ghost sm" onClick={() => setI(i + 1)}>Skip for now</button>
        </>}

        {shown && <>
          <div className="card stack" style={{ gap: 8, background: 'var(--wash)' }}>
            <div className="kicker">Tick the key points you actually said</div>
            {it.p.map((p, k) => (
              <label key={k} className="row ibpt" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!ticks[k]} onChange={() => setTicks((t) => t.map((x, j) => (j === k ? !x : x)))} style={{ marginTop: 3 }} />
                <span>{p}</span>
              </label>
            ))}
          </div>
          <div className="callout worked" style={{ margin: 0 }}><div className="ctitle">{fit ? 'How to answer it' : 'Model answer'}</div><p style={{ marginTop: 0 }}>{it.a}</p></div>
          {it.t && <div className="callout traps" style={{ margin: 0 }}><div className="ctitle">Common trap</div><p className="small" style={{ marginTop: 0 }}>{it.t}</p></div>}
          {it.in && <div className="callout india" style={{ margin: 0 }}><div className="ctitle">In India</div><p className="small" style={{ marginTop: 0 }}>{it.in}</p></div>}
          {(topic || LAB_TOPICS.has(it.tp)) && (
            <div className="row small" style={{ gap: 8 }}>
              {topic && <Link to={`/topic/${it.tp}`} className="chip">Drill this topic: {it.tp}</Link>}
              {LAB_TOPICS.has(it.tp) && <Link to="/lab" className="chip">Open the Statements lab</Link>}
            </div>
          )}
          <label className="field" htmlFor="ib-note">Your note (your own example, a reminder)
            <input id="ib-note" type="text" maxLength={280} value={note} onChange={(e) => setNoteText(e.target.value)} onBlur={() => mutate((d) => setNote(d, it.id, note))} placeholder="e.g. use the Tata Steel and Corus deal here" />
          </label>
          <button className="btn primary lg" onClick={() => { if ((note || '') !== (c.note || '')) mutate((d) => setNote(d, it.id, note)); save(); }}>
            Save: {hit} of {it.p.length} points <Icon n="arrowR" s={15} />
          </button>
          <span className="small muted" style={{ textAlign: 'center' }}>{hit === it.p.length ? 'All points: it comes back later each time.' : hit * 2 >= it.p.length ? 'Half or more: it comes back on the same schedule.' : 'Under half: it comes back tomorrow.'}</span>
        </>}
      </div>
    </div>
  );
}
