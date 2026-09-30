// Three-statement engine. A transaction is a set of primitive moves; compute() turns
// them into consistent changes on the income statement, cash flow statement and
// balance sheet. Convention (the interview default): tax is paid in cash in the same
// period, so it flows through net income and CFO; interest paid sits in CFO via net income.

export interface Prim {
  rev?: number; cogs?: number; opex?: number; da?: number; imp?: number; sbc?: number; gain?: number; interest?: number;
  nonDed?: number; taxX?: number;
  dAR?: number; dInv?: number; dPre?: number; dAP?: number; dAcc?: number; dDef?: number;
  capex?: number; proceeds?: number; bookSold?: number;
  dDebt?: number; eqIssue?: number; buyback?: number; div?: number;
  ncPPE?: number; ncEq?: number;
}

export type Line = { k: string; l: string; total?: boolean; sub?: string };
export const IS_LINES: Line[] = [
  { k: 'rev', l: 'Revenue' }, { k: 'cogs', l: 'Cost of goods sold' }, { k: 'gp', l: 'Gross profit', total: true },
  { k: 'opex', l: 'Operating expenses' }, { k: 'ebitda', l: 'EBITDA', total: true },
  { k: 'da', l: 'Depreciation and amortisation' }, { k: 'nc', l: 'Impairment and share-based pay' }, { k: 'gain', l: 'Gain on asset sale' },
  { k: 'ebit', l: 'EBIT', total: true }, { k: 'interest', l: 'Interest expense' }, { k: 'pbt', l: 'Profit before tax', total: true },
  { k: 'tax', l: 'Tax' }, { k: 'ni', l: 'Net income', total: true },
];
export const CF_LINES: Line[] = [
  { k: 'cf_ni', l: 'Net income', sub: 'Operating' }, { k: 'cf_da', l: 'Add back D&A' }, { k: 'cf_nc', l: 'Add back impairment and SBC' }, { k: 'cf_gain', l: 'Less gain on sale' },
  { k: 'cf_ar', l: 'Change in receivables' }, { k: 'cf_inv', l: 'Change in inventory' }, { k: 'cf_pre', l: 'Change in prepaid expenses' },
  { k: 'cf_ap', l: 'Change in payables' }, { k: 'cf_acc', l: 'Change in accrued expenses' }, { k: 'cf_def', l: 'Change in deferred revenue' },
  { k: 'cfo', l: 'Cash from operations (CFO)', total: true },
  { k: 'cf_capex', l: 'Capex', sub: 'Investing' }, { k: 'cf_sale', l: 'Asset sale proceeds' }, { k: 'cfi', l: 'Cash from investing (CFI)', total: true },
  { k: 'cf_debt', l: 'Debt raised or repaid', sub: 'Financing' }, { k: 'cf_eq', l: 'Equity issued' }, { k: 'cf_bb', l: 'Share buyback' }, { k: 'cf_div', l: 'Dividends paid' },
  { k: 'cff', l: 'Cash from financing (CFF)', total: true },
  { k: 'dcash', l: 'Net change in cash', total: true },
];
export const BS_LINES: Line[] = [
  { k: 'cash', l: 'Cash', sub: 'Assets' }, { k: 'ar', l: 'Receivables' }, { k: 'inv', l: 'Inventory' }, { k: 'pre', l: 'Prepaid expenses' },
  { k: 'ppe', l: 'PP&E (net)' }, { k: 'gw', l: 'Goodwill' }, { k: 'ta', l: 'Total assets', total: true },
  { k: 'ap', l: 'Payables', sub: 'Liabilities' }, { k: 'acc', l: 'Accrued expenses' }, { k: 'def', l: 'Deferred revenue' }, { k: 'debt', l: 'Debt' },
  { k: 'tl', l: 'Total liabilities', total: true },
  { k: 'sc', l: 'Share capital', sub: 'Equity' }, { k: 're', l: 'Retained earnings' }, { k: 'te', l: 'Total equity', total: true },
  { k: 'tle', l: 'Liabilities + equity', total: true },
];

