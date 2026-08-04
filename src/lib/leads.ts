/**
 * The opportunity catalogue.
 *
 * KEVLAR has no server and makes no network calls, so this is a *static* list
 * compiled by hand. That has one honest consequence worth stating plainly in
 * the UI: it cannot discover anything new, and its dates will drift.
 *
 * Two deliberate choices follow from that:
 *
 *   · Entries describe things that recur on a roughly annual cycle, so a
 *     stale list is still directionally useful next year.
 *   · No URLs. Links rot faster than programme names do, and a dead link in
 *     an offline app cannot be fixed from the couch. Each entry carries the
 *     phrase to search instead, which survives redesigns and domain changes.
 *
 * Everything here needs verifying before he relies on it. VANE says so.
 */

import type { LeadField } from './types';

export type Region = 'global' | 'us' | 'mena';

export type Lead = {
  /** Stable and hand-written — ids travel in `dismissedLeads` and in tasks. */
  id: string;
  name: string;
  field: LeadField;
  /** What the thing actually is, in one line. */
  what: string;
  /** Why it is worth *his* time, given game dev and school. */
  why: string;
  /**
   * Months the window falls in, 1-12. Empty means it runs continuously.
   * Approximate by design: these shift by a few weeks year to year.
   */
  window: number[];
  windowNote: string;
  eligibility: string;
  region: Region;
  cost: 'free' | 'paid' | 'varies';
  /** Paste into a search engine. Deliberately not a URL. */
  search: string;
  /** Becomes the checklist when the lead is raised onto the board. */
  steps: string[];
};

