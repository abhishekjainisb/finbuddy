// Eight-week plan (guide Part H). Exit criteria are evaluated from tracked progress.
export type Check =
  | { kind: 'diagnostic' }
  | { kind: 'targets' }
  | { kind: 'note'; id: string; label: string; placeholder: string }
  | { kind: 'topics'; ids: string[]; state: 'read' | 'drilled' | 'proven' }
  | { kind: 'manual'; id: string; label: string; hint?: string }
  | { kind: 'mocks'; min: number; fromWeek: number }
  | { kind: 'errorsReviewed' }
  | { kind: 'bank'; min: number }
  | { kind: 'readiness' };

export interface Week {
  n: number;
  goal: string;
  common: string;
  ib: string;
  chapters: string[];
  exit: string;
  checks: Check[];
}

export const WEEKS: Week[] = [
  {
    n: 1, goal: 'Diagnose and set targets',
    common: '20-question diagnostic from the core question bank; A1 statements; read one annual report; choose primary and adjacent track; five target firms each.',
    ib: 'Map coverage and product groups; shortlist banks (B1).',
    chapters: ['A1'],
    exit: 'Diagnostic score recorded; target list; 90-second story draft.',
    checks: [
      { kind: 'diagnostic' },
      { kind: 'targets' },
      { kind: 'note', id: 'story90', label: '90-second story draft', placeholder: 'Where you come from, what pulled you to finance, what you did about it, why this role, why this firm.' },
    ],
  },
  {
    n: 2, goal: 'Accounting and operating analysis',
    common: 'A1 links and walk-throughs; A2 ratios, unit economics, quality of earnings; pick the pitch company.',
    ib: 'Read one deal announcement and its filings.',
    chapters: ['A1', 'A2'],
    exit: 'Three-statement walk-through without notes; company primer (2 pages).',
    checks: [
      { kind: 'topics', ids: ['CORE-04'], state: 'proven' },
      { kind: 'topics', ids: ['CORE-01', 'CORE-02', 'CORE-03', 'CORE-05', 'CORE-06', 'CORE-07', 'CORE-10', 'CORE-11', 'CORE-12'], state: 'drilled' },
      { kind: 'note', id: 'pitchco', label: 'Pitch company chosen', placeholder: 'Company, sector, and one line on why.' },
      { kind: 'manual', id: 'primer', label: 'Company primer (2 pages) written', hint: 'Use the A6.4 template. Paste a link to your file.' },
    ],
  },
  {
    n: 3, goal: 'Valuation and capital',
    common: 'A3 WACC, NPV; A4 EV bridge, comps, DCF; A5 capital routes.',
    ib: 'Comps and DCF for the pitch company.',
    chapters: ['A3', 'A4', 'A5'],
    exit: 'One comps table and DCF for the pitch company; 5-minute presentation.',
    checks: [
      { kind: 'topics', ids: ['CORE-14', 'CORE-15', 'CORE-17', 'CORE-18', 'CORE-19'], state: 'drilled' },
      { kind: 'topics', ids: ['CORE-22', 'CORE-23'], state: 'read' },
      { kind: 'manual', id: 'compsdcf', label: 'Comps table and DCF for the pitch company', hint: 'Five peers, seven-year DCF with sensitivities. Link your model.' },
      { kind: 'manual', id: 'present5', label: '5-minute presentation delivered', hint: 'Record it or present to a peer.' },
    ],
  },
  {
    n: 4, goal: 'Track process and first mock',
    common: 'Track chapters on process.',
    ib: 'IPO and DRHP process map; sell-side process (B2, B3).',
    chapters: [],
    exit: 'First track mock with written feedback.',
    checks: [
      { kind: 'mocks', min: 1, fromWeek: 4 },
    ],
  },
  {
    n: 5, goal: 'Track technical depth',
    common: 'Track technical chapters.',
    ib: 'Merger model and five-slide mock pitch (B2, B5).',
    chapters: [],
    exit: 'One complete timed case or model.',
    checks: [
      { kind: 'manual', id: 'timedmodel', label: 'Timed case or model completed', hint: 'A 60 to 180 minute modelling test, case or model for your track. Link it.' },
    ],
  },
  {
    n: 6, goal: 'Judgement: firms, deals, markets',
    common: 'Two target firms in depth; one recent deal each; the weekly market update.',
    ib: 'Two deal briefs; desk fit.',
    chapters: ['A6'],
    exit: 'Two-page role-specific recommendation (pitch, IC memo, deal brief or CFO pack).',
    checks: [
      { kind: 'topics', ids: ['CORE-26'], state: 'drilled' },
      { kind: 'manual', id: 'mktupdate', label: 'Weekly 90-second market update recorded', hint: 'Global event, India macro number, one deal, one sector.' },
    ],
  },
  {
    n: 7, goal: 'Repetitions',
    common: 'G-part mocks: technical, pitch and fit; question bank sweeps.',
    ib: 'Technical and deal mock.',
    chapters: [],
    exit: 'Two mocks; error log reviewed; revised answers.',
    checks: [
      { kind: 'mocks', min: 2, fromWeek: 7 },
      { kind: 'errorsReviewed' },
      { kind: 'bank', min: 60 },
    ],
  },
  {
    n: 8, goal: 'Refresh and readiness',
    common: 'Weakest topics from the error log; latest market and firm news; final story polish.',
    ib: 'Bank and deal refresh.',
    chapters: [],
    exit: 'Final mock; readiness checklist complete.',
    checks: [
      { kind: 'mocks', min: 1, fromWeek: 8 },
      { kind: 'readiness' },
    ],
  },
];

