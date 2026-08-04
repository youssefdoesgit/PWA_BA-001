import { Tabs } from 'expo-router';

import { FnKey, fnTabBarStyle } from '@/components/fn-tabs';
import { SubsystemFrame } from '@/components/system-bar';
import { subsystem } from '@/theme/tokens';

const key = (n: number, label: string) => ({
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <FnKey n={n} label={label} focused={focused} tone={subsystem.desk} />
  ),
});

export default function DeskLayout() {
  return (
    <SubsystemFrame name="Docket" code="DKT-002" tone={subsystem.desk}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: fnTabBarStyle(subsystem.desk),
        }}>
        <Tabs.Screen name="index" options={key(1, 'BOARD')} />
        <Tabs.Screen name="tracks" options={key(2, 'TRACKS')} />
        <Tabs.Screen name="radar" options={key(3, 'RADAR')} />
        <Tabs.Screen name="brief" options={key(4, 'BRIEF')} />
      </Tabs>
    </SubsystemFrame>
  );
}