export const LEADS: Lead[] = [
  /* ---------------------------------------------------------------------- */
  /* Jams — the fastest way to have finished something                       */
  /* ---------------------------------------------------------------------- */
  {
    id: 'ggj',
    name: 'Global Game Jam',
    field: 'competition',
    what: 'The largest game jam in the world, run at hundreds of physical sites and online over one weekend.',
    why: 'A finished jam game plus a named site is the single cheapest credential in game dev. No entry fee, no age gate.',
    window: [1],
    windowNote: 'Late January. Site sign-ups open through December.',
    eligibility: 'Open to everyone. Some physical sites set their own minimum age.',
    region: 'global',
    cost: 'free',
    search: 'Global Game Jam nearest site register',
    steps: [
      'Find the nearest participating site, or pick online',
      'Register before sites fill up',
      'Line up a team, or commit to going solo',
      'Publish the build and write a short post-mortem',
    ],
  },
  {
    id: 'gmtk',
    name: 'GMTK Game Jam',
    field: 'competition',
    what: 'Game Makers Toolkit runs a 48-hour themed jam with tens of thousands of entrants.',
    why: 'Enormous reach and a genuinely useful ranked feedback round. Entries get played, which most jams cannot promise.',
    window: [7, 8],
    windowNote: 'Mid-summer, usually July or August.',
    eligibility: 'Open to everyone, solo or team.',
    region: 'global',
    cost: 'free',
    search: 'GMTK Game Jam itch.io',
    steps: [
      'Watch for the date announcement on the GMTK channel',
      'Scope to something finishable in 48 hours',
      'Submit before the deadline, then rate other entries',
    ],
  },
  {
    id: 'ludum-dare',
    name: 'Ludum Dare',
    field: 'competition',
    what: 'Long-running online jam with a Compo (48h, solo, all assets your own) and a Jam (72h, teams allowed).',
    why: 'The Compo rules force you to make art, sound and code in one weekend. Brutal, and the fastest skill compounding available.',
    window: [4, 10],
    windowNote: 'Roughly twice a year, spring and autumn.',
    eligibility: 'Open to everyone.',
    region: 'global',
    cost: 'free',
    search: 'Ludum Dare next event date',
    steps: ['Pick Compo or Jam', 'Prepare a project template beforehand', 'Submit and rate'],
  },
  {
    id: 'brackeys',
    name: 'Brackeys Game Jam',
    field: 'competition',
    what: 'A large community jam aimed squarely at newer developers.',
    why: 'Friendlier field than GMTK or Ludum Dare, which makes it a better place to actually place well early on.',
    window: [2, 8],
    windowNote: 'A few times a year; watch itch.io.',
    eligibility: 'Open to everyone.',
    region: 'global',
    cost: 'free',
    search: 'Brackeys Game Jam itch.io',
    steps: ['Join the jam page', 'Build to theme', 'Submit and rate others'],
  },
  {
    id: 'js13k',
    name: 'js13kGames',
    field: 'competition',
    what: 'Build a browser game in JavaScript that fits inside 13 kilobytes, zipped.',
    why: 'A constraint that teaches more about optimisation in a month than a year of tutorials. Runs entirely in the browser, so it costs nothing to enter.',
    window: [8, 9],
    windowNote: '13 August to 13 September, every year.',
    eligibility: 'Open to everyone.',
    region: 'global',
    cost: 'free',
    search: 'js13kGames competition rules',
    steps: ['Read the size rules carefully', 'Set up a minifying build early', 'Submit the zip'],
  },
  {
    id: 'itch-habit',
    name: 'Standing jam habit',
    field: 'competition',
    what: 'itch.io lists dozens of open jams at any moment, from weekend jams to month-long ones.',
    why: 'Not an event — a habit. One small finished thing a month beats one unfinished masterpiece a year.',
    window: [],
    windowNote: 'Continuous. Something is always open.',
    eligibility: 'Varies by jam. Most have no age restriction.',
    region: 'global',
    cost: 'free',
    search: 'itch.io game jams calendar',
    steps: ['Browse the jam calendar', 'Pick one ending within a month', 'Finish and ship it'],
  },

  /* ---------------------------------------------------------------------- */
  /* Competitions and programmes with real high-school eligibility           */
  /* ---------------------------------------------------------------------- */
  {
    id: 'congressional-app',
    name: 'Congressional App Challenge',
    field: 'competition',
    what: 'A US congressional district competition for student-built apps, judged per district.',
    why: 'Field is small because it is district by district, so odds are far better than national contests. Winners get named publicly.',
    window: [9, 10, 11],
    windowNote: 'Submissions usually close late autumn.',
    eligibility: 'US middle and high school students, judged by congressional district.',
    region: 'us',
    cost: 'free',
    search: 'Congressional App Challenge eligibility deadline',
    steps: [
      'Confirm your district participates',
      'Register before the deadline',
      'Record the demo video they require',
    ],
  },
  {
    id: 'mit-think',
    name: 'MIT THINK Scholars',
    field: 'competition',
    what: 'MIT students review proposals for science and engineering projects and fund the ones they pick, with mentorship.',
    why: 'It funds a project you have *not* built yet, which is rare. A well-argued game or tools proposal fits.',
    window: [12, 1],
    windowNote: 'Deadline usually around the turn of the year.',
    eligibility: 'High school students. Check current residency rules.',
    region: 'us',
    cost: 'free',
    search: 'MIT THINK Scholars Program application',
    steps: ['Read past winning proposals', 'Draft the budget and timeline', 'Submit before the deadline'],
  },
  {
    id: 'isef',
    name: 'Regeneron ISEF (via affiliated fair)',
    field: 'competition',
    what: 'The international science and engineering fair. You qualify by placing at an affiliated regional fair first.',
    why: 'Has a systems software and embedded systems category. Serious prize money and it travels well on an application.',
    window: [1, 2, 3],
    windowNote: 'Regional fairs run late winter; ISEF itself is in May.',
    eligibility: 'Roughly ages 13-18, through an affiliated fair. Affiliates exist outside the US.',
    region: 'global',
    cost: 'free',
    search: 'Regeneron ISEF affiliated fair near me',
    steps: [
      'Find your affiliated regional fair and its deadline',
      'Check which category the project belongs in',
      'Prepare the required paperwork early — it is substantial',
    ],
  },
  {
    id: 'mlh',
    name: 'MLH hackathons',
    field: 'competition',
    what: 'Major League Hacking sanctions hackathons year-round, many of them online and many open to high schoolers.',
    why: 'Weekend-sized, team-based, and the good ones hand out hardware and mentorship. Also the easiest place to meet people ahead of you.',
    window: [],
    windowNote: 'Continuous. Season calendar published in advance.',
    eligibility: 'Varies per event. Filter for high-school-friendly ones.',
    region: 'global',
    cost: 'free',
    search: 'MLH hackathon season calendar high school',
    steps: ['Filter the calendar for open-to-high-school events', 'Apply early — some cap attendance'],
  },
  {
    id: 'hack-club',
    name: 'Hack Club',
    field: 'learning',
    what: 'A network of high-school programming clubs that runs its own jams, grants and hardware giveaways.',
    why: 'Built specifically for people your age, which almost nothing else in this list is. Also a route to a peer group that ships.',
    window: [],
    windowNote: 'Continuous, with programmes opening and closing through the year.',
    eligibility: 'High school students.',
    region: 'global',
    cost: 'free',
    search: 'Hack Club current programs high school',
    steps: ['Join the community', 'Check which programmes are open now', 'Start or join a club'],
  },

  /* ---------------------------------------------------------------------- */
  /* Scholarships                                                            */
  /* ---------------------------------------------------------------------- */
  {
    id: 'coca-cola-scholars',
    name: 'Coca-Cola Scholars',
    field: 'scholarship',
    what: 'A large achievement-based scholarship for US high school seniors.',
    why: 'One of the biggest by award size and volume. Opens early and closes before most people start thinking about applications.',
    window: [8, 9, 10],
    windowNote: 'Opens in August, closes around the end of October.',
    eligibility: 'US high school seniors. Check citizenship and GPA requirements.',
    region: 'us',
    cost: 'free',
    search: 'Coca-Cola Scholars Program application deadline',
    steps: [
      'Confirm eligibility before investing time',
      'Draft the activities list — it is the bulk of the work',
      'Submit at least a week early',
    ],
  },
  {
    id: 'jkc-college',
    name: 'Jack Kent Cooke College Scholarship',
    field: 'scholarship',
    what: 'A very large award for high-achieving students with financial need, covering much of an undergraduate degree.',
    why: 'Among the largest available to a high schooler anywhere. Correspondingly competitive, and worth a serious attempt.',
    window: [8, 9, 10, 11],
    windowNote: 'Autumn deadline for the following academic year.',
    eligibility: 'US high school seniors with demonstrated financial need.',
    region: 'us',
    cost: 'free',
    search: 'Jack Kent Cooke College Scholarship Program eligibility',
    steps: ['Check the financial need thresholds first', 'Gather transcripts and recommendations early'],
  },
  {
    id: 'davidson-fellows',
    name: 'Davidson Fellows',
    field: 'scholarship',
    what: 'Awards for significant pieces of work by young people, including a technology category.',
    why: 'Judges a *project*, not a transcript. If a game or engine is genuinely substantial, this is where it counts for money.',
    window: [1, 2],
    windowNote: 'Deadline usually in late winter.',
    eligibility: 'Under 18. Check current US residency requirements.',
    region: 'us',
    cost: 'free',
    search: 'Davidson Fellows Scholarship technology category',
    steps: [
      'Read the technology category criteria closely',
      'Assemble evidence the work is yours and is substantial',
    ],
  },
  {
    id: 'gates-scholarship',
    name: 'The Gates Scholarship',
    field: 'scholarship',
    what: 'A full last-dollar scholarship for outstanding minority high school seniors with financial need.',
    why: 'Covers what other aid does not, which is usually the part that decides whether a place is affordable.',
    window: [7, 8, 9],
    windowNote: 'Opens mid-year, closes in early autumn.',
    eligibility: 'US, Pell-eligible, specific minority-group requirements.',
    region: 'us',
    cost: 'free',
    search: 'The Gates Scholarship eligibility requirements',
    steps: ['Check eligibility carefully — it is narrow', 'Prepare financial documentation'],
  },
  {
    id: 'mena-advising',
    name: 'Regional education advising (MENA)',
    field: 'scholarship',
    what: 'Advising centres such as AMIDEAST and embassy-run education advising offices publish local scholarship and exchange programmes.',
    why: 'Almost every entry above is US-gated. If Tunisia is the base rather than a visit, the real pipeline runs through these offices, not through search engines.',
    window: [],
    windowNote: 'Rolling. Programmes are announced locally and often not indexed well.',
    eligibility: 'Varies. Many are aimed specifically at secondary students.',
    region: 'mena',
    cost: 'free',
    search: 'AMIDEAST Tunisia student programs education advising',
    steps: [
      'Find the nearest advising office',
      'Ask specifically what is open to secondary students this year',
      'Get on their mailing list — most announcements go out that way',
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* Craft, portfolio and the honest version of "internships"                */
  /* ---------------------------------------------------------------------- */
  {
    id: 'studio-outreach',
    name: 'Local studio outreach',
    field: 'gamedev',
    what: 'Cold-emailing small and mid-size studios near you asking to visit, shadow, or help with playtesting.',
    why: 'Paid game dev internships essentially do not exist below university age — studios are constrained by labour law, not by your ability. Unpaid access, however, is often available for the asking, and almost nobody asks.',
    window: [],
    windowNote: 'Continuous. Quieter periods after a launch are the best time to ask.',
    eligibility: 'No formal eligibility. This is a conversation, not an application.',
    region: 'global',
    cost: 'free',
    search: 'game studios near me indie',
    steps: [
      'List studios within reach, smallest first',
      'Write one short, specific email — name a game of theirs',
      'Offer something concrete: playtesting, bug reports, QA',
      'Follow up once after two weeks, then leave it',
    ],
  },
  {
    id: 'open-source-gamedev',
    name: 'Open-source contribution',
    field: 'gamedev',
    what: 'Contributing to Godot, Unity packages, Bevy, or the tooling around them.',
    why: 'A merged pull request is public, dated, verifiable evidence of skill. It is the closest thing to a work reference available at your age.',
    window: [],
    windowNote: 'Continuous.',
    eligibility: 'None. Repositories do not ask how old you are.',
    region: 'global',
    cost: 'free',
    search: 'Godot engine good first issue',
    steps: [
      'Pick one project you actually use',
      'Filter for good-first-issue labels',
      'Read the contribution guide before writing anything',
      'Ship one small fix before attempting anything large',
    ],
  },
  {
    id: 'engine-certification',
    name: 'Unity Learn / Unreal Online Learning',
    field: 'learning',
    what: 'Both engine vendors run free structured learning tracks, some with certification at the end.',
    why: 'Free, self-paced, and the certificates are recognised enough to be worth listing. Better use of a quiet month than another tutorial series.',
    window: [],
    windowNote: 'Continuous, self-paced.',
    eligibility: 'Open. Certification exams may charge a fee.',
    region: 'global',
    cost: 'varies',
    search: 'Unity Learn pathways certification',
    steps: ['Pick one pathway and finish it', 'Build something not in the course using it'],
  },
  {
    id: 'github-student-pack',
    name: 'GitHub Student Developer Pack',
    field: 'learning',
    what: 'A bundle of free professional developer tools and credits for verified students.',
    why: 'Costs nothing and quietly removes a lot of small expenses. Requires proof of school enrolment.',
    window: [],
    windowNote: 'Continuous. Verification takes a few days.',
    eligibility: 'Students aged 13+ with proof of enrolment.',
    region: 'global',
    cost: 'free',
    search: 'GitHub Student Developer Pack apply',
    steps: ['Gather proof of enrolment', 'Apply and wait for verification'],
  },
  {
    id: 'epic-megagrants',
    name: 'Epic MegaGrants',
    field: 'gamedev',
    what: 'Epic funds projects built with Unreal Engine, with no revenue share and no strings on ownership.',
    why: 'Applications are rolling rather than a once-a-year window. Worth knowing about now even if the project that deserves it does not exist yet.',
    window: [],
    windowNote: 'Rolling submissions, reviewed continuously.',
    eligibility: 'Likely requires being 18+ or applying through a legal entity — verify before building a plan around it.',
    region: 'global',
    cost: 'free',
    search: 'Epic MegaGrants application requirements',
    steps: [
      'Check the age and entity requirements first',
      'Have a playable build before applying',
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export const leadById = (id: string): Lead | undefined => LEADS.find((l) => l.id === id);

/** A lead with no window runs continuously and is always "open". */
export const isRolling = (l: Lead): boolean => l.window.length === 0;

/**
 * How many months until the next window opens. 0 means it is open now.
 *
 * Wraps around the year end, so a January deadline read in December returns 1
 * rather than a negative number.
 */
export function monthsUntilWindow(l: Lead, at = new Date()): number {
  if (isRolling(l)) return 0;
  const month = at.getMonth() + 1;
  let best = 12;
  for (const m of l.window) {
    const gap = (m - month + 12) % 12;
    if (gap < best) best = gap;
  }
  return best;
}

/** Open now, or opening within `months`. Rolling leads always qualify. */
export function upcoming(months = 2, at = new Date()): Lead[] {
  return LEADS.filter((l) => isRolling(l) || monthsUntilWindow(l, at) <= months).sort(
    (a, b) => monthsUntilWindow(a, at) - monthsUntilWindow(b, at)
  );
}

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/** `JUL/AUG` or `ROLLING`, for the window badge. */
export function windowLabel(l: Lead): string {
  if (isRolling(l)) return 'ROLLING';
  return l.window.map((m) => MONTHS[m - 1]).join('/');
}
