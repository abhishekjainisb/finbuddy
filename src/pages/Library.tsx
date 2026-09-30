import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import glossary from '../data/glossary.json';
import clubmap from '../data/clubmap.json';
import { FORMULAS } from '../data/formulas';
import { FACTS } from '../data/facts';
import { dayKey } from '../lib/state';
import { FactsGrid, Icon, Inline, PageHead } from '../components/ui';

type Tab = 'formulas' | 'glossary' | 'club' | 'markets';

export default function Library() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'formulas';
  const [q, setQ] = useState('');
  const set = (t: Tab) => { setParams({ tab: t }); setQ(''); };
  const ql = q.toLowerCase();
  const G = (glossary as { term: string; def_: string }[]).filter((g) => !q || (g.term + ' ' + g.def_).toLowerCase().includes(ql));
  const C = (clubmap as { folder: string; name: string; sub: string; use: string; url: string }[]).filter((c) => !q || (c.folder + c.name + c.sub + c.use).toLowerCase().includes(ql));
  const folders = [...new Set(C.map((c) => c.folder))];
  const stale = FACTS.filter((f) => f.verifyBy < dayKey()).length;
  return (
    <div className="content">
      <PageHead kicker="Reference" title="Library" sub="Formula sheet, glossary, the club folder map and the live market figures, each with the date it was last checked." />
      <div className="tabs">
        {([['formulas', 'Formula sheet'], ['glossary', 'Glossary'], ['club', 'Club folder'], ['markets', 'Market dashboard']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => set(k)}>{l}</button>)}
      </div>
      {(tab === 'glossary' || tab === 'club') && (
        <div style={{ position: 'relative', marginBottom: 14, maxWidth: 420 }}>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'glossary' ? 'Search 90 terms' : 'Search the folder map'} style={{ paddingLeft: 34 }} />
          <span style={{ position: 'absolute', left: 10, top: 10, color: 'var(--faint)' }}><Icon n="search" s={16} /></span>
        </div>
      )}
      {tab === 'formulas' && (
        <div className="grid g2">
          {FORMULAS.map((f) => (
            <div key={f.title} className="callout core" style={{ margin: 0 }}>
              <div className="ctitle">{f.title}</div>
              <div className="formula" style={{ whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>{f.items.join('\n')}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'glossary' && (
        <div className="grid g2">
          {G.map((g) => <div key={g.term} className="card" style={{ padding: 14 }}><b style={{ color: 'var(--navy)' }}>{g.term}</b><div className="small" style={{ marginTop: 4 }}><Inline t={g.def_.charAt(0).toUpperCase() + g.def_.slice(1)} /></div></div>)}
          {!G.length && <div className="empty">No match.</div>}
        </div>
      )}
      {tab === 'club' && <>
        <div className="banner" style={{ marginBottom: 14 }}><Icon n="lock" s={13} /> These links open the Finance Club folder on SharePoint. You need your ISB login; nothing is copied into this portal.</div>
        {folders.map((f) => (
          <div key={f} style={{ marginBottom: 16 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>{f}</div>
            <div className="grid g2">
              {C.filter((c) => c.folder === f).map((c) => (
                <a key={c.url + c.name} href={c.url} target="_blank" rel="noopener noreferrer" className="card row" style={{ textDecoration: 'none', color: 'inherit', padding: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <Icon n="lock" s={14} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{c.name}</b>{c.sub && <span className="small muted"> · {c.sub}</span>}
                    {c.use && <span className="small muted" style={{ display: 'block' }}>{c.use}</span>}
                  </span>
                  <Icon n="ext" s={14} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </>}
      {tab === 'markets' && <>
        <div className="banner" style={{ marginBottom: 14 }}>
          Live-sensitive figures. Each shows when it was last verified and when to re-check. {stale ? <b>{stale} figure{stale > 1 ? 's are' : ' is'} past the re-check date; confirm before quoting.</b> : 'All are within their re-check window.'}
        </div>
        <FactsGrid />
      </>}
    </div>
  );
}
