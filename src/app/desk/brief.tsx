import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FileHeader, LeaderRow, VaneSays } from '@/components/ui/agency';
import { Rise, useTypewriter } from '@/components/ui/motion';
import { Tap } from '@/components/ui/press';
import { Card, Empty, Row, Rule, Screen, SectionTitle, Txt } from '@/components/ui/primitives';
import { completedSince, openTasks, overdueTasks, useDocket } from '@/lib/store';
import { DAY } from '@/lib/date';
import {
  buildSignals,
  streak,
  vaneGreeting,
  vaneSignoff,
  type Severity,
} from '@/lib/vane';
import { color, glyph, radius, space, subsystem } from '@/theme/tokens';

const TONE: Record<Severity, string> = {
  alarm: color.expense,
  warn: color.warn,
  info: color.transfer,
  good: color.income,
};

const LABEL: Record<Severity, string> = {
  alarm: 'ACT NOW',
  warn: 'WATCH',
  info: 'NOTED',
  good: 'CLEAR',
};

export default function Brief() {
  const router = useRouter();
  const docket = useDocket();

  const signals = buildSignals(docket);
  const greeting = useTypewriter(vaneGreeting(docket), 76);

  const open = openTasks(docket);
  const late = overdueTasks(docket);
  const week = completedSince(docket, Date.now() - 7 * DAY);
  const run = streak(docket);

  return (
    <Screen>
      <Rise>
        <FileHeader
          title="Brief"
          code="DKT-002/B"
          subtitle="Everything VANE can tell from your notes, computed on this device."
        />
      </Rise>

      <Rise delay={40}>
        <VaneSays mood={signals[0] ? (signals[0].severity === 'alarm' ? 'alarm' : signals[0].severity === 'warn' ? 'warn' : 'idle') : 'happy'}>
          {greeting}
        </VaneSays>
      </Rise>

      <Rise delay={90}>
        <SectionTitle>Readout</SectionTitle>
        <Card>
          <LeaderRow label="Open entries" value={String(open.length)} />
          <LeaderRow
            label="Past deadline"
            value={String(late.length)}
            tone={late.length > 0 ? color.expense : color.income}
            bold={late.length > 0}
          />
          <LeaderRow label="Closed this week" value={String(week.length)} tone={color.income} />
          <LeaderRow
            label="Day streak"
            value={run > 0 ? `${run}` : '—'}
            tone={run >= 3 ? color.income : undefined}
          />
        </Card>
      </Rise>

      <Rise delay={140}>
        <SectionTitle>{`${signals.length} signal${signals.length === 1 ? '' : 's'}`}</SectionTitle>

        {signals.length === 0 ? (
          <Empty
            icon="◉"
            title="Nothing to report"
            body="No deadlines, no drift, nothing gone cold. Write more down and I will have more to say."
          />
        ) : (
          signals.map((sig) => (
            <Tap
              key={sig.id}
              scale={0.99}
              weight="light"
              style={[s.signal, { borderColor: `${TONE[sig.severity]}55` }]}
              onPress={() => sig.href && router.push(sig.href as never)}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Row style={{ gap: space.sm, alignItems: 'center', flex: 1 }}>
                  <View style={[s.dot, { backgroundColor: TONE[sig.severity] }]} />
                  <Txt
                    variant="micro"
                    weight="bold"
                    spaced
                    tone={TONE[sig.severity]}>
                    {LABEL[sig.severity]}
                  </Txt>
                </Row>
                <Txt variant="caption" tone={color.textFaint}>
                  {glyph.arrow}
                </Txt>
              </Row>

              <Txt variant="caption" weight="bold" style={{ marginTop: space.sm }}>
                {sig.title}
              </Txt>
              <Txt variant="caption" dim style={{ marginTop: 4, lineHeight: 19 }}>
                {sig.detail}
              </Txt>
            </Tap>
          ))
        )}
      </Rise>

      <Rise delay={200}>
        <Rule />
        <Txt variant="micro" faint style={{ textAlign: 'center', lineHeight: 17 }}>
          {vaneSignoff()}
        </Txt>
        <Txt
          variant="micro"
          faint
          style={{ textAlign: 'center', lineHeight: 17, marginTop: space.sm }}>
          VANE is a rules engine, not a model. She reads what you have written down and nothing
          else — no connection, no lookups.
        </Txt>
      </Rise>
    </Screen>
  );
}

const s = StyleSheet.create({
  signal: {
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space.lg,
    marginBottom: space.sm,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