export type Res = Record<string, number>;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function compute(p: Prim, t = 0): Res {
  const g = (k: keyof Prim) => p[k] || 0;
  const rev = g('rev'), cogs = g('cogs'), opex = g('opex'), da = g('da'), nc = g('imp') + g('sbc'), gain = g('gain'), interest = g('interest');
  const gp = rev - cogs, ebitda = gp - opex, ebit = ebitda - da - nc + gain, pbt = ebit - interest;
  const tax = t * (pbt + g('nonDed')) + g('taxX'); const ni = pbt - tax;
  const cf = {
    cf_ni: ni, cf_da: da, cf_nc: nc, cf_gain: -gain,
    cf_ar: -g('dAR'), cf_inv: -g('dInv'), cf_pre: -g('dPre'), cf_ap: g('dAP'), cf_acc: g('dAcc'), cf_def: g('dDef'),
    cf_capex: -g('capex'), cf_sale: g('proceeds'),
    cf_debt: g('dDebt'), cf_eq: g('eqIssue'), cf_bb: -g('buyback'), cf_div: -g('div'),
  };
  const cfo = cf.cf_ni + cf.cf_da + cf.cf_nc + cf.cf_gain + cf.cf_ar + cf.cf_inv + cf.cf_pre + cf.cf_ap + cf.cf_acc + cf.cf_def;
  const cfi = cf.cf_capex + cf.cf_sale, cff = cf.cf_debt + cf.cf_eq + cf.cf_bb + cf.cf_div, dcash = cfo + cfi + cff;
  const bs = {
    cash: dcash, ar: g('dAR'), inv: g('dInv'), pre: g('dPre'), ppe: g('capex') - da - g('bookSold') + g('ncPPE'), gw: -g('imp'),
    ap: g('dAP'), acc: g('dAcc'), def: g('dDef'), debt: g('dDebt'),
    sc: g('eqIssue') + g('sbc') - g('buyback') + g('ncEq'), re: ni - g('div'),
  };
  const ta = bs.cash + bs.ar + bs.inv + bs.pre + bs.ppe + bs.gw, tl = bs.ap + bs.acc + bs.def + bs.debt, te = bs.sc + bs.re;
  const out: Res = { rev, cogs: -cogs, gp, opex: -opex, ebitda, da: -da, nc: -nc, gain, ebit, interest: -interest, pbt, tax: -tax, ni, ...cf, cfo, cfi, cff, dcash, ...bs, ta, tl, te, tle: tl + te };
  for (const k in out) out[k] = r2(out[k]) || 0;
  return out;
}
export const add = (a: Res, b: Res): Res => { const o: Res = { ...a }; for (const k in b) o[k] = r2((o[k] || 0) + b[k]); return o; };

