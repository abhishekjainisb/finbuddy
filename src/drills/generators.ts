// Parametric numeric drills. Each generator builds a fresh question from a seed,
// computes the answer key, and diagnoses common wrong answers into error tags.

export type Rng = () => number;
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)];
const int = (r: Rng, lo: number, hi: number, step = 1) => lo + step * Math.floor(r() * ((hi - lo) / step + 1));
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const fmt = (x: number, d = 1) => x.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const near = (a: number | undefined, b: number, tol = 0.02) => a !== undefined && Math.abs(a - b) <= Math.max(tol, Math.abs(b) * 0.01);

export interface Field { key: string; label: string; answer: number; unit?: string; tol?: number }
export interface GenOut {
  q: string;
  fields: Field[];
  why: string;
  diagnose?: (v: Record<string, number | undefined>) => string | null;
}
export type Gen = (r: Rng) => GenOut;

export const TAG_LABELS: Record<string, string> = {
  forgot_tax: 'Forgot the tax effect',
  wc_sign: 'Wrong sign on working capital',
  dep_as_cash: 'Treated depreciation as a cash cost',
  cogs_base: 'Used revenue instead of COGS for inventory or payable days',
  ltv_on_revenue: 'Calculated LTV on revenue instead of gross profit',
  taxed_twice: 'Applied the tax shield twice to the cost of debt',
  cash_sign: 'Added cash to EV instead of subtracting it',
  nci_sign: 'Subtracted minority interest instead of adding it',
  dilution_ignored: 'Ignored dilution from in-the-money options',
  mean_not_median: 'Used the mean instead of the median',
  reinvestment_ignored: 'Grew free cash flow without funding the growth',
  mixed_periods: 'Mixed LTM and forward numbers',
  accretion_sign: 'Got the direction of accretion or dilution wrong',
  fresh_vs_ofs: 'Confused a fresh issue with an offer for sale',
  discounting: 'Discounting or compounding error',
  rate_units: 'Percent versus decimal or annual versus monthly rate error',
  arithmetic: 'Arithmetic slip',
  concept: 'Concept gap',
  premium_base: 'Measured the premium on the wrong base',
  bond_direction: 'Price and yield moved the same way',
  dol_mix: 'Confused operating and financial leverage',
  hurdle_math: 'Skipped the preferred return or the GP catch-up',
  moic_irr: 'Treated IRR as MOIC divided by years',
  pool_shuffle: 'Put the option pool in the post-money instead of the pre-money',
  pref_type: 'Mixed up participating and non-participating preference',
  mix_price: 'Measured the price effect on budget volumes',
};

