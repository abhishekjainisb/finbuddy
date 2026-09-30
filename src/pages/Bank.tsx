import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { QUESTIONS, dueCards, gradeCard, TOPIC_BY_ID, dayKey, type QItem } from '../lib/state';
import { Drill } from '../components/Drill';
import { Session } from '../components/Session';
import { Icon, PageHead, Inline, shuffled, fmtDate } from '../components/ui';

const BANKS: Record<string, string> = { core: 'Common core', ib: 'Investment banking', fit: 'Fit and behavioural', cf: 'Corporate finance', pe: 'Private equity', vc: 'Venture capital' };

export default function Bank() {
  const { s, mutate } = useStore();
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const [bank, setBank] = useState<string>(() => (focus ? QUESTIONS.find((q) => q.id === focus)?.bank : null) || 'all');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState<'all' | 'new' | 'due' | 'weak'>('all');
  const [qtext, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(focus);
  const [run, setRun] = useState<QItem[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const due = dueCards(s);
  const banks = [...new Set(QUESTIONS.map((q) => q.bank))];
  const list = useMemo(() => QUESTIONS.filter((q) => {
    const c = s.cards[q.id];
    if (bank !== 'all' && q.bank !== bank) return false;
    if (level !== 'all' && q.level !== level) return false;
    if (status === 'new' && c) return false;
    if (status === 'due' && !due.includes(q.id)) return false;
    if (status === 'weak' && !(c && (c.grade || 0) <= 2)) return false;
    if (qtext && !(q.q + ' ' + q.a).toLowerCase().includes(qtext.toLowerCase())) return false;
    return true;
  }), [s.cards, bank, level, status, qtext, due]);
  useEffect(() => { if (focus) setTimeout(() => document.getElementById('q-' + focus)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150); }, [focus]);

  if (run) return <div className="content narrow"><Session items={run} src="drill" title="Question bank" exitTo="/bank" again={() => setRun(null)} /></div>;
  const seen = QUESTIONS.filter((q) => s.cards[q.id]).length;
  const good = QUESTIONS.filter((q) => (s.cards[q.id]?.grade || 0) >= 3).length;
  const fresh = QUESTIONS.filter((q) => !s.cards[q.id] && (bank === 'all' || q.bank === bank));
  return (
    <div className="content">
      <PageHead kicker="Prove it" title="Question bank" sub="The guide's interview questions with model answers. Answer aloud first, then compare and grade yourself. Grades schedule each card: missed comes back tomorrow, easy comes back in weeks." />
      <div className="grid g3" style={{ marginBottom: 18 }}>
        <div className="card stat"><b className="tnum">{due.length}</b><span>due for review today</span>
          <button className="btn primary sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} disabled={!due.length} onClick={() => setRun(due.slice(0, 15).map((id) => ({ kind: 'card', id, topic: null })))}><Icon n="play" s={13} /> Review due</button></div>
        <div className="card stat"><b className="tnum">{seen}/{QUESTIONS.length}</b><span>answered at least once</span>
          <button className="btn sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} disabled={!fresh.length} onClick={() => setRun(shuffled(fresh, Date.now()).slice(0, 8).map((q) => ({ kind: 'card', id: q.id, topic: q.topic })))}><Icon n="shuffle" s={13} /> 8 new questions</button></div>
        <div className="card stat"><b className="tnum">{good}</b><span>graded Good or Easy last time</span></div>
      </div>
      <div className="row" style={{ marginBottom: 14, gap: 8 }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <input type="text" value={qtext} onChange={(e) => setQ(e.target.value)} placeholder="Search questions and answers" style={{ paddingLeft: 34 }} />
          <span style={{ position: 'absolute', left: 10, top: 10, color: 'var(--faint)' }}><Icon n="search" s={16} /></span>
        </div>
        <select value={bank} onChange={(e) => setBank(e.target.value)} style={{ width: 'auto' }}><option value="all">All banks</option>{banks.map((b) => <option key={b} value={b}>{BANKS[b] || b}</option>)}</select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: 'auto' }}><option value="all">All levels</option>{['BASIC', 'INTERMEDIATE', 'ADVANCED', 'FIT'].map((l) => <option key={l} value={l}>{l[0] + l.slice(1).toLowerCase()}</option>)}</select>
        <div className="seg">{(['all', 'new', 'due', 'weak'] as const).map((k) => <button key={k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{k === 'all' ? 'All' : k === 'new' ? 'New' : k === 'due' ? 'Due' : 'Shaky'}</button>)}</div>
      </div>
      <div className="small muted" style={{ marginBottom: 8 }}>{list.length} questions</div>
      <div className="stack">
        {list.map((q) => {
          const c = s.cards[q.id]; const isOpen = open === q.id;
          return (
            <div key={q.id} id={'q-' + q.id} className="card" style={{ padding: isOpen ? 20 : 14, borderColor: isOpen ? 'var(--navy2)' : undefined }}>
              {!isOpen ? (
                <button onClick={() => { setOpen(q.id); setNonce((n) => n + 1); }} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
                  <span className={`tick ${(c?.grade || 0) >= 3 ? 'on' : ''}`} style={{ borderColor: c && (c.grade || 0) <= 2 ? 'var(--bad)' : undefined }}>{(c?.grade || 0) >= 3 ? '✓' : ''}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}><Inline t={q.q} /></span>
                    <span className="row small muted" style={{ gap: 6, marginTop: 4 }}>
                      <span className="chip">{q.level.toLowerCase()}</span><span className="chip id">{q.sec} · {q.secTitle}</span>
                      {q.topic && <span className="chip id" title={TOPIC_BY_ID[q.topic]?.title}>{q.topic}</span>}
                      {c ? <span>next review {c.due <= dayKey() ? 'due now' : fmtDate(c.due)} · {c.reps} rep{c.reps > 1 ? 's' : ''}</span> : <span>not tried</span>}
                    </span>
                  </span>
                  <Icon n="mic" s={18} />
                </button>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'flex-end', marginBottom: -8 }}><button className="btn ghost sm" onClick={() => setOpen(null)} aria-label="Close"><Icon n="x" s={15} /></button></div>
                  <Drill item={{ kind: 'card', id: q.id, topic: q.topic }} firstTry nonce={nonce} onAnswer={() => ({ xp: 0 })}
                    onGrade={(id, g) => mutate((d) => gradeCard(d, id, g))} onNext={() => setOpen(null)} />
                </>
              )}
            </div>
          );
        })}
        {!list.length && <div className="empty">No questions match. <Link to="/bank" onClick={() => { setBank('all'); setLevel('all'); setStatus('all'); setQ(''); }}>Clear filters</Link></div>}
      </div>
    </div>
  );
}
