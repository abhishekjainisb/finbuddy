export const ONE_PAGE = 'Pick one primary track and at most one secondary track in week 1. Build the common core in weeks 1 to 3. Go deep on your track in weeks 3 to 6. From week 4, do one mock interview and one written or modelled output every week. Track your errors, not your hours.';

export const INTRO = 'Finance interviews reward people who can explain a concept simply, apply it to a real company, and defend a view under follow-up questions. Reading is the smallest part of that. Use this portal to decide what to learn, then spend most of your time producing evidence: a company primer, a model, a pitch, a mock interview.';

export const PARTS = [
  { id: 'A', name: 'Common core', blurb: 'Statements, ratios, TVM, WACC, DCF, multiples, capital markets, Excel.', live: true },
  { id: 'B', name: 'Investment banking', blurb: 'M&A, IPOs and ECM, DCM, pitchbooks, models, Indian bank landscape.', live: true },
  { id: 'C', name: 'Corporate finance', blurb: 'FP&A, AOP, variance, treasury, controllership, Ind AS, capital allocation.', live: true },
  { id: 'D', name: 'Private equity', blurb: 'Fund economics, diligence, LBO, IC memo, value creation, exits.', live: true },
  { id: 'E', name: 'Venture capital', blurb: 'Power law, market sizing, metrics, cap tables, term sheets, memos.', live: true },
  { id: 'F', name: 'Adjacent roles', blurb: 'Consulting and advisory, equity research, markets, banking and credit.', live: true },
];

export const READING_PATHS = [
  { who: 'New to finance', from: '(consulting, product, operations)', start: 'A1 statements, A3 time value, A4 valuation', skim: 'Deep accounting (consolidation, deferred tax) at first', blind: 'Explaining why cash differs from profit', focus: '6 to 8 hours a week on the core; read one annual report cover to cover' },
  { who: 'Engineer who has worked near finance', from: '(analytics, fintech, strategy)', start: 'A1 and A2, then A4', skim: 'Excel mechanics', blind: 'Accounting treatment and Indian regulation', focus: "Rebuild one company's statements from its filing" },
  { who: 'CA', from: '', start: 'A4 valuation, A5 capital markets, your track', skim: 'A1 statements, most of Ind AS', blind: 'Turning technical depth into a two-minute answer; market views; deal judgement', focus: 'Build a DCF and comps from scratch; prepare a stock pitch early' },
  { who: 'CFA or finance work-ex', from: '(ER, banking, audit, valuation)', start: "Your track's process chapters and interview part", skim: 'Core definitions', blind: 'Knowing the specific firm, desk and deal flow; articulating "why this role"', focus: 'Deep firm research; two deals you can discuss for 15 minutes' },
  { who: 'Pivoting from a non-finance career', from: 'with strong domain depth', start: 'A1, A4, then the track closest to your domain', skim: 'None; but use your domain in sector questions', blind: 'Credibility of the pivot story', focus: 'Write the 90-second story in week 1 and test it' },
];

export const CHAPTER_PATTERN = [
  ['What it is and why it matters', 'Plain language first, then the precise version.'],
  ['How it works', 'Mechanics, formulas and a diagram or chart where it helps.'],
  ['Worked example', 'Numbers from Kaveri Consumer Ltd or a small case.'],
  ['Interview angle', 'How the question is usually asked, what a strong answer sounds like, and the follow-up to expect.'],
  ['Traps, drills and links', 'What trips people up, a task that produces evidence, and where to read more, including the exact file in the club folder.'],
];

export const THREE_QUESTIONS = [
  ['Who is the client or the capital provider?', "A bank's client is the company (or the selling shareholder). A PE fund's capital comes from its limited partners. A corporate finance team serves the CEO, the board and ultimately shareholders."],
  ['What decision is being made?', 'Sell a business, raise money, buy a stake, set next year\'s budget, lend or not lend.'],
  ['How is the role paid?', 'Banks earn fees on completed transactions. Funds earn management fees and a share of profits (carry). Corporate finance is a cost centre whose value shows up in better decisions.'],
];

