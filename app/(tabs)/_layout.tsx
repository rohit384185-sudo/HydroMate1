import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalization } from '@/localization';
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

const HOME_ACTIVE_COLOR = '#0A7EA4';
const TODAY_ACTIVE_COLOR = '#2F80C9';
const SETTINGS_ACTIVE_COLOR = '#D17A22';
const REMINDERS_ACTIVE_COLOR = '#6D5BD0';

type TabLabelProps = {
  activeColor: string;
  focused: boolean;
  inactiveColor: string;
  label: string;
};

function TabLabel({
  activeColor,
  focused,
  inactiveColor,
  label,
}: TabLabelProps) {
  return (
    <Text
      numberOfLines={1}
      style={{
        color: focused ? activeColor : inactiveColor,
        fontSize: 12,
        fontWeight: focused ? '600' : '500',
      }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useLocalization();
  const inactiveColor = Colors[colorScheme ?? 'light'].tabIconDefault;

  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused, size }) => (
            <IconSymbol
              size={size}
              name="house.fill"
              color={focused ? HOME_ACTIVE_COLOR : inactiveColor}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              activeColor={HOME_ACTIVE_COLOR}
              focused={focused}
              inactiveColor={inactiveColor}
              label={t('tabs.home')}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="today"
        options={{
          title: t("tabs.today"),
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={focused ? TODAY_ACTIVE_COLOR : inactiveColor}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              activeColor={TODAY_ACTIVE_COLOR}
              focused={focused}
              inactiveColor={inactiveColor}
              label={t('tabs.today')}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={focused ? SETTINGS_ACTIVE_COLOR : inactiveColor}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              activeColor={SETTINGS_ACTIVE_COLOR}
              focused={focused}
              inactiveColor={inactiveColor}
              label={t('tabs.settings')}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reminders"
        options={{
          title: t('tabs.reminders'),
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="notifications"
              size={size}
              color={focused ? REMINDERS_ACTIVE_COLOR : inactiveColor}
            />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              activeColor={REMINDERS_ACTIVE_COLOR}
              focused={focused}
              inactiveColor={inactiveColor}
              label={t('tabs.reminders')}
            />
          ),
        }}
      />
    </Tabs>
  );
}