export const RHYTHM = [
  { day: 'Monday', focus: 'Core concept', example: 'WACC and beta: read A3, do the worked example without looking' },
  { day: 'Tuesday', focus: 'Core exercise', example: 'Build the WACC for your pitch company' },
  { day: 'Wednesday', focus: 'Role topic', example: 'A process chapter from your track: sell-side process, PE deal funnel, the close cycle, the VC investment process' },
  { day: 'Thursday', focus: 'Role case or model', example: 'A case or model from your track: comps, paper LBO, variance bridge, cap table, credit ratios' },
  { day: 'Friday', focus: 'Read one filing or deal', example: "A DRHP's industry section, or a recent acquisition announcement" },
  { day: 'Weekend', focus: 'Mock, feedback, error log, market update', example: '45-minute mock with a peer; update the error log; 90-second market update' },
];

export const EFFORT = [
  { who: 'New to finance', text: '6 to 8 hours a week on the core in weeks 1 to 3; start with accounting and read one annual report cover to cover. Track depth starts in week 3.' },
  { who: 'Engineer with some finance', text: 'Balance core and track from week 2; your edge is models and data, your gap is accounting and regulation.' },
  { who: 'CA, CFA or finance work-ex', text: '2 to 3 hours a week refreshing the core; spend the rest on track process, firm research, the pitch and mocks. Your gap is usually communication and market views, not knowledge.' },
  { who: 'Everyone', text: 'From week 4, one live mock and one written or modelled output every week. Track errors, not hours.' },
];

export const READINESS = {
  technicals: [
    { id: 'r1', text: 'Walk the three statements in 90 seconds', topic: 'CORE-04' },
    { id: 'r2', text: 'Trace a Rs. 10 depreciation change through all three', topic: 'CORE-04' },
    { id: 'r3', text: 'Bridge equity value and enterprise value', topic: 'CORE-17' },
    { id: 'r4', text: 'Build a DCF on paper; defend the terminal value', topic: 'CORE-19' },
    { id: 'r5', text: 'Say when comparables beat a DCF, and vice versa', topic: 'CORE-21' },
  ],
  other: [
    { id: 'o1', text: 'Rebuilt at least one sample model from scratch' },
    { id: 'o2', text: 'A one-page stock or company pitch you would defend' },
    { id: 'o3', text: 'Two sectors you can discuss in depth' },
    { id: 'o4', text: 'A current view on RBI policy, inflation, the rupee and one global theme' },
    { id: 'o5', text: 'Three deals or market events from this quarter, with your view' },
    { id: 'o6', text: '"Why this role", specific to the desk or fund' },
    { id: 'o7', text: 'Six STAR stories with numbers' },
    { id: 'o8', text: 'Two questions for each interviewer type' },
    { id: 'o9', text: 'Your error log, reviewed in the last 48 hours' },
    { id: 'o10', text: 'Phone charged; calendar clear during process weeks' },
  ],
};

// Mock rubric (guide G4.3): 7 criteria on a 5-point scale, anchors at 1, 3 and 5.
export const RUBRIC = [
  { id: 'tech', label: 'Technical accuracy', a1: 'Errors on core concepts', a3: 'Correct but slow', a5: 'Correct, fast, with nuance' },
  { id: 'struct', label: 'Structure', a1: 'Rambling', a3: 'Some structure', a5: 'Answer first, clear logic' },
  { id: 'nums', label: 'Numbers', a1: 'Avoids them', a3: 'Uses them', a5: 'Quantifies naturally, sanity-checks' },
  { id: 'judg', label: 'Commercial judgement', a1: 'Textbook only', a3: 'Some business sense', a5: 'Connects to real companies and trade-offs' },
  { id: 'pitch', label: 'Pitch and views', a1: 'Superficial', a3: 'Researched', a5: 'Variant view, defended under pressure' },
  { id: 'story', label: 'Story and fit', a1: 'Generic', a3: 'Coherent', a5: 'Specific, credible, memorable' },
  { id: 'comp', label: 'Composure', a1: 'Flustered by pushback', a3: 'Recovers', a5: 'Engages with challenge, admits limits gracefully' },
];
