import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '@/config/firebase.config';
import { requestNotificationPermission, scheduleDailyReminder } from '@/services/notifications';

export type AppThemeMode = 'light' | 'dark';

export interface UserProfile {
  name: string;
  email: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  dueDate: string;
  description?: string;
  achieved: boolean;
}

interface AppContextData {
  isLoggedIn: boolean;
  isReady: boolean;
  user: UserProfile;
  themeMode: AppThemeMode;
  goals: Goal[];
  signIn: (name: string, email: string) => void;
  signOut: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  toggleTheme: () => void;
  setThemeMode: (mode: AppThemeMode) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'achieved'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

const STORAGE_KEYS = {
  user: '@kod_finance:user',
  theme: '@kod_finance:theme',
  loggedIn: '@kod_finance:loggedIn',
  goals: '@kod_finance:goals',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile>({ name: '', email: '' });
  const [themeMode, setThemeMode] = useState<AppThemeMode>('dark');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadAppState() {
      try {
        const [storedUser, storedTheme, storedGoals, storedLoggedIn] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.user),
          AsyncStorage.getItem(STORAGE_KEYS.theme),
          AsyncStorage.getItem(STORAGE_KEYS.goals),
          AsyncStorage.getItem(STORAGE_KEYS.loggedIn),
        ]);

        console.log('💾 AsyncStorage carregado:', { storedUser, storedTheme, storedLoggedIn });

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeMode(storedTheme);
        }

        if (storedGoals) {
          setGoals(JSON.parse(storedGoals));
        }

        const isLogged = storedLoggedIn === 'true';
        console.log('✅ isLoggedIn definido como:', isLogged);
        setIsLoggedIn(isLogged);
      } catch (error) {
        console.error('Erro ao carregar estado do app:', error);
      } finally {
        setIsReady(true);
      }
    }

    loadAppState();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    async function saveAppState() {
      try {
        console.log('💾 Salvando AppState:', { user, isLoggedIn });
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user)),
          AsyncStorage.setItem(STORAGE_KEYS.theme, themeMode),
          AsyncStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals)),
          AsyncStorage.setItem(STORAGE_KEYS.loggedIn, isLoggedIn ? 'true' : 'false'),
        ]);
        console.log('✅ AppState salvo com sucesso');
      } catch (error) {
        console.error('Erro ao salvar estado do app:', error);
      }
    }

    saveAppState();
  }, [user, themeMode, goals, isLoggedIn, isReady]);

  function signIn(name: string, email: string) {
    console.log('📱 AppContext.signIn() chamado:', { name, email });
    setUser({ name, email });
    setIsLoggedIn(true);
    // Solicitar permissão e agendar lembrete diário às 21h
    requestNotificationPermission().then(granted => {
      if (granted) scheduleDailyReminder(21, 0).catch(() => {});
    }).catch(() => {});
  }

  async function signOut() {
    console.log('📱 AppContext.signOut() chamado');
    try {
      await GoogleSignin.signOut();
    } catch (e) {}
    try {
      await auth.signOut();
    } catch (e) {}
    setIsLoggedIn(false);
    setUser({ name: '', email: '' });
  }

  function updateProfile(profile: Partial<UserProfile>) {
    setUser(prev => ({ ...prev, ...profile }));
  }

  function toggleTheme() {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  function addGoal(goal: Omit<Goal, 'id' | 'achieved'>) {
    setGoals(prev => [
      {
        ...goal,
        id: Date.now().toString(),
        achieved: goal.currentAmount >= goal.targetAmount,
      },
      ...prev,
    ]);
  }

  function updateGoal(id: string, goal: Partial<Goal>) {
    setGoals(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              ...goal,
              achieved:
                goal.currentAmount !== undefined
                  ? goal.currentAmount >= (goal.targetAmount ?? item.targetAmount)
                  : item.achieved,
            }
          : item,
      ),
    );
  }

  function deleteGoal(id: string) {
    setGoals(prev => prev.filter(goal => goal.id !== id));
  }

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isReady,
        user,
        themeMode,
        goals,
        signIn,
        signOut,
        updateProfile,
        toggleTheme,
        setThemeMode,
        addGoal,
        updateGoal,
        deleteGoal,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
