import { Tabs } from 'expo-router';

import { FnKey, fnTabBarStyle } from '@/components/fn-tabs';
import { SubsystemFrame } from '@/components/system-bar';
import { subsystem } from '@/theme/tokens';

const key = (n: number, label: string) => ({
  tabBarIcon: ({ focused }: { focused: boolean }) => (
    <FnKey n={n} label={label} focused={focused} tone={subsystem.bank} />
  ),
});

export default function BankLayout() {
  return (
    <SubsystemFrame name="Banking" code="BNK-001" tone={subsystem.bank}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: fnTabBarStyle(subsystem.bank),
        }}>
        <Tabs.Screen name="index" options={key(1, 'HOME')} />
        <Tabs.Screen name="log" options={key(2, 'LOG')} />
        <Tabs.Screen name="budgets" options={key(3, 'PLAN')} />
        <Tabs.Screen name="goals" options={key(4, 'GOALS')} />
        <Tabs.Screen name="advisor" options={key(5, 'ADVISOR')} />
      </Tabs>
    </SubsystemFrame>
  );
}
