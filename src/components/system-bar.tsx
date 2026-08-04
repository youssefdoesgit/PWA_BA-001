import { useRouter } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SyncPip } from '@/components/sync-pip';
import { Tap } from '@/components/ui/press';
import { Row, Txt } from '@/components/ui/primitives';
import { color, space } from '@/theme/tokens';

/**
 * The chrome every subsystem wears.
 *
 * A mainframe terminal always told you which subsystem you were talking to and
 * always let you get back to the switcher. That is the entire job here: a
 * breadcrumb back to the mainframe on the left, machine state on the right,
 * and a rule in the subsystem's own phosphor so the colour alone tells you
 * where you are.
 */
export function SystemBar({
  name,
  code,
  tone,
}: {
  /** Subsystem name, e.g. BANKING. */
  name: string;
  /** Its form number, e.g. BNK-001. */
  code: string;
  tone: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.bar, { paddingTop: insets.top + space.xs, borderBottomColor: `${tone}55` }]}>
      <Tap
        scale={0.97}
        weight="light"
        hitSlop={10}
        style={s.crumb}
        onPress={() => router.navigate('/')}>
        <Row style={{ gap: 5, alignItems: 'center' }}>
          <Txt variant="micro" weight="bold" tone={color.textFaint}>
            ◀
          </Txt>
          <Txt variant="micro" weight="bold" spaced tone={color.rust}>
            KEVLAR
          </Txt>
          <Txt variant="micro" tone={color.textFaint}>
            ▸
          </Txt>
          <Txt variant="micro" weight="bold" spaced tone={tone}>
            {name.toUpperCase()}
          </Txt>
        </Row>
      </Tap>

      <Row style={{ gap: space.md, alignItems: 'center' }}>
        <Txt variant="micro" tone={color.textFaint}>
          {code}
        </Txt>
        <SyncPip />
        <Tap
          scale={0.9}
          weight="light"
          hitSlop={12}
          onPress={() => router.push('/settings')}
          style={{ paddingHorizontal: 2 }}>
          <Txt variant="lead" dim>
            ⚙
          </Txt>
        </Tap>
      </Row>
    </View>
  );
}

/**
 * Wraps a subsystem's screens so they lay out beneath the bar.
 *
 * `Screen` pads itself by the top safe-area inset, which is correct when it is
 * the topmost thing on screen and wrong once the system bar has already eaten
 * that space. Rather than teach every screen about the bar, the inset is
 * overridden for everything below it — the bar consumed it, so as far as the
 * children are concerned there is no notch left to avoid.
 */
export function SubsystemFrame({
  name,
  code,
  tone,
  children,
}: {
  name: string;
  code: string;
  tone: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const consumed = useMemo(() => ({ ...insets, top: 0 }), [insets]);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <SystemBar name={name} code={code} tone={tone} />
      <SafeAreaInsetsContext.Provider value={consumed}>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: color.surface,
    borderBottomWidth: 1,
  },
  crumb: { paddingVertical: 2, paddingRight: space.sm },
});
