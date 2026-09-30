// Tracks: which chapters and topics each career track covers, its week-by-week work
// (guide H1.3 for IB, CF, PE and VC; adapted from Part F for the adjacent roles),
// and the track-specific item on the readiness checklist.
import type { Check } from './plan';

export interface TrackWeek { text: string; chapters: string[]; checks: Check[] }
export interface TrackDef {
  name: string; short: string; part: string; prefixes: string[]; units: string[]; bank?: string;
  blurb: string; adapted?: boolean;
  readiness: { id: string; text: string; topic: string };
  weeks: TrackWeek[];
}

const T = (text: string, chapters: string[], checks: Check[] = []): TrackWeek => ({ text, chapters, checks });
const read = (ids: string[]): Check => ({ kind: 'topics', ids, state: 'read' });
const drilled = (ids: string[]): Check => ({ kind: 'topics', ids, state: 'drilled' });
const proven = (ids: string[]): Check => ({ kind: 'topics', ids, state: 'proven' });
const doc = (id: string, label: string, hint: string): Check => ({ kind: 'manual', id, label, hint });

export const TRACK_DEFS: TrackDef[] = [
  {
    name: 'Investment banking', short: 'IB', part: 'B', prefixes: ['IB'], units: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'], bank: 'ib',
    blurb: 'M&A, IPOs and ECM, DCM, pitchbooks, models, the Indian bank landscape.',
    readiness: { id: 'r6', text: 'Accretion/dilution and the IPO process (IB)', topic: 'IB-04' },
    weeks: [
      T('Map coverage and product groups; shortlist banks (B1).', ['B1'], [read(['IB-01', 'IB-16', 'IB-18', 'IB-19', 'IB-20'])]),
      T('Read one deal announcement and its filings.', []),
      T('Comps and DCF for the pitch company.', []),
      T('IPO and DRHP process map; sell-side process (B2, B3).', ['B2', 'B3'], [drilled(['IB-02', 'IB-07', 'IB-08'])]),
      T('Merger model and five-slide mock pitch (B2, B5).', ['B2', 'B5'], [proven(['IB-04']), doc('fiveslide', 'Five-slide mock pitch built', 'Situation, rationale, valuation, buyer universe, process.')]),
      T('Two deal briefs; desk fit.', ['B5'], [drilled(['IB-14']), doc('dealbriefs', 'Two deal briefs written', 'Facts, rationale, valuation, structure, market reaction, your view.')]),
      T('Technical and deal mock.', ['B6']),
      T('Bank and deal refresh.', []),
    ],
  },
  {
    name: 'Corporate finance', short: 'CF', part: 'C', prefixes: ['CF'], units: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], bank: 'cf',
    blurb: 'FP&A, AOP and variance, treasury, controllership, Ind AS, capital allocation.',
    readiness: { id: 'r6cf', text: 'Variance analysis and a 13-week cash forecast (CF)', topic: 'CF-03' },
    weeks: [
      T('Map the CFO organisation; shortlist companies and programmes (C1).', ['C1'], [read(['CF-01', 'CF-17', 'CF-18'])]),
      T('Read quarterly results as a variance exercise.', ['C2'], [read(['CF-02', 'CF-03'])]),
      T('Capex case with sensitivities (C3).', ['C3'], [drilled(['CF-07', 'CF-08']), doc('capexcase', 'Capex case with sensitivities built', 'NPV, IRR, payback and a volume trigger. Link your model.')]),
      T('AOP, rolling forecast and close cycle (C1, C2, C5).', ['C1', 'C2', 'C5'], [drilled(['CF-02', 'CF-12', 'CF-18'])]),
      T('Price-volume-mix variance and 13-week cash forecast (C2, C4).', ['C2', 'C4'], [proven(['CF-03']), drilled(['CF-10']), doc('cash13', '13-week cash forecast built', 'Receipts, payments, buffer, and what treasury does in the tight weeks.')]),
      T('P&L decision memo and one-page CFO pack.', ['C6'], [drilled(['CF-15']), doc('cfopack', 'One-page CFO pack written', 'Headline variance, a bridge, three drivers, two risks, one decision.')]),
      T('Business case and function mock.', ['C6']),
      T('Job-description-specific case.', []),
    ],
  },
  {
    name: 'Private equity', short: 'PE', part: 'D', prefixes: ['PE'], units: ['D1', 'D2', 'D3', 'D4', 'D5'], bank: 'pe',
    blurb: 'Fund economics, diligence, LBO, IC memo, value creation, exits.',
    readiness: { id: 'r6pe', text: 'Paper LBO to an approximate IRR (PE)', topic: 'PE-06' },
    weeks: [
      T('Fund strategies and India landscape; shortlist funds (D1).', ['D1'], [read(['PE-01', 'PE-14', 'PE-15', 'PE-16'])]),
      T('Quality-of-earnings red flags in one company.', ['D2'], [read(['PE-04'])]),
      T('Paper LBO inputs; sources and uses (D3).', ['D3'], [drilled(['PE-05'])]),
      T('Diligence, LOI and IC sequence (D2, D4).', ['D2', 'D4'], [drilled(['PE-03', 'PE-09', 'PE-17'])]),
      T('Full simple LBO and QoE note (D3).', ['D3'], [proven(['PE-06']), doc('qoenote', 'QoE note written', 'Reported to run-rate EBITDA bridge with the adjustments you would push back on.')]),
      T('Investment thesis and value creation plan; two-page IC memo.', ['D4'], [drilled(['PE-10', 'PE-12']), doc('icmemo', 'Two-page IC memo written', 'Base, upside and downside; three reasons to walk away.')]),
      T('Model and IC mock.', ['D5']),
      T('Fund portfolio and downside cases.', []),
    ],
  },
  {
    name: 'Venture capital', short: 'VC', part: 'E', prefixes: ['VC'], units: ['E1', 'E2', 'E3', 'E4'], bank: 'vc',
    blurb: 'Power law, market sizing, metrics, cap tables, term sheets, memos.',
    readiness: { id: 'r6vc', text: 'Cap table across two rounds; bottom-up market size (VC)', topic: 'VC-08' },
    weeks: [
      T('Stages and fund math; shortlist funds (E1).', ['E1'], [read(['VC-01', 'VC-13', 'VC-14'])]),
      T('Business models and metrics for three startups.', ['E2'], [read(['VC-06'])]),
      T('Cap table across two rounds; market sizing (E2, E3).', ['E2', 'E3'], [drilled(['VC-03', 'VC-08'])]),
      T('Sourcing, founder meeting, term sheet (E1, E3).', ['E1', 'E3'], [drilled(['VC-02', 'VC-09', 'VC-15'])]),
      T('Cohort analysis and runway scenario (E2).', ['E2'], [drilled(['VC-05', 'VC-07']), doc('cohorts', 'Cohort and runway analysis done', 'Retention by cohort and a runway scenario for one startup.')]),
      T('20-startup market map and invest/pass memo.', ['E2'], [drilled(['VC-11']), doc('marketmap', '20-startup market map and memo', 'One theme, 20 startups, one you would back.')]),
      T('Pitch and partner mock.', ['E4']),
      T('Firm portfolio and current startups.', []),
    ],
  },
  {
    name: 'Consulting or deal advisory', short: 'Consulting', part: 'F', prefixes: ['ADJ-01', 'ADJ-02'], units: ['F1', 'D2'], adapted: true,
    blurb: 'Strategy PE practices, Big 4 transaction services, valuation, case interviews.',
    readiness: { id: 'r6co', text: 'A PE diligence case and a guesstimate against the clock (consulting)', topic: 'ADJ-02' },
    weeks: [
      T('Map practices and firms: PE practices, Big 4 deals, valuation (F1).', ['F1'], [read(['ADJ-01'])]),
      T('Quality-of-earnings red flags in one company (D2).', ['D2'], [read(['PE-04'])]),
      T('Comps and DCF for the pitch company.', []),
      T('Case structures: profitability, market entry, PE diligence (F1).', ['F1'], [drilled(['ADJ-02'])]),
      T('A timed PE diligence case and two guesstimates.', ['F1', 'D2'], [drilled(['PE-03']), doc('casepractice', 'Timed diligence case and guesstimates done', 'Record your structure, maths and recommendation.')]),
      T('Two-page diligence recommendation on a listed company.', [], [doc('ddmemo', 'Two-page diligence recommendation written', 'Market, position, QoE, price and returns, deal-breakers.')]),
      T('Case and fit mocks.', []),
      T('Firm and practice refresh.', []),
    ],
  },
  {
    name: 'Equity research or markets', short: 'ER / markets', part: 'F', prefixes: ['ADJ-03', 'ADJ-04', 'ADJ-05', 'ADJ-06'], units: ['F2', 'F3'], adapted: true,
    blurb: 'Sell-side and buy-side research, portfolio basics, macro, derivatives.',
    readiness: { id: 'r6mk', text: 'Duration, convexity and the Greeks (markets)', topic: 'ADJ-06' },
    weeks: [
      T('Sell-side versus buy-side; shortlist brokers and AMCs (F2).', ['F2'], [read(['ADJ-03'])]),
      T('Read one set of results and write an earnings update.', ['F2'], [read(['ADJ-04'])]),
      T('Model, comps and DCF for the pitch stock.', []),
      T('Derivatives and fixed income basics (F3, A5).', ['F3', 'A5'], [drilled(['ADJ-05', 'ADJ-06'])]),
      T('Initiation-style note with a variant view and a catalyst.', ['F2'], [drilled(['ADJ-03']), doc('initnote', 'Initiation-style note written', 'Thesis, variant view, catalyst, valuation, risks.')]),
      T('Markets journal and a view on RBI, the rupee and yields.', ['A6'], [doc('journal', 'Four-week markets journal kept', 'One headline, the move, your trade and stop-loss each day.')]),
      T('Stock pitch and markets mocks.', []),
      T('Refresh results, numbers and trade ideas.', []),
    ],
  },
  {
    name: 'Corporate banking and credit', short: 'Credit', part: 'F', prefixes: ['ADJ-07', 'ADJ-08'], units: ['F4'], adapted: true,
    blurb: 'Credit analysis, DSCR and coverage, NPAs, project finance, private credit.',
    readiness: { id: 'r6cr', text: 'Credit ratios, DSCR and a lending decision (credit)', topic: 'ADJ-07' },
    weeks: [
      T('Map corporate banks, NBFCs and private credit funds (F4).', ['F4'], [read(['ADJ-07'])]),
      T('Credit analysis of one company from its financials.', ['F4']),
      T('Cash flow, working capital, DSCR and coverage (A2, F4).', ['A2', 'F4'], [drilled(['ADJ-07'])]),
      T('Project finance structure and debt sizing (F4).', ['F4'], [drilled(['ADJ-08'])]),
      T('Credit memo: amount, tenor, security, covenants, pricing.', [], [proven(['ADJ-07']), doc('creditmemo', 'Credit memo written', 'Five Cs, ratios, structure and a lending decision.')]),
      T('Sector credit risks for two sectors.', [], [doc('sectorcredit', 'Two sector credit notes written', 'Cycle, leverage norms, asset quality, what could go wrong.')]),
      T('Credit case and fit mocks.', []),
      T('Latest RBI policy and asset quality refresh.', []),
    ],
  },
];

export const TRACK_NAMES = TRACK_DEFS.map((t) => t.name);
export const trackByName = (name?: string) => TRACK_DEFS.find((t) => t.name === name) || TRACK_DEFS[0];
export const topicInTrack = (topic: string, t: TrackDef) => t.prefixes.some((p) => topic === p || topic.startsWith(p + '-') || (p.length <= 3 && topic.startsWith(p)));
