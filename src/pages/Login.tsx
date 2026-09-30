import { useState } from 'react';
import { authReturnError, type Backend } from '../lib/backend';
import { Icon } from '../components/ui';

// Sign-in: a 6-digit code sent to the student's ISB email. The verified address is
// matched to the class roster on the server, which links the PGID automatically.
// Students stay signed in on that device until they sign out.
type Stage = 'start' | 'code' | 'notlisted';

export default function Login({ backend, onDone }: { backend: Backend; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>(backend.needsLink ? 'notlisted' : 'start');
  const [err, setErr] = useState(authReturnError ? friendly({ message: authReturnError }) : '');
  const [busy, setBusy] = useState(false);
  const em = email.trim().toLowerCase();
  const isb = /^[^\s@]+@isb\.edu$/.test(em);
  const typedOther = /@/.test(em) && !/@isb\.edu$/.test(em) && /\.[a-z]{2,}$/.test(em);
  const run = async (f: () => Promise<void>) => {
    setErr(''); setBusy(true);
    try { await f(); } catch (e: any) { setErr(friendly(e)); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <div className="row" style={{ marginBottom: 22, flexWrap: 'nowrap' }}>
        <div className="brand-mark">FC</div>
        <div><div className="kicker">ISB Finance Club · Co'27</div><b style={{ fontSize: 18 }}>FinBuddy</b></div>
      </div>
      <form className="stepcard stack" style={{ minHeight: 0, gap: 14 }} onSubmit={(e) => e.preventDefault()}>
        {stage === 'start' && <>
          <h1 className="serif auth-h">Sign in to FinBuddy</h1>
          <p className="muted" style={{ margin: 0 }}>Enter your ISB email and we will send you a 6-digit code. Your PGID links itself, and you stay signed in on this device.</p>
          <label className="field" htmlFor="email">ISB email
            <input id="email" type="email" inputMode="email" autoComplete="email" value={email} autoFocus
              onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="yourname_pgp2027@isb.edu" />
          </label>
          {typedOther && <div className="small" style={{ color: 'var(--bad)' }}>Use your ISB address ending in @isb.edu. That is how FinBuddy knows which PGID is yours.</div>}
          <button type="submit" className="btn primary lg" disabled={busy || !isb}
            onClick={() => run(async () => { await backend.sendEmailOtp!(em); setCode(''); setStage('code'); })}>
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
        </>}

        {stage === 'code' && <>
          <h1 className="serif auth-h">Check your ISB inbox</h1>
          <p className="muted" style={{ margin: 0 }}>We sent a 6-digit code to <b>{em}</b>. It can take a minute; if you do not see it, check <b>Junk</b> and mark it Not junk. <button type="button" className="linkbtn" onClick={() => setStage('start')}>Change email</button></p>
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
          {backend.signOut && <button type="button" className="btn lg" onClick={async () => { await backend.signOut!(); setEmail(''); setStage('start'); }}>Try a different email</button>}
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
