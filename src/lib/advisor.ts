/**
 * KEVLAR's advisor — BRIC.
 *
 * Entirely local: no network, no API key, no model. Every conclusion is
 * arithmetic on the user's own ledger, which is why it can afford to be blunt.
 *
 * Hard rule: this file never tells the user what to invest in. It explains
 * principles, does arithmetic, and flags risk. Naming instruments would be
 * personalised investment advice, which KEVLAR is not licensed to give.
 */

import { DAY, endOfBudgetMonth, startOfBudgetMonth } from './date';
import { balance, monthTotals, spendByCategory } from './store';
import type { KevlarData } from './types';

export type Severity = 'good' | 'info' | 'warn' | 'alarm';
export type Mood = 'idle' | 'happy' | 'warn' | 'alarm' | 'think';

export type Insight = {
  id: string;
  severity: Severity;
  mood: Mood;
  tag: string;
  title: string;
  body: string;
  metric?: string;
};

const MOOD: Record<Severity, Mood> = {
  good: 'happy',
  info: 'think',
  warn: 'warn',
  alarm: 'alarm',
};

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/**
 * Rotates phrasing by the day so BRIC doesn't repeat himself word for word
 * every time you open the app, but stays stable within a single day.
 */
function pick<T>(options: T[], salt = 0): T {
  const day = Math.floor(Date.now() / DAY);
  return options[(day + salt) % options.length];
}

/* -------------------------------------------------------------------------- */
/* Core metrics                                                               */
/* -------------------------------------------------------------------------- */

export type Metrics = {
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  dailyBurn: number;
  runwayDays: number | null;
  liquid: number;
  monthProgress: number;
  daysElapsed: number;
  daysLeft: number;
  projectedSpend: number;
  prevExpense: number | null;
  recurringMonthly: number;
  emergencyMonths: number | null;
};

export function computeMetrics(data: KevlarData, at = Date.now()): Metrics {
  const { monthStartDay } = data.settings;
  const start = startOfBudgetMonth(at, monthStartDay);
  const end = endOfBudgetMonth(at, monthStartDay);

  const { income, expense, net } = monthTotals(data, at);

  const daysElapsed = Math.max(1, Math.ceil((at - start) / DAY));
  const totalDays = Math.max(1, Math.round((end - start) / DAY));
  const daysLeft = Math.max(0, totalDays - daysElapsed);
  const monthProgress = Math.min(1, daysElapsed / totalDays);

  const dailyBurn = expense / daysElapsed;
  const projectedSpend = Math.round(dailyBurn * totalDays);

  const liquid = balance(data);
  const runwayDays = dailyBurn > 0 ? Math.floor(liquid / dailyBurn) : null;

  const prevAt = start - 1;
  const prevStart = startOfBudgetMonth(prevAt, monthStartDay);
  const hasPrev = data.transactions.some((t) => t.date >= prevStart && t.date <= prevAt);
  const prevExpense = hasPrev ? monthTotals(data, prevAt).expense : null;

  const recurringMonthly = data.recurring
    .filter((r) => r.active)
    .reduce((sum, r) => {
      const perYear =
        r.unit === 'week' ? 52 / r.every : r.unit === 'month' ? 12 / r.every : 1 / r.every;
      return sum + (r.amount * perYear) / 12;
    }, 0);

  const avgMonthlySpend = prevExpense ? (prevExpense + projectedSpend) / 2 : projectedSpend;
  const emergencyMonths = avgMonthlySpend > 0 ? liquid / avgMonthlySpend : null;

  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? net / income : null,
    dailyBurn,
    runwayDays,
    liquid,
    monthProgress,
    daysElapsed,
    daysLeft,
    projectedSpend,
    prevExpense,
    recurringMonthly,
    emergencyMonths,
  };
}

/* -------------------------------------------------------------------------- */
/* Zakat                                                                      */
/* -------------------------------------------------------------------------- */

