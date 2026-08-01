import { useMemo } from 'react';
import { View } from 'react-native';

import { BricSays, FileHeader, LeaderRow, Stamp } from '@/components/ui/agency';
import { Amount, Bar, Card, Empty, Row, Rule, Screen, SectionTitle, Txt } from '@/components/ui/primitives';
import { buildInsights, computeMetrics, computeZakat, greeting, type Severity } from '@/lib/advisor';
import { formatIn } from '@/lib/currency';
import { useData, useStore } from '@/lib/store';
import { color, space } from '@/theme/tokens';

const TONE: Record<Severity, string> = {
  good: color.income,
  info: color.transfer,
  warn: color.warn,
  alarm: color.expense,
};

export default function Advisor() {
  const data = useData();
  const { currency } = data.settings;

  const now = Date.now();
  const insights = useMemo(() => buildInsights(data, now), [data, now]);
  const m = useMemo(() => computeMetrics(data, now), [data, now]);
  const zakat = useMemo(() => computeZakat(data), [data]);

  const money = (c: number) => formatIn(c, currency);
  const worstMood = insights[0]?.mood ?? 'idle';

  const counts = insights.reduce(
    (acc, i) => ({ ...acc, [i.severity]: (acc[i.severity] ?? 0) + 1 }),
    {} as Record<Severity, number>
  );

  /* Only mention buckets that actually have something in them — listing
     "0 urgent, 0 to watch" next to a real finding just reads as broken. */
  const breakdown = (
    [
      ['urgent', counts.alarm],
      ['to watch', counts.warn],
      ['to note', counts.info],
      ['going well', counts.good],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${n} ${label}`)
    .join(', ');

  return (
    <Screen>
      <FileHeader
        title="Advisory"
        code="K-04 / ANALYSIS"
        subtitle="COMPUTED LOCALLY · NO DATA TRANSMITTED"
      />

      <BricSays mood={worstMood}>
        {insights.length === 0
          ? greeting(data, 0)
          : `${greeting(data, insights.length)} ${breakdown}.`}
      </BricSays>

      {/* Vitals */}
      <SectionTitle>Vitals</SectionTitle>
      <Card label="this month">
        <LeaderRow label="Income" value={money(m.income)} tone={color.income} />
        <LeaderRow label="Spent" value={money(m.expense)} tone={color.expense} />
        <LeaderRow
          label="Net"
          value={money(m.net)}
          tone={m.net >= 0 ? color.income : color.expense}
          bold
        />
        <Rule />
        <LeaderRow
          label="Savings rate"
          value={m.savingsRate === null ? '—' : `${Math.round(m.savingsRate * 100)}%`}
        />
        <LeaderRow label="Daily burn" value={money(Math.round(m.dailyBurn))} />
        <LeaderRow
          label="Projected month"
          value={money(m.projectedSpend)}
          tone={m.prevExpense && m.projectedSpend > m.prevExpense ? color.warn : undefined}
        />
        <LeaderRow
          label="Runway"
          value={m.runwayDays === null ? '—' : `${m.runwayDays} days`}
          tone={m.runwayDays !== null && m.runwayDays < 30 ? color.expense : undefined}
        />
        <LeaderRow
          label="Emergency cover"
          value={m.emergencyMonths === null ? '—' : `${m.emergencyMonths.toFixed(1)} months`}
          tone={
            m.emergencyMonths === null
              ? undefined
              : m.emergencyMonths < 1
                ? color.expense
                : m.emergencyMonths < 3
                  ? color.warn
                  : color.income
          }
        />
        <LeaderRow label="Committed monthly" value={money(Math.round(m.recurringMonthly))} />

        {m.emergencyMonths !== null && (
          <View style={{ marginTop: space.md }}>
            <Txt variant="micro" faint style={{ marginBottom: 4 }}>
              EMERGENCY COVER · TARGET 3 MONTHS
            </Txt>
            <Bar
              pct={m.emergencyMonths / 3}
              tint={
                m.emergencyMonths < 1
                  ? color.expense
                  : m.emergencyMonths < 3
                    ? color.warn
                    : color.income
              }
            />
          </View>
        )}
      </Card>

      {/* Zakat */}
      {data.settings.islamicMode && (
        <>
          <SectionTitle>Zakat</SectionTitle>
          <Card label="2.5% · nisab 85g gold" tint={color.mustard}>
            <LeaderRow label="Qualifying wealth" value={money(zakat.base)} />
            <LeaderRow
              label="Nisab threshold"
              value={zakat.nisab === null ? 'set gold price' : money(zakat.nisab)}
            />
            <Rule />
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt variant="caption" dim>
                ESTIMATED DUE
              </Txt>
              <Amount variant="title" tone={color.mustard}>
                {zakat.due === null ? '—' : money(zakat.due)}
              </Amount>
            </Row>
            <Txt variant="micro" faint style={{ marginTop: space.md, lineHeight: 16 }}>
              Estimate based on logged balances only. Excludes gold, property, business assets and
              debts owed. Zakat falls due after a full lunar year (hawl). Confirm with a scholar.
            </Txt>
          </Card>
        </>
      )}

      {/* Findings */}
      <SectionTitle>Findings</SectionTitle>

      {insights.length === 0 ? (
        <Empty icon="✓" title="All clear" body="Nothing needs your attention this month." />
      ) : (
        insights.map((i) => (
          <Card key={i.id} tint={`${TONE[i.severity]}55`} style={{ marginBottom: space.md }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: space.md }}>
                <Stamp text={i.tag} tone={TONE[i.severity]} angle={-3} />
                <Txt variant="body" weight="bold" style={{ marginTop: space.md }}>
                  {i.title}
                </Txt>
              </View>
              {i.metric ? (
                <Amount variant="title" tone={TONE[i.severity]}>
                  {i.metric}
                </Amount>
              ) : null}
            </Row>
            <Txt variant="caption" dim style={{ marginTop: space.md, lineHeight: 19 }}>
              {i.body}
            </Txt>
          </Card>
        ))
      )}

      <Card style={{ marginTop: space.lg }} tint={color.border}>
        <Txt variant="micro" faint style={{ lineHeight: 16 }}>
          KEVLAR runs this analysis on your device using your own numbers. It is not a licensed
          financial adviser and will not recommend specific investments. Religious rulings are
          summarised for orientation only — take them to a qualified scholar.
        </Txt>
      </Card>
    </Screen>
  );
}
