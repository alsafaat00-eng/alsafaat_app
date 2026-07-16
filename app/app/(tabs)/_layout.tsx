// Powered by OnSpace.AI
// SAFAT — Tabs Layout

import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from '@/components/ui/AppLinearGradient';
import { AppIcon } from '@/components/ui/FlaticonIcon';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { rtlDirection } from '@/lib/rtl';
import type { FlaticonStyle } from '@/constants/flaticon-glyphs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

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
  return <AppIcon name={name} variant={variant} color={color} size={size} />;
}

function AddListingTabButton({
  style,
  accessibilityState,
}: BottomTabBarButtonProps) {
  const router = useRouter();
  const { colors, gradients, scheme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel="إضافة إعلان"
      onPress={() => router.push('/create/listing')}
      style={[style, styles.addTabWrap]}
    >
      <LinearGradient
        colors={scheme === 'light' ? gradients.electric : gradients.royal}
        style={[styles.addTabBtn, { borderColor: colors.bgPrimary }]}
      >
        <AppIcon name="plus" variant="sr" size={34} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

export default function TabsLayout() {
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
          title: 'الرئيسية',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'السوق',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="tags" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarShowLabel: false,
          tabBarIcon: () => null,
          tabBarButton: (props) => <AddListingTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: 'المنشورات',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="newspaper" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon name="user" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addTabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTabBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginTop: -10,
  },
});
