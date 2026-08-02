import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bric } from '@/components/ui/agency';
import { Tap, notify } from '@/components/ui/press';
import { Row, Txt } from '@/components/ui/primitives';
import { bricOnUndo } from '@/lib/bric';
import { useSession } from '@/lib/session';
import { color, radius, space } from '@/theme/tokens';

/** How long BRIC's remark stays before it withdraws. */
const LINGER = 4200;

/**
 * BRIC's transient voice — confirmations, corrections, undo.
 *
 * Sits above the tab bar so it never covers the thing you just acted on, and
 * withdraws on its own. Anything reversible gets an UNDO on the right.
 */
export function BricBar() {
  const toast = useSession((s) => s.toast);
  const dismiss = useSession((s) => s.dismiss);
  const say = useSession((s) => s.say);
  const insets = useSafeAreaInsets();

  // Restart the timer whenever a new remark replaces the old one.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, LINGER);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(240).springify().damping(18)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[s.wrap, { bottom: insets.bottom + 96 }]}>
      <View style={s.bar}>
        <Bric mood={toast.mood} size={34} />
        <Txt variant="caption" style={{ flex: 1, marginLeft: space.md, lineHeight: 17 }}>
          {toast.text}
        </Txt>

        {toast.undo ? (
          <Tap
            weight="medium"
            style={s.undo}
            onPress={() => {
              toast.undo?.();
              notify('warning');
              say(bricOnUndo(), { mood: 'idle' });
            }}>
            <Txt variant="micro" weight="bold" spaced tone={color.accentText}>
              UNDO
            </Txt>
          </Tap>
        ) : (
          <Tap weight="light" onPress={dismiss} style={s.close}>
            <Txt variant="caption" faint>
              ✕
            </Txt>
          </Tap>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 500 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceHi,
    borderWidth: 1,
    borderColor: color.borderHi,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  undo: {
    backgroundColor: color.accent,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginLeft: space.sm,
  },
  close: { paddingHorizontal: space.sm, paddingVertical: 4 },
});

/** Quiet banner offering to reload once a new build has been cached. */
export function UpdateBanner() {
  const ready = useSession((s) => s.updateReady);
  const insets = useSafeAreaInsets();
  if (!ready) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[u.wrap, { top: insets.top + space.sm }]}>
      <Tap
        weight="medium"
        style={u.bar}
        onPress={() => {
          if (typeof window !== 'undefined') window.location.reload();
        }}>
        <Row style={{ gap: space.sm, alignItems: 'center' }}>
          <Bric mood="happy" size={26} />
          <Txt variant="micro" weight="bold" spaced tone={color.accentText}>
            NEW VERSION READY · TAP TO APPLY
          </Txt>
        </Row>
      </Tap>
    </Animated.View>
  );
}

const u = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 600 },
  bar: {
    backgroundColor: color.accent,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
});
