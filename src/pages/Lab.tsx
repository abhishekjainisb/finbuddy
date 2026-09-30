// Statements lab: see one transaction move through all three statements, predict the
// moves as a game (recorded against the tracker), and build a small company's year
// step by step, then see which cells each ratio picks.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { recordAttempt, TOPIC_BY_ID } from '../lib/state';
import {
  TXS, TX_BY_ID, compute, add, IS_LINES, CF_LINES, BS_LINES, PREDICT_ROWS, STORY, RATIOS, sgn, fmtN, sign, sayIt,
  type Res, type Line, type Tx,
} from '../lib/statements';
import { PageHead, Icon, Bar } from '../components/ui';

type Mode = 'walk' | 'predict' | 'year';
const GROUPS = ['Operating', 'Investing', 'Financing', 'Accruals and non-cash'] as const;

// ---------- the three statements side by side
function Statements({ r, delta, flash, nonce, pick, onlyMoved }: { r: Res; delta: boolean; flash?: Set<string>; nonce?: number; pick?: Set<string>; onlyMoved?: boolean }) {
  const block = (title: string, sub: string, lines: Line[]) => {
    const shown = onlyMoved ? lines.filter((x) => x.total ? ['ni', 'cfo', 'cfi', 'cff', 'dcash', 'ta', 'tl', 'te'].includes(x.k) : Math.abs(r[x.k] || 0) > 0.004) : lines;
    const secOf: Record<string, string> = {}; let cur = '';
    for (const x of lines) { if (x.sub) cur = x.sub; secOf[x.k] = cur; }
    let lastSub = '';
    return (
      <div className="card st-card">
        <div className="kicker">{sub}</div>
        <h3 style={{ margin: '4px 0 10px' }}>{title}</h3>
        {shown.map((x) => {
          const v = r[x.k] || 0; const z = Math.abs(v) < 0.005;
          const subHead = secOf[x.k] !== lastSub ? secOf[x.k] : '';
          lastSub = secOf[x.k];
          return (
            <div key={x.k + (flash?.has(x.k) ? nonce : '')}>
              {subHead && <div className="st-sub">{subHead}</div>}
              <div className={`st-row ${x.total ? 'total' : ''} ${z ? 'zero' : ''} ${flash?.has(x.k) && !z ? 'flash' : ''} ${pick?.has(x.k) ? 'pick' : ''}`}>
                <span>{x.l}</span>
                <b className={`tnum ${delta && !z ? (v > 0 ? 'up' : 'down') : ''}`}>{delta ? sign(v) : v < -0.004 ? `(${fmtN(-v)})` : fmtN(v)}</b>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const okBal = Math.abs(r.ta - r.tle) < 0.01, okCash = Math.abs(r.cash - r.dcash) < 0.01;
  const f = (x: number) => (delta ? sign(x) : fmtN(x));
  return (
    <>
      <div className="grid g3 st-grid">
        {block('Income statement', 'Step 1 · over the period', IS_LINES)}
        {block('Cash flow statement', 'Step 2 · where cash moved', CF_LINES)}
        {block('Balance sheet', 'Step 3 · at period end', BS_LINES)}
      </div>
      <div className="row small" style={{ gap: 14, marginTop: 10 }}>
        <span className={okBal ? 'ok-t' : 'bad-t'}><Icon n={okBal ? 'check' : 'x'} s={13} /> Assets {f(r.ta)} = liabilities {f(r.tl)} + equity {f(r.te)}</span>
        <span className={okCash ? 'ok-t' : 'bad-t'}><Icon n={okCash ? 'check' : 'x'} s={13} /> Cash on the balance sheet {f(r.cash)} = {delta ? 'net change' : 'cumulative net change'} on the cash flow {f(r.dcash)}</span>
      </div>
    </>
  );
}

export default function Lab() {
  const [params, setParams] = useSearchParams();
  const mode = (params.get('m') as Mode) || 'walk';
  const setMode = (m: Mode) => setParams((p) => { const n = new URLSearchParams(p); n.set('m', m); return n; }, { replace: true });
  return (
    <div className="content">
      <PageHead kicker="Practice tool" title="Statements lab" sub="Every transaction moves through the income statement, the cash flow statement and the balance sheet at once. Watch it happen, then predict it yourself." />
      <div className="seg" style={{ marginBottom: 16 }} role="tablist">
        {([['walk', 'Walk it through'], ['predict', 'Predict the moves'], ['year', 'Build a year']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode === 'walk' && <Walk start={params.get('tx') || 'dep'} />}
      {mode === 'predict' && <Predict onReview={(id) => setParams({ m: 'walk', tx: id })} />}
      {mode === 'year' && <Year />}
    </div>
  );
}

// ---------- 1. Walk it through
function Walk({ start }: { start: string }) {
  const [id, setId] = useState(TX_BY_ID[start] ? start : 'dep');
  const [tax, setTax] = useState(0.25);
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);
  const tx = TX_BY_ID[id]; const X = 100;
  const r = useMemo(() => compute(tx.p(X), tax), [tx, tax]);
  const flash = useMemo(() => new Set(Object.keys(r).filter((k) => Math.abs(r[k]) > 0.004)), [r]);
  const idx = TXS.findIndex((t) => t.id === id);
  const go = (d: number) => { const n = TXS[(idx + d + TXS.length) % TXS.length]; setId(n.id); setNonce((x) => x + 1); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input,textarea,select')) return; if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  return (
    <div className="stack" style={{ gap: 16 }}>
      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>The three links to never forget</summary>
        <ol className="small" style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
          <li><b>Net income</b> is the first line of CFO and flows into <b>retained earnings</b> (less dividends).</li>
          <li><b>Net change in cash</b> on the cash flow statement is the change in <b>cash</b> on the balance sheet.</li>
          <li><b>Non-cash expenses</b> (depreciation, impairment, share-based pay) are added back in CFO; their only cash effect is the tax saving.</li>
        </ol>
        <p className="small muted" style={{ margin: '8px 0 0' }}>In an interview, always go income statement, then cash flow, then balance sheet, and finish by saying it balances. State the tax rate you assume.</p>
      </details>

      <div className="card stack" style={{ gap: 12 }}>
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="kicker" style={{ marginBottom: 6 }}>{g}</div>
            <div className="row" style={{ gap: 6 }}>
              {TXS.filter((t) => t.group === g).map((t) => (
                <button key={t.id} className={`chip txchip ${t.id === id ? 'p1' : ''}`} onClick={() => { setId(t.id); setNonce((x) => x + 1); }}>{t.name}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card raised stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="kicker">{tx.group} · {idx + 1} of {TXS.length}</div>
          <div className="row" style={{ gap: 8 }}>
            <div className="seg" aria-label="Tax rate">
              <button className={tax ? 'on' : ''} onClick={() => { setTax(0.25); setNonce((x) => x + 1); }}>Tax 25%</button>
              <button className={!tax ? 'on' : ''} onClick={() => { setTax(0); setNonce((x) => x + 1); }}>No tax</button>
            </div>
            <div className="seg" aria-label="Rows">
              <button className={!full ? 'on' : ''} onClick={() => setFull(false)}>What moved</button>
              <button className={full ? 'on' : ''} onClick={() => setFull(true)}>Full</button>
            </div>
          </div>
        </div>
        <h2 className="serif" style={{ fontSize: 24, color: 'var(--navy)', margin: 0 }}>{tx.name}</h2>
        <p style={{ margin: 0 }}>{tx.desc(X)}</p>
      </div>

      <Statements r={r} delta flash={flash} nonce={nonce} onlyMoved={!full} />

      <div className="callout traps" style={{ margin: 0 }}><div className="ctitle">What trips people</div><p className="small" style={{ marginTop: 0 }}>{tx.note}</p></div>
      <div className="callout worked" style={{ margin: 0 }}>
        <div className="ctitle">Say it like this</div>
        {sayIt(r).map((s, i) => <p key={i} className="small" style={{ marginTop: 0 }}>{s}</p>)}
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn" onClick={() => go(-1)}><Icon n="arrowL" s={15} /> Previous</button>
        <Link to="/lab?m=predict" className="btn ghost sm">Test yourself</Link>
        <button className="btn" onClick={() => go(1)}>Next <Icon n="arrowR" s={15} /></button>
      </div>
    </div>
  );
}

// ---------- 2. Predict the moves (recorded)
type Q = { tx: Tx; x: number };
const AMTS = [20, 40, 50, 60, 80, 100, 120, 150, 200];
function deal(n = 8): Q[] {
  const a = [...TXS].sort(() => Math.random() - 0.5).slice(0, n);
  return a.map((tx) => ({ tx, x: AMTS[Math.floor(Math.random() * AMTS.length)] }));
}
const WC = new Set(['creditsale', 'collect', 'invbuy', 'invsale', 'payap', 'advance', 'earned', 'wages', 'prepaid']);

function Predict({ onReview }: { onReview: (id: string) => void }) {
  const { mutate } = useStore();
  const [tax, setTax] = useState(0.25);
  const [qs, setQs] = useState<Q[]>(() => deal());
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const [log, setLog] = useState<{ id: string; name: string; ok: boolean; xp: number }[]>([]);
  const [nonce, setNonce] = useState(0);
  const q = qs[i];
  const r = useMemo(() => q ? compute(q.tx.p(q.x), tax) : ({} as Res), [q, tax]);
  const done = i >= qs.length;
  const allSet = PREDICT_ROWS.every((row) => ans[row.k] !== undefined);

  const check = () => {
    const wrong = PREDICT_ROWS.filter((row) => ans[row.k] !== sgn(r[row.k]));
    const ok = wrong.length === 0;
    let tag: string | null = null;
    if (!ok) {
      const r0 = compute(q.tx.p(q.x), 0);
      if (tax && PREDICT_ROWS.every((row) => ans[row.k] === sgn(r0[row.k]))) tag = 'forgot_tax';
      else if (WC.has(q.tx.id) && wrong.some((w) => w.k === 'cfo') && ans.ni === sgn(r.ni)) tag = 'wc_sign';
      else tag = 'concept';
    }
    const correct = PREDICT_ROWS.map((row) => `${row.l} ${sign(r[row.k])}`).join('; ');
    const res = mutate((d) => recordAttempt(d, {
      ref: `lab:${q.tx.id}`, topic: q.tx.topic, ok, tag, firstTry: true, gen: true, src: 'drill',
      prompt: `Statements lab (${tax ? 'tax 25%' : 'no tax'}): ${q.tx.desc(q.x)} Which way do the statements move?`,
      given: PREDICT_ROWS.map((row) => `${row.l} ${['down', 'no change', 'up'][ans[row.k] + 1]}`).join('; '), correct,
    }));
    setLog((l) => [...l, { id: q.tx.id, name: q.tx.name, ok, xp: res.xp }]);
    setChecked(true); setNonce((n) => n + 1);
  };
  const next = () => { setI(i + 1); setAns({}); setChecked(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const restart = () => { setQs(deal()); setI(0); setAns({}); setChecked(false); setLog([]); };

  if (done) {
    const score = log.filter((x) => x.ok).length; const xp = log.reduce((a, b) => a + b.xp, 0);
    return (
      <div className="card raised stack" style={{ gap: 12 }}>
        <div className="kicker">Round complete</div>
        <h2 className="serif" style={{ fontSize: 28, color: 'var(--navy)', margin: 0 }}>{score} of {log.length} fully right</h2>
        <div className="small muted">+{xp} XP. Each answer counts toward the topic on your tracker; misses go to your error log.</div>
        <div className="stack" style={{ gap: 6 }}>
          {log.map((x, k) => (
            <div key={k} className="row" style={{ flexWrap: 'nowrap' }}>
              <span className={x.ok ? 'ok-t' : 'bad-t'}><Icon n={x.ok ? 'check' : 'x'} s={14} /></span>
              <span style={{ flex: 1 }}>{x.name}</span>
              {!x.ok && <button className="btn ghost sm" onClick={() => onReview(x.id)}>Walk it through</button>}
            </div>
          ))}
        </div>
        <div className="row"><button className="btn primary" onClick={restart}>Play again</button><Link to="/practice" className="btn">Back to practice</Link></div>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 160 }}><Bar v={i / qs.length} good /></div>
        <span className="small muted tnum">{i + 1}/{qs.length} · {log.filter((x) => x.ok).length} right</span>
        <div className="seg" aria-label="Tax">
          <button className={tax ? 'on' : ''} disabled={checked} onClick={() => setTax(0.25)}>Tax 25%</button>
          <button className={!tax ? 'on' : ''} disabled={checked} onClick={() => setTax(0)}>No tax</button>
        </div>
      </div>
      <div className="stepcard stack" style={{ gap: 12, minHeight: 0 }}>
        <div className="kicker">{q.tx.group} · {TOPIC_BY_ID[q.tx.topic]?.cluster || ''}</div>
        <h2 className="serif" style={{ fontSize: 22, color: 'var(--navy)', margin: 0 }}>{q.tx.desc(q.x)}</h2>
        <p className="small muted" style={{ margin: 0 }}>Which way does each line move{tax ? ', with tax at 25% paid in cash' : ''}?</p>
        <div className="stack" style={{ gap: 8 }}>
          {PREDICT_ROWS.map((row) => {
            const truth = sgn(r[row.k]); const mine = ans[row.k];
            return (
              <div key={row.k} className={`pr-row ${checked ? (mine === truth ? 'right' : 'wrong') : ''}`}>
                <span className="pr-l">{row.l}{checked && <span className="small muted tnum"> {sign(r[row.k])}</span>}</span>
                <div className="seg">
                  {[[1, 'Up'], [0, 'Same'], [-1, 'Down']].map(([v, l]) => (
                    <button key={v} disabled={checked} className={`${mine === v ? 'on' : ''} ${checked && truth === v ? 'truth' : ''}`} onClick={() => setAns((a) => ({ ...a, [row.k]: v as number }))}>{l}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {!checked && <button className="btn primary lg" disabled={!allSet} onClick={check}>Check</button>}
        {checked && (() => { const last = log[log.length - 1]; return (
          <div className={`feedback ${last.ok ? 'ok' : 'no'}`} style={{ marginTop: 0 }}>
            <p style={{ margin: 0 }}><b>{last.ok ? 'All seven right.' : 'Not quite.'}</b>{last.xp ? ` +${last.xp} XP.` : ''} {q.tx.note}</p>
          </div>); })()}
        {checked && <button className="btn primary lg" onClick={next}>{i + 1 < qs.length ? 'Next' : 'See results'} <Icon n="arrowR" s={15} /></button>}
      </div>
      {checked && <>
        <Statements r={r} delta flash={new Set(Object.keys(r).filter((k) => Math.abs(r[k]) > 0.004))} nonce={nonce} onlyMoved />
        <div className="callout worked" style={{ margin: 0 }}><div className="ctitle">Say it like this</div>{sayIt(r).map((s, k) => <p key={k} className="small" style={{ marginTop: 0 }}>{s}</p>)}</div>
      </>}
    </div>
  );
}

// ---------- 3. Build a year, then pick the ratios
function Year() {
  const [n, setN] = useState(0);
  const [play, setPlay] = useState(false);
  const [ratio, setRatio] = useState<string | null>(null);
  const totals = useMemo(() => STORY.slice(0, n).reduce((a, s) => add(a, compute(s.p, 0)), {} as Res), [n]);
  const stepRes = n ? compute(STORY[n - 1].p, 0) : ({} as Res);
  const flash = new Set(Object.keys(stepRes).filter((k) => Math.abs(stepRes[k]) > 0.004));
  const end = n === STORY.length;
  useEffect(() => {
    if (!play) return;
    if (end) { setPlay(false); return; }
    const t = window.setTimeout(() => setN((x) => x + 1), 2200);
    return () => window.clearTimeout(t);
  }, [play, n, end]);
  const R = RATIOS.find((x) => x.id === ratio);
  const pick = R ? new Set(R.cells) : undefined;
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card raised stack" style={{ gap: 10 }}>
        <div className="kicker">Kettle Street Tea Co. · year one · Rs. lakh · step {n} of {STORY.length}</div>
        <h2 className="serif" style={{ fontSize: 22, color: 'var(--navy)', margin: 0 }}>{n ? STORY[n - 1].title : 'An empty company'}</h2>
        <p style={{ margin: 0 }}>{n ? STORY[n - 1].desc : 'A tea kiosk business near campus starts from zero. Step through twelve transactions and watch the statements fill up. The cells that change light up.'}</p>
        {n > 0 && <p className="small muted" style={{ margin: 0 }}>{STORY[n - 1].note}</p>}
        <Bar v={n / STORY.length} good />
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" disabled={n === 0} onClick={() => { setPlay(false); setN(n - 1); }}><Icon n="arrowL" s={15} /></button>
          <button className="btn primary" onClick={() => { if (end) setN(0); setPlay(!play || end); }}>{play ? 'Pause' : end ? 'Replay' : <><Icon n="play" s={14} /> Play</>}</button>
          <button className="btn" disabled={end} onClick={() => { setPlay(false); setN(n + 1); }}><Icon n="arrowR" s={15} /></button>
          {!end && <button className="btn ghost sm" onClick={() => { setPlay(false); setN(STORY.length); }}>Jump to year end</button>}
        </div>
      </div>

      {end && (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="kicker">Year end · which numbers does each ratio use?</div>
          <div className="row" style={{ gap: 6 }}>
            {RATIOS.map((x) => <button key={x.id} className={`chip txchip ${ratio === x.id ? 'p1' : ''}`} onClick={() => setRatio(ratio === x.id ? null : x.id)}>{x.l}</button>)}
          </div>
          {R && (() => { const [f, v, u] = R.calc(totals); return (
            <div className="feedback ok" style={{ marginTop: 0 }}>
              <p style={{ margin: 0 }}><b>{R.l}</b> = {R.f} = {f} = <b className="tnum">{u === '%' ? `${v.toFixed(1)}%` : u === 'days' ? `${Math.round(v)} days` : `${v.toFixed(2)}x`}</b></p>
              <p className="small" style={{ margin: '6px 0 0' }}>{R.read(v)} The cells it uses are outlined below.</p>
            </div>); })()}
        </div>
      )}

      <Statements r={totals} delta={false} flash={flash} nonce={n} pick={pick} />
    </div>
  );
}

// Entry banner for lessons and topics on the statements
export const LAB_TOPICS = new Set(['CORE-01', 'CORE-02', 'CORE-03', 'CORE-04', 'CORE-05', 'CORE-06', 'CORE-10']);
export function LabLink({ topics, style }: { topics: string[]; style?: React.CSSProperties }) {
  if (!topics.some((t) => LAB_TOPICS.has(t))) return null;
  const ratios = topics.some((t) => t === 'CORE-10' || t === 'CORE-06');
  return (
    <Link to={ratios ? '/lab?m=year' : '/lab'} className="card row lab-link" style={{ textDecoration: 'none', color: 'inherit', flexWrap: 'nowrap', ...style }}>
      <Icon n="layers" s={22} />
      <div style={{ flex: 1 }}><b>{ratios ? 'See which numbers each ratio picks' : 'See it move across the three statements'}</b><div className="small muted">{ratios ? 'Statements lab: build a company\'s year, then tap a ratio.' : 'Statements lab: 24 transactions, then predict the moves yourself.'}</div></div>
      <Icon n="arrowR" s={16} />
    </Link>
  );
}
