// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { FinanceProvider } from '@/context/FinanceContext';
import { AppProvider, useApp } from '@/context/AppContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { themeMode, isLoggedIn, isReady } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (isLoggedIn) {
      console.log('✅ isLoggedIn=true → navegando para /(tabs)');
      router.replace('/(tabs)');
    } else {
      console.log('❌ isLoggedIn=false → navegando para /');
      router.replace('/');
    }
  }, [isLoggedIn, isReady, router]);

  // Exibe tela de carregamento enquanto o AsyncStorage ainda está sendo lido
  if (!isReady) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: themeMode === 'dark' ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#4F8CFF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={themeMode === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="add-transaction" options={{ headerShown: false }} />
        <Stack.Screen name="edit-transaction" options={{ headerShown: false }} />
        <Stack.Screen name="goals" options={{ headerShown: false }} />
        <Stack.Screen name="edit-goal" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <FinanceProvider>
        <RootLayoutContent />
      </FinanceProvider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});