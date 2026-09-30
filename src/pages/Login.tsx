import { useState } from 'react';
import type { Backend } from '../lib/backend';
import { Icon } from '../components/ui';

// Sign-in: phone OTP, then a one-time link to the student's PGID on the class roster.
// A phone number cannot prove someone is at ISB; the roster link is the gate.
type Stage = 'phone' | 'code' | 'pgid' | 'confirm';

const MSG: Record<string, string> = {
  invalid: 'A PGID is 8 digits, like 62610123.',
  not_found: 'That PGID is not on the PGP Co\'27 Hyderabad list. Check the digits on your ID card.',
  taken: 'That PGID is already linked to another phone number. If it is yours, message the Finance Club team and we will reset it.',
  too_many: 'Too many tries in the last hour. Please wait a bit and try again.',
  signed_out: 'Your sign-in expired. Enter your phone number again.',
  already_linked: 'This phone number is already linked to a different PGID.',
};

export default function Login({ backend, onDone }: { backend: Backend; onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [pgid, setPgid] = useState('');
  const [found, setFound] = useState<string>('');
  const [stage, setStage] = useState<Stage>(backend.needsLink ? 'pgid' : 'phone');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = phone.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  const e164 = '+91' + digits;
  const run = async (f: () => Promise<void>) => {
    setErr(''); setBusy(true);
    try { await f(); } catch (e: any) { setErr(friendly(e, stage)); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <div className="row" style={{ marginBottom: 22, flexWrap: 'nowrap' }}>
        <div className="brand-mark">FC</div>
        <div><div className="kicker">ISB Finance Club · Co'27</div><b style={{ fontSize: 18 }}>FinBuddy</b></div>
      </div>
      <div className="row small muted" style={{ gap: 6, marginBottom: 10 }}>
        {(['Phone', 'Code', 'PGID'] as const).map((l, i) => {
          const at = stage === 'phone' ? 0 : stage === 'code' ? 1 : 2;
          return <span key={l} className={`chip ${i === at ? 'p1' : ''}`} style={{ opacity: i > at ? 0.5 : 1 }}>{i < at ? '✓ ' : ''}{l}</span>;
        })}
      </div>
      <form className="stepcard stack" style={{ minHeight: 0, gap: 14 }} onSubmit={(e) => e.preventDefault()}>
        {stage === 'phone' && <>
          <h1 className="serif auth-h">Sign in with your phone</h1>
          <p className="muted" style={{ margin: 0 }}>We will text you a 6-digit code. No password needed.</p>
          <label className="field" htmlFor="phone">Mobile number
            <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
              <span className="pill" style={{ padding: '12px 12px' }}>+91</span>
              <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} maxLength={14}
                onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoFocus />
            </div>
          </label>
          <button type="submit" className="btn primary lg" disabled={busy || digits.length !== 10}
            onClick={() => run(async () => { await backend.sendOtp!(e164); setCode(''); setStage('code'); })}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </>}

        {stage === 'code' && <>
          <h1 className="serif auth-h">Enter the code</h1>
          <p className="muted" style={{ margin: 0 }}>Sent by SMS to {e164}. <button type="button" className="linkbtn" onClick={() => setStage('phone')}>Change number</button></p>
          <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="otp" autoFocus aria-label="6-digit code" />
          <button type="submit" className="btn primary lg" disabled={busy || code.length !== 6} onClick={() => run(async () => {
            await backend.verifyOtp!(e164, code);
            await backend.load();
            if (backend.needsLink) setStage('pgid'); else onDone();
          })}>{busy ? 'Checking…' : 'Verify'}</button>
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => run(async () => { await backend.sendOtp!(e164); setErr(''); })}>Resend code</button>
        </>}

        {stage === 'pgid' && <>
          <h1 className="serif auth-h">Link your PGID</h1>
          <p className="muted" style={{ margin: 0 }}>One time only. It confirms you are in the Co'27 Hyderabad class and puts your name on your progress.</p>
          <label className="field" htmlFor="pgid">PGID
            <input id="pgid" type="text" inputMode="numeric" maxLength={8} value={pgid} autoFocus placeholder="6261xxxx"
              onChange={(e) => { setPgid(e.target.value.replace(/\D/g, '')); setErr(''); }} className="otp" style={{ letterSpacing: '.2em' }} />
          </label>
          <button type="submit" className="btn primary lg" disabled={busy || pgid.length !== 8} onClick={() => run(async () => {
            const r = await backend.lookupPgid!(pgid);
            if (r.status === 'free' || r.status === 'mine') { setFound(r.name || ''); setStage('confirm'); }
            else setErr(MSG[r.status] || 'Something went wrong. Try again.');
          })}>{busy ? 'Looking up…' : 'Find me'}</button>
        </>}

        {stage === 'confirm' && <>
          <h1 className="serif auth-h">Is this you?</h1>
          <div className="card" style={{ background: 'var(--wash)' }}>
            <div className="kicker">PGID {pgid}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{found}</div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Linking is permanent for this phone number. Only link your own PGID.</p>
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

// Map Supabase auth errors to plain messages, using the error code first so a
// failed SMS send is never reported as a wrong code.
function friendly(e: any, stage: Stage) {
  const code: string = e?.code || '';
  const m: string = e?.message || '';
  if (code === 'sms_send_failed' || /sending.*otp|provider/i.test(m)) return 'We could not send the SMS. The sign-in service is being set up; please try again later or tell the Finance Club team.';
  if (code === 'over_sms_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit|too many/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
  if (code === 'phone_provider_disabled' || /phone.*disabled/i.test(m)) return 'Phone sign-in is switched off right now. Tell the Finance Club team.';
  if (code === 'otp_expired' || (stage === 'code' && /expired|invalid/i.test(m))) return 'That code is wrong or has expired. Check it, or tap Resend code.';
  if (code === 'validation_failed' || /phone/i.test(m)) return 'That phone number does not look right. Enter your 10-digit mobile number.';
  return m || 'Something went wrong. Try again.';
}