export const ROLES = {
  cols: ['Investment banking', 'Corporate finance (CFO track)', 'Private equity', 'Venture capital'],
  rows: [
    ['Core job', 'Advise and execute transactions for clients: M&A, IPOs, QIPs, debt raises', "Plan, measure, fund and control a company's performance", 'Buy stakes in mature businesses, improve them, sell in 3 to 7 years', 'Back early-stage founders with minority stakes and follow-on capital'],
    ['What you produce', 'Models, valuation, pitchbooks, CIMs, DRHP sections, buyer outreach', 'AOP and forecasts, variance commentary, board packs, capex and funding cases', 'Investment memos, LBO and returns models, diligence plans, 100-day plans', 'Market maps, founder notes, investment memos, cap tables, portfolio updates'],
    ['What is tested', 'Accounting, valuation, M&A and ECM mechanics, deal awareness, stamina', 'Business judgement, variance and cash logic, Ind AS basics, stakeholder handling', 'Investment judgement, paper LBO, business model analysis, a view on the fund', 'Market and founder judgement, metrics, cap tables, a pitch of a startup or theme'],
    ['Typical ISB entry', 'Associate / AVP at global banks, Indian full-service banks and boutiques', 'Leadership programmes, FP&A and treasury roles, strategy-finance', 'Associate at mid-market and large funds (small intake; work-ex heavy)', 'Associate or senior associate (small intake; sector or operator depth helps)'],
    ['Rhythm', 'Deal-driven, intense peaks, long hours', 'Monthly and annual cycle, predictable peaks at close and AOP', 'Deal peaks plus steady portfolio work', 'Many meetings, few decisions, long feedback loops'],
    ['Long-term path', 'VP, MD; or exits to PE, corporate development, CFO roles', 'Business finance head, CFO', 'Principal, partner; portfolio CFO or CEO roles', 'Partner; founder; operator'],
  ],
};

export const INDIA_LENS = [
  ['Investment banking in India is ECM-heavy.', 'India ran one of the world\'s busiest IPO markets in 2024 to 2026, so domestic banks earn a large share of fees from IPOs, QIPs, block deals and OFS. Expect IPO process questions even for an M&A seat.'],
  ['Private equity in India is mostly growth and minority investing,', 'with control buyouts rising but still a minority of deals. Bank financing of acquisitions was restricted until RBI\'s 2026 acquisition finance directions. Paper LBOs are still tested because they test returns logic.'],
  ['Corporate finance roles are closer to strategy than in many markets:', 'Indian conglomerates and MNC subsidiaries use finance leadership programmes to rotate people through FP&A, treasury, M&A and plant finance.'],
];

export const TRACK_FIT = [
  ['Building a precise model, polishing a document, working fast under deadlines for a client', 'Investment banking', 'Rebuilding a comps table and a simple DCF for a listed company in 3 hours'],
  ['Understanding why a business makes or loses money and changing it from the inside', 'Corporate finance', "Writing a variance commentary for a company's last two quarters from its results"],
  ['Forming a view on a whole business and living with that decision for years', 'Private equity', 'Writing a two-page invest or pass memo on a listed mid-cap'],
  ['Meeting founders, spotting markets early, and being comfortable being wrong often', 'Venture capital', 'Mapping 20 startups in one theme and picking the one you would back'],
  ['Structured problem solving across industries and client work', 'Consulting or deal advisory', 'Solving a profitability case and a guesstimate with a timer'],
  ['Having daily views on stocks, rates and currencies', 'Equity research or markets', 'Writing a one-page stock pitch and a weekly macro note'],
];

export const TRACK_TRAPS = [
  ['Applying to everything.', 'Recruiters can tell. A candidate who explains why IB and not PE, and why this bank\'s ECM desk, beats a generically strong candidate.'],
  ['Confusing prestige with fit.', 'VC has very few seats and rewards a specific kind of network and judgement. If you have not spent time with startups, a credible story takes months to build.'],
  ['Ignoring the secondary track.', 'Most successful candidates prepare one primary track and one secondary track that shares 70% of the preparation: IB with PE, PE with ER, corporate finance with consulting.'],
];

export const WEEK1_DRILL = 'By the end of week 1, write down: your primary and secondary track, five target firms for each, the desk or team you want, and one sentence on why. Read three real job descriptions for each and list the skills they mention. This list drives everything else.';