export interface Tx {
  id: string; name: string; group: 'Financing' | 'Investing' | 'Operating' | 'Accruals and non-cash'; topic: string;
  desc: (x: number) => string; p: (x: number) => Prim; note: string;
}
export const fmtN = (x: number) => (Math.abs(x) < 0.005 ? '0' : x.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const R = (x: number) => `Rs. ${fmtN(x)}`;

export const TXS: Tx[] = [
  { id: 'eq', group: 'Financing', topic: 'CORE-04', name: 'Raise equity for cash', desc: (x) => `The company issues shares for ${R(x)} cash.`, p: (x) => ({ eqIssue: x }),
    note: 'No income statement effect: raising money is not earning it.' },
  { id: 'borrow', group: 'Financing', topic: 'CORE-04', name: 'Borrow debt', desc: (x) => `The company takes a bank loan of ${R(x)}.`, p: (x) => ({ dDebt: x }),
    note: 'A loan is not income. Cash and debt rise together; interest only appears once it accrues.' },
  { id: 'repay', group: 'Financing', topic: 'CORE-04', name: 'Repay debt principal', desc: (x) => `The company repays ${R(x)} of loan principal.`, p: (x) => ({ dDebt: -x }),
    note: 'Principal is not an expense. Only the interest on a loan touches the income statement.' },
  { id: 'interest', group: 'Financing', topic: 'CORE-04', name: 'Pay interest', desc: (x) => `The company pays ${R(x)} of interest in cash.`, p: (x) => ({ interest: x }),
    note: 'Interest is tax-deductible, so the cash cost is after tax. The interview convention runs it through net income into CFO. Indian annual reports under Ind AS usually show interest paid in financing instead; the total change in cash is the same.' },
  { id: 'div', group: 'Financing', topic: 'CORE-04', name: 'Pay a dividend', desc: (x) => `The company pays a ${R(x)} dividend.`, p: (x) => ({ div: x }),
    note: 'Dividends are a distribution of profit, not an expense. They skip the income statement and reduce retained earnings directly.' },
  { id: 'bb', group: 'Financing', topic: 'CORE-04', name: 'Buy back shares', desc: (x) => `The company buys back ${R(x)} of its own shares.`, p: (x) => ({ buyback: x }),
    note: 'Like a dividend, a buyback returns cash to shareholders without touching the income statement. Equity and cash fall together.' },

  { id: 'capex', group: 'Investing', topic: 'CORE-04', name: 'Buy equipment for cash', desc: (x) => `The company buys a machine for ${R(x)} cash.`, p: (x) => ({ capex: x }),
    note: 'Capex is not an expense on day one. One asset (cash) swaps for another (PP&E); the income statement feels it later through depreciation.' },
  { id: 'sell', group: 'Investing', topic: 'CORE-04', name: 'Sell equipment at a gain', desc: (x) => `The company sells a machine with book value ${R(x)} for ${R(x * 1.2)} cash.`, p: (x) => ({ proceeds: x * 1.2, bookSold: x, gain: x * 0.2 }),
    note: 'The full proceeds are investing cash flow. The gain is in net income, so CFO subtracts it to avoid counting it twice. Only the tax on the gain is an operating cash cost.' },
  { id: 'eqppe', group: 'Investing', topic: 'CORE-04', name: 'Issue shares for equipment', desc: (x) => `The company gives a supplier ${R(x)} of new shares in exchange for equipment.`, p: (x) => ({ ncPPE: x, ncEq: x }),
    note: 'No cash moves, so the cash flow statement is silent. It is disclosed as a non-cash transaction.' },

  { id: 'cashsale', group: 'Operating', topic: 'CORE-04', name: 'Cash sale of a service', desc: (x) => `The company delivers a service and is paid ${R(x)} in cash.`, p: (x) => ({ rev: x }),
    note: 'With no cost attached, the whole sale is profit before tax. Cash rises by the after-tax amount.' },
  { id: 'creditsale', group: 'Operating', topic: 'CORE-05', name: 'Credit sale of a service', desc: (x) => `The company delivers a ${R(x)} service on 30-day credit.`, p: (x) => ({ rev: x, dAR: x }),
    note: 'Revenue is earned but not collected. With tax, cash actually falls: the tax is paid now on profit that has not come in yet. This is why fast-growing companies run short of cash.' },
  { id: 'collect', group: 'Operating', topic: 'CORE-05', name: 'Collect a receivable', desc: (x) => `A customer pays the ${R(x)} they owed.`, p: (x) => ({ dAR: -x }),
    note: 'Revenue was booked at the sale. Collection only swaps a receivable for cash; there is no second income statement effect.' },
  { id: 'invbuy', group: 'Operating', topic: 'CORE-05', name: 'Buy inventory on credit', desc: (x) => `The company buys ${R(x)} of inventory on supplier credit.`, p: (x) => ({ dInv: x, dAP: x }),
    note: 'No expense until the goods are sold, and no cash until the supplier is paid. On the cash flow statement the two working capital lines cancel out.' },
  { id: 'invsale', group: 'Operating', topic: 'CORE-04', name: 'Sell inventory for cash at a profit', desc: (x) => `Inventory that cost ${R(x)} is sold for ${R(x * 1.5)} cash.`, p: (x) => ({ rev: x * 1.5, cogs: x, dInv: -x }),
    note: 'Two things happen at once: revenue is earned and the inventory becomes COGS. CFO adds back the fall in inventory, so cash rises by the price less tax.' },
  { id: 'payap', group: 'Operating', topic: 'CORE-05', name: 'Pay a supplier', desc: (x) => `The company pays ${R(x)} it owed to a supplier.`, p: (x) => ({ dAP: -x }),
    note: 'The cost was already recognised when the goods were sold. Paying the bill is a cash outflow with no income statement effect.' },
  { id: 'advance', group: 'Operating', topic: 'CORE-05', name: 'Customer pays in advance', desc: (x) => `A customer prepays ${R(x)} for a service to be delivered next quarter.`, p: (x) => ({ dDef: x }),
    note: 'Cash in, nothing earned yet. The obligation to deliver is a liability (deferred revenue) until the work is done.' },
  { id: 'earned', group: 'Operating', topic: 'CORE-05', name: 'Deliver prepaid service', desc: (x) => `The company delivers the ${R(x)} service the customer prepaid.`, p: (x) => ({ rev: x, dDef: -x }),
    note: 'The liability turns into revenue. The cash came in earlier, so CFO only shows the tax paid on the profit.' },
  { id: 'cashexp', group: 'Operating', topic: 'CORE-04', name: 'Pay salaries in cash', desc: (x) => `The company pays ${R(x)} of salaries.`, p: (x) => ({ opex: x }),
    note: 'A cash expense hits all three statements. The tax saving means cash falls by less than the expense.' },

  { id: 'dep', group: 'Accruals and non-cash', topic: 'CORE-04', name: 'Depreciation', desc: (x) => `Depreciation of ${R(x)} is recorded.`, p: (x) => ({ da: x }),
    note: 'The most asked three-statement question. Depreciation is non-cash, but it is tax-deductible, so cash goes up by the tax saving.' },
  { id: 'wages', group: 'Accruals and non-cash', topic: 'CORE-05', name: 'Accrue unpaid wages', desc: (x) => `Staff have earned ${R(x)} of wages that will be paid next month.`, p: (x) => ({ opex: x, dAcc: x }),
    note: 'Expense now, cash later. The accrued liability is added back in CFO, so cash only reflects the tax saving.' },
  { id: 'prepaid', group: 'Accruals and non-cash', topic: 'CORE-05', name: 'Prepaid expense used up', desc: (x) => `${R(x)} of insurance paid last year expires this year.`, p: (x) => ({ opex: x, dPre: -x }),
    note: 'The cash left last year when the premium was paid. This year the asset drips into expense.' },
  { id: 'invwd', group: 'Accruals and non-cash', topic: 'CORE-04', name: 'Write down inventory', desc: (x) => `${R(x)} of inventory becomes obsolete and is written off.`, p: (x) => ({ cogs: x, dInv: -x }),
    note: 'Assumes the write-down is tax-deductible. Non-cash, so cash rises by the tax saving, like depreciation.' },
  { id: 'impair', group: 'Accruals and non-cash', topic: 'CORE-04', name: 'Impair goodwill', desc: (x) => `Goodwill of ${R(x)} is impaired. The charge is not tax-deductible.`, p: (x) => ({ imp: x, nonDed: x }),
    note: 'Non-cash and, here, no tax saving, so cash does not move. State your tax assumption in an interview; if it were deductible, cash would rise by the tax saving.' },
  { id: 'sbc', group: 'Accruals and non-cash', topic: 'CORE-04', name: 'Share-based compensation', desc: (x) => `Employees receive ${R(x)} of stock options as pay.`, p: (x) => ({ sbc: x }),
    note: 'An expense with no cash, paid in shares. Assumes it is tax-deductible. Share capital rises while retained earnings fall.' },
];
export const TX_BY_ID = Object.fromEntries(TXS.map((t) => [t.id, t]));

// Predict mode rows
export const PREDICT_ROWS: { k: string; l: string }[] = [
  { k: 'ni', l: 'Net income' }, { k: 'cfo', l: 'Cash from operations' }, { k: 'cfi', l: 'Cash from investing' }, { k: 'cff', l: 'Cash from financing' },
  { k: 'ta', l: 'Total assets' }, { k: 'tl', l: 'Total liabilities' }, { k: 'te', l: 'Total equity' },
];
export const sgn = (x: number) => (Math.abs(x) < 0.005 ? 0 : x > 0 ? 1 : -1);

// The worked year: a tea kiosk business, figures in Rs. lakh. Tax is booked at year end.
export const STORY: { title: string; desc: string; p: Prim; note: string }[] = [
  { title: 'Founders invest Rs. 50 lakh', desc: 'Two founders put in Rs. 50 lakh for shares.', p: { eqIssue: 50 }, note: 'Cash and share capital rise. Financing inflow. No income.' },
  { title: 'Bank loan of Rs. 30 lakh at 10%', desc: 'A term loan to fund the kiosks.', p: { dDebt: 30 }, note: 'Cash and debt rise. Financing inflow. Loans are not income.' },
  { title: 'Buy kiosks and machines for Rs. 40 lakh', desc: 'Paid in cash.', p: { capex: 40 }, note: 'Cash becomes PP&E. Investing outflow. No expense yet.' },
  { title: 'Buy Rs. 30 lakh of tea and supplies on credit', desc: 'Suppliers give 60 days.', p: { dInv: 30, dAP: 30 }, note: 'Inventory and payables rise. No cash, no expense.' },
  { title: 'Sell goods costing Rs. 24 lakh for Rs. 60 lakh', desc: 'Rs. 45 lakh in cash; Rs. 15 lakh on credit to a corporate client.', p: { rev: 60, cogs: 24, dInv: -24, dAR: 15 }, note: 'Revenue 60 and COGS 24 give gross profit 36. Cash rises only 45; the other 15 sits in receivables.' },
  { title: 'Corporate client prepays Rs. 6 lakh', desc: 'For catering next quarter.', p: { dDef: 6 }, note: 'Cash in, deferred revenue up. Nothing earned yet.' },
  { title: 'Pay suppliers Rs. 20 lakh', desc: 'Part of the 30 owed.', p: { dAP: -20 }, note: 'Cash and payables fall. The cost was already in COGS.' },
  { title: 'Pay salaries and rent of Rs. 13 lakh', desc: 'Cash operating costs for the year.', p: { opex: 13 }, note: 'Expense and cash outflow together.' },
  { title: 'Depreciation of Rs. 8 lakh', desc: 'Kiosks written down over five years.', p: { da: 8 }, note: 'PP&E falls, expense rises, no cash. CFO adds it back.' },
  { title: 'Pay interest of Rs. 3 lakh', desc: '10% on the Rs. 30 lakh loan.', p: { interest: 3 }, note: 'Expense and cash outflow. EBIT is untouched; profit before tax falls.' },
  { title: 'Book and pay tax of Rs. 3 lakh', desc: '25% of profit before tax of Rs. 12 lakh.', p: { taxX: 3 }, note: 'Net income is now 9. Cash falls by the tax paid.' },
  { title: 'Pay a dividend of Rs. 2 lakh', desc: 'The founders take a little out.', p: { div: 2 }, note: 'Retained earnings end at 7 (net income 9 less dividend 2). Cash on the balance sheet equals closing cash on the cash flow statement: 50.' },
];

export interface Ratio { id: string; l: string; cells: string[]; f: string; calc: (r: Res) => [string, number, 'x' | '%' | 'days' | 'rs']; read: (v: number) => string }
const pct = (a: number, b: number) => (a / b) * 100;
export const RATIOS: Ratio[] = [
  { id: 'gm', l: 'Gross margin', cells: ['gp', 'rev'], f: 'Gross profit / Revenue', calc: (r) => [`${fmtN(r.gp)} / ${fmtN(r.rev)}`, pct(r.gp, r.rev), '%'], read: () => 'What is left from each rupee of sales after the direct cost of the goods.' },
  { id: 'em', l: 'EBITDA margin', cells: ['ebitda', 'rev'], f: 'EBITDA / Revenue', calc: (r) => [`${fmtN(r.ebitda)} / ${fmtN(r.rev)}`, pct(r.ebitda, r.rev), '%'], read: () => 'Operating profitability before capital intensity and financing. The margin used with EV/EBITDA.' },
  { id: 'ebm', l: 'EBIT margin', cells: ['ebit', 'rev'], f: 'EBIT / Revenue', calc: (r) => [`${fmtN(r.ebit)} / ${fmtN(r.rev)}`, pct(r.ebit, r.rev), '%'], read: () => 'Profit after paying for the assets that wear out. The base for ROCE.' },
  { id: 'nm', l: 'Net margin', cells: ['ni', 'rev'], f: 'Net income / Revenue', calc: (r) => [`${fmtN(r.ni)} / ${fmtN(r.rev)}`, pct(r.ni, r.rev), '%'], read: () => 'What shareholders keep from each rupee of sales after interest and tax.' },
  { id: 'roe', l: 'Return on equity', cells: ['ni', 'te'], f: 'Net income / Total equity', calc: (r) => [`${fmtN(r.ni)} / ${fmtN(r.te)}`, pct(r.ni, r.te), '%'], read: () => 'Uses closing equity here because it is year one; with history, use the average of opening and closing.' },
  { id: 'roa', l: 'Return on assets', cells: ['ni', 'ta'], f: 'Net income / Total assets', calc: (r) => [`${fmtN(r.ni)} / ${fmtN(r.ta)}`, pct(r.ni, r.ta), '%'], read: () => 'How hard the whole asset base works, regardless of how it is funded.' },
  { id: 'ic', l: 'Interest cover', cells: ['ebit', 'interest'], f: 'EBIT / Interest expense', calc: (r) => [`${fmtN(r.ebit)} / ${fmtN(-r.interest)}`, r.ebit / -r.interest, 'x'], read: (v) => `Operating profit covers interest ${v.toFixed(1)} times. Lenders usually want 3x or more.` },
  { id: 'cr', l: 'Current ratio', cells: ['cash', 'ar', 'inv', 'pre', 'ap', 'acc', 'def'], f: 'Current assets / Current liabilities', calc: (r) => { const ca = r.cash + r.ar + r.inv + r.pre, cl = r.ap + r.acc + r.def; return [`${fmtN(ca)} / ${fmtN(cl)}`, ca / cl, 'x']; }, read: () => 'Short-term liquidity. Very high usually means idle cash, not strength.' },
  { id: 'nd', l: 'Net debt / EBITDA', cells: ['debt', 'cash', 'ebitda'], f: '(Debt - Cash) / EBITDA', calc: (r) => [`(${fmtN(r.debt)} - ${fmtN(r.cash)}) / ${fmtN(r.ebitda)}`, (r.debt - r.cash) / r.ebitda, 'x'], read: (v) => v < 0 ? 'Negative means net cash: the company holds more cash than debt.' : 'Years of EBITDA needed to repay net debt. The first leverage number bankers quote.' },
  { id: 'cc', l: 'Cash conversion', cells: ['cfo', 'ni'], f: 'CFO / Net income', calc: (r) => [`${fmtN(r.cfo)} / ${fmtN(r.ni)}`, r.cfo / r.ni, 'x'], read: () => 'Above 1x means profits turn into cash. Persistently below 1x is a quality-of-earnings flag.' },
  { id: 'dso', l: 'Receivable days (DSO)', cells: ['ar', 'rev'], f: 'Receivables / Revenue x 365', calc: (r) => [`${fmtN(r.ar)} / ${fmtN(r.rev)} x 365`, (r.ar / r.rev) * 365, 'days'], read: () => 'How long customers take to pay.' },
  { id: 'dio', l: 'Inventory days (DIO)', cells: ['inv', 'cogs'], f: 'Inventory / COGS x 365', calc: (r) => [`${fmtN(r.inv)} / ${fmtN(-r.cogs)} x 365`, (r.inv / -r.cogs) * 365, 'days'], read: () => 'Uses COGS, not revenue, because inventory is carried at cost.' },
  { id: 'dpo', l: 'Payable days (DPO)', cells: ['ap', 'cogs'], f: 'Payables / COGS x 365', calc: (r) => [`${fmtN(r.ap)} / ${fmtN(-r.cogs)} x 365`, (r.ap / -r.cogs) * 365, 'days'], read: () => 'How long the company takes to pay suppliers. Cash conversion cycle = DSO + DIO - DPO.' },
];

export const sign = (x: number) => (Math.abs(x) < 0.005 ? '0' : (x > 0 ? '+' : '−') + fmtN(Math.abs(x)));

// How to say it in an interview, generated from the numbers: income statement, then cash flow, then balance sheet.
export function sayIt(r: Res) {
  const lab = (lines: Line[], keys: string[]) => keys.filter((k) => Math.abs(r[k]) > 0.004).map((k) => `${lines.find((x) => x.k === k)!.l.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())} ${sign(r[k])}`);
  const is = lab(IS_LINES, ['rev', 'cogs', 'opex', 'da', 'nc', 'gain', 'interest', 'tax']);
  const p1 = is.length ? `Income statement: ${is.join(', ')}, so net income ${sign(r.ni)}.` : 'Income statement: no effect.';
  const adj = lab(CF_LINES, ['cf_da', 'cf_nc', 'cf_gain', 'cf_ar', 'cf_inv', 'cf_pre', 'cf_ap', 'cf_acc', 'cf_def']);
  const parts: string[] = [];
  if (Math.abs(r.cfo) > 0.004 || adj.length || Math.abs(r.ni) > 0.004) parts.push(`CFO starts with net income ${sign(r.ni)}${adj.length ? `, then ${adj.join(', ')}` : ''}, so CFO ${sign(r.cfo)}`);
  if (Math.abs(r.cfi) > 0.004) parts.push(`investing ${sign(r.cfi)}`);
  if (Math.abs(r.cff) > 0.004) parts.push(`financing ${sign(r.cff)}`);
  const p2 = parts.length ? `Cash flow: ${parts.join('; ')}. Cash ${sign(r.dcash)}.` : 'Cash flow: no cash moves.';
  const bs = lab(BS_LINES, ['cash', 'ar', 'inv', 'pre', 'ppe', 'gw', 'ap', 'acc', 'def', 'debt', 'sc', 're']);
  const p3 = `Balance sheet: ${bs.join(', ')}. Assets ${sign(r.ta)} = liabilities ${sign(r.tl)} + equity ${sign(r.te)}. It balances.`;
  return [p1, p2, p3];
}

