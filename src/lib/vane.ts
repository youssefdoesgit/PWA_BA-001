/**
 * VANE's voice and judgement.
 *
 * The docket's unit, and deliberately nothing like BRIC. BRIC is staff: he
 * defers, he softens, he calls him sir. VANE is a colleague running the board
 * — brisk, forward-facing, mildly impatient, and entirely uninterested in
 * flattering anyone. She reports what is closing and what has gone cold, then
 * gets out of the way.
 *
 * Fragments are intentional. So is the refusal to congratulate him for work he
 * has not finished.
 *
 * Like BRIC, every line is chosen by a real condition in the data. There is no
 * model here and no network call — this is rules over a local board.
 */

import { DAY } from './date';
import { isRolling, LEADS, monthsUntilWindow, type Lead } from './leads';
import { completedSince, dueWithin, isDone, loadByTrack, openTasks, overdueTasks } from './store';
import type { BriefItem, Briefing, BriefTone } from './bric';
import type { Mood } from '@/components/ui/agency';
import type { DocketData, Task } from './types';

/** Rotates by day so lines vary without flickering mid-session. */
function pick<T>(options: T[], salt = 0): T {
  const day = Math.floor(Date.now() / DAY);
  return options[(day + salt) % options.length];
}

/** She uses his name flat, with no honorific. That is the whole difference. */
const addr = (name: string): string => name || 'you';

const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`;

/** Whole days until `ts`, rounded up, so "tomorrow" is never reported as 0. */
const daysUntil = (ts: number, at = Date.now()): number => Math.ceil((ts - at) / DAY);

/* -------------------------------------------------------------------------- */
/* Greetings                                                                  */
/* -------------------------------------------------------------------------- */

export function vaneGreeting(d: DocketData): string {
  const name = addr(d.settings.name);
  const open = openTasks(d);
  const late = overdueTasks(d);
  const soon = dueWithin(d, 72);
  const h = new Date().getHours();

  if (late.length > 0) {
    return pick([
      `${plural(late.length, 'deadline')} already passed. Not going to pretend otherwise.`,
      `You're late on ${plural(late.length, 'item')}. Salvage what's salvageable, drop the rest.`,
      `Overdue: ${late.length}. Deal with the top one, then we talk about the rest.`,
    ]);
  }

  if (soon.length > 0) {
    const next = soon[0];
    const days = daysUntil(next.due ?? 0);
    return pick([
      `Clock's running. "${next.title}" ${days <= 1 ? 'closes today' : `closes in ${plural(days, 'day')}`}.`,
      `Next thing up: "${next.title}". ${days <= 1 ? 'Today.' : `${days} days.`} Start it now, not tonight.`,
    ]);
  }

  if (open.length === 0) {
    return pick([
      `Board's empty, ${name}. Either you're between things or you've stopped writing them down.`,
      `Nothing on the board. That's either discipline or avoidance — you'd know which.`,
      `Clear board. Good time to put something ambitious on it.`,
    ]);
  }

  if (h < 5) {
    return pick([
      `It's late. ${plural(open.length, 'item')} on the board, none of it more urgent than sleep.`,
      `Still up? The board will keep. It's very good at keeping.`,
    ]);
  }

  if (h < 12) {
    return pick([
      `Morning. ${plural(open.length, 'item')} on the board, nothing on fire.`,
      `Board's steady — ${open.length} open. Pick the hardest one while you're fresh.`,
      `Morning, ${name}. Nothing closing this week. Use it.`,
    ]);
  }

  if (h < 18) {
    return pick([
      `${plural(open.length, 'item')} open, no deadlines biting. Quiet stretch.`,
      `Afternoon. Board's under control. Ship something small.`,
    ]);
  }

  return pick([
    `Evening. ${plural(open.length, 'item')} still open. None of it urgent.`,
    `Board unchanged since this morning. Not a criticism, just the readout.`,
  ]);
}

/* -------------------------------------------------------------------------- */
/* Reactions                                                                  */
/* -------------------------------------------------------------------------- */

export function vaneOnAdd(title: string, hasDue: boolean): string {
  if (!hasDue) {
    return pick([
      `"${title}" logged. No date on it, so it'll drift. Your call.`,
      `On the board. Give it a deadline when you're ready to be honest about one.`,
      `Noted — "${title}". Undated things have a way of staying undated.`,
    ]);
  }
  return pick([
    `"${title}" is on the board with a clock. Better.`,
    `Logged and dated. I'll start counting.`,
    `Got it. Dated items are the only ones I can actually chase you about.`,
  ]);
}

export function vaneOnDone(title: string, streak: number): string {
  if (streak >= 5) {
    return pick([
      `"${title}" cleared. That's ${streak} this week. You're on a run — don't narrate it, just keep going.`,
      `Done. ${streak} closed in seven days. This is what momentum looks like.`,
    ]);
  }
  return pick([
    `"${title}" cleared. Next.`,
    `Closed. Board's lighter.`,
    `Done. I'd say well played, but you'd get complacent.`,
  ]);
}

export function vaneOnUndo(title: string): string {
  return pick([
    `"${title}" back on the board. No judgement.`,
    `Reopened. Happens.`,
    `Un-done. The clock resumes.`,
  ]);
}

