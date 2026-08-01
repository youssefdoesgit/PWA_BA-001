import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, glyph, mono, radius, space } from '@/theme/tokens';
import { Bob, Pulse } from './motion';
import { Row, Txt } from './primitives';

/* -------------------------------------------------------------------------- */
/* Agency furniture                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Document header. Every screen is a form issued by an authority that takes
 * itself far too seriously, which is the joke.
 */
export function FileHeader({
  title,
  code,
  subtitle,
  right,
}: {
  title: string;
  code: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt variant="micro" spaced tone={color.rust} weight="bold">
            {`FORM ${code}`}
          </Txt>
          <Txt variant="title" weight="bold" spaced style={{ marginTop: 2 }}>
            {title.toUpperCase()}
          </Txt>
          {subtitle ? (
            <Txt variant="micro" faint style={{ marginTop: 3 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </Row>
      <View style={s.doubleRule}>
        <View style={s.ruleThick} />
        <View style={s.ruleThin} />
      </View>
    </View>
  );
}

/**
 * A form row with dotted leaders running from label to value, the way a
 * printed ledger does it.
 */
export function LeaderRow({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: string;
  bold?: boolean;
}) {
  return (
    <Row style={{ marginVertical: 3 }}>
      <Txt variant="caption" dim numberOfLines={1}>
        {label.toUpperCase()}
      </Txt>
      <View style={s.leader}>
        <Txt variant="caption" tone={color.surfacePress} numberOfLines={1}>
          {'.'.repeat(60)}
        </Txt>
      </View>
      <Txt variant="caption" weight={bold ? 'bold' : 'medium'} tone={tone}>
        {value}
      </Txt>
    </Row>
  );
}

/** Rubber stamp. Slightly rotated, outlined, deliberately imperfect. */
export function Stamp({
  text,
  tone = color.stamp,
  angle = -8,
}: {
  text: string;
  tone?: string;
  angle?: number;
}) {
  return (
    <View style={[s.stamp, { borderColor: tone, transform: [{ rotate: `${angle}deg` }] }]}>
      <Txt variant="micro" weight="bold" spaced tone={tone}>
        {text.toUpperCase()}
      </Txt>
    </View>
  );
}

/** Small caps field label used above inputs on form-like screens. */
export function FieldLabel({ children }: { children: string }) {
  return (
    <Txt variant="micro" spaced tone={color.boneDim} weight="bold" style={{ marginBottom: space.sm }}>
      {`${children.toUpperCase()} ${glyph.rule.repeat(2)}`}
    </Txt>
  );
}

/* -------------------------------------------------------------------------- */
/* Mascot                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * BRIC — the assistant's face. An original ASCII construct, not a licensed
 * character: a little armour plate with eyes that change with its mood.
 */
export type Mood = 'idle' | 'happy' | 'warn' | 'alarm' | 'think';

const FACES: Record<Mood, string> = {
  idle: '● ●',
  happy: '^ ^',
  warn: '● ○',
  alarm: '× ×',
  think: '· ●',
};

const MOOD_TONE: Record<Mood, string> = {
  idle: color.accent,
  happy: color.income,
  warn: color.warn,
  alarm: color.expense,
  think: color.transfer,
};

/** Eyes shut. Shown for a beat whenever BRIC blinks. */
const BLINK = '– –';

export function Bric({ mood = 'idle', size = 54 }: { mood?: Mood; size?: number }) {
  const tone = MOOD_TONE[mood];
  const [blinking, setBlinking] = useState(false);

  // Irregular blinks read as alive; a fixed interval reads as a loading spinner.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(
        () => {
          setBlinking(true);
          setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 120);
        },
        2200 + Math.random() * 2600
      );
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  // Alarm state jitters instead of bobbing — it shouldn't look relaxed.
  const body = (
    <View
      style={[
        s.bric,
        { width: size, height: size, borderColor: tone, backgroundColor: `${tone}14` },
      ]}>
      <Txt
        style={{
          fontFamily: mono,
          fontSize: size * 0.26,
          color: tone,
          letterSpacing: -1,
        }}>
        {blinking ? BLINK : FACES[mood]}
      </Txt>
      <View
        style={[
          s.bricMouth,
          { backgroundColor: tone, width: size * (mood === 'happy' ? 0.42 : 0.32) },
        ]}
      />
    </View>
  );

  if (mood === 'alarm') return <Pulse min={0.55} ms={620}>{body}</Pulse>;
  return <Bob distance={2.5} ms={2400}>{body}</Bob>;
}

/** A speech panel from BRIC. */
export function BricSays({
  mood = 'idle',
  children,
  compact,
}: {
  mood?: Mood;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <Row style={{ alignItems: 'flex-start', gap: space.md }}>
      <Bric mood={mood} size={compact ? 38 : 50} />
      <View style={[s.bubble, { borderColor: `${MOOD_TONE[mood]}55` }]}>
        <View style={[s.tail, { borderRightColor: `${MOOD_TONE[mood]}55` }]} />
        {typeof children === 'string' ? (
          <Txt variant="caption" style={{ lineHeight: 19 }}>
            {children}
          </Txt>
        ) : (
          children
        )}
      </View>
    </Row>
  );
}

const s = StyleSheet.create({
  doubleRule: { marginTop: space.sm },
  ruleThick: { height: 2, backgroundColor: color.accent },
  ruleThin: { height: 1, backgroundColor: color.border, marginTop: 2 },
  leader: { flex: 1, overflow: 'hidden', marginHorizontal: 4 },
  stamp: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    opacity: 0.9,
  },
  bric: {
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bricMouth: { height: 2, opacity: 0.8 },
  bubble: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    padding: space.md,
  },
  tail: {
    position: 'absolute',
    left: -7,
    top: 14,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});
