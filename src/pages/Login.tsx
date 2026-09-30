import { useState } from 'react';
import type { Backend } from '../lib/backend';
import { Icon } from '../components/ui';

// Phone OTP sign-in. Phone numbers cannot prove ISB membership, so first-time users
// also enter the cohort invite code the club shares on the class group.
export default function Login({ backend, onDone }: { backend: Backend; onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [stage, setStage] = useState<'phone' | 'code' | 'invite'>(backend.needsInvite ? 'invite' : 'phone');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const e164 = '+91' + phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const run = async (f: () => Promise<void>) => { setErr(''); setBusy(true); try { await f(); } catch (e: any) { setErr(e?.message || 'Something went wrong. Try again.'); } setBusy(false); };

  return (
    <div className="content narrow" style={{ paddingTop: 60, maxWidth: 460 }}>
      <div className="row" style={{ marginBottom: 20 }}>
        <div className="brand-mark">FC</div>
        <div><div className="kicker">ISB Finance Club · Co'27</div><b>FinBuddy</b></div>
      </div>
      <div className="stepcard stack" style={{ minHeight: 0, gap: 14 }}>
        {stage === 'phone' && <>
          <h1 className="serif" style={{ fontSize: 26, color: 'var(--navy)' }}>Sign in with your phone</h1>
          <p className="muted" style={{ margin: 0 }}>We text you a 6-digit code. No password to remember.</p>
          <label className="field">Mobile number
            <div className="row" style={{ flexWrap: 'nowrap' }}><span className="pill">+91</span><input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98xxxxxxxx" autoFocus /></div>
          </label>
          <button className="btn primary lg" disabled={busy || e164.length !== 13} onClick={() => run(async () => { await backend.sendOtp!(e164); setStage('code'); })}>Send code</button>
        </>}
        {stage === 'code' && <>
          <h1 className="serif" style={{ fontSize: 26, color: 'var(--navy)' }}>Enter the code</h1>
          <p className="muted" style={{ margin: 0 }}>Sent to {e164}. <button className="btn ghost sm" onClick={() => setStage('phone')}>Change</button></p>
          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" style={{ fontSize: 24, letterSpacing: '.4em', textAlign: 'center' }} autoFocus />
          <button className="btn primary lg" disabled={busy || code.length !== 6} onClick={() => run(async () => {
            await backend.verifyOtp!(e164, code);
            await backend.load();
            if (backend.needsInvite) setStage('invite'); else onDone();
          })}>Verify</button>
          <button className="btn ghost sm" disabled={busy} onClick={() => run(() => backend.sendOtp!(e164))}>Resend code</button>
        </>}
        {stage === 'invite' && <>
          <h1 className="serif" style={{ fontSize: 26, color: 'var(--navy)' }}>Join the cohort</h1>
          <p className="muted" style={{ margin: 0 }}>Enter the invite code the Finance Club shared with the class.</p>
          <input type="text" value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} placeholder="FC27-XXXX" autoFocus />
          <button className="btn primary lg" disabled={busy || invite.length < 4} onClick={() => run(async () => {
            const ok = await backend.joinCohort!(invite.trim());
            if (!ok) throw new Error('That code did not work. Check it with the club.');
            onDone();
          })}>Join</button>
        </>}
        {err && <div className="feedback no" style={{ marginTop: 0 }}><p><Icon n="alert" s={14} /> {err}</p></div>}
      </div>
    </div>
  );
}
