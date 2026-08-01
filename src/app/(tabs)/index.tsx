import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Bric, LeaderRow } from '@/components/ui/agency';
import { CurrencyStrip } from '@/components/ui/currency-strip';
import { Rise, useRolling } from '@/components/ui/motion';
import { Amount, Card, Row, Rule, Screen, SectionTitle, Txt } from '@/components/ui/primitives';
import { headline } from '@/lib/advisor';
import { bricQuip } from '@/lib/bric';
import { formatIn } from '@/lib/currency';
import { dayLabel } from '@/lib/date';
import { balance, monthTotals, useData } from '@/lib/store';
import { color, glyph, radius, space } from '@/theme/tokens';

/** Short, time-aware, and in BRIC's register. */
function salutation(name: string): string {
  const h = new Date().getHours();
  const part =
    h < 5 ? 'Still awake' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : `${part}, sir`;
}

export default function Home() {
  const router = useRouter();
  const data = useData();
  const { currency, travelCurrencies, rateOverrides, ratesSetAt, name } = data.settings;

  const total = balance(data);
  const rolled = useRolling(total);
  const month = monthTotals(data);
  const recent = data.transactions.slice(0, 4);
  const catById = new Map(data.categories.map((c) => [c.id, c]));
  const head = headline(data);
  const money = (c: number) => formatIn(c, currency);

  // The categories you reach for most, so logging is two taps from here.
  const quick = data.categories.filter((c) => !c.archived && c.kind === 'expense').slice(0, 6);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Rise>
          <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
            <View>
              <Txt variant="micro" spaced tone={color.rust} weight="bold">
                KEVLAR
              </Txt>
              <Txt variant="lead" weight="bold" style={{ marginTop: 2 }} numberOfLines={1}>
                {salutation(name)}
              </Txt>
            </View>
            <Pressable onPress={() => router.push('/settings')} hitSlop={14}>
              <Txt variant="title" dim>
                ⚙
              </Txt>
            </Pressable>
          </Row>
        </Rise>

        {/* Balance — swipe it sideways for other currencies */}
        <Rise delay={60}>
          <Card label="balance" tint={color.accent} style={{ paddingVertical: space.xl }}>
            <CurrencyStrip
              cents={rolled}
              base={currency}
              codes={travelCurrencies ?? []}
              overrides={rateOverrides ?? {}}
              ratesSetAt={ratesSetAt}
            />
            <Rule />
            <LeaderRow label="In this month" value={money(month.income)} tone={color.income} />
            <LeaderRow label="Out this month" value={money(month.expense)} tone={color.expense} />
            <LeaderRow
              label="Net"
              value={money(month.net)}
              tone={month.net >= 0 ? color.income : color.expense}
              bold
            />
          </Card>
        </Rise>

        {/* Two taps to log anything */}
        <Rise delay={120}>
          <SectionTitle>Quick log</SectionTitle>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
            {quick.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push({ pathname: '/add', params: { category: c.id } })}
                style={({ pressed }) => [
                  s.quick,
                  { borderColor: `${c.color}66` },
                  pressed && { backgroundColor: color.surfacePress, transform: [{ translateY: 1 }] },
                ]}>
                <Txt variant="title">{c.icon}</Txt>
                <Txt variant="micro" tone={c.color} weight="bold" numberOfLines={1}>
                  {c.name.toUpperCase()}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </Rise>

        {/* BRIC */}
        <Rise delay={180}>
          <Pressable onPress={() => router.push('/advisor')}>
            <Card style={{ marginTop: space.lg }} tint={color.borderHi}>
              <Row style={{ gap: space.md }}>
                <Bric mood={head.mood} size={42} />
                <View style={{ flex: 1 }}>
                  <Txt variant="micro" spaced tone={color.rust} weight="bold">
                    BRIC
                  </Txt>
                  <Txt variant="caption" style={{ marginTop: 3, lineHeight: 18 }}>
                    {head.text}
                  </Txt>
                  <Txt variant="micro" faint style={{ marginTop: 4, lineHeight: 15 }}>
                    {bricQuip(data)}
                  </Txt>
                </View>
                <Txt variant="body" tone={color.accent}>
                  {glyph.arrow}
                </Txt>
              </Row>
            </Card>
          </Pressable>
        </Rise>

        {/* Recent */}
        <Rise delay={240}>
          <SectionTitle
            action={
              <Pressable hitSlop={8} onPress={() => router.push('/log')}>
                <Txt variant="micro" weight="bold" spaced tone={color.accent}>
                  ALL
                </Txt>
              </Pressable>
            }>
            Recent
          </SectionTitle>

          {recent.length === 0 ? (
            <Card>
              <Txt variant="caption" dim style={{ textAlign: 'center', lineHeight: 19 }}>
                Nothing logged yet. Tap a category above, punch in the amount, done.
              </Txt>
            </Card>
          ) : (
            <Card style={{ padding: 0 }}>
              {recent.map((t, i) => {
                const cat = t.categoryId ? catById.get(t.categoryId) : undefined;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => router.push('/log')}
                    style={({ pressed }) => [
                      s.txRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: color.border },
                      pressed && { backgroundColor: color.surfacePress },
                    ]}>
                    <Txt variant="title">{cat?.icon ?? '▦'}</Txt>
                    <View style={{ flex: 1, marginLeft: space.md }}>
                      <Txt variant="caption" weight="bold" numberOfLines={1}>
                        {t.note || cat?.name || 'Unfiled'}
                      </Txt>
                      <Txt variant="micro" faint style={{ marginTop: 2 }}>
                        {dayLabel(t.date).toUpperCase()}
                      </Txt>
                    </View>
                    <Amount
                      variant="caption"
                      tone={t.kind === 'income' ? color.income : color.text}>
                      {t.kind === 'income' ? '+' : '−'}
                      {money(t.amount)}
                    </Amount>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </Rise>
      </Screen>

      <Pressable
        onPress={() => router.push('/add')}
        style={({ pressed }) => [s.fab, pressed && { transform: [{ translateY: 2 }] }]}>
        <Txt variant="title" weight="bold" tone={color.accentText}>
          +
        </Txt>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  quick: {
    width: 84,
    height: 76,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: space.md },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.accentDim,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
