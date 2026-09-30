import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FACTS } from '../data/facts';
import markUrl from '../assets/fc-mark.png';
import { dayKey, type TopicState, STATE_LABEL } from '../lib/state';

// ---------- icons (stroke icons, 20px grid)
const P: Record<string, string> = {
  home: 'M3 10.5 10 4l7 6.5M5 9v7h4v-4h2v4h4V9',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12H5.5A1.5 1.5 0 0 0 4 16.5v-12Zm0 12A1.5 1.5 0 0 0 5.5 18H16',
  target: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-3.5h.01',
  cards: 'M6 5h10v11H6zM4 3h10',
  alert: 'M10 3 2.5 16.5h15L10 3Zm0 5v4m0 2.5h.01',
  cal: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3v3m6-3v3',
  chart: 'M3.5 16.5h13M6 13.5V9m4 4.5V5.5m4 8V8',
  mic: 'M10 3a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 10 3Zm-5 6.5a5 5 0 0 0 10 0M10 14.5V17',
  lib: 'M4 3.5h3v13H4zm4.5 0h3v13h-3zm4.5 1 2.8-.7 2.7 12.3-2.8.7z',
  trophy: 'M6.5 3.5h7v4a3.5 3.5 0 0 1-7 0v-4Zm0 1.5H4a2.5 2.5 0 0 0 2.6 3M13.5 5H16a2.5 2.5 0 0 1-2.6 3M10 11v3m-3 2.5h6',
  user: 'M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm-6 7a6 6 0 0 1 12 0',
  flame: 'M10 17.5c3 0 5-2 5-5 0-3.5-3-5-3.5-8.5C9 5.5 8 8 8.5 10 7 9.5 6.5 8 6.5 7 5.5 8.5 5 10.5 5 12.5c0 3 2 5 5 5Z',
  bolt: 'M11 2.5 4.5 11H10l-1 6.5L15.5 9H10l1-6.5Z',
  play: 'M6.5 4.5v11l9-5.5-9-5.5Z',
  check: 'M4.5 10.5 8 14l7.5-8',
  x: 'M5 5l10 10M15 5 5 15',
  arrowR: 'M4 10h12m-5-5 5 5-5 5',
  arrowL: 'M16 10H4m5-5-5 5 5 5',
  ext: 'M8 4H4.5v11.5H16V12M11 3.5h5.5V9M16.5 3.5 9 11',
  lock: 'M5.5 9h9v7.5h-9zM7.5 9V6.5a2.5 2.5 0 0 1 5 0V9',
  sun: 'M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM10 1.5v2m0 13v2M1.5 10h2m13 0h2M4 4l1.4 1.4m9.2 9.2L16 16M4 16l1.4-1.4m9.2-9.2L16 4',
  moon: 'M16.5 12A7 7 0 0 1 8 3.5 7 7 0 1 0 16.5 12Z',
  search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm8 2-3.8-3.8',
  grip: 'M7.5 5h.01M12.5 5h.01M7.5 10h.01M12.5 10h.01M7.5 15h.01M12.5 15h.01',
  sigma: 'M15 4H5l5.5 6L5 16h10',
  flag: 'M4.5 17V3.5m0 0h10l-2 3.5 2 3.5h-10',
  timer: 'M10 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-9v3.5l2 1.5M8 2.5h4',
  shuffle: 'M3 6h3.5c4 0 5 8 9 8H17m0 0-2-2m2 2-2 2M3 14h3.5c1.3 0 2.2-.8 3-2M17 6h-1.5c-1.3 0-2.2.8-3 2M17 6l-2-2m2 2-2 2',
  menu: 'M3.5 6h13M3.5 10h13M3.5 14h13',
  layers: 'M10 3 2.5 7 10 11l7.5-4L10 3ZM2.5 10 10 14l7.5-4M2.5 13 10 17l7.5-4',
};
export function Icon({ n, s = 18, className }: { n: keyof typeof P | string; s?: number; className?: string }) {
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n] || ''} />
    </svg>
  );
}

// ---------- inline markup used across the guide text: **bold**, *italic*, [text](url), {{verify}}
const TOKEN = /(\*\*.+?\*\*|\*[^*\s][^*]*?\*|\[[^\]]+\]\([^)\s]+\)|\{\{verify\}\})/g;
export function Inline({ t }: { t: string }) {
  if (!t) return null;
  const parts = t.split(TOKEN);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}><Inline t={p.slice(2, -2)} /></strong>;
        if (p === '{{verify}}') return <span key={i} className="chip verify" title="Live figure: check the latest value before you quote it">VERIFY</span>;
        const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
        if (m) {
          const club = m[2].includes('sharepoint.com');
          return <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" title={club ? 'Club folder: opens with your ISB login' : undefined}>{club && <Icon n="lock" s={12} />} <Inline t={m[1]} /></a>;
        }
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
export const plain = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\{\{verify\}\}/g, '');

// ---------- facts with as-of stamps
export function FactsGrid({ keys }: { keys?: string[] }) {
  const today = dayKey();
  const list = keys ? FACTS.filter((f) => keys.includes(f.key)) : FACTS;
  return (
    <div className="facts">
      {list.map((f) => {
        const stale = f.verifyBy < today;
        return (
          <div key={f.key} className={`fact ${stale ? 'stale' : ''}`}>
            <div className="kicker">{f.label}</div>
            <b>{f.value}</b>
            <div className="small muted" style={{ marginTop: 4 }}>{f.detail}</div>
            <div className="asof">As of {fmtDate(f.asOf)}{stale ? ' · re-check due' : ` · re-check by ${fmtDate(f.verifyBy)}`}</div>
            <a className="small" href={f.source.url} target="_blank" rel="noopener noreferrer">{f.source.name} <Icon n="ext" s={11} /></a>
          </div>
        );
      })}
    </div>
  );
}
export function fmtDate(k: string | number) {
  const d = typeof k === 'number' ? new Date(k) : new Date(k + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function StateDot({ st }: { st: TopicState }) { return <i className={`dot st-${st}`} title={STATE_LABEL[st]} />; }

export function Bar({ v, good }: { v: number; good?: boolean }) {
  return <div className={`bar ${good ? 'good' : ''}`}><i style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }} /></div>;
}

export function Ring({ v, size = 96, stroke = 9, children, color = 'var(--good)' }: { v: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, v));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--wash2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

export function PageHead({ kicker, title, sub, right }: { kicker?: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div style={{ flex: 1, minWidth: 240 }}>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 style={{ marginTop: kicker ? 6 : 0 }}>{title}</h1>
        <div className="rule" />
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Back({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="btn ghost sm" style={{ paddingLeft: 0 }}><Icon n="arrowL" s={15} /> {label}</Link>;
}

// simple seeded shuffle used by drills
export function shuffled<T>(a: T[], seed: number): T[] {
  const r = [...a]; let x = ((seed >>> 0) % 2147483646) + 1;
  for (let i = r.length - 1; i > 0; i--) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
export function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ISB Finance Club mark, used wherever the app shows its logo
export function BrandMark({ size = 34 }: { size?: number }) {
  return <img src={markUrl} alt="ISB Finance Club" width={size} height={size} className="brand-img" style={{ width: size, height: size, borderRadius: Math.round(size * 0.18) }} />;
}
export const TAGLINE = 'Built by an Innocent Engineer with ❤️';
