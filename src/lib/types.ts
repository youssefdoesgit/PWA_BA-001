/** KEVLAR domain model. One person, one balance, nothing leaves the device. */

export type TxKind = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  /** Emoji, so it renders identically on web and iOS with zero assets. */
  icon: string;
  color: string;
  kind: TxKind;
  archived: boolean;
};

export type Transaction = {
  id: string;
  kind: TxKind;
  /** Always positive. `kind` carries the direction. */
  amount: number;
  categoryId?: string;
  note?: string;
  /** Epoch ms of when the money moved, not when it was logged. */
  date: number;
  createdAt: number;
};

export type Budget = {
  id: string;
  categoryId: string;
  /** Cap per budget month. */
  limit: number;
};

export type Goal = {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  color: string;
  createdAt: number;
};

export type RecurrenceUnit = 'week' | 'month' | 'year';

export type Recurring = {
  id: string;
  name: string;
  amount: number;
  categoryId?: string;
  every: number;
  unit: RecurrenceUnit;
  nextDue: number;
  color: string;
  active: boolean;
};

export type Settings = {
  /** What BRIC calls you. The only personal detail KEVLAR ever asks for. */
  name: string;
  currency: string;
  /** What was in your pocket the day you started. Balance builds from here. */
  openingBalance: number;
  /** Day the budget month rolls over. 1 = calendar month. */
  monthStartDay: number;

  onboarded: boolean;
  /** False until the in-app guided tour has been seen. */
  tourDone: boolean;

  /** User-corrected FX rates, expressed as units per USD. */
  rateOverrides: Record<string, number>;
  ratesSetAt?: number;
  /** Codes shown in the balance conversion strip, in order. */
  travelCurrencies: string[];

  /** Riba warnings, zakat tracking and halal framing in the advisory. */
  islamicMode: boolean;
  /** Gold price per gram, in minor units, for the zakat nisab. */
  goldPricePerGram?: number;

  /**
   * When your wealth last crossed the nisab threshold. Zakat falls due a full
   * lunar year (hawl) after this, so it only resets if you drop back below.
   */
  hawlStartedAt?: number;
  /** Records a hawl you have already settled, so BRIC stops asking. */
  lastZakatPaidAt?: number;

  /** Start of the most recent month BRIC has already issued a statement for. */
  lastStatementFor?: number;

  lastBackupAt?: number;
};

export type KevlarData = {
  version: number;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurring: Recurring[];
  settings: Settings;
};