export function vaneOnRaise(name: string): string {
  return pick([
    `"${name}" is on the board with its checklist. Work the steps, not the vibes.`,
    `Raised. I've pre-loaded the steps — verify the dates yourself before you plan around them.`,
    `On the board. First step is the only one that matters right now.`,
  ]);
}

export function vaneOnDismiss(): string {
  return pick([
    `Dropped. I won't raise it again.`,
    `Off the radar for good. You can undo that in settings if you change your mind.`,
    `Noted. Not your thing.`,
  ]);
}

/** Standing disclaimer. The catalogue is static and she says so, every time. */
export function vaneCatalogueNote(): string {
  return 'This catalogue is baked into the app — it has no connection and cannot check itself. Windows are approximate and shift year to year. Verify every date before you plan around it.';
}

/* -------------------------------------------------------------------------- */
/* Signals — the rules engine                                                 */
/* -------------------------------------------------------------------------- */

export type Severity = 'alarm' | 'warn' | 'info' | 'good';

export type Signal = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  href?: string;
};

/** Open, undated, untouched and old. The definition of a thing that has died quietly. */
const STALE_DAYS = 21;
/** More than this many at once and nothing is actually getting finished. */
const WIP_LIMIT = 6;
/** Waiting on someone else for longer than this deserves a chase. */
const BLOCKED_DAYS = 7;

