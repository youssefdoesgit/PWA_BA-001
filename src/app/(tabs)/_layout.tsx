import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';

import { Txt } from '@/components/ui/primitives';
import { color, font, mono, space } from '@/theme/tokens';

/**
 * Tab bar styled as a terminal function-key strip: F1..F5 with square
 * indicator blocks instead of icons.
 */
function Key({ n, label, focused }: { n: number; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, paddingTop: 2 }}>
      <Txt
        variant="micro"
        weight="bold"
        tone={focused ? color.accentText : color.textFaint}
        style={{
          backgroundColor: focused ? color.accent : 'transparent',
          paddingHorizontal: 5,
          paddingVertical: 1,
          overflow: 'hidden',
        }}>
        {`F${n}`}
      </Txt>
      <Txt variant="micro" weight="bold" spaced tone={focused ? color.accent : color.textFaint}>
        {label}
      </Txt>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.accent,
          borderTopWidth: 2,
          height: Platform.OS === 'web' ? 60 : 84,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <Key n={1} label="HOME" focused={focused} /> }}
      />
      <Tabs.Screen
        name="log"
        options={{ tabBarIcon: ({ focused }) => <Key n={2} label="LOG" focused={focused} /> }}
      />
      <Tabs.Screen
        name="budgets"
        options={{ tabBarIcon: ({ focused }) => <Key n={3} label="PLAN" focused={focused} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ tabBarIcon: ({ focused }) => <Key n={4} label="GOALS" focused={focused} /> }}
      />
      <Tabs.Screen
        name="advisor"
        options={{ tabBarIcon: ({ focused }) => <Key n={5} label="ADVISOR" focused={focused} /> }}
      />
    </Tabs>
  );
}
