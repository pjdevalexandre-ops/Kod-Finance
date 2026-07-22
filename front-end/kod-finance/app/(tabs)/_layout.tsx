import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { FinanceTheme } from '@/constants/theme';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: (Platform.OS === 'ios' ? 56 : 56) + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Análises',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'chart-bar' : 'chart-bar'} color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Orçamento',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'account-circle' : 'account-circle-outline'} color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      {/* esconder tela legada explore */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ name, color, focused, theme }: {
  name: string; color: string; focused: boolean; theme: any;
}) {
  return (
    <View style={[styles.iconWrapper, focused && { backgroundColor: theme.primaryGlow }]}>
      <MaterialCommunityIcons name={name as any} size={24} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