export const GENERATORS: Record<string, { topic: string; title: string; gen: Gen }> = {
  dep_change: {
    topic: 'CORE-04', title: 'Depreciation walk-through',
    gen: (r) => {
      const X = pick(r, [10, 20, 25, 40, 50, 80]); const t = pick(r, [0.2, 0.25, 0.3]);
      const dNI = -X * (1 - t), dCash = X * t;
      return {
        q: `Depreciation rises by Rs. ${X}. The tax rate is ${fmt(t * 100, 2)}% and the extra depreciation is tax-deductible. Walk it through the statements.`,
        fields: [
          { key: 'ni', label: 'Change in net income', answer: dNI },
          { key: 'cfo', label: 'Change in cash from operations', answer: dCash },
          { key: 'ppe', label: 'Change in PP&E', answer: -X },
          { key: 're', label: 'Change in retained earnings', answer: dNI },
        ],
        why: `EBIT and PBT fall by ${X}; tax falls by ${fmt(X * t)}; net income falls by ${fmt(X * (1 - t))}. CFO = net income ${fmt(dNI)} + depreciation ${X} = +${fmt(dCash)}. PP&E falls ${X}, cash rises ${fmt(dCash)}, so assets fall ${fmt(X * (1 - t))}, matching the fall in retained earnings.`,
        diagnose: (v) => near(v.ni, -X) ? 'forgot_tax' : near(v.cfo, -X) || near(v.cfo, dNI) ? 'dep_as_cash' : null,
      };
    },
  },
  cfo_indirect: {
    topic: 'CORE-03', title: 'PAT to cash from operations',
    gen: (r) => {
      const pat = int(r, 150, 400, 5), da = int(r, 40, 120, 5), inv = int(r, -30, 40, 5), rec = int(r, -20, 40, 5), pay = int(r, -20, 30, 5);
      const cfo = pat + da - inv - rec + pay;
      const s = (x: number, n: string) => (x >= 0 ? `${n} rise by ${x}` : `${n} fall by ${-x}`);
      return {
        q: `PAT is Rs. ${pat} crore and D&A is Rs. ${da} crore. During the year, ${s(inv, 'inventories')}, ${s(rec, 'receivables')} and ${s(pay, 'payables')}. What is cash from operations?`,
        fields: [{ key: 'cfo', label: 'Cash from operations (Rs. crore)', answer: cfo }],
        why: `CFO = PAT + D&A − increase in inventory − increase in receivables + increase in payables = ${pat} + ${da} − (${inv}) − (${rec}) + (${pay}) = ${cfo}. An increase in an operating asset uses cash; an increase in an operating liability provides it.`,
        diagnose: (v) => near(v.cfo, pat + da + inv + rec - pay) || near(v.cfo, pat + da + inv + rec + pay) || near(v.cfo, pat + da - inv - rec - pay) ? 'wc_sign' : near(v.cfo, pat - inv - rec + pay) ? 'concept' : null,
      };
    },
  },
  equity_roll: {
    topic: 'CORE-02', title: 'Roll the equity balance',
    gen: (r) => {
      const open = int(r, 500, 1200, 5), pat = int(r, 80, 300, 5), div = int(r, 10, 120, 5), issue = pick(r, [0, 0, 50, 100]);
      const close = open + pat - div + issue;
      return {
        q: `Opening shareholders' equity is Rs. ${open} crore. PAT for the year is Rs. ${pat} crore, dividends paid are Rs. ${div} crore${issue ? ` and the company issues Rs. ${issue} crore of new shares` : ''}. What is closing equity?`,
        fields: [{ key: 'eq', label: 'Closing equity (Rs. crore)', answer: close }],
        why: `Every flow explains a change in a stock: ${open} + ${pat} − ${div}${issue ? ` + ${issue}` : ''} = ${close}. Retained earnings rise by net income and fall by dividends.`,
        diagnose: (v) => near(v.eq, open + pat + div + issue) ? 'concept' : null,
      };
    },
  },
  ccc: {
    topic: 'CORE-06', title: 'Cash conversion cycle',
    gen: (r) => {
      const rev = int(r, 1500, 4000, 100), cogs = Math.round(rev * pick(r, [0.5, 0.55, 0.6, 0.65])), rec = int(r, 100, 400, 10), inv = int(r, 120, 450, 10), pay = int(r, 100, 350, 10);
      const dso = rec / rev * 365, dio = inv / cogs * 365, dpo = pay / cogs * 365, c = dso + dio - dpo;
      return {
        q: `Revenue Rs. ${rev} crore, COGS Rs. ${cogs} crore. Receivables ${rec}, inventory ${inv}, payables ${pay}. Compute DSO, DIO, DPO and the cash conversion cycle (days, 1 decimal).`,
        fields: [
          { key: 'dso', label: 'DSO (days)', answer: round(dso, 1), tol: 0.2 },
          { key: 'dio', label: 'DIO (days)', answer: round(dio, 1), tol: 0.2 },
          { key: 'dpo', label: 'DPO (days)', answer: round(dpo, 1), tol: 0.2 },
          { key: 'ccc', label: 'CCC (days)', answer: round(c, 1), tol: 0.3 },
        ],
        why: `DSO = ${rec} ÷ ${rev} × 365 = ${fmt(dso)}. DIO = ${inv} ÷ ${cogs} × 365 = ${fmt(dio)}. DPO = ${pay} ÷ ${cogs} × 365 = ${fmt(dpo)}. CCC = DSO + DIO − DPO = ${fmt(c)} days.`,
        diagnose: (v) => near(v.dio, inv / rev * 365, 0.3) || near(v.dpo, pay / rev * 365, 0.3) ? 'cogs_base' : null,
      };
    },
  },
  wc_release: {
    topic: 'CORE-06', title: 'Cash released by a working capital lever',
    gen: (r) => {
      const cogs = int(r, 800, 3000, 50), days = pick(r, [5, 7, 10, 15]);
      const cash = cogs / 365 * days;
      return {
        q: `COGS is Rs. ${cogs} crore. A programme cuts inventory by ${days} days. How much cash does it release, permanently?`,
        fields: [{ key: 'c', label: 'Cash released (Rs. crore)', answer: round(cash, 1), tol: 0.3 }],
        why: `Cash released = COGS ÷ 365 × days = ${cogs} ÷ 365 × ${days} = Rs. ${fmt(cash)} crore. Inventory days are measured on COGS, not revenue.`,
      };
    },
  },
  lease: {
    topic: 'CORE-07', title: 'Ind AS 116 lease',
    gen: (r) => {
      const rent = pick(r, [10, 20, 30, 40, 50]), rate = pick(r, [0.08, 0.09, 0.1]), n = pick(r, [5, 8, 10]);
      const af = (1 - (1 + rate) ** -n) / rate, L = rent * af, dep = L / n, int1 = L * rate;
      return {
        q: `A retailer signs a ${n}-year store lease at Rs. ${rent} crore a year; the incremental borrowing rate is ${fmt(rate * 100, 2)}%. Compute the opening lease liability, year-1 depreciation and interest, and the change in EBITDA.`,
        fields: [
          { key: 'L', label: 'Lease liability at start (Rs. crore)', answer: round(L, 1), tol: 0.3 },
          { key: 'dep', label: 'Year-1 depreciation', answer: round(dep, 1), tol: 0.2 },
          { key: 'int', label: 'Year-1 interest', answer: round(int1, 1), tol: 0.2 },
          { key: 'ebitda', label: 'Change in EBITDA', answer: rent },
        ],
        why: `Liability = ${rent} × annuity factor (${fmt(rate * 100, 2)}%, ${n} years) = ${rent} × ${fmt(af, 3)} = ${fmt(L)}. Depreciation = ${fmt(L)} ÷ ${n} = ${fmt(dep)}; interest = ${fmt(L)} × ${fmt(rate * 100, 2)}% = ${fmt(int1)}. Total charge ${fmt(dep + int1)} versus rent ${rent}: front-loaded. EBITDA rises by the rent of ${rent}.`,
        diagnose: (v) => near(v.L, rent * n, 0.5) ? 'discounting' : null,
      };
    },
  },
  nci: {
    topic: 'CORE-08', title: 'Minority interest in numbers',
    gen: (r) => {
      const own = pick(r, [0.6, 0.7, 0.75, 0.8, 0.9]), pat = int(r, 20, 120, 5);
      return {
        q: `A parent owns ${fmt(own * 100, 2)}% of a subsidiary that earns PAT of Rs. ${pat} crore and is fully consolidated. How much PAT is attributable to non-controlling interests?`,
        fields: [{ key: 'n', label: 'NCI share of PAT (Rs. crore)', answer: round(pat * (1 - own), 1), tol: 0.1 }],
        why: `The parent consolidates 100% of the subsidiary's PAT, then deducts the ${round((1 - own) * 100, 0)}% attributable to NCI: ${pat} × ${fmt(1 - own, 2)} = ${fmt(pat * (1 - own))}. EPS and P/E use the attributable figure; EV/EBITDA uses consolidated EBITDA with NCI added to EV.`,
        diagnose: (v) => near(v.n, pat * own) ? 'concept' : null,
      };
    },
  },
  returns: {
    topic: 'CORE-10', title: 'ROE, ROCE and ROIC',
    gen: (r) => {
      const ebit = int(r, 200, 600, 10), intr = int(r, 20, 80, 5), t = 0.25, eq = int(r, 700, 2000, 50), debt = int(r, 200, 900, 50), cash = int(r, 50, 300, 10);
      const pat = (ebit - intr) * (1 - t);
      const roe = pat / eq * 100, roce = ebit / (eq + debt) * 100, roic = ebit * (1 - t) / (eq + debt - cash) * 100;
      return {
        q: `EBIT Rs. ${ebit} crore, interest ${intr}, tax 25%. Equity ${eq}, debt ${debt}, cash ${cash}. Compute ROE, ROCE and ROIC (%, 1 decimal).`,
        fields: [
          { key: 'roe', label: 'ROE %', answer: round(roe, 1), tol: 0.2 },
          { key: 'roce', label: 'ROCE %', answer: round(roce, 1), tol: 0.2 },
          { key: 'roic', label: 'ROIC %', answer: round(roic, 1), tol: 0.2 },
        ],
        why: `PAT = (${ebit} − ${intr}) × 0.75 = ${fmt(pat)}. ROE = ${fmt(pat)} ÷ ${eq} = ${fmt(roe)}%. ROCE = EBIT ÷ (equity + debt) = ${ebit} ÷ ${eq + debt} = ${fmt(roce)}%. ROIC = EBIT × (1 − t) ÷ (equity + debt − cash) = ${fmt(ebit * 0.75)} ÷ ${eq + debt - cash} = ${fmt(roic)}%.`,
        diagnose: (v) => near(v.roic, ebit / (eq + debt - cash) * 100, 0.3) ? 'forgot_tax' : near(v.roe, ebit * 0.75 / eq * 100, 0.3) ? 'concept' : null,
      };
    },
  },
  unit_econ: {
    topic: 'CORE-11', title: 'SaaS unit economics',
    gen: (r) => {
      const price = pick(r, [2000, 3000, 5000, 8000]), gm = pick(r, [0.7, 0.75, 0.8, 0.85]), cac = pick(r, [40000, 60000, 90000, 120000]), churn = pick(r, [0.015, 0.02, 0.025, 0.03]);
      const gp = price * gm, pay = cac / gp, ltv = gp / churn;
      return {
        q: `A startup charges Rs. ${fmt(price, 0)} a month at a ${fmt(gm * 100, 2)}% gross margin. CAC is Rs. ${fmt(cac, 0)} and monthly churn is ${fmt(churn * 100, 2)}%. Compute monthly gross profit per customer, simple CAC payback, LTV and LTV/CAC.`,
        fields: [
          { key: 'gp', label: 'Monthly gross profit (Rs.)', answer: gp },
          { key: 'pb', label: 'CAC payback (months)', answer: round(pay, 1), tol: 0.2 },
          { key: 'ltv', label: 'LTV (Rs.)', answer: Math.round(ltv), tol: 50 },
          { key: 'x', label: 'LTV / CAC (x)', answer: round(ltv / cac, 2), tol: 0.03 },
        ],
        why: `Gross profit = ${fmt(price, 0)} × ${fmt(gm * 100, 2)}% = ${fmt(gp, 0)}. Payback = ${fmt(cac, 0)} ÷ ${fmt(gp, 0)} = ${fmt(pay)} months. LTV = ${fmt(gp, 0)} ÷ ${fmt(churn * 100, 2)}% = ${fmt(ltv, 0)}. LTV/CAC = ${fmt(ltv / cac, 2)}x; below 3x means cut churn or CAC before scaling spend.`,
        diagnose: (v) => near(v.ltv, price / churn, 100) ? 'ltv_on_revenue' : null,
      };
    },
  },
  tvm: {
    topic: 'CORE-14', title: 'Time value without a calculator',
    gen: (r) => {
      const kind = pick(r, ['fv', 'perp', 'cagr', 'real', 'ear']);
      if (kind === 'fv') {
        const pv = pick(r, [1, 2, 5]), rate = pick(r, [0.08, 0.1, 0.12]), n = pick(r, [5, 10]);
        const fv = pv * (1 + rate) ** n;
        return { q: `Rs. ${pv} lakh compounds at ${fmt(rate * 100, 2)}% a year for ${n} years. What does it grow to (Rs. lakh, 2 decimals)?`, fields: [{ key: 'a', label: 'Future value (Rs. lakh)', answer: round(fv, 2), tol: 0.02 }], why: `FV = PV × (1 + r)^n = ${pv} × ${fmt(1 + rate, 4)}^${n} = ${fmt(fv, 2)}. Rule of 72: doubling takes about ${fmt(72 / (rate * 100), 1)} years.`, diagnose: (v) => near(v.a, pv * (1 + rate * n), 0.05) ? 'discounting' : null };
      }
      if (kind === 'perp') {
        const c = pick(r, [50, 100, 200]), k = pick(r, [0.08, 0.1, 0.12]), g = pick(r, [0.03, 0.04, 0.05]);
        const v1 = c * (1 + g) / (k - g);
        return { q: `A payment of Rs. ${c} a year has just been paid and will grow at ${fmt(g * 100, 2)}% forever. The discount rate is ${fmt(k * 100, 2)}%. What is it worth today?`, fields: [{ key: 'a', label: 'Value (Rs.)', answer: round(v1, 0), tol: 1.5 }], why: `The next payment is C₁ = ${c} × ${fmt(1 + g, 4)} = ${fmt(c * (1 + g))}. PV = C₁ ÷ (r − g) = ${fmt(c * (1 + g))} ÷ ${fmt((k - g) * 100)}% = ${fmt(v1, 0)}.`, diagnose: (v) => near(v.a, c / (k - g), 2) ? 'discounting' : null };
      }
      if (kind === 'cagr') {
        const a = pick(r, [400, 500, 800]), m = pick(r, [1.5, 1.6, 2, 2.5]), n = pick(r, [3, 4, 5]);
        const cg = (m ** (1 / n) - 1) * 100;
        return { q: `Revenue grew from ${a} to ${a * m} in ${n} years. What is the CAGR (%, 1 decimal)?`, fields: [{ key: 'a', label: 'CAGR %', answer: round(cg, 1), tol: 0.2 }], why: `CAGR = (${a * m} ÷ ${a})^(1/${n}) − 1 = ${m}^(${fmt(1 / n, 3)}) − 1 = ${fmt(cg)}%.`, diagnose: (v) => near(v.a, (m - 1) / n * 100, 0.3) ? 'discounting' : null };
      }
      if (kind === 'real') {
        const nom = pick(r, [0.1, 0.12, 0.14]), inf = pick(r, [0.04, 0.05, 0.06]);
        const re = ((1 + nom) / (1 + inf) - 1) * 100;
        return { q: `Nominal return ${fmt(nom * 100, 2)}%, inflation ${fmt(inf * 100, 2)}%. What is the real return (%, 2 decimals)?`, fields: [{ key: 'a', label: 'Real return %', answer: round(re, 2), tol: 0.02 }], why: `Real = (1 + nominal) ÷ (1 + inflation) − 1 = ${fmt(1 + nom, 4)} ÷ ${fmt(1 + inf, 4)} − 1 = ${fmt(re, 2)}%. Discount nominal cash flows at nominal rates and real at real.` };
      }
      const k = pick(r, [0.09, 0.12, 0.18]), m = pick(r, [4, 12]);
      const ear = ((1 + k / m) ** m - 1) * 100;
      return { q: `A rate of ${fmt(k * 100, 2)}% a year is compounded ${m === 12 ? 'monthly' : 'quarterly'}. What is the effective annual rate (%, 2 decimals)?`, fields: [{ key: 'a', label: 'Effective annual rate %', answer: round(ear, 2), tol: 0.02 }], why: `EAR = (1 + ${fmt(k * 100, 2)}% ÷ ${m})^${m} − 1 = ${fmt(ear, 2)}%. Convert before comparing: FDs quote quarterly compounding, bonds semi-annual.`, diagnose: (v) => near(v.a, k * 100, 0.01) ? 'rate_units' : null };
    },
  },
  npv: {
    topic: 'CORE-14', title: 'NPV of a project',
    gen: (r) => {
      const cap = pick(r, [100, 120, 150]), k = pick(r, [0.1, 0.12]);
      const cfs = [int(r, 20, 40, 5), int(r, 25, 45, 5), int(r, 30, 50, 5), int(r, 30, 60, 5), int(r, 30, 60, 5)];
      const npv = -cap + cfs.reduce((s, c, i) => s + c / (1 + k) ** (i + 1), 0);
      const pb = (() => { let c = -cap; for (let i = 0; i < cfs.length; i++) { if (c + cfs[i] >= 0) return i + (-c) / cfs[i]; c += cfs[i]; } return NaN; })();
      return {
        q: `A project costs Rs. ${cap} crore today and returns ${cfs.join(', ')} over years 1 to 5. The cost of capital is ${fmt(k * 100, 2)}%. What is the NPV, and the simple payback in years?`,
        fields: [
          { key: 'npv', label: 'NPV (Rs. crore)', answer: round(npv, 1), tol: 0.3 },
          ...(isNaN(pb) ? [] : [{ key: 'pb', label: 'Payback (years)', answer: round(pb, 2), tol: 0.05 }]),
        ],
        why: `NPV = −${cap} + ${cfs.map((c, i) => `${c} ÷ ${fmt(1 + k, 4)}^${i + 1}`).join(' + ')} = ${fmt(npv)}. Accept if NPV > 0. Payback ignores time value and cash after payback.`,
        diagnose: (v) => near(v.npv, -cap + cfs.reduce((s, c) => s + c, 0), 1) ? 'discounting' : null,
      };
    },
  },
  wacc: {
    topic: 'CORE-15', title: 'Build a WACC',
    gen: (r) => {
      const rf = pick(r, [7.0, 7.1, 7.2]), beta = pick(r, [0.7, 0.8, 0.9, 1.1, 1.2]), erp = pick(r, [6.5, 7.0, 7.5]), kd = pick(r, [8.0, 8.5, 9.0, 9.5]), t = 0.25, wd = pick(r, [0.1, 0.2, 0.3]);
      const ke = rf + beta * erp, w = (1 - wd) * ke + wd * kd * (1 - t);
      return {
        q: `Rf ${rf}%, beta ${beta}, ERP ${erp}%. Pre-tax cost of new debt ${kd}%, tax 25%. Target weights: ${(1 - wd) * 100}% equity, ${fmt(wd * 100, 2)}% debt. Compute Ke and WACC (%, 2 decimals).`,
        fields: [
          { key: 'ke', label: 'Cost of equity %', answer: round(ke, 2), tol: 0.02 },
          { key: 'w', label: 'WACC %', answer: round(w, 2), tol: 0.02 },
        ],
        why: `Ke = ${rf}% + ${beta} × ${erp}% = ${fmt(ke, 2)}%. After-tax Kd = ${kd}% × 0.75 = ${fmt(kd * 0.75, 3)}%. WACC = ${(1 - wd)} × ${fmt(ke, 2)}% + ${wd} × ${fmt(kd * 0.75, 3)}% = ${fmt(w, 2)}%.`,
        diagnose: (v) => near(v.w, (1 - wd) * ke + wd * kd * 0.75 * 0.75, 0.02) ? 'taxed_twice' : near(v.w, (1 - wd) * ke + wd * kd, 0.02) ? 'forgot_tax' : null,
      };
    },
  },
  relever: {
    topic: 'CORE-15', title: 'Unlever and relever beta',
    gen: (r) => {
      const bl = pick(r, [0.9, 1.0, 1.1, 1.2, 1.3]), de1 = pick(r, [0.2, 0.3, 0.5]), de2 = pick(r, [0.1, 0.25, 0.4, 0.6]), t = 0.25;
      const bu = bl / (1 + (1 - t) * de1), b2 = bu * (1 + (1 - t) * de2);
      return {
        q: `A peer has a levered beta of ${bl} at D/E ${de1}. Tax 25%. Unlever it, then relever at your company's target D/E of ${de2} (3 decimals).`,
        fields: [
          { key: 'bu', label: 'Unlevered beta', answer: round(bu, 3), tol: 0.005 },
          { key: 'bl', label: 'Relevered beta', answer: round(b2, 3), tol: 0.005 },
        ],
        why: `βu = βL ÷ [1 + (1 − t) × D/E] = ${bl} ÷ ${fmt(1 + 0.75 * de1, 3)} = ${fmt(bu, 3)}. βL = βu × [1 + (1 − t) × D/E] = ${fmt(bu, 3)} × ${fmt(1 + 0.75 * de2, 3)} = ${fmt(b2, 3)}.`,
        diagnose: (v) => near(v.bu, bl / (1 + de1), 0.005) ? 'forgot_tax' : null,
      };
    },
  },
  breakeven: {
    topic: 'CORE-16', title: 'Break-even and operating leverage',
    gen: (r) => {
      // redraw until the company is comfortably above break-even, so DOL is finite and positive
      let fixed = 0, cm = 0, revv = 0;
      do { fixed = pick(r, [200, 300, 400]); cm = pick(r, [0.3, 0.4, 0.5]); revv = pick(r, [1000, 1200, 1500]); } while (revv * cm - fixed < revv * cm * 0.2);
      const be = fixed / cm, contrib = revv * cm, ebit = contrib - fixed, dol = contrib / ebit;
      return {
        q: `Fixed costs Rs. ${fixed} crore, contribution margin ${fmt(cm * 100, 2)}%. What revenue breaks even? At revenue of Rs. ${revv} crore, what is the degree of operating leverage?`,
        fields: [
          { key: 'be', label: 'Break-even revenue (Rs. crore)', answer: round(be, 0), tol: 1 },
          { key: 'dol', label: 'DOL at that revenue (x)', answer: round(dol, 2), tol: 0.02 },
        ],
        why: `Break-even = fixed ÷ CM = ${fixed} ÷ ${cm} = ${fmt(be, 0)}. At ${revv}: contribution ${fmt(contrib, 0)}, EBIT ${fmt(ebit, 0)}, DOL = contribution ÷ EBIT = ${fmt(dol, 2)}. A 10% fall in revenue cuts EBIT by about ${fmt(dol * 10, 0)}%.`,
      };
    },
  },
  ev_bridge: {
    topic: 'CORE-17', title: 'Equity value to enterprise value',
    gen: (r) => {
      const m = int(r, 5000, 15000, 500), d = int(r, 500, 3000, 100), l = pick(r, [0, 200, 400]), p = pick(r, [0, 100, 200]), n = pick(r, [0, 150, 300]), c = int(r, 300, 1500, 100), a = pick(r, [0, 200, 600]);
      const ev = m + d + l + p + n - c - a;
      return {
        q: `Diluted market cap Rs. ${fmt(m, 0)} crore; debt ${fmt(d, 0)}; lease liabilities ${l}; preference capital ${p}; non-controlling interest ${n}; cash and liquid investments ${fmt(c, 0)}; associates and JVs ${a}. What is enterprise value?`,
        fields: [{ key: 'ev', label: 'Enterprise value (Rs. crore)', answer: ev }],
        why: `EV = equity value + debt + leases + preference + NCI − cash − associates = ${m} + ${d} + ${l} + ${p} + ${n} − ${c} − ${a} = ${fmt(ev, 0)}. Add every non-common claim; subtract what a buyer gets back or whose earnings are not in EBITDA.`,
        diagnose: (v) => near(v.ev, m + d + l + p + n + c - a) ? 'cash_sign' : near(v.ev, m + d + l + p - n - c - a) ? 'nci_sign' : null,
      };
    },
  },
  tsm: {
    topic: 'CORE-17', title: 'Treasury stock method',
    gen: (r) => {
      const basic = pick(r, [10, 20, 50]), price = pick(r, [100, 150, 200]), opts = pick(r, [1, 2, 3]), k = pick(r, [40, 60, 80, 120]);
      const dil = k < price ? basic + opts - opts * k / price : basic;
      return {
        q: `${basic} crore basic shares trade at Rs. ${price}. There are ${opts} crore options with a strike of Rs. ${k}. What is the diluted share count (crore, 2 decimals)?`,
        fields: [{ key: 'd', label: 'Diluted shares (crore)', answer: round(dil, 2), tol: 0.01 }],
        why: k < price ? `Options are in the money. Exercise raises ${opts} × ${k} = Rs. ${opts * k} crore, which buys back ${fmt(opts * k / price, 3)} crore shares at ${price}. Diluted = ${basic} + ${opts} − ${fmt(opts * k / price, 3)} = ${fmt(dil, 2)}.` : `The strike exceeds the price, so the options are out of the money and add nothing. Diluted = ${basic}.`,
        diagnose: (v) => near(v.d, basic, 0.01) && k < price ? 'dilution_ignored' : near(v.d, basic + opts, 0.01) && k < price ? 'concept' : null,
      };
    },
  },
  comps: {
    topic: 'CORE-18', title: 'Value on trading comps',
    gen: (r) => {
      const peers = [pick(r, [15, 16, 17]), pick(r, [18, 19, 19.5]), pick(r, [20, 21, 22]), pick(r, [23, 24]), pick(r, [27, 28, 45])].sort((a, b) => a - b);
      const med = peers[2], mean = peers.reduce((s, x) => s + x, 0) / 5;
      const e = int(r, 300, 700, 10), nd = int(r, 100, 500, 50), sh = pick(r, [20, 40, 50]);
      const ev = e * med, ps = (ev - nd) / sh;
      return {
        q: `Five peers trade at ${peers.map(p => p + 'x').join(', ')} FY27E EV/EBITDA. Your company's FY27E EBITDA is Rs. ${e} crore, net debt ${nd} crore, ${sh} crore shares. Value it at the peer median.`,
        fields: [
          { key: 'm', label: 'Median multiple (x)', answer: med, tol: 0.01 },
          { key: 'ev', label: 'Enterprise value (Rs. crore)', answer: round(ev, 0), tol: 2 },
          { key: 'ps', label: 'Value per share (Rs.)', answer: round(ps, 1), tol: 0.3 },
        ],
        why: `Median = ${med}x (the mean, ${fmt(mean, 2)}x, is pulled by the outlier). EV = ${e} × ${med} = ${fmt(ev, 0)}. Equity = ${fmt(ev, 0)} − ${nd} = ${fmt(ev - nd, 0)}; per share = ${fmt(ps)}. Use the same period (FY27E) for every peer.`,
        diagnose: (v) => near(v.m, mean, 0.05) ? 'mean_not_median' : near(v.ps, ev / sh, 0.3) ? 'cash_sign' : null,
      };
    },
  },
  gordon: {
    topic: 'CORE-19', title: 'Terminal value with reinvestment',
    gen: (r) => {
      const nopat = int(r, 300, 800, 10), g = pick(r, [0.05, 0.06, 0.07]), ronic = pick(r, [0.2, 0.25, 0.3]), w = pick(r, [0.11, 0.12, 0.13]);
      const reinv = g / ronic, f1 = nopat * (1 + g) * (1 - reinv), tv = f1 / (w - g);
      return {
        q: `Final-year NOPAT is Rs. ${nopat} crore. Long-term growth ${fmt(g * 100, 2)}%, return on new capital ${fmt(ronic * 100, 2)}%, WACC ${fmt(w * 100, 2)}%. Compute the reinvestment rate, FCFF in year n+1 and the terminal value.`,
        fields: [
          { key: 'ri', label: 'Reinvestment rate %', answer: round(reinv * 100, 1), tol: 0.2 },
          { key: 'f', label: 'FCFF n+1 (Rs. crore)', answer: round(f1, 0), tol: 2 },
          { key: 'tv', label: 'Terminal value (Rs. crore)', answer: round(tv, 0), tol: Math.max(10, tv * 0.005) },
        ],
        why: `Reinvestment = g ÷ RONIC = ${fmt(g * 100, 2)}% ÷ ${fmt(ronic * 100, 2)}% = ${fmt(reinv * 100)}%. FCFF n+1 = ${nopat} × ${fmt(1 + g, 4)} × (1 − ${fmt(reinv, 3)}) = ${fmt(f1, 0)}. TV = ${fmt(f1, 0)} ÷ (${fmt(w * 100, 2)}% − ${fmt(g * 100, 2)}%) = ${fmt(tv, 0)}.`,
        diagnose: (v) => near(v.tv, nopat * (1 + g) / (w - g), 20) ? 'reinvestment_ignored' : null,
      };
    },
  },
  premium: {
    topic: 'CORE-20', title: 'Control premium',
    gen: (r) => {
      const und = pick(r, [200, 250, 400, 500]), off = und * pick(r, [1.2, 1.25, 1.3, 1.35, 1.4]);
      return {
        q: `A target's undisturbed share price was Rs. ${und}. The acquirer offers Rs. ${fmt(off, 0)}. What is the premium (%)?`,
        fields: [{ key: 'p', label: 'Premium %', answer: round((off / und - 1) * 100, 1), tol: 0.2 }],
        why: `Premium = offer ÷ undisturbed price − 1 = ${fmt(off, 0)} ÷ ${und} − 1 = ${fmt((off / und - 1) * 100)}%. Premiums of 20 to 40% are common globally; buyers who pay away all synergies transfer the value to the seller.`,
        diagnose: (v) => near(v.p, (1 - und / off) * 100, 0.3) ? 'premium_base' : null,
      };
    },
  },
  terp: {
    topic: 'CORE-23', title: 'Rights issue arithmetic',
    gen: (r) => {
      const n = pick(r, [3, 4, 5]), p = pick(r, [100, 150, 200]), s = p * pick(r, [0.7, 0.75, 0.8]);
      const terp = (n * p + s) / (n + 1);
      return {
        q: `A stock trades at Rs. ${p}. The company announces a 1-for-${n} rights issue at Rs. ${fmt(s, 0)}. Compute TERP and the value of each right.`,
        fields: [
          { key: 't', label: 'TERP (Rs.)', answer: round(terp, 2), tol: 0.02 },
          { key: 'v', label: 'Value of a right (Rs.)', answer: round(terp - s, 2), tol: 0.02 },
        ],
        why: `TERP = (${n} × ${p} + 1 × ${fmt(s, 0)}) ÷ ${n + 1} = ${fmt(terp, 2)}. Right = TERP − subscription price = ${fmt(terp - s, 2)}. The discount is not a gift: holders capture it by subscribing or selling the right.`,
      };
    },
  },
  bond: {
    topic: 'CORE-24', title: 'Bond price and duration',
    gen: (r) => {
      const c = pick(r, [6, 7, 8]), y = pick(r, [6.5, 7.2, 7.5, 8.5]) / 100, n = pick(r, [5, 10]);
      const price = (yy: number) => { let s = 0; for (let k = 1; k <= n; k++) s += c / (1 + yy) ** k; return s + 100 / (1 + yy) ** n; };
      const P = price(y); let mac = 0; for (let k = 1; k <= n; k++) mac += k * c / (1 + y) ** k; mac = (mac + n * 100 / (1 + y) ** n) / P;
      const md = mac / (1 + y);
      return {
        q: `A ${n}-year, ${c}% annual-coupon bond (face 100). The market yield is ${fmt(y * 100, 1)}%. Compute its price and modified duration.`,
        fields: [
          { key: 'p', label: 'Price (per 100)', answer: round(P, 2), tol: 0.03 },
          { key: 'md', label: 'Modified duration', answer: round(md, 2), tol: 0.03 },
        ],
        why: `Price = Σ ${c} ÷ (1 + ${fmt(y, 3)})^k + 100 ÷ (1 + ${fmt(y, 3)})^${n} = ${fmt(P, 2)} (${P < 100 ? 'below par: coupon below yield' : 'above par: coupon above yield'}). Macaulay ${fmt(mac, 2)} years; modified = ${fmt(mac, 2)} ÷ ${fmt(1 + y, 3)} = ${fmt(md, 2)}. A 0.5% rise in yield cuts the price by about ${fmt(md * 0.5, 2)}%.`,
      };
    },
  },
  buyback_eps: {
    topic: 'CORE-25', title: 'Buyback and EPS',
    gen: (r) => {
      const ni = int(r, 200, 500, 10), sh = pick(r, [50, 100]), price = pick(r, [150, 200, 300]), spend = pick(r, [300, 500, 800]), yld = pick(r, [0.06, 0.07]), t = 0.25;
      const bought = spend / price, lost = spend * yld * (1 - t), eps0 = ni / sh, eps1 = (ni - lost) / (sh - bought);
      return {
        q: `Net income Rs. ${ni} crore, ${sh} crore shares at Rs. ${price}. The company spends Rs. ${spend} crore of cash earning ${fmt(yld * 100, 2)}% pre-tax on a buyback (tax 25%). What is EPS after the buyback, and the change?`,
        fields: [
          { key: 'e', label: 'New EPS (Rs.)', answer: round(eps1, 2), tol: 0.02 },
          { key: 'c', label: 'Change in EPS %', answer: round((eps1 / eps0 - 1) * 100, 1), tol: 0.2 },
        ],
        why: `Shares bought = ${spend} ÷ ${price} = ${fmt(bought, 2)} crore. Lost after-tax interest = ${spend} × ${fmt(yld * 100, 2)}% × 0.75 = ${fmt(lost, 2)}. EPS = (${ni} − ${fmt(lost, 2)}) ÷ (${sh} − ${fmt(bought, 2)}) = ${fmt(eps1, 2)} versus ${fmt(eps0, 2)}. EPS rises when the earnings yield on the shares exceeds the after-tax yield on cash; value rises only if the price is below intrinsic value.`,
        diagnose: (v) => near(v.e, ni / (sh - bought), 0.02) ? 'forgot_tax' : null,
      };
    },
  },
  fx_forward: {
    topic: 'CORE-26', title: 'Forward rupee price',
    gen: (r) => {
      const s = pick(r, [95, 96, 96.5]), rd = pick(r, [6.0, 6.5, 7.0]), rf = pick(r, [4.0, 4.5, 5.0]), m = pick(r, [3, 6, 12]);
      const f = s * (1 + rd / 100 * m / 12) / (1 + rf / 100 * m / 12);
      return {
        q: `Spot USD/INR ${s}. Rupee rate ${rd}%, dollar rate ${rf}% (annual). What is the ${m}-month forward (2 decimals)?`,
        fields: [{ key: 'f', label: 'Forward rate', answer: round(f, 2), tol: 0.02 }],
        why: `F = S × (1 + r_d × T) ÷ (1 + r_f × T) = ${s} × ${fmt(1 + rd / 100 * m / 12, 4)} ÷ ${fmt(1 + rf / 100 * m / 12, 4)} = ${fmt(f, 2)}. The forward premium reflects the rate differential; it is not a forecast.`,
        diagnose: (v) => near(v.f, s * (1 + rd / 100) / (1 + rf / 100), 0.02) && m !== 12 ? 'rate_units' : null,
      };
    },
  },
  fees: {
    topic: 'IB-18', title: 'How the bank earns',
    gen: (r) => {
      const deal = pick(r, [1000, 2500, 5000]), fee = pick(r, [0.5, 1, 1.5, 2]), ipo = pick(r, [1500, 3000, 6000]), gs = pick(r, [1, 1.5, 2]), banks = pick(r, [3, 4, 5]);
      return {
        q: `An M&A success fee of ${fee}% on a Rs. ${fmt(deal, 0)} crore deal, and an IPO of Rs. ${fmt(ipo, 0)} crore with a ${gs}% gross spread split equally among ${banks} BRLMs. What does the bank earn on each?`,
        fields: [
          { key: 'm', label: 'M&A fee (Rs. crore)', answer: round(deal * fee / 100, 2), tol: 0.05 },
          { key: 'i', label: 'IPO fee per BRLM (Rs. crore)', answer: round(ipo * gs / 100 / banks, 2), tol: 0.05 },
        ],
        why: `M&A: ${deal} × ${fee}% = ${fmt(deal * fee / 100, 2)}, paid only at closing. IPO: ${ipo} × ${gs}% = ${fmt(ipo * gs / 100, 2)}, split ${banks} ways = ${fmt(ipo * gs / 100 / banks, 2)} each. Indian ECM fee rates are low, so banks compete on volume and distribution.`,
      };
    },
  },
  accretion: {
    topic: 'IB-04', title: 'Accretion or dilution',
    gen: (r) => {
      const ni = int(r, 150, 400, 10), sh = pick(r, [40, 50, 60]), pe = pick(r, [15, 18, 20, 25]), tni = int(r, 20, 60, 5), tpe = pick(r, [10, 12.5, 15, 20, 25]), stock = pick(r, [0, 0.5, 1]), kd = pick(r, [0.08, 0.09, 0.1]), t = 0.25;
      const price = ni / sh * pe, pay = tni * tpe, newsh = pay * stock / price, intr = pay * (1 - stock) * kd * (1 - t);
      const eps0 = ni / sh, eps1 = (ni + tni - intr) / (sh + newsh), acc = (eps1 / eps0 - 1) * 100;
      return {
        q: `Acquirer: net income Rs. ${ni} crore, ${sh} crore shares, trades at ${pe}x P/E. It buys a target earning Rs. ${tni} crore at ${tpe}x, paying ${fmt(stock * 100, 2)}% in stock and the rest with new debt at ${fmt(kd * 100, 2)}% (tax 25%). No synergies. Compute pro forma EPS and accretion (+) or dilution (−) in %.`,
        fields: [
          { key: 'eps', label: 'Pro forma EPS (Rs.)', answer: round(eps1, 2), tol: 0.02 },
          { key: 'a', label: 'Accretion / dilution %', answer: round(acc, 1), tol: 0.2 },
        ],
        why: `Share price = ${fmt(eps0, 2)} × ${pe} = ${fmt(price, 2)}. Price paid = ${tni} × ${tpe} = ${fmt(pay, 0)}. New shares = ${fmt(pay * stock, 0)} ÷ ${fmt(price, 2)} = ${fmt(newsh, 2)}. After-tax interest = ${fmt(pay * (1 - stock), 0)} × ${fmt(kd * 100, 2)}% × 0.75 = ${fmt(intr, 2)}. EPS = (${ni} + ${tni} − ${fmt(intr, 2)}) ÷ ${fmt(sh + newsh, 2)} = ${fmt(eps1, 2)} versus ${fmt(eps0, 2)}: ${acc >= 0 ? 'accretive' : 'dilutive'} by ${fmt(Math.abs(acc))}%.`,
        diagnose: (v) => v.a !== undefined && Math.sign(v.a) !== Math.sign(acc) && Math.abs(acc) > 0.3 ? 'accretion_sign' : near(v.eps, (ni + tni - pay * (1 - stock) * kd) / (sh + newsh), 0.02) ? 'forgot_tax' : null,
      };
    },
  },
  ppa: {
    topic: 'IB-04', title: 'Purchase price allocation',
    gen: (r) => {
      const price = pick(r, [300, 450, 600]), book = pick(r, [100, 150, 200]), intang = pick(r, [60, 90, 120]), ppe = pick(r, [20, 30, 40]), t = 0.25;
      const dtl = (intang + ppe) * t, fv = book + intang + ppe - dtl, gw = price - fv;
      return {
        q: `Price Rs. ${price} crore. Target book net assets Rs. ${book} crore. Fair value step-ups: intangibles ${intang}, PP&E ${ppe}. Tax 25%. Compute the deferred tax liability on step-ups and goodwill.`,
        fields: [
          { key: 'd', label: 'Deferred tax liability (Rs. crore)', answer: round(dtl, 1), tol: 0.1 },
          { key: 'g', label: 'Goodwill (Rs. crore)', answer: round(gw, 1), tol: 0.2 },
        ],
        why: `DTL = (${intang} + ${ppe}) × 25% = ${fmt(dtl)}. Fair value of net assets = ${book} + ${intang + ppe} − ${fmt(dtl)} = ${fmt(fv)}. Goodwill = ${price} − ${fmt(fv)} = ${fmt(gw)}, tested annually for impairment. Finite-life intangibles are amortised, which reduces future EPS.`,
        diagnose: (v) => near(v.g, price - book - intang - ppe, 0.5) ? 'forgot_tax' : null,
      };
    },
  },
  ipo_own: {
    topic: 'IB-08', title: 'Who owns what after the IPO',
    gen: (r) => {
      const pre = pick(r, [10, 20]), prom = pick(r, [0.6, 0.7, 0.75]), price = pick(r, [250, 500, 800]), fresh = pick(r, [500, 1000, 1500]), ofs = pick(r, [0.5, 1, 1.5]);
      const newsh = fresh / price, post = pre + newsh, fund = pre * (1 - prom) - ofs;
      return {
        q: `Pre-IPO: ${pre} crore shares, promoter ${fmt(prom * 100, 2)}%, a PE fund the rest. IPO at Rs. ${price}: fresh issue of Rs. ${fresh} crore plus an OFS of ${ofs} crore shares by the fund. Compute post-issue shares and the promoter and fund stakes (%).`,
        fields: [
          { key: 's', label: 'Post-issue shares (crore)', answer: round(post, 2), tol: 0.01 },
          { key: 'p', label: 'Promoter stake %', answer: round(pre * prom / post * 100, 1), tol: 0.1 },
          { key: 'f', label: 'PE fund stake %', answer: round(fund / post * 100, 1), tol: 0.1 },
        ],
        why: `New shares = ${fresh} ÷ ${price} = ${fmt(newsh, 2)} crore; post = ${fmt(post, 2)}. The OFS moves existing shares, so it does not change the count. Promoter ${fmt(pre * prom, 2)} ÷ ${fmt(post, 2)} = ${fmt(pre * prom / post * 100)}%; fund (${fmt(pre * (1 - prom), 2)} − ${ofs}) ÷ ${fmt(post, 2)} = ${fmt(fund / post * 100)}%. The company receives only the fresh issue.`,
        diagnose: (v) => near(v.s, pre + newsh + ofs, 0.01) ? 'fresh_vs_ofs' : null,
      };
    },
  },
  ipo_alloc: {
    topic: 'IB-07', title: 'Main-board IPO allocation',
    gen: (r) => {
      const size = pick(r, [1000, 2000, 3000, 5000]);
      const qib = size * 0.5, anchor = qib * 0.6, nii = size * 0.15, retail = size * 0.35;
      return {
        q: `A Regulation 6(1) main-board IPO of Rs. ${fmt(size, 0)} crore uses the maximum QIB portion. Compute the QIB portion, the maximum anchor book, and the minimum NII and retail portions.`,
        fields: [
          { key: 'q', label: 'QIB portion (Rs. crore)', answer: qib },
          { key: 'a', label: 'Maximum anchor book', answer: anchor },
          { key: 'n', label: 'NII (minimum)', answer: nii },
          { key: 'r', label: 'Retail (minimum)', answer: retail },
        ],
        why: `QIB up to 50% = ${fmt(qib, 0)}; up to 60% of it to anchors = ${fmt(anchor, 0)}; NII at least 15% = ${fmt(nii, 0)}; retail at least 35% = ${fmt(retail, 0)}. From 30 Nov 2025, 40% of the anchor portion is reserved for domestic MFs (33%) and insurers and pension funds (7%).`,
      };
    },
  },
  headroom: {
    topic: 'IB-11', title: 'Covenant headroom',
    gen: (r) => {
      const nd = pick(r, [400, 600, 900]), e = pick(r, [180, 250, 350]), cov = pick(r, [3, 3.5, 4]);
      const lev = nd / e, emin = nd / cov;
      return {
        q: `Net debt Rs. ${nd} crore, EBITDA Rs. ${e} crore. The loan requires net debt/EBITDA of at most ${cov}x. What is current leverage, and how far can EBITDA fall before a breach (%)?`,
        fields: [
          { key: 'l', label: 'Leverage (x)', answer: round(lev, 2), tol: 0.02 },
          { key: 'h', label: 'EBITDA headroom %', answer: round((1 - emin / e) * 100, 1), tol: 0.3 },
        ],
        why: `Leverage = ${nd} ÷ ${e} = ${fmt(lev, 2)}x. Breach EBITDA = ${nd} ÷ ${cov} = ${fmt(emin)}; headroom = 1 − ${fmt(emin)} ÷ ${e} = ${fmt((1 - emin / e) * 100)}%. Lenders focus on the downside: cash flow coverage, security and covenants.`,
      };
    },
  },
  // ---------- Corporate finance
  pvm: {
    topic: 'CF-03', title: 'Price, volume and mix variance',
    gen: (r) => {
      const bA = int(r, 50, 70, 5), bB = 100 - bA, pA = pick(r, [100, 120]), pB = pick(r, [50, 60, 70]);
      const aA = bA + int(r, -12, 6, 2), aB = bB + int(r, -4, 16, 2), qA = pA + int(r, -4, 6, 2), qB = pB + int(r, -4, 4, 2);
      const bTot = bA + bB, aTot = aA + aB, bRev = bA * pA + bB * pB, avg = bRev / bTot;
      const vol = (aTot - bTot) * avg / 100;
      const mix = ((aA - aTot * bA / bTot) * pA + (aB - aTot * bB / bTot) * pB) / 100;
      const price = ((qA - pA) * aA + (qB - pB) * aB) / 100;
      const wrongPrice = ((qA - pA) * bA + (qB - pB) * bB) / 100;
      return {
        q: `Budget: premium pack ${bA} lakh units at Rs. ${pA}, value pack ${bB} lakh at Rs. ${pB}. Actual: premium ${aA} lakh at Rs. ${qA}, value ${aB} lakh at Rs. ${qB}. Split the revenue variance into volume, mix and price (Rs. crore; negative is adverse).`,
        fields: [
          { key: 'v', label: 'Volume variance', answer: round(vol, 2), unit: 'Rs. crore', tol: 0.05 },
          { key: 'm', label: 'Mix variance', answer: round(mix, 2), unit: 'Rs. crore', tol: 0.05 },
          { key: 'p', label: 'Price variance', answer: round(price, 2), unit: 'Rs. crore', tol: 0.05 },
        ],
        why: `Budget revenue ${fmt(bRev / 100, 2)} crore, average price Rs. ${fmt(avg, 2)}. Volume = (${aTot} − ${bTot}) lakh × ${fmt(avg, 2)} = ${fmt(vol, 2)}. Mix = Σ (actual units − actual total × budget mix) × budget price = ${fmt(mix, 2)}. Price = Σ (actual − budget price) × actual units = ${fmt(price, 2)}. Together they explain the whole gap of ${fmt((aA * qA + aB * qB - bRev) / 100, 2)} crore.`,
        diagnose: (v) => near(v.p, wrongPrice, 0.05) ? 'mix_price' : null,
      };
    },
  },
  price_break: {
    topic: 'CF-07', title: 'Break-even volume after a price change',
    gen: (r) => {
      const cm = pick(r, [30, 35, 40, 45, 50]), ch = pick(r, [3, 5, 8, 10]), up = r() < 0.5;
      const ans = up ? ch / (cm + ch) * 100 : ch / (cm - ch) * 100;
      return {
        q: up ? `A product earns a ${cm}% contribution margin. If you raise its price by ${ch}%, how much volume (%) can you lose before total contribution falls?`
          : `A product earns a ${cm}% contribution margin. If you cut its price by ${ch}%, how much extra volume (%) do you need just to keep total contribution flat?`,
        fields: [{ key: 'x', label: up ? 'Maximum volume loss' : 'Extra volume needed', answer: round(ans, 1), unit: '%', tol: 0.2 }],
        why: up ? `Break-even loss = price change ÷ (margin + change) = ${ch} ÷ ${cm + ch} = ${fmt(ans)}%. Fixed costs do not move with the price decision, so compare contribution.`
          : `Needed gain = price cut ÷ (margin − cut) = ${ch} ÷ ${cm - ch} = ${fmt(ans)}%. Price cuts need far more volume than people expect.`,
        diagnose: (v) => near(v.x, ch / cm * 100, 0.2) ? 'concept' : null,
      };
    },
  },
  capex: {
    topic: 'CF-08', title: 'Capex case: NPV and payback',
    gen: (r) => {
      const cost = pick(r, [80, 100, 120, 150]), c1 = int(r, 18, 30), c2 = c1 + int(r, 4, 8), c3 = c2 + int(r, 4, 8), c4 = c3 + int(r, 0, 4), k = pick(r, [0.1, 0.12, 0.14]);
      const cf = [c1, c2, c3, c4, c4, c4, c4];
      let npv = -cost; cf.forEach((c, i) => { npv += c / (1 + k) ** (i + 1); });
      let cum = 0, pb = 0; for (let i = 0; i < cf.length; i++) { if (cum + cf[i] >= cost) { pb = i + (cost - cum) / cf[i]; break; } cum += cf[i]; }
      const undisc = cf.reduce((a, b) => a + b, 0) - cost;
      return {
        q: `A Rs. ${cost} crore production line generates cash flows of ${c1}, ${c2} and ${c3} in years 1 to 3, then ${c4} a year in years 4 to 7. The hurdle rate is ${fmt(k * 100, 2)}%. Compute the NPV and the simple payback.`,
        fields: [
          { key: 'n', label: 'NPV', answer: round(npv, 1), unit: 'Rs. crore', tol: 0.5 },
          { key: 'p', label: 'Payback', answer: round(pb, 2), unit: 'years', tol: 0.05 },
        ],
        why: `NPV = −${cost} + Σ CFt ÷ ${fmt(1 + k, 2)}^t = ${fmt(npv)}. Payback: cumulative cash reaches ${cost} during year ${Math.floor(pb) + 1}, at ${fmt(pb, 2)} years. Then test the key driver (usually volume) and add a trigger for a phased build.`,
        diagnose: (v) => near(v.n, undisc, 1) ? 'discounting' : null,
      };
    },
  },
  dist_credit: {
    topic: 'CF-10', title: 'Should we extend distributor credit?',
    gen: (r) => {
      const S = pick(r, [80, 120, 150, 200]), cm = pick(r, [0.2, 0.25, 0.3]), d1 = pick(r, [30, 45]), d2 = pick(r, [60, 75, 90]), g = pick(r, [0.05, 0.08, 0.1, 0.15]), k = pick(r, [0.09, 0.1, 0.12]);
      const rec1 = S * d1 / 365, rec2 = S * (1 + g) * d2 / 365, extra = rec2 - rec1, carry = extra * k, contrib = S * g * cm;
      return {
        q: `A distributor buys Rs. ${S} crore a year from you at a ${fmt(cm * 100, 2)}% contribution margin. It wants credit extended from ${d1} to ${d2} days and promises ${fmt(g * 100, 2)}% more volume. Your cost of funds is ${fmt(k * 100, 2)}%. Compute the extra receivables, their annual carrying cost, and the extra contribution.`,
        fields: [
          { key: 'x', label: 'Extra receivables', answer: round(extra, 1), unit: 'Rs. crore', tol: 0.15 },
          { key: 'c', label: 'Annual carrying cost', answer: round(carry, 2), unit: 'Rs. crore', tol: 0.05 },
          { key: 'b', label: 'Extra contribution', answer: round(contrib, 2), unit: 'Rs. crore', tol: 0.05 },
        ],
        why: `Receivables go from ${S} × ${d1} ÷ 365 = ${fmt(rec1)} to ${fmt(S * (1 + g))} × ${d2} ÷ 365 = ${fmt(rec2)}, up ${fmt(extra)}. At ${fmt(k * 100, 2)}% that costs ${fmt(carry, 2)} a year, against ${fmt(contrib, 2)} of extra contribution if the volume is truly incremental. Recommend conditionally: link days to volume, add security, and consider precedent with other distributors.`,
        diagnose: (v) => near(v.x, S * (d2 - d1) / 365, 0.15) ? 'wc_sign' : null,
      };
    },
  },
  fwd_hedge: {
    topic: 'CF-11', title: 'Hedging an import payable',
    gen: (r) => {
      const usd = pick(r, [5, 10, 20]), m = pick(r, [3, 6]), S = pick(r, [94, 95, 96, 97]), ri = pick(r, [0.06, 0.065, 0.07]), ru = pick(r, [0.04, 0.045, 0.05]);
      const T = m / 12, F = S * (1 + ri * T) / (1 + ru * T), cost = usd * F / 10, bad = S * (1 + ru * T) / (1 + ri * T);
      return {
        q: `An importer owes US$${usd} million in ${m} months. Spot is Rs. ${S.toFixed(2)}; rupee and dollar interest rates are ${fmt(ri * 100)}% and ${fmt(ru * 100)}% a year. What is the forward rate, and what rupee cost does buying forward lock in?`,
        fields: [
          { key: 'f', label: 'Forward rate', answer: round(F, 2), unit: 'Rs. per US$', tol: 0.02 },
          { key: 'c', label: 'Locked rupee cost', answer: round(cost, 2), unit: 'Rs. crore', tol: 0.03 },
        ],
        why: `F = ${S} × (1 + ${ri} × ${fmt(T, 3)}) ÷ (1 + ${ru} × ${fmt(T, 3)}) = ${fmt(F, 2)}. US$${usd} million × ${fmt(F, 2)} = Rs. ${fmt(cost, 2)} crore. The premium reflects the interest differential, not a forecast; an option costs a premium but keeps the upside if the rupee strengthens.`,
        diagnose: (v) => near(v.f, bad, 0.02) ? 'rate_units' : null,
      };
    },
  },

  // ---------- Private equity
  waterfall: {
    topic: 'PE-01', title: 'Distribution waterfall with catch-up',
    gen: (r) => {
      let C = 0, mult = 0, n = 0, pref = 0;
      do { C = pick(r, [500, 1000, 2000]); mult = pick(r, [2, 2.2, 2.4, 2.6]); n = pick(r, [5, 6, 7]); pref = C * (1.08 ** n - 1); } while (C * mult - C - pref < pref / 4);
      const D = C * mult, profit = D - C, carry = 0.2 * profit, lp = D - carry, noCatch = 0.2 * (profit - pref);
      return {
        q: `A Rs. ${fmt(C, 0)} crore fund returns Rs. ${fmt(D, 0)} crore after ${n} years. European waterfall: 8% compounding hurdle, full GP catch-up, 20% carry. How much preferred return do LPs get, and how does the Rs. ${fmt(D, 0)} crore split?`,
        fields: [
          { key: 'p', label: 'Preferred return to LPs', answer: Math.round(pref), unit: 'Rs. crore', tol: 3 },
          { key: 'g', label: 'GP carry in total', answer: Math.round(carry), unit: 'Rs. crore', tol: 3 },
          { key: 'l', label: 'LPs receive in total', answer: Math.round(lp), unit: 'Rs. crore', tol: 3 },
        ],
        why: `Return of capital ${fmt(C, 0)}; preferred return ${fmt(C, 0)} × (1.08^${n} − 1) = ${fmt(pref, 0)}; catch-up ${fmt(pref / 4, 0)} to the GP; the rest splits 80/20. With a full catch-up the GP ends with exactly 20% of the ${fmt(profit, 0)} profit: ${fmt(carry, 0)}. LPs get ${fmt(lp, 0)}.`,
        diagnose: (v) => near(v.g, noCatch, 3) ? 'hurdle_math' : null,
      };
    },
  },
  sources_uses: {
    topic: 'PE-05', title: 'Sources and uses',
    gen: (r) => {
      const E = pick(r, [60, 80, 100, 120, 150]), m = pick(r, [8, 9, 10, 11, 12]), fp = pick(r, [0.015, 0.02, 0.025]), dx = pick(r, [3, 3.5, 4, 4.5, 5]);
      const EV = E * m, fees = EV * fp, debt = E * dx, eq = EV + fees - debt;
      return {
        q: `A sponsor buys a business with EBITDA of Rs. ${E} crore at ${m}x. Fees are ${fmt(fp * 100)}% of EV. Lenders provide ${dx}x EBITDA of debt. Compute the purchase EV, the debt, the sponsor equity, and equity as a share of total sources.`,
        fields: [
          { key: 'ev', label: 'Purchase EV', answer: EV, unit: 'Rs. crore', tol: 1 },
          { key: 'd', label: 'Debt', answer: debt, unit: 'Rs. crore', tol: 1 },
          { key: 'e', label: 'Sponsor equity', answer: round(eq, 1), unit: 'Rs. crore', tol: 1 },
          { key: 's', label: 'Equity share of sources', answer: round(eq / (EV + fees) * 100, 1), unit: '%', tol: 0.3 },
        ],
        why: `Uses = EV ${EV} + fees ${fmt(fees)} = ${fmt(EV + fees)}. Sources: debt ${fmt(debt)} and the plug, sponsor equity = ${fmt(eq)} (${fmt(eq / (EV + fees) * 100)}%). Equity = EV + fees − debt.`,
        diagnose: (v) => near(v.e, EV - debt, 1) ? 'concept' : null,
      };
    },
  },
  lbo: {
    topic: 'PE-06', title: 'Paper LBO in five minutes',
    gen: (r) => {
      const E = pick(r, [80, 100, 120]), m = pick(r, [8, 9, 10]), fees = pick(r, [10, 15, 20]), dx = pick(r, [4, 4.5, 5]), g = pick(r, [0.08, 0.1, 0.12, 0.15]), xm = m - pick(r, [0, 0, 1]), paid = pick(r, [0.4, 0.5, 0.6]);
      const n = 5, EV = E * m, debt = E * dx, eq0 = EV + fees - debt, E5 = E * (1 + g) ** n, debt5 = debt * (1 - paid), eq5 = E5 * xm - debt5, moic = eq5 / eq0, irr = (moic ** (1 / n) - 1) * 100;
      return {
        q: `EBITDA Rs. ${E} crore, bought at ${m}x with Rs. ${fees} crore of fees and ${dx}x debt. EBITDA grows ${fmt(g * 100, 2)}% a year for 5 years; free cash flow repays ${fmt(paid * 100, 2)}% of the entry debt. Exit at ${xm}x. Compute exit equity, MOIC and IRR.`,
        fields: [
          { key: 'e', label: 'Exit equity', answer: Math.round(eq5), unit: 'Rs. crore', tol: 5 },
          { key: 'm', label: 'MOIC', answer: round(moic, 2), unit: 'x', tol: 0.03 },
          { key: 'i', label: 'IRR', answer: round(irr, 1), unit: '%', tol: 0.4 },
        ],
        why: `Entry equity = ${EV} + ${fees} − ${debt} = ${fmt(eq0)}. Exit EBITDA = ${E} × ${fmt(1 + g, 2)}^5 = ${fmt(E5)}; EV = ${fmt(E5 * xm, 0)}; debt left ${fmt(debt5)}; equity ${fmt(eq5, 0)}. MOIC ${fmt(moic, 2)}x; IRR = MOIC^(1/5) − 1 = ${fmt(irr)}%. Rules of thumb: 2x in 5 years ≈ 15%, 2.5x ≈ 20%, 3x ≈ 25%.`,
        diagnose: (v) => near(v.i, (moic - 1) / n * 100, 0.4) ? 'moic_irr' : near(v.e, E5 * xm - debt, 5) ? 'concept' : null,
      };
    },
  },

  // ---------- Venture capital
  return_fund: {
    topic: 'VC-01', title: 'What it takes to return the fund',
    gen: (r) => {
      const F = pick(r, [250, 500, 1000, 2000]), mult = pick(r, [3, 4]), own = pick(r, [0.08, 0.1, 0.12, 0.15]);
      return {
        q: `A Rs. ${fmt(F, 0)} crore fund targets ${mult}x gross and owns on average ${fmt(own * 100, 2)}% of its companies at exit. How much must the portfolio be worth at exit, and how big must one company's exit be to return the whole fund?`,
        fields: [
          { key: 'p', label: 'Portfolio value at exit', answer: Math.round(F * mult / own), unit: 'Rs. crore', tol: 5 },
          { key: 'o', label: 'Exit value to return the fund', answer: Math.round(F / own), unit: 'Rs. crore', tol: 5 },
        ],
        why: `${fmt(F, 0)} × ${mult} ÷ ${fmt(own * 100, 2)}% = ${fmt(F * mult / own, 0)} crore of exit value across the portfolio. One company returns the fund only at ${fmt(F, 0)} ÷ ${fmt(own * 100, 2)}% = ${fmt(F / own, 0)} crore. Every new investment must plausibly reach that size, which is why good but small businesses are bad venture investments.`,
        diagnose: (v) => near(v.p, F * mult, 5) ? 'concept' : null,
      };
    },
  },
  tam: {
    topic: 'VC-03', title: 'Bottom-up market sizing',
    gen: (r) => {
      const N = pick(r, [1.5, 2, 2.5, 4, 6]), P = pick(r, [24000, 36000, 60000, 120000]), sam = pick(r, [0.3, 0.4, 0.5]), som = pick(r, [0.05, 0.08, 0.1]), x = pick(r, [6, 8, 10]);
      const tam = N * P / 100, samV = tam * sam, somV = samV * som;
      return {
        q: `About ${N} lakh small businesses could use a tool priced at Rs. ${fmt(P, 0)} a year. ${fmt(sam * 100, 2)}% are reachable today, and you might win ${fmt(som * 100, 2)}% of those in five years. Size TAM, SAM and SOM (Rs. crore of annual revenue) and value the SOM at ${x}x revenue.`,
        fields: [
          { key: 't', label: 'TAM', answer: round(tam, 1), unit: 'Rs. crore', tol: 1 },
          { key: 's', label: 'SAM', answer: round(samV, 1), unit: 'Rs. crore', tol: 1 },
          { key: 'o', label: 'SOM', answer: round(somV, 1), unit: 'Rs. crore', tol: 0.5 },
          { key: 'v', label: 'Value at the multiple', answer: round(somV * x, 0), unit: 'Rs. crore', tol: 5 },
        ],
        why: `TAM = ${N} lakh × Rs. ${fmt(P, 0)} = Rs. ${fmt(tam)} crore; SAM ${fmt(samV)}; SOM ${fmt(somV)}; value ≈ ${fmt(somV * x, 0)} crore. Compare that with the outcome the fund needs: unless the company can expand into adjacencies, this is a good business but not venture scale.`,
      };
    },
  },
  runway: {
    topic: 'VC-07', title: 'Burn and runway',
    gen: (r) => {
      const C = pick(r, [12, 18, 24, 30, 45]), b = pick(r, [0.8, 1, 1.2, 1.5, 2]), up = pick(r, [0.2, 0.25, 0.5]);
      return {
        q: `A startup has Rs. ${C} crore in the bank and burns Rs. ${b} crore a month. What is its runway? If it hires ahead of the round and burn rises ${fmt(up * 100, 2)}% from next month, what is the runway then?`,
        fields: [
          { key: 'r', label: 'Runway today', answer: round(C / b, 1), unit: 'months', tol: 0.1 },
          { key: 'n', label: 'Runway at the higher burn', answer: round(C / (b * (1 + up)), 1), unit: 'months', tol: 0.1 },
        ],
        why: `Runway = cash ÷ net burn = ${C} ÷ ${b} = ${fmt(C / b)} months; at ${fmt(b * (1 + up), 2)} a month it is ${fmt(C / (b * (1 + up)))}. Founders should raise with 12 to 18 months left, having hit the milestones that justify a higher price.`,
      };
    },
  },
  round: {
    topic: 'VC-08', title: 'Pricing a round with an option pool',
    gen: (r) => {
      const P = pick(r, [16, 20, 40, 60, 80]), M = pick(r, [4, 5, 10, 15, 20]), p = pick(r, [0.08, 0.1, 0.12]);
      const post = P + M, inv = M / post, fnd = 1 - inv - p, eff = P - p * post;
      return {
        q: `Founders own 100% before a round. An investor puts in Rs. ${M} crore at a Rs. ${P} crore pre-money and asks for a ${fmt(p * 100, 2)}% post-money option pool created in the pre-money. What do the investor and the founders own after the round, and what is the effective pre-money for the founders?`,
        fields: [
          { key: 'i', label: 'Investor ownership', answer: round(inv * 100, 1), unit: '%', tol: 0.2 },
          { key: 'f', label: 'Founder ownership', answer: round(fnd * 100, 1), unit: '%', tol: 0.2 },
          { key: 'e', label: 'Effective pre-money', answer: round(eff, 2), unit: 'Rs. crore', tol: 0.1 },
        ],
        why: `Post-money = ${P} + ${M} = ${post}; investor = ${M} ÷ ${post} = ${fmt(inv * 100)}%. The pool comes out of the pre-money, so founders keep 100 − ${fmt(inv * 100)} − ${fmt(p * 100, 2)} = ${fmt(fnd * 100)}%. The pool is worth ${fmt(p * post, 2)} crore, so the effective pre-money is ${fmt(eff, 2)}, not ${P}.`,
        diagnose: (v) => near(v.f, (1 - inv) * (1 - p) * 100, 0.2) ? 'pool_shuffle' : null,
      };
    },
  },
  liq_pref: {
    topic: 'VC-09', title: 'Liquidation preference payout',
    gen: (r) => {
      const I = pick(r, [10, 20, 30]), o = pick(r, [0.15, 0.2, 0.25]), V = I * pick(r, [1.5, 2.5, 4, 6]), part = r() < 0.5;
      const nonp = Math.max(I, o * V), parti = I + o * (V - I), ans = part ? parti : nonp, other = part ? nonp : parti;
      return {
        q: `A Series A investor put in Rs. ${I} crore for ${fmt(o * 100, 2)}% with a 1x ${part ? 'participating' : 'non-participating'} preference. The company sells for Rs. ${fmt(V, 0)} crore. What does the investor receive, and what is left for everyone else?`,
        fields: [
          { key: 'i', label: 'Investor receives', answer: round(ans, 1), unit: 'Rs. crore', tol: 0.2 },
          { key: 'r', label: 'Left for others', answer: round(V - ans, 1), unit: 'Rs. crore', tol: 0.2 },
        ],
        why: part ? `Participating: money back first (${I}), then ${fmt(o * 100, 2)}% of the remaining ${fmt(V - I, 0)} = ${fmt(o * (V - I))}, total ${fmt(parti)}.`
          : `Non-participating: the greater of the preference (${I}) and ${fmt(o * 100, 2)}% of ${fmt(V, 0)} = ${fmt(o * V)}, so ${fmt(nonp)}. It converts once ${fmt(o * 100, 2)}% of the exit exceeds ${I}, above ${fmt(I / o, 0)} crore.`,
        diagnose: (v) => near(v.i, other, 0.2) ? 'pref_type' : null,
      };
    },
  },
  antidil: {
    topic: 'VC-09', title: 'Weighted-average anti-dilution',
    gen: (r) => {
      const A = pick(r, [10, 20, 40]), p0 = pick(r, [100, 150, 200]), amt = pick(r, [1, 2, 3]), p1 = p0 * pick(r, [0.5, 0.6, 0.75]);
      const B = amt * 1e7 / p0 / 1e5, Cc = amt * 1e7 / p1 / 1e5, np = p0 * (A + B) / (A + Cc);
      return {
        q: `${A} lakh shares are outstanding. The last round was at Rs. ${p0}. A Rs. ${amt} crore down round is priced at Rs. ${fmt(p1, 0)}. Under broad-based weighted-average anti-dilution, what is the old investors' new conversion price?`,
        fields: [{ key: 'p', label: 'New conversion price', answer: round(np, 1), unit: 'Rs.', tol: 0.2 }],
        why: `B = ${amt} crore ÷ ${p0} = ${fmt(B, 2)} lakh shares; C = ${amt} crore ÷ ${fmt(p1, 0)} = ${fmt(Cc, 2)} lakh. New price = ${p0} × (${A} + ${fmt(B, 2)}) ÷ (${A} + ${fmt(Cc, 2)}) = ${fmt(np)}. A full ratchet would drop it all the way to ${fmt(p1, 0)}.`,
        diagnose: (v) => near(v.p, p1, 0.2) ? 'concept' : null,
      };
    },
  },

  // ---------- Adjacent roles
  sharpe: {
    topic: 'ADJ-04', title: 'Sharpe, Treynor and alpha',
    gen: (r) => {
      const Rp = pick(r, [12, 14, 16, 18]), rf = pick(r, [6.5, 7]), sd = pick(r, [12, 15, 18, 20]), b = pick(r, [0.8, 0.9, 1.1, 1.2]), Rm = pick(r, [12, 13, 14]);
      const sh = (Rp - rf) / sd, tr = (Rp - rf) / b, al = Rp - (rf + b * (Rm - rf));
      return {
        q: `A fund returned ${Rp}% with ${sd}% volatility and a beta of ${b}. The risk-free rate is ${rf}% and the market returned ${Rm}%. Compute the Sharpe ratio, the Treynor ratio and Jensen's alpha.`,
        fields: [
          { key: 's', label: 'Sharpe ratio', answer: round(sh, 2), tol: 0.01 },
          { key: 't', label: 'Treynor ratio (%)', answer: round(tr, 2), tol: 0.05 },
          { key: 'a', label: "Jensen's alpha", answer: round(al, 2), unit: '%', tol: 0.05 },
        ],
        why: `Sharpe = (${Rp} − ${rf}) ÷ ${sd} = ${fmt(sh, 2)}. Treynor = (${Rp} − ${rf}) ÷ ${b} = ${fmt(tr, 2)}. CAPM expects ${rf} + ${b} × (${Rm} − ${rf}) = ${fmt(rf + b * (Rm - rf), 2)}%, so alpha = ${fmt(al, 2)}%.`,
      };
    },
  },
  put_call: {
    topic: 'ADJ-06', title: 'Put-call parity',
    gen: (r) => {
      const S = pick(r, [95, 100, 105, 110]), K = 100, rr = pick(r, [0.06, 0.07, 0.08]), T = pick(r, [0.5, 1]), C = pick(r, [6, 8, 10, 12]);
      const pvk = K / (1 + rr) ** T, P = C - S + pvk;
      if (P <= 0.2) return GENERATORS.put_call.gen(r);
      return {
        q: `A European call with strike ${K} and ${T === 1 ? 'one year' : 'six months'} to expiry costs ${C}. The stock is at ${S} and pays no dividend; the interest rate is ${fmt(rr * 100, 2)}% a year (annual compounding). What should the matching put cost?`,
        fields: [{ key: 'p', label: 'Put price', answer: round(P, 2), tol: 0.05 }],
        why: `C − P = S − PV(K), so P = C − S + K ÷ (1 + r)^T = ${C} − ${S} + ${fmt(pvk, 2)} = ${fmt(P, 2)}. If the market put differs, buy the cheap side and sell the rich side.`,
        diagnose: (v) => near(v.p, C - S + K, 0.05) ? 'discounting' : null,
      };
    },
  },
  credit: {
    topic: 'ADJ-07', title: 'Credit ratios for a lending decision',
    gen: (r) => {
      const E = pick(r, [120, 150, 200]), da = pick(r, [0.2, 0.25]) * E, i = pick(r, [20, 25, 30]), prin = pick(r, [30, 40, 50]), cfads = E * pick(r, [0.55, 0.6, 0.65]), nd = E * pick(r, [2, 2.5, 3.2]);
      return {
        q: `A borrower has EBITDA of Rs. ${E} crore, D&A of ${fmt(da, 0)}, interest of ${i} and scheduled principal of ${prin}. Cash available for debt service is Rs. ${fmt(cfads, 0)} crore and net debt is Rs. ${fmt(nd, 0)} crore. Compute interest coverage (EBIT basis), DSCR and net debt/EBITDA.`,
        fields: [
          { key: 'c', label: 'Interest coverage (EBIT)', answer: round((E - da) / i, 2), unit: 'x', tol: 0.03 },
          { key: 'd', label: 'DSCR', answer: round(cfads / (prin + i), 2), unit: 'x', tol: 0.03 },
          { key: 'l', label: 'Net debt / EBITDA', answer: round(nd / E, 2), unit: 'x', tol: 0.03 },
        ],
        why: `EBIT = ${E} − ${fmt(da, 0)} = ${fmt(E - da, 0)}; coverage ${fmt((E - da) / i, 2)}x (comfort above 3x). DSCR = ${fmt(cfads, 0)} ÷ (${prin} + ${i}) = ${fmt(cfads / (prin + i), 2)}x (above 1.3x for term loans). Leverage ${fmt(nd / E, 2)}x (below 3x for most corporates). End with a lending decision: amount, tenor, security, covenants, pricing.`,
        diagnose: (v) => near(v.d, cfads / i, 0.03) ? 'concept' : null,
      };
    },
  },
  dscr_debt: {
    topic: 'ADJ-08', title: 'Sizing project debt with a DSCR',
    gen: (r) => {
      const cf = pick(r, [80, 100, 120, 150]), dscr = pick(r, [1.2, 1.3, 1.4]), rr = pick(r, [0.085, 0.09, 0.1]), n = pick(r, [10, 12, 15]), cost = cf * pick(r, [7, 7.5, 8]);
      const ds = cf / dscr, af = (1 - (1 + rr) ** -n) / rr, debt = ds * af, eq = cost - debt;
      return {
        q: `A project generates Rs. ${cf} crore a year of cash available for debt service. Lenders want a minimum DSCR of ${dscr}x on a ${n}-year loan at ${fmt(rr * 100)}%. The project costs Rs. ${fmt(cost, 0)} crore. Size the debt service, the maximum debt and the sponsor equity.`,
        fields: [
          { key: 's', label: 'Maximum annual debt service', answer: round(ds, 1), unit: 'Rs. crore', tol: 0.2 },
          { key: 'd', label: 'Maximum debt', answer: Math.round(debt), unit: 'Rs. crore', tol: 3 },
          { key: 'e', label: 'Sponsor equity', answer: Math.round(eq), unit: 'Rs. crore', tol: 3 },
        ],
        why: `Debt service = ${cf} ÷ ${dscr} = ${fmt(ds)}. Annuity factor (${fmt(rr * 100)}%, ${n} years) = ${fmt(af, 2)}, so debt = ${fmt(debt, 0)}. Equity = ${fmt(cost, 0)} − ${fmt(debt, 0)} = ${fmt(eq, 0)} (${fmt(eq / cost * 100)}%).`,
        diagnose: (v) => near(v.d, ds * n, 3) ? 'discounting' : null,
      };
    },
  },
};

// A diagnosis is only trusted when it cannot also fire on the correct answers
// (for example, mean and median of the peer set can coincide).
export function makeGen(id: string, seed: number): GenOut {
  const out = GENERATORS[id].gen(rng(seed));
  if (!out.diagnose) return out;
  const raw = out.diagnose;
  const ambiguous = raw(Object.fromEntries(out.fields.map((f) => [f.key, f.answer])));
  return { ...out, diagnose: (v) => { const t = raw(v); return t && t !== ambiguous ? t : null; } };
}
export const GEN_BY_TOPIC: Record<string, string[]> = Object.entries(GENERATORS).reduce((m, [id, g]) => {
  (m[g.topic] ||= []).push(id); return m;
}, {} as Record<string, string[]>);
