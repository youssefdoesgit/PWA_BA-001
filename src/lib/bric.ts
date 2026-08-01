/**
 * BRIC's voice.
 *
 * Impeccably polite, unflappable, quietly amused. Speaks the way a very good
 * butler would if he had also read every line of your ledger and formed
 * private opinions about it. Courteous first, honest always, never fawning.
 *
 * Every line is selected by real conditions in the data — BRIC does not offer
 * congratulations while you are overdrawn.
 */

import { DAY } from './date';
import { balance, monthTotals } from './store';
import type { KevlarData } from './types';

/** Rotates by day so lines vary without flickering mid-session. */
function pick<T>(options: T[], salt = 0): T {
  const day = Math.floor(Date.now() / DAY);
  return options[(day + salt) % options.length];
}

/** He defaults to "sir" and uses the name when he wants your attention. */
const addr = (name: string): string => (name ? name : 'sir');

/* -------------------------------------------------------------------------- */
/* Greetings                                                                  */
/* -------------------------------------------------------------------------- */

export function bricGreeting(data: KevlarData): string {
  const name = addr(data.settings.name);
  const h = new Date().getHours();
  const bal = balance(data);

  if (bal < 0) {
    return pick([
      `We are below zero, ${name}. I thought it best you heard it from me.`,
      `The balance has gone negative, sir. Nothing that cannot be recovered, but it does want attention.`,
    ]);
  }

  if (h < 5) {
    return pick([
      `It is rather late, ${name}. Whatever you are considering purchasing, I would sleep on it.`,
      `Working at this hour, sir? I shall keep the books open.`,
    ]);
  }

  if (h < 12) {
    return pick([
      `Good morning, ${name}. The books are balanced and nothing is on fire.`,
      `Good morning, sir. I took the liberty of running the figures overnight.`,
      `You are up. So am I, in a manner of speaking. The ledger awaits.`,
    ]);
  }

  if (h < 18) {
    return pick([
      `Good afternoon, ${name}. Everything is precisely where you left it.`,
      `Afternoon, sir. Standing by, as ever.`,
      `Good afternoon. The accounts have behaved themselves so far.`,
    ]);
  }

  return pick([
    `Good evening, ${name}. The day's damage has been recorded.`,
    `Good evening, sir. Nothing has exploded financially. A low bar, admittedly.`,
    `Evening, ${name}. The ledger is current, assuming you have been honest with me.`,
  ]);
}

/* -------------------------------------------------------------------------- */
/* Ambient commentary                                                         */
/* -------------------------------------------------------------------------- */

/** A short aside for the home screen, reacting to what is actually true. */
export function bricQuip(data: KevlarData): string {
  const name = addr(data.settings.name);
  const n = data.transactions.length;
  const { income, expense, net } = monthTotals(data);
  const today = data.transactions.filter(
    (t) => Date.now() - t.date < DAY && t.kind === 'expense'
  );

  if (n === 0) {
    return pick([
      'The ledger is empty, sir. I cannot be insightful about nothing.',
      'Nothing on file as yet. Provide me with data and I become considerably more useful.',
    ]);
  }

  if (today.length >= 5) {
    return pick([
      `${today.length} purchases today, ${name}. I am not judging. I am counting, which is rather worse.`,
      `That is ${today.length} today, sir. Busy hands.`,
    ]);
  }

  if (today.length === 0) {
    return pick([
      'Nothing logged today. Either a quiet day or an oversight. I have my suspicions.',
      'No expenditure recorded today, sir. I shall take the win.',
    ]);
  }

  if (net > 0 && income > 0) {
    return pick([
      'You are up on the month. Do try not to celebrate expensively.',
      'In the black this month, sir. Steady as she goes.',
    ]);
  }

  if (expense > 0 && income === 0) {
    return pick([
      'Funds have moved in one direction only this month. Normal for now, worth watching.',
      'Nothing has come in yet this month, sir. Merely an observation.',
    ]);
  }

  return pick([
    'Everything appears entirely ordinary, which is genuinely the objective.',
    'Nothing dramatic to report. The best sort of report.',
    'The ledger is holding steady, sir.',
  ]);
}

/* -------------------------------------------------------------------------- */
/* Reactions                                                                  */
/* -------------------------------------------------------------------------- */

/** Said immediately after something is logged. */
export function bricOnLog(kind: 'expense' | 'income', cents: number, name: string): string {
  const who = addr(name);
  if (kind === 'income') {
    return pick(
      [
        'Recorded. Money arriving is my favourite variety of paperwork.',
        `Noted, ${who}. That is the agreeable direction.`,
        'In it goes, sir.',
      ],
      cents
    );
  }
  if (cents > 20000) {
    return pick(
      [
        'A substantial one. Filed without comment. Very nearly.',
        `Recorded, ${who}. I shall pretend not to have seen the figure.`,
      ],
      cents
    );
  }
  return pick(['Recorded.', 'Filed, sir.', 'Noted.', 'Duly logged.'], cents);
}

/** Lines shown while the analysis screen assembles itself. */
export const THINKING = [
  'Reading the ledger…',
  'Performing the arithmetic you have been avoiding…',
  'Assessing the damage…',
  'Running the figures…',
];

export function bricSignoff(): string {
  return pick([
    'That is everything, sir. I shall be here.',
    'All computed on this device, precisely as promised.',
    'No servers were troubled in the preparation of this advice.',
  ]);
}