// Lives in ./zakat now that the hawl is tracked properly. Imported for use
// below and re-exported so the advisory screen keeps a single import.
import { computeZakat, NISAB_GOLD_GRAMS } from './zakat';

export { computeZakat, HAWL_DAYS, NISAB_GOLD_GRAMS, ZAKAT_RATE } from './zakat';
export type { ZakatState } from './zakat';

/* -------------------------------------------------------------------------- */
/* Insights                                                                   */
/* -------------------------------------------------------------------------- */

export function buildInsights(data: KevlarData, at = Date.now()): Insight[] {
  const m = computeMetrics(data, at);
  const out: Insight[] = [];
  const money = (c: number) => fmt(c, data.settings.currency);

  if (data.transactions.length === 0) {
    return [
      {
        id: 'nodata',
        severity: 'info',
        mood: 'think',
        tag: 'standby',
        title: 'Ledger is empty',
        body: pick([
          'Log everything for a week. Yes, including the coffee. The coffee is usually the whole story.',
          "Give me seven days of real entries. Don't tidy them up either, I'm not here to be impressed.",
        ]),
      },
    ];
  }

  /* Savings rate ---------------------------------------------------------- */
  if (m.savingsRate !== null) {
    const r = m.savingsRate;
    if (r < 0) {
      out.push({
        id: 'rate-negative',
        severity: 'alarm',
        mood: 'alarm',
        tag: 'deficit',
        title: 'Spending more than you earn',
        metric: pct(r),
        body: `${money(m.income)} in, ${money(m.expense)} out. You are ${money(Math.abs(m.net))} underwater, and that shortfall came from somewhere — savings or borrowing, there is no third option. I would find the single largest category and cut there. One decisive cut you will actually maintain is worth five virtuous little ones you will abandon by Thursday.`,
      });
    } else if (r < 0.1) {
      out.push({
        id: 'rate-thin',
        severity: 'warn',
        mood: 'warn',
        tag: 'thin margin',
        title: `Keeping ${pct(r)} of what you earn`,
        metric: pct(r),
        body: `You are in the black, which is genuinely the difficult part, so credit where it is due. The difficulty is that ${pct(r)} evaporates the first time something breaks. I would aim for ten percent — in your case, ${money(Math.round(m.income * 0.1))} a month.`,
      });
    } else if (r < 0.25) {
      out.push({
        id: 'rate-ok',
        severity: 'good',
        mood: 'happy',
        tag: 'on track',
        title: `Keeping ${pct(r)} of your income`,
        metric: pct(r),
        body: pick([
          `Solid. Most people never get here. If you want something to chase, 25% is where it starts snowballing, about ${money(Math.round(m.income * 0.25 - m.net))} more a month.`,
          `That's a real savings rate, not a rounding error. Next rung is 25%, which means finding ${money(Math.round(m.income * 0.25 - m.net))} more.`,
        ]),
      });
    } else {
      out.push({
        id: 'rate-strong',
        severity: 'good',
        mood: 'happy',
        tag: 'excellent',
        title: `Keeping ${pct(r)} of your income`,
        metric: pct(r),
        body: "That is not normal, in the agreeable sense. The only thing I would watch is becoming the sort of person who declines a coffee because it is not optimal. The money is meant to be for something, sir.",
      });
    }
  }

  /* Pace ------------------------------------------------------------------ */
  const budgeted = data.budgets.reduce((n, b) => n + b.limit, 0);
  const spend = spendByCategory(data, at);
  if (budgeted > 0) {
    const spentBudgeted = data.budgets.reduce((n, b) => n + (spend.get(b.categoryId) ?? 0), 0);
    const consumed = spentBudgeted / budgeted;
    if (consumed > m.monthProgress + 0.15) {
      const overshoot = Math.round(budgeted * (consumed / Math.max(0.01, m.monthProgress)) - budgeted);
      out.push({
        id: 'pace-hot',
        severity: 'warn',
        mood: 'warn',
        tag: 'ahead of pace',
        title: 'Burning budget faster than the month is passing',
        metric: pct(consumed),
        body: `${pct(m.monthProgress)} through the month, ${pct(consumed)} through the budget. That arithmetic does not end well: you are on course to finish roughly ${money(overshoot)} over. You have ${m.daysLeft} days to correct it.`,
      });
    } else if (consumed < m.monthProgress - 0.15) {
      out.push({
        id: 'pace-cool',
        severity: 'good',
        mood: 'happy',
        tag: 'under pace',
        title: 'Comfortably under budget',
        metric: pct(consumed),
        body: `${pct(m.monthProgress)} through the month and only ${pct(consumed)} of the budget gone. You've got slack. Move it to a goal now, because slack left lying around has a way of spending itself.`,
      });
    }
  }

  /* Per-category overspend ------------------------------------------------ */
  for (const b of data.budgets) {
    const cat = data.categories.find((c) => c.id === b.categoryId);
    if (!cat) continue;
    const spent = spend.get(b.categoryId) ?? 0;
    if (spent > b.limit) {
      out.push({
        id: `over-${b.id}`,
        severity: 'warn',
        mood: 'warn',
        tag: 'over cap',
        title: `${cat.name} blew its cap`,
        metric: money(spent - b.limit),
        body: `Capped at ${money(b.limit)}, currently ${money(spent)}. Either the cap was fantasy or the month got away from you. Only one of those needs willpower to fix.`,
      });
    }
  }

  /* Trend ----------------------------------------------------------------- */
  if (m.prevExpense && m.prevExpense > 0) {
    const change = (m.projectedSpend - m.prevExpense) / m.prevExpense;
    if (change > 0.2) {
      out.push({
        id: 'trend-up',
        severity: 'warn',
        mood: 'warn',
        tag: 'rising',
        title: `Spending up ${pct(change)} on last month`,
        metric: `+${pct(change)}`,
        body: `Last month was ${money(m.prevExpense)}. You're tracking toward ${money(m.projectedSpend)}. Worth working out whether that was a one-off or whether this is just what you spend now.`,
      });
    } else if (change < -0.15) {
      out.push({
        id: 'trend-down',
        severity: 'good',
        mood: 'happy',
        tag: 'improving',
        title: `Spending down ${pct(Math.abs(change))}`,
        metric: pct(Math.abs(change)),
        body: `${money(m.prevExpense)} last month, tracking ${money(m.projectedSpend)} this one. Whatever you changed, do it again.`,
      });
    }
  }

  /* Concentration --------------------------------------------------------- */
  const ranked = [...spend.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 0 && m.expense > 0) {
    const [topId, topAmount] = ranked[0];
    const cat = data.categories.find((c) => c.id === topId);
    const share = topAmount / m.expense;
    if (cat && share > 0.35) {
      out.push({
        id: 'concentrated',
        severity: 'info',
        mood: 'think',
        tag: 'concentrated',
        title: `${cat.name} is ${pct(share)} of everything you spend`,
        metric: pct(share),
        body: `${money(topAmount)} out of ${money(m.expense)}. If that's rent, fine, that's how rent works and there's nothing to discuss. If it isn't, this is the one line where a change actually moves the needle.`,
      });
    }
  }

  /* Recurring load -------------------------------------------------------- */
  if (m.recurringMonthly > 0 && m.income > 0) {
    const share = m.recurringMonthly / m.income;
    if (share > 0.3) {
      out.push({
        id: 'subs-heavy',
        severity: 'warn',
        mood: 'warn',
        tag: 'locked in',
        title: 'Too much of your income is already spoken for',
        metric: pct(share),
        body: `${money(Math.round(m.recurringMonthly))} a month departs automatically — ${pct(share)} of your income, spent before you have made a single decision. I would read that list properly. There is invariably one on it you had forgotten you were paying for.`,
      });
    }
  }

  /* Buffer ---------------------------------------------------------------- */
  if (m.emergencyMonths !== null) {
    if (m.emergencyMonths < 1) {
      out.push({
        id: 'buffer-none',
        severity: 'alarm',
        mood: 'alarm',
        tag: 'exposed',
        title: 'Under a month of cover',
        metric: `${m.emergencyMonths.toFixed(1)}m`,
        body: `${m.emergencyMonths.toFixed(1)} months of ordinary spending in reserve. That is not a buffer, sir, that is a rounding error. One failed laptop and the entire plan is alight. I would get this to a full month before pursuing anything else.`,
      });
    } else if (m.emergencyMonths < 3) {
      const target = Math.round((m.liquid / Math.max(0.1, m.emergencyMonths)) * 3 - m.liquid);
      out.push({
        id: 'buffer-thin',
        severity: 'warn',
        mood: 'warn',
        tag: 'building',
        title: `${m.emergencyMonths.toFixed(1)} months of cover`,
        metric: `${m.emergencyMonths.toFixed(1)}m`,
        body: `Better than most. Three to six months is where you stop flinching at bad news, and you need roughly ${money(target)} more to hit three.`,
      });
    } else {
      out.push({
        id: 'buffer-ok',
        severity: 'good',
        mood: 'happy',
        tag: 'covered',
        title: `${m.emergencyMonths.toFixed(1)} months of cover`,
        metric: `${m.emergencyMonths.toFixed(1)}m`,
        body: 'The buffer is in good health. Nobody will ever compliment you on this, and it remains the single best position on the list.',
      });
    }
  }

  /* Runway ---------------------------------------------------------------- */
  if (m.runwayDays !== null && m.runwayDays < 45 && m.dailyBurn > 0) {
    out.push({
      id: 'runway',
      severity: m.runwayDays < 20 ? 'alarm' : 'warn',
      mood: m.runwayDays < 20 ? 'alarm' : 'warn',
      tag: 'runway',
      title: `${m.runwayDays} days of runway`,
      metric: `${m.runwayDays}d`,
      body: `${money(Math.round(m.dailyBurn))} a day going out, ${money(m.liquid)} in the tank. If nothing new comes in, that's ${m.runwayDays} days before things get interesting.`,
    });
  }

  if (data.settings.islamicMode) out.push(...islamicInsights(data, m, money));

  const order: Record<Severity, number> = { alarm: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

/* -------------------------------------------------------------------------- */
/* Islamic finance                                                            */
/* -------------------------------------------------------------------------- */

function islamicInsights(data: KevlarData, m: Metrics, money: (c: number) => string): Insight[] {
  const out: Insight[] = [];

  // Without separate accounts, a negative balance is the debt signal.
  const owed = balance(data);
  if (owed < 0) {
    out.push({
      id: 'riba-debt',
      severity: 'alarm',
      mood: 'alarm',
      tag: 'riba risk',
      title: 'You are in the red',
      metric: money(Math.abs(owed)),
      body: `You are ${money(Math.abs(owed))} below zero. If any of that is borrowed at interest, it is riba, and it compounds while you sleep. I would clear it before saving and before investing. Halting a guaranteed loss outranks pursuing a possible gain, every time.`,
    });
  }

  const interestish = data.transactions.filter(
    (t) => t.kind === 'income' && /interest|riba|apy|savings bonus/i.test(t.note ?? '')
  );
  if (interestish.length > 0) {
    out.push({
      id: 'riba-income',
      severity: 'warn',
      mood: 'warn',
      tag: 'review',
      title: 'Some income looks like interest',
      body: `${interestish.length} ${interestish.length === 1 ? 'entry mentions' : 'entries mention'} interest. Conventional savings interest is generally treated as riba, and the usual position is to give it away without counting it as reward. But I'm a calculator with a face. Ask your scholar.`,
    });
  }

  const z = computeZakat(data);
  if (z.needsGoldPrice) {
    out.push({
      id: 'zakat-setup',
      severity: 'info',
      mood: 'think',
      tag: 'zakat',
      title: 'Zakat tracking needs one figure from you',
      body: `Enter today's gold price per gram in Settings and I shall watch the nisab on your behalf. The threshold is ${NISAB_GOLD_GRAMS}g of gold; above it, zakat is 2.5% of qualifying wealth held for a full lunar year.`,
    });
  } else if (z.payable && z.due) {
    out.push({
      id: 'zakat-payable',
      severity: 'alarm',
      mood: 'alarm',
      tag: 'zakat due',
      title: 'Your zakat is due',
      metric: money(z.due),
      body: `You have held wealth above the nisab for a full lunar year. On ${money(z.base)}, that comes to roughly ${money(z.due)} at 2.5%. Mark it settled in the advisory once paid and I shall start the next year's count.`,
    });
  } else if (z.aboveNisab && z.daysRemaining !== null) {
    out.push({
      id: 'zakat-counting',
      severity: 'info',
      mood: 'think',
      tag: 'hawl running',
      title: `Zakat in ${z.daysRemaining} days`,
      metric: money(z.due ?? 0),
      body: `You crossed the nisab of ${money(z.nisab!)} and the hawl is running. If your wealth stays above the threshold, roughly ${money(z.due ?? 0)} falls due when the lunar year completes. Drop below the nisab and the count resets.`,
    });
  } else if (z.aboveNisab) {
    out.push({
      id: 'zakat-started',
      severity: 'info',
      mood: 'think',
      tag: 'zakat',
      title: 'Above the nisab — starting the count',
      body: `${money(z.base)} against a threshold of ${money(z.nisab!)}. I have started the hawl from today. Zakat becomes due after a full lunar year above that line.`,
    });
  } else {
    out.push({
      id: 'zakat-below',
      severity: 'good',
      mood: 'idle',
      tag: 'zakat',
      title: 'Below the nisab',
      body: `${money(z.base)} against a threshold of ${money(z.nisab!)}. Nothing is due, and no count is running. I shall tell you the moment that changes.`,
    });
  }

  if (m.savingsRate !== null && m.savingsRate > 0.15 && m.emergencyMonths && m.emergencyMonths >= 3) {
    out.push({
      id: 'halal-principles',
      severity: 'info',
      mood: 'think',
      tag: 'principles',
      title: 'Surplus is piling up',
      body: 'I will not name anything to put it into. I am not licensed, and I have no intention of feigning a qualification at you. What I can offer is the screen most scholars apply: no riba, no contracts built on excessive uncertainty, no ownership in alcohol, gambling, conventional banking, adult content or pork, and profit must carry genuinely shared risk rather than a guaranteed return on a loan. Take that list to someone properly qualified, sir.',
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', TND: 'DT', AED: 'AED',
  MAD: 'DH', SAR: 'SR', INR: '₹', CAD: 'CA$', AUD: 'A$',
};

function fmt(cents: number, currency: string): string {
  const sym = SYMBOLS[currency] ?? `${currency} `;
  const neg = cents < 0 ? '-' : '';
  return `${neg}${sym}${(Math.abs(cents) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Greeting for the top of the advisory screen. */
export function greeting(data: KevlarData, count: number): string {
  const name = data.settings.name || 'sir';
  if (count === 0) {
    return `I have read the entire ledger, ${name}. There is nothing worth troubling you with.`;
  }
  return pick([
    `I have been through the ledger, ${name}.`,
    'I have reviewed the figures. The honest version follows.',
    `A full pass of the accounts, ${name}. Here is what stood out.`,
  ]);
}

/** One-line headline for the home screen. */
export function headline(data: KevlarData, at = Date.now()): { text: string; mood: Mood } {
  const insights = buildInsights(data, at);
  if (insights.length === 0) return { text: 'Nothing to flag. Carry on.', mood: 'idle' };
  return { text: insights[0].title, mood: MOOD[insights[0].severity] };
}
