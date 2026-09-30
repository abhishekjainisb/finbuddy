import { useEffect, useRef, useState } from 'react';
import { authReturnError, type Backend } from '../lib/backend';
import { Icon } from '../components/ui';

// Sign-in: the student finds themselves by name or PGID, and a 6-digit code goes to
// their ISB email from the class list. The verified address links the PGID on the
// server. Students stay signed in on that device until they sign out.
type Stage = 'start' | 'code' | 'notlisted';
type Hit = { pgid: string; name: string; email: string };

export default function Login({ backend, onDone }: { backend: Backend; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>(backend.needsLink ? 'notlisted' : 'start');
  const [err, setErr] = useState(authReturnError ? friendly({ message: authReturnError }) : '');
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const em = (picked?.email || email).trim().toLowerCase();
  const typedEmail = q.includes('@');
  const isb = /^[^\s@]+@isb\.edu$/.test(q.trim().toLowerCase());
  const run = async (f: () => Promise<void>) => {
    setErr(''); setBusy(true);
    try { await f(); } catch (e: any) { setErr(friendly(e)); }
    setBusy(false);
  };
  // smart search: name (any order, partial words) or PGID; debounced, latest query wins
  useEffect(() => {
    const s = q.trim();
    if (picked || typedEmail || !backend.findStudent) return;
    const digits = /^\d+$/.test(s);
    if ((digits && s.length < 4) || (!digits && s.replace(/[^a-z]/gi, '').length < 3)) { setHits([]); setSearched(false); return; }
    const id = ++seq.current;
    const t = window.setTimeout(async () => {
      try { const r = await backend.findStudent!(s); if (id === seq.current) { setHits(r); setActive(0); setSearched(true); } } catch { /* ignore */ }
    }, 180);
    return () => window.clearTimeout(t);
  }, [q, picked, typedEmail, backend]);
  const pick = (h: Hit) => { setPicked(h); setEmail(h.email); setHits([]); setErr(''); };
  const send = () => run(async () => { await backend.sendEmailOtp!(em); setCode(''); setStage('code'); });

  return (
    <div className="auth">
      <div className="row" style={{ marginBottom: 22, flexWrap: 'nowrap' }}>
        <div className="brand-mark">FC</div>
        <div><div className="kicker">ISB Finance Club · Co'27</div><b style={{ fontSize: 18 }}>FinBuddy</b></div>
      </div>
      <form className="stepcard stack" style={{ minHeight: 0, gap: 14 }} onSubmit={(e) => e.preventDefault()}>
        {stage === 'start' && <>
          <h1 className="serif auth-h">Sign in to FinBuddy</h1>
          {!picked && <>
            <p className="muted" style={{ margin: 0 }}>Find yourself by name or PGID. We send a 6-digit code to your ISB email, and you stay signed in on this device.</p>
            <div className="combo">
              <label className="field" htmlFor="who">Your name or PGID
                <input id="who" type="text" autoComplete="off" autoCapitalize="words" value={q} autoFocus role="combobox" aria-expanded={hits.length > 0} aria-controls="who-list"
                  placeholder="e.g. Abhishek Jain or 62610573"
                  onChange={(e) => { setQ(e.target.value); setErr(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                    if (e.key === 'Enter' && hits[active]) { e.preventDefault(); pick(hits[active]); }
                  }} />
              </label>
              {hits.length > 0 && (
                <ul className="combo-list" id="who-list" role="listbox">
                  {hits.map((h, i) => (
                    <li key={h.pgid} role="option" aria-selected={i === active}>
                      <button type="button" className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onClick={() => pick(h)}>
                        <b>{h.name}</b><span className="muted tnum">PGID {h.pgid}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {searched && hits.length === 0 && !typedEmail && <div className="small muted">No one on the Co'27 list matches. Try your first name, your surname, or your PGID.</div>}
            {typedEmail && <>
              {!isb && <div className="small" style={{ color: 'var(--bad)' }}>Use your ISB address ending in @isb.edu.</div>}
              <button type="submit" className="btn primary lg" disabled={busy || !isb} onClick={() => { setEmail(q.trim().toLowerCase()); run(async () => { await backend.sendEmailOtp!(q.trim().toLowerCase()); setCode(''); setStage('code'); }); }}>
                {busy ? 'Sending…' : 'Email me a code'}
              </button>
            </>}
          </>}
          {picked && <>
            <div className="card" style={{ background: 'var(--wash)' }}>
              <div className="kicker">PGID {picked.pgid}</div>
              <div style={{ fontSize: 21, fontWeight: 700, marginTop: 4 }}>{picked.name}</div>
              <div className="small muted" style={{ marginTop: 6, wordBreak: 'break-all' }}>Code goes to <b>{picked.email}</b></div>
            </div>
            <button type="submit" className="btn primary lg" disabled={busy} onClick={send}>{busy ? 'Sending…' : `Send code to my ISB email`}</button>
            <button type="button" className="btn" disabled={busy} onClick={() => { setPicked(null); setEmail(''); }}>Not me, search again</button>
          </>}
        </>}

        {stage === 'code' && <>
          <h1 className="serif auth-h">Check your ISB inbox</h1>
          <p className="muted" style={{ margin: 0 }}>We sent a 6-digit code to <b>{em}</b>. It can take a minute; if you do not see it, check <b>Junk</b> and mark it Not junk. <button type="button" className="linkbtn" onClick={() => { setStage('start'); setPicked(null); }}>Start again</button></p>
          <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="otp" autoFocus aria-label="Code from the email" />
          <button type="submit" className="btn primary lg" disabled={busy || code.length < 6} onClick={() => run(async () => {
            await backend.verifyEmailOtp!(em, code);
            await backend.load();
            if (backend.needsLink) setStage('notlisted'); else onDone();
          })}>{busy ? 'Checking…' : 'Verify'}</button>
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => run(async () => { await backend.sendEmailOtp!(em); setErr(''); })}>Send a new code</button>
        </>}

        {stage === 'notlisted' && <>
          <h1 className="serif auth-h">We could not find you</h1>
          <p className="muted" style={{ margin: 0 }}>{backend.email ? <><b>{backend.email}</b> is</> : 'This email is'} not on the PGP Co'27 Hyderabad class list, so it cannot be linked to a PGID. Check that you used your ISB student address, or message the Finance Club team and we will add you.</p>
          {backend.signOut && <button type="button" className="btn lg" onClick={async () => { await backend.signOut!(); setEmail(''); setPicked(null); setQ(''); setStage('start'); }}>Try again</button>}
        </>}

        {err && <div className="feedback no" style={{ marginTop: 0 }} role="alert"><p><Icon n="alert" s={14} /> {err}</p></div>}
      </form>
      <p className="small muted" style={{ textAlign: 'center', marginTop: 18 }}>Trouble signing in? Message the Finance Club team.</p>
    </div>
  );
}

// Plain messages for auth errors, by error code first.
function friendly(e: any) {
  const code: string = e?.code || '';
  const m: string = e?.message || '';
  if (code === 'otp_expired' || /token has expired|invalid/i.test(m)) return 'That code is wrong or has expired. Check it, or send a new code.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit|too many|security purposes/i.test(m)) return 'Please wait a minute before asking for another code.';
  if (code === 'email_provider_disabled' || /provider is not enabled|unsupported provider/i.test(m)) return 'Email sign-in is not switched on yet. Tell the Finance Club team.';
  if (/error sending|smtp|confirmation email|magic link/i.test(m)) return 'We could not send the email right now. Try again in a minute.';
  return m || 'Something went wrong. Try again.';
}
