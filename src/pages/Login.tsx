import { useEffect, useState } from 'react';
import { authReturnError, type Backend } from '../lib/backend';
import { Icon } from '../components/ui';

// Sign-in: Microsoft (ISB account), Google, or a 6-digit code by email.
// A verified ISB email links the PGID automatically; anyone else confirms it once.
type Stage = 'start' | 'code' | 'pgid' | 'confirm';

const MSG: Record<string, string> = {
  invalid: 'A PGID is 8 digits, like 62610123.',
  not_found: 'That PGID is not on the PGP Co\'27 Hyderabad list. Check the digits on your ID card.',
  taken: 'That PGID is already linked to another account. Sign in with your ISB Microsoft account or your ISB email to claim it back, or message the Finance Club team.',
  too_many: 'Too many tries in the last hour. Please wait a bit and try again.',
  signed_out: 'Your sign-in expired. Please sign in again.',
  already_linked: 'This account is already linked to a different PGID.',
};

const MsLogo = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>
);
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
);

export default function Login({ backend, onDone }: { backend: Backend; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pgid, setPgid] = useState('');
  const [found, setFound] = useState<string>('');
  const [stage, setStage] = useState<Stage>(backend.needsLink ? 'pgid' : 'start');
  const [err, setErr] = useState(authReturnError ? friendly({ message: authReturnError }) : '');
  const [busy, setBusy] = useState(false);
  const em = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
  const isb = /@isb\.edu$/.test(em);
  const run = async (f: () => Promise<void>) => {
    setErr(''); setBusy(true);
    try { await f(); } catch (e: any) { setErr(friendly(e)); }
    setBusy(false);
  };
  const at = stage === 'start' || stage === 'code' ? 0 : 1;
  // show a single-sign-on button only when that provider is switched on
  const [prov, setProv] = useState<{ azure: boolean; google: boolean } | null>(null);
  useEffect(() => { backend.providers?.().then(setProv).catch(() => setProv({ azure: false, google: false })); }, [backend]);

  return (
    <div className="auth">
      <div className="row" style={{ marginBottom: 22, flexWrap: 'nowrap' }}>
        <div className="brand-mark">FC</div>
        <div><div className="kicker">ISB Finance Club · Co'27</div><b style={{ fontSize: 18 }}>FinBuddy</b></div>
      </div>
      <div className="row small muted" style={{ gap: 6, marginBottom: 10 }}>
        {(['Sign in', 'PGID'] as const).map((l, i) => (
          <span key={l} className={`chip ${i === at ? 'p1' : ''}`} style={{ opacity: i > at ? 0.5 : 1 }}>{i < at ? '✓ ' : ''}{l}</span>
        ))}
      </div>
      <form className="stepcard stack" style={{ minHeight: 0, gap: 14 }} onSubmit={(e) => e.preventDefault()}>
        {stage === 'start' && <>
          <h1 className="serif auth-h">Sign in to FinBuddy</h1>
          <p className="muted" style={{ margin: 0 }}>{prov?.azure ? 'Use your ISB Microsoft account and your PGID links itself.' : 'Use your ISB email and your PGID links itself.'} No password to create.</p>
          {prov?.azure && <button type="button" className="btn lg sso" disabled={busy} onClick={() => run(() => backend.signInOAuth!('azure'))}>
            <MsLogo /> Continue with Microsoft (ISB)
          </button>}
          {prov?.google && <button type="button" className="btn lg sso" disabled={busy} onClick={() => run(() => backend.signInOAuth!('google'))}>
            <GoogleLogo /> Continue with Google
          </button>}
          {(prov?.azure || prov?.google) && <div className="or"><span>or get a code by email</span></div>}
          <label className="field" htmlFor="email">Email
            <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yourname_pgp2027@isb.edu" />
          </label>
          <button type="submit" className="btn primary lg" disabled={busy || !validEmail}
            onClick={() => run(async () => { await backend.sendEmailOtp!(em); setCode(''); setStage('code'); })}>
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
          {validEmail && !isb && <div className="small muted">Tip: your ISB address links your PGID automatically. Any other email works too; you will confirm your PGID once.</div>}
        </>}

        {stage === 'code' && <>
          <h1 className="serif auth-h">Check your email</h1>
          <p className="muted" style={{ margin: 0 }}>We sent a 6-digit code to <b>{em}</b>. It can take a minute; check Junk or Other if you do not see it. <button type="button" className="linkbtn" onClick={() => setStage('start')}>Use a different email</button></p>
          <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="otp" autoFocus aria-label="Code from the email" />
          <button type="submit" className="btn primary lg" disabled={busy || code.length < 6} onClick={() => run(async () => {
            await backend.verifyEmailOtp!(em, code);
            await backend.load();
            if (backend.needsLink) setStage('pgid'); else onDone();
          })}>{busy ? 'Checking…' : 'Verify'}</button>
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => run(async () => { await backend.sendEmailOtp!(em); setErr(''); })}>Send a new code</button>
        </>}

        {stage === 'pgid' && <>
          <h1 className="serif auth-h">Link your PGID</h1>
          <p className="muted" style={{ margin: 0 }}>One time only. It confirms you are in the Co'27 Hyderabad class and puts your name on your progress.{backend.email ? <> Signed in as <b>{backend.email}</b>.</> : null}</p>
          <label className="field" htmlFor="pgid">PGID
            <input id="pgid" type="text" inputMode="numeric" maxLength={8} value={pgid} autoFocus placeholder="6261xxxx"
              onChange={(e) => { setPgid(e.target.value.replace(/\D/g, '')); setErr(''); }} className="otp" style={{ letterSpacing: '.2em' }} />
          </label>
          <button type="submit" className="btn primary lg" disabled={busy || pgid.length !== 8} onClick={() => run(async () => {
            const r = await backend.lookupPgid!(pgid);
            if (r.status === 'free' || r.status === 'mine') { setFound(r.name || ''); setStage('confirm'); }
            else setErr(MSG[r.status] || 'Something went wrong. Try again.');
          })}>{busy ? 'Looking up…' : 'Find me'}</button>
          {backend.signOut && <button type="button" className="btn ghost sm" onClick={async () => { await backend.signOut!(); setStage('start'); }}>Use a different account</button>}
        </>}

        {stage === 'confirm' && <>
          <h1 className="serif auth-h">Is this you?</h1>
          <div className="card" style={{ background: 'var(--wash)' }}>
            <div className="kicker">PGID {pgid}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{found}</div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Only link your own PGID. If it is ever linked by someone else, signing in with your ISB account takes it back.</p>
          <button type="submit" className="btn primary lg" disabled={busy} onClick={() => run(async () => {
            const r = await backend.claimPgid!(pgid);
            if (r.ok) { await backend.load(); onDone(); }
            else setErr(MSG[r.status] || 'Could not link. Try again.');
          })}>{busy ? 'Linking…' : `Yes, I am ${found.split(' ')[0]}`}</button>
          <button type="button" className="btn" disabled={busy} onClick={() => { setStage('pgid'); setErr(''); }}>No, change PGID</button>
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
  if (/admin approval|consent|AADSTS65001|AADSTS90094/i.test(m)) return 'Your ISB Microsoft account needs IT approval for this app. Use "Email me a code" with your ISB email instead; it links your PGID the same way.';
  if (code === 'otp_expired' || /token has expired|invalid/i.test(m)) return 'That code is wrong or has expired. Check it, or send a new code.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit|too many|security purposes/i.test(m)) return 'Please wait a minute before asking for another code.';
  if (code === 'email_provider_disabled' || /provider is not enabled|unsupported provider/i.test(m)) return 'That sign-in option is not switched on yet. Try another one, or tell the Finance Club team.';
  if (/error sending|smtp|confirmation email|magic link/i.test(m)) return 'We could not send the email right now. Try again in a minute, or use Microsoft or Google.';
  if (/access_denied|cancel/i.test(m)) return 'Sign-in was cancelled. Try again when you are ready.';
  return m || 'Something went wrong. Try again.';
}
