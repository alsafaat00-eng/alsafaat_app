// Powered by OnSpace.AI
// SAFAT — Butcher Tabs Layout
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { rtlDirection } from '@/lib/rtl';
import type { FlaticonStyle } from '@/constants/flaticon-glyphs';

function TabBarIcon({
  name,
  color,
  size,
  focused,
}: {
  name: string;
  color: string;
  size: number;
  focused?: boolean;
}) {
  const variant: FlaticonStyle = focused ? 'sr' : 'rr';
  return <AppIcon name={name} variant={variant} size={size} color={color} />;
}

export default function ButcherTabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const tabBarBottom = Math.max(insets.bottom, 8) + 6;

  return (
    <Tabs
      key={scheme}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.electricBright,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabel: ({ focused, children }) => (
          <Text
            style={{
              color: focused ? colors.textBrandStrong : colors.textMuted,
              fontSize: 10,
              fontWeight: '600',
              writingDirection: 'rtl',
            }}
          >
            {children}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopColor: colors.borderSoft,
          borderTopWidth: 1,
          height: 58 + tabBarBottom,
          paddingTop: 8,
          paddingBottom: tabBarBottom,
          ...rtlDirection,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          writingDirection: 'rtl',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'التحليلات',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="bar-chart-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'إدارة الملحمة',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="storefront-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'الرسائل',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="chatbubbles-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="person-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
