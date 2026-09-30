import type { ReactNode } from 'react';
import { Inline, FactsGrid, Icon } from './ui';
import type { Block } from '../lib/state';
import { useStore } from '../lib/store';
import { addXp, XP } from '../lib/state';

const BOX_LABEL: Record<string, string> = {
  worked: 'Worked example', angle: 'Interview angle', traps: 'Common traps', drill: 'Drill', drill2: 'Drill',
  india: 'India lens', deeper: 'Go deeper', club: 'In the club folder', core: 'Core idea', formula: 'Formulas',
};

export function Blocks({ blocks, taskKey }: { blocks: Block[]; taskKey?: string }) {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === 'bullet') {
      const items: Block[] = [];
      while (i < blocks.length && blocks[i].kind === 'bullet') items.push(blocks[i++]);
      out.push(<ul key={i}>{items.map((x, k) => <li key={k}><Inline t={x.text} /></li>)}</ul>);
      continue;
    }
    if (b.kind === 'num') {
      const items: Block[] = [];
      while (i < blocks.length && blocks[i].kind === 'num') items.push(blocks[i++]);
      const start = parseInt(items[0].n) || 1;
      out.push(<ol key={i} start={start}>{items.map((x, k) => <li key={k}><Inline t={x.text} /></li>)}</ol>);
      continue;
    }
    out.push(<BlockView key={i} b={b} taskKey={taskKey ? `${taskKey}:${i}` : undefined} />);
    i++;
  }
  return <div className="prose">{out}</div>;
}

function BlockView({ b, taskKey }: { b: Block; taskKey?: string }) {
  switch (b.kind) {
    case 'para': return <p><Inline t={b.text} /></p>;
    case 'code': return <div className="formula">{b.text}</div>;
    case 'table':
      return (
        <div className="tablewrap">
          <table className="gt">
            <thead><tr>{b.head.map((h: string, k: number) => <th key={k}><Inline t={h} /></th>)}</tr></thead>
            <tbody>{b.rows.map((r: string[], k: number) => <tr key={k}>{r.map((c, j) => <td key={j}><Inline t={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'fig':
      return (
        <figure className="fig" style={{ maxWidth: Math.min(760, b.w * 1.45) }}>
          <img src={b.src} alt={b.cap || 'Figure from the guide'} width={b.w} height={b.h} loading="lazy" />
          {b.cap && <figcaption><Inline t={b.cap.replace(/^(Figure \d+\.)/, '**$1**')} /></figcaption>}
        </figure>
      );
    case 'facts': return <FactsGrid keys={b.keys} />;
    case 'box': return <Callout b={b} taskKey={taskKey} />;
    default: return b.text ? <p><Inline t={b.text} /></p> : null;
  }
}

function Callout({ b, taskKey }: { b: Block; taskKey?: string }) {
  const t = b.title?.full || BOX_LABEL[b.btype] || '';
  const isTask = (b.btype === 'drill' || b.btype === 'drill2') && taskKey;
  if (b.btype === 'formula') {
    return (
      <div className="callout core">
        <div className="ctitle"><Icon n="sigma" s={12} /> {t || 'Formulas'}</div>
        <div className="formula" style={{ margin: '0 0 10px' }}>{b.items.map((x: Block) => x.text).join('\n')}</div>
      </div>
    );
  }
  return (
    <div className={`callout ${b.btype}`}>
      <div className="ctitle">{t}</div>
      <Blocks blocks={b.items} />
      {isTask && <TaskDone k={taskKey!} />}
    </div>
  );
}

// Drill boxes in the guide ask for a piece of evidence (a rebuilt P&L, a memo). Students tick them off here.
function TaskDone({ k }: { k: string }) {
  const { s, mutate, toast } = useStore();
  const m = s.manual['task:' + k];
  return (
    <div className="row" style={{ margin: '4px 0 10px' }}>
      <button className={`btn sm ${m?.done ? 'good' : ''}`} onClick={() => mutate((d) => {
        const cur = d.manual['task:' + k];
        if (cur?.done) { d.manual['task:' + k] = { done: false, at: cur.at }; return; }
        d.manual['task:' + k] = { done: true, at: Date.now() };
        if (!cur?.at) { addXp(d, XP.manual); toast(`Evidence logged. +${XP.manual} XP`, 'good'); }
      })}>
        <Icon n="check" s={14} /> {m?.done ? 'Done' : 'I did this'}
      </button>
      <span className="small muted">Producing the output is what makes it stick.</span>
    </div>
  );
}
