import { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { byCode, convert, formatIn } from '@/lib/currency';
import { color, glyph, radius, space } from '@/theme/tokens';
import { Row, Txt } from './primitives';

/**
 * The balance, swipeable through every currency you care about.
 *
 * Each page renders the same total converted into one currency, so dragging
 * sideways reads as "what is this worth over there" rather than as navigation.
 */
export function CurrencyStrip({
  cents,
  base,
  codes,
  overrides,
  ratesSetAt,
  tone,
}: {
  cents: number;
  base: string;
  codes: string[];
  overrides: Record<string, number>;
  ratesSetAt?: number;
  tone?: string;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const ref = useRef<ScrollView>(null);

  // The home currency always leads, then anywhere you travel.
  const list = [base, ...codes.filter((c) => c !== base)];

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < list.length) setIndex(next);
  };

  const goTo = (i: number) => {
    setIndex(i);
    ref.current?.scrollTo({ x: i * width, animated: true });
  };

  const active = list[index] ?? base;
  const isConverted = active !== base;

  return (
    <View onLayout={onLayout}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast">
        {list.map((code) => {
          const value = convert(cents, base, code, overrides);
          return (
            <View key={code} style={{ width: width || undefined, minWidth: width || 1 }}>
              <Txt variant="micro" spaced tone={color.textFaint}>
                {byCode(code).name.toUpperCase()}
              </Txt>
              <Txt
                variant="hero"
                weight="bold"
                tone={tone ?? (value < 0 ? color.expense : color.text)}
                style={{ marginTop: 2 }}
                numberOfLines={1}
                adjustsFontSizeToFit>
                {formatIn(value, code)}
              </Txt>
            </View>
          );
        })}
      </ScrollView>

      {/* Currency selector / page indicator */}
      <Row style={{ gap: space.xs, marginTop: space.md, flexWrap: 'wrap' }}>
        {list.map((code, i) => {
          const on = i === index;
          return (
            <Pressable
              key={code}
              onPress={() => goTo(i)}
              style={[s.tag, on && { borderColor: color.accent, backgroundColor: color.glow }]}>
              <Txt variant="micro" weight="bold" tone={on ? color.accent : color.textFaint}>
                {code}
              </Txt>
            </Pressable>
          );
        })}
      </Row>

      {isConverted && (
        <Row style={{ gap: space.xs, marginTop: space.sm }}>
          <Txt variant="micro" tone={color.textFaint}>
            {glyph.arrow}
          </Txt>
          <Txt variant="micro" tone={color.textFaint}>
            {`ESTIMATE · RATES ${
              ratesSetAt ? `SET ${new Date(ratesSetAt).toLocaleDateString()}` : 'NOT VERIFIED'
            }`}
          </Txt>
        </Row>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tag: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
});
