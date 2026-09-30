import { useState, type ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useStore, getTheme, applyTheme } from '../lib/store';
import { streakOf, levelOf, openErrors, dueCards, dayKey, currentWeek } from '../lib/state';
import { Icon } from './ui';

const NAV = [
  { to: '/', n: 'home', l: 'Today', end: true },
  { to: '/learn', n: 'book', l: 'Learn' },
  { to: '/practice', n: 'target', l: 'Practice' },
  { to: '/lab', n: 'layers', l: 'Statements lab' },
  { to: '/bank', n: 'cards', l: 'Question bank', badge: 'due' },
  { to: '/errors', n: 'alert', l: 'Error log', badge: 'errors' },
  { sep: true },
  { to: '/plan', n: 'cal', l: '8-week plan' },
  { to: '/progress', n: 'chart', l: 'Progress' },
  { to: '/mocks', n: 'mic', l: 'Mock interviews' },
  { to: '/board', n: 'trophy', l: 'Leaderboard' },
  { sep: true },
  { to: '/library', n: 'lib', l: 'Library' },
  { to: '/profile', n: 'user', l: 'Profile' },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { s, backend, saving } = useStore();
  const [theme, setTheme] = useState(getTheme());
  const st = streakOf(s); const lv = levelOf(s.xp.total);
  const today = s.xp.days[dayKey()] || 0; const tgt = s.profile?.dailyTarget || 50;
  const badges: Record<string, number> = { due: dueCards(s).length, errors: openErrors(s).length };
  const cycle = () => { const t = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto'; applyTheme(t); setTheme(t); };
  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="brand-mark">FC</div>
          <div><b>FinBuddy</b><span>ISB Finance Club · Co'27</span></div>
        </Link>
        <nav className="nav">
          {NAV.map((x, i) => 'sep' in x ? <div key={i} className="sep" /> : (
            <NavLink key={x.to} to={x.to} end={'end' in x}>
              <Icon n={x.n} /> {x.l}
              {'badge' in x && badges[x.badge] > 0 && <span className="badge">{badges[x.badge]}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot stack" style={{ gap: 6 }}>
          <div>Week {currentWeek(s)} of 8 · {lv.name}</div>
          <div>{backend.kind === 'local' ? 'Saved on this device' : backend.kind === 'artifact' ? 'Synced to your account' : 'Synced to the club server'}{saving ? ' · saving' : ''}</div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <Link to="/" className="brand-mark show-sm" style={{ textDecoration: 'none', width: 30, height: 30, fontSize: 12 }} aria-label="Home">FC</Link>
          <div className="row" style={{ gap: 8 }}>
            <span className={`pill flame ${st.todayDone ? '' : 'off'}`} title={st.todayDone ? 'Streak safe today' : `Earn ${20 - Math.min(20, today)} more XP today to keep the streak`}>
              <Icon n="flame" s={16} /> {st.current}
            </span>
            <Link to="/progress" className="pill" style={{ textDecoration: 'none', color: 'inherit' }} title={`${today} of ${tgt} XP today`}>
              <Icon n="bolt" s={15} /> <span className="tnum">{today}/{tgt}</span>
            </Link>
            <span className="pill hide-sm" title={lv.next ? `${lv.to - s.xp.total} XP to ${lv.next}` : 'Top level'}>
              {lv.name} · <span className="tnum">{s.xp.total.toLocaleString('en-IN')}</span> XP
            </span>
          </div>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={cycle} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
            <Icon n={theme === 'dark' ? 'moon' : 'sun'} s={17} /> <span className="hide-sm small">{theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </header>
        {children}
      </div>
      <nav className="tabbar">
        {([['/', 'home', 'Today'], ['/learn', 'book', 'Learn'], ['/practice', 'target', 'Practice'], ['/plan', 'cal', 'Plan'], ['/more', 'menu', 'More']] as const).map(([to, n, l]) => (
          <NavLink key={to} to={to} end={to === '/'}><Icon n={n} s={21} />{l}</NavLink>
        ))}
      </nav>
    </div>
  );
}

export function More() {
  const { s } = useStore();
  const items = [
    ['/lab', 'layers', 'Statements lab', 'See the three statements move'], ['/bank', 'cards', 'Question bank', `${dueCards(s).length} due`], ['/errors', 'alert', 'Error log', `${openErrors(s).length} open`],
    ['/progress', 'chart', 'Progress', ''], ['/mocks', 'mic', 'Mock interviews', `${s.mocks.length} logged`], ['/board', 'trophy', 'Leaderboard', ''],
    ['/library', 'lib', 'Library', 'Formulas, glossary, club folder, markets'], ['/start', 'flag', 'Start here', ''], ['/profile', 'user', 'Profile', ''],
  ];
  return (
    <div className="content">
      <div className="stack">
        {items.map(([to, n, l, sub]) => (
          <Link key={to} to={to} className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Icon n={n} /> <b>{l}</b> <span className="small muted" style={{ marginLeft: 'auto' }}>{sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