export function buildSignals(d: DocketData, at = Date.now()): Signal[] {
  const out: Signal[] = [];
  const open = openTasks(d);
  const late = overdueTasks(d, at);
  const week = dueWithin(d, 24 * 7, at);
  const threeDays = dueWithin(d, 72, at);

  /* --- Deadlines ------------------------------------------------------- */

  if (late.length > 0) {
    const worst = late[0];
    out.push({
      id: 'overdue',
      severity: 'alarm',
      title: `${plural(late.length, 'item')} past deadline`,
      detail: `"${worst.title}" was due ${plural(Math.abs(daysUntil(worst.due ?? at, at)), 'day')} ago. If it is genuinely gone, close it and stop carrying it. If it is not, it is the only thing that matters today.`,
      href: '/desk',
    });
  }

  if (threeDays.length > 0) {
    const next = threeDays[0];
    const days = daysUntil(next.due ?? at, at);
    out.push({
      id: 'closing',
      severity: 'alarm',
      title: `"${next.title}" ${days <= 1 ? 'closes today' : `closes in ${plural(days, 'day')}`}`,
      detail: `Nothing else on the board outranks this until it is submitted. Applications close at a specific hour, not a specific day — check which.`,
      href: '/desk',
    });
  } else if (week.length > 0) {
    out.push({
      id: 'this-week',
      severity: 'warn',
      title: `${plural(week.length, 'deadline')} inside seven days`,
      detail: `"${week[0].title}" is the nearest. A week is enough time if you start now and not enough if you start Thursday.`,
      href: '/desk',
    });
  }

  /* --- Drift ------------------------------------------------------------ */

  const stale = open.filter(
    (t) =>
      t.due === undefined &&
      at - t.createdAt > STALE_DAYS * DAY &&
      t.steps.filter((s) => s.done).length === 0
  );
  if (stale.length > 0) {
    out.push({
      id: 'stale',
      severity: 'warn',
      title: `${plural(stale.length, 'item has', 'items have')} gone cold`,
      detail: `Open for over ${STALE_DAYS} days with no step completed and no deadline — starting with "${stale[0].title}". Give each one a date or delete it. Carrying it costs you attention either way.`,
      href: '/desk',
    });
  }

  const active = open.filter((t) => t.status === 'active');
  if (active.length > WIP_LIMIT) {
    out.push({
      id: 'wip',
      severity: 'warn',
      title: `${active.length} things marked active`,
      detail: `That is not ${active.length} projects, it is one project being done ${active.length} times slower. Pick three, put the rest back to open.`,
      href: '/desk',
    });
  }

  const blocked = open.filter(
    (t) => t.status === 'blocked' && at - t.updatedAt > BLOCKED_DAYS * DAY
  );
  if (blocked.length > 0) {
    out.push({
      id: 'blocked',
      severity: 'warn',
      title: `${plural(blocked.length, 'item')} blocked over a week`,
      detail: `"${blocked[0].title}" has been waiting on someone else since before last week. Chase it or unblock it yourself — nobody else is tracking this.`,
      href: '/desk',
    });
  }

  /* --- Opportunity windows --------------------------------------------- */

  for (const lead of openingSoon(d, 1, at).slice(0, 2)) {
    const gap = monthsUntilWindow(lead, new Date(at));
    out.push({
      id: `lead-${lead.id}`,
      severity: 'info',
      title: `${lead.name} — ${gap === 0 ? 'window is open' : 'opens next month'}`,
      detail: `${lead.what} ${lead.why}`,
      href: '/desk/radar',
    });
  }

  /* --- Shape of the board ---------------------------------------------- */

  if (open.length === 0) {
    out.push({
      id: 'empty',
      severity: 'info',
      title: 'Nothing on the board',
      detail: `An empty board is only good news if it is true. Radar has ${LEADS.length} things filed under game dev, scholarships and competitions — start there.`,
      href: '/desk/radar',
    });
  } else if (open.every((t) => t.due === undefined)) {
    out.push({
      id: 'no-dates',
      severity: 'info',
      title: 'Nothing on the board has a date',
      detail: `${plural(open.length, 'open item')}, not one with a deadline. Undated work slides indefinitely and nobody notices, including me — I cannot chase what has no clock.`,
      href: '/desk',
    });
  }

  const load = loadByTrack(d);
  const idle = d.tracks.filter((t) => (load.get(t.id) ?? 0) === 0);
  if (idle.length > 0 && open.length > 0) {
    out.push({
      id: 'idle-track',
      severity: 'info',
      title: `${idle.length === 1 ? `${idle[0].name} has nothing on it` : `${idle.length} tracks are empty`}`,
      detail: `${idle.map((t) => t.name).join(', ')} — nothing open. Either that ambition is dormant or it has quietly ended. Both are fine; drifting between the two is not.`,
      href: '/desk/tracks',
    });
  }

  /* --- Momentum --------------------------------------------------------- */

  const doneWeek = completedSince(d, at - 7 * DAY);
  if (doneWeek.length >= 3) {
    out.push({
      id: 'momentum',
      severity: 'good',
      title: `${plural(doneWeek.length, 'item')} cleared this week`,
      detail: `That is a real rate. The thing that kills it is starting something large before the current run ends — finish what is open first.`,
      href: '/desk',
    });
  } else if (late.length === 0 && open.length > 0 && week.length === 0) {
    out.push({
      id: 'steady',
      severity: 'good',
      title: 'Nothing overdue, nothing closing',
      detail: `Quiet weeks are when portfolio work actually gets done. Deadlines will not give you this window again for a while.`,
      href: '/desk',
    });
  }

  const rank: Record<Severity, number> = { alarm: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* -------------------------------------------------------------------------- */
/* Radar                                                                      */
/* -------------------------------------------------------------------------- */

/** Leads he has neither dismissed nor already raised onto the board. */
export function liveLeads(d: DocketData): Lead[] {
  const dismissed = new Set(d.settings.dismissedLeads ?? []);
  const raised = new Set(d.tasks.filter((t) => t.leadId).map((t) => t.leadId));
  return LEADS.filter((l) => !dismissed.has(l.id) && !raised.has(l.id));
}

/**
 * Live leads whose window is open now or opens within `months`.
 *
 * Rolling entries are excluded here even though they are always technically
 * open — a briefing that leads with "open source exists" every single day is
 * noise, and noise is what makes people stop reading briefings.
 */
export function openingSoon(d: DocketData, months = 1, at = Date.now()): Lead[] {
  const now = new Date(at);
  return liveLeads(d)
    .filter((l) => !isRolling(l) && monthsUntilWindow(l, now) <= months)
    .sort((a, b) => monthsUntilWindow(a, now) - monthsUntilWindow(b, now));
}

/* -------------------------------------------------------------------------- */
/* Briefing                                                                   */
/* -------------------------------------------------------------------------- */

const TONE_MOOD: Record<BriefTone, Mood> = {
  urgent: 'alarm',
  warn: 'warn',
  info: 'think',
  good: 'happy',
};

const SEVERITY_TONE: Record<Severity, BriefTone> = {
  alarm: 'urgent',
  warn: 'warn',
  info: 'info',
  good: 'good',
};

/** What VANE leads with, ordered by what will actually bite first. */
export function vaneBriefing(d: DocketData, at = Date.now()): Briefing {
  const signals = buildSignals(d, at);

  const items: BriefItem[] = signals.slice(0, 4).map((sig) => ({
    id: sig.id,
    text: sig.title,
    tone: SEVERITY_TONE[sig.severity],
    href: sig.href,
  }));

  if (items.length === 0) {
    items.push({ id: 'clear', text: 'Board is clear.', tone: 'good', href: '/desk' });
  }

  return {
    greeting: vaneGreeting(d),
    items,
    mood: TONE_MOOD[items[0].tone],
  };
}

export function vaneSignoff(): string {
  return pick([
    'All of this is computed here. Nothing left the device to produce it.',
    'No network, no lookups. Just your board and a set of rules.',
    'I only know what you have written down. Write more down.',
  ]);
}

/** Longest run of consecutive days with at least one task closed, ending today. */
export function streak(d: DocketData, at = Date.now()): number {
  const days = new Set(
    d.tasks
      .filter((t) => isDone(t) && t.completedAt)
      .map((t) => Math.floor((t.completedAt as number) / DAY))
  );
  let cursor = Math.floor(at / DAY);
  // Today not being closed yet should not break a run built yesterday.
  if (!days.has(cursor)) cursor -= 1;

  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor -= 1;
  }
  return n;
}

/** Tasks closed in the last seven days, for VANE's reaction when one lands. */
export const weeklyRate = (d: DocketData, at = Date.now()): number =>
  completedSince(d, at - 7 * DAY).length;

export type { Task };
