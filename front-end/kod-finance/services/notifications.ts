import { Platform, Alert } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecurringBill } from '@/context/FinanceContext';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
let currentSoundEnabled = true;
const CHANNEL_ID = 'kod_alerts_v3';
const processedAchievements = new Set<string>();

// ─── Inicialização condicional para evitar crash no Expo Go ───
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    
    // Carrega preferência de som
    AsyncStorage.getItem('@kod_finance:notification_sound').then(val => {
      if (val !== null) currentSoundEnabled = val === 'true';
      configureNotificationHandler();
      setupNotificationChannel();
    }).catch(() => {
      configureNotificationHandler();
      setupNotificationChannel();
    });

  } catch (e) {
    console.warn('Erro ao carregar expo-notifications:', e);
  }
}

async function setupNotificationChannel() {
  if (Platform.OS === 'android' && Notifications) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Notificações do Kod Finance',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00bf63',
      sound: currentSoundEnabled ? 'notification' : null,
    });
  }
}

function configureNotificationHandler() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: currentSoundEnabled,
      shouldSetBadge:  false,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

/** Define a preferência de som das notificações */
export async function setNotificationSoundEnabled(enabled: boolean) {
  currentSoundEnabled = enabled;
  await AsyncStorage.setItem('@kod_finance:notification_sound', enabled ? 'true' : 'false');
  configureNotificationHandler();
  await setupNotificationChannel();
}

/** Solicitar permissão de notificação */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return false;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('Erro ao solicitar permissão de notificação:', e);
    return false;
  }
}

/** Envio imediato local */
async function sendLocal(title: string, body: string, data?: object) {
  console.log(`[Notification Alert] ${title}: ${body}`, data);

  // No Expo Go, simulamos a notificação nativa usando Alert.alert do React Native
  if (isExpoGo || !Notifications) {
    Alert.alert(title, body);
    return;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: (data ?? {}) as Record<string, unknown>,
        sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.error('Erro ao enviar notificação local:', e);
  }
}

// ─── Notificações do produto ────────────────────────────────────

/** Alerta quando o usuário atinge % do orçamento de uma categoria */
export async function notifyBudgetWarning(
  categoryName: string,
  pct: number,
  spent: number,
  limit: number,
) {
  const label = pct >= 100 ? '🚨 Orçamento estourado!' : '⚠️ Orçamento no limite';
  const body  = pct >= 100
    ? `Você passou R$ ${(spent - limit).toFixed(2)} acima do limite de ${categoryName}.`
    : `Você usou ${pct.toFixed(0)}% do orçamento de ${categoryName} (R$ ${spent.toFixed(0)} de R$ ${limit.toFixed(0)}).`;

  await sendLocal(label, body, { categoryName, pct });
}

/** Parabeniza quando o usuário adiciona uma entrada */
export async function notifyIncomeAdded(description: string, value: number) {
  await sendLocal(
    '💰 Receita registrada!',
    `+R$ ${value.toFixed(2)} de "${description}" foi adicionado ao seu saldo.`,
  );
}

/** Agenda notificações diárias (Simples ou Frequente com Motivação) */
export async function scheduleMotivationalNotifications(mode: 'single' | 'frequent' = 'single') {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    // Cancela agendamentos diários prévios
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (mode === 'frequent') {
      // 1. Manhã (08:30) - Foco & Disciplina
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Foco & Disciplina',
          body: 'Bom dia! Mantenha a disciplina financeira hoje. Pequenas escolhas constroem grandes conquistas.',
          sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 30,
        },
      });

      // 2. Tarde (14:00) - Consumo Consciente
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💡 Reflexão de Tarde',
          body: 'Pense duas vezes antes de gastos por impulso. O seu eu do futuro agradece!',
          sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 14,
          minute: 0,
        },
      });

      // 3. Noite (20:30) - Fechamento do dia
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📒 Fechamento do Dia',
          body: 'Como foram seus gastos hoje? Registre no Kod Finance antes de descansar.',
          sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 30,
        },
      });
    } else {
      // Notificação única noturna (20:30)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📒 Registro Diário',
          body: 'Não esqueça de registrar seus gastos de hoje no Kod Finance.',
          sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 30,
        },
      });
    }
  } catch (e) {
    console.error('Erro ao agendar notificações diárias:', e);
  }
}

/** Mantém apelido para retrocompatibilidade */
export async function scheduleDailyReminder(hour = 20, minute = 30) {
  await scheduleMotivationalNotifications('single');
}

export async function cancelDailyReminder() {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.error('Erro ao cancelar lembretes:', e);
  }
}

/** Agenda alertas de vencimento antecipados para contas recorrentes */
export async function scheduleBillDueDateReminders(bills: RecurringBill[]) {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const bill of bills) {
      // Se a conta já foi paga este mês, pula
      if (bill.lastPaidMonth === currentMonth) continue;

      const dueDay = bill.dueDay;
      const reminderDays = bill.reminderDaysBefore || 3;

      // Calcula data de vencimento no mês atual
      const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay, 9, 0, 0);

      // Alerta antecipado (ex: 3 dias antes)
      const advanceDate = new Date(dueDate);
      advanceDate.setDate(dueDate.getDate() - reminderDays);

      if (advanceDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Conta a vencer em breve',
            body: `Sua conta "${bill.description}" de R$ ${bill.value.toFixed(2)} vence em ${reminderDays} dias (dia ${dueDay}).`,
            sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: advanceDate },
        });
      }

      // Alerta no próprio dia do vencimento (09:00)
      if (dueDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 Vencimento hoje!',
            body: `Hoje é o dia de pagar "${bill.description}" (R$ ${bill.value.toFixed(2)}). Marque como paga no app!`,
            sound: currentSoundEnabled ? (Platform.OS === 'ios' ? 'notification.mp3' : 'notification') : undefined,
            ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
        });
      }
    }
  } catch (e) {
    console.error('Erro ao agendar lembretes de contas fixas:', e);
  }
}

/** Conquista — meta atingida */
export async function notifyGoalAchieved(goalTitle: string) {
  await sendLocal(
    '🎉 Meta conquistada!',
    `Parabéns! Você atingiu a meta "${goalTitle}". Continue assim!`,
  );
}

/** Notifica desbloqueio de Medalha / Conquista */
export async function notifyAchievementUnlocked(title: string, desc: string) {
  await sendLocal(
    `🏆 Medalha Desbloqueada!`,
    `Parabéns! Você conquistou "${title}": ${desc}`,
  );
}

/** Verifica e dispara notificações de novas conquistas atingidas */
export async function checkAndNotifyAchievements(params: {
  goalsCount: number;
  transactionsCount: number;
  balance: number;
  budgetsCount: number;
}) {
  try {
    const raw = await AsyncStorage.getItem('@kod_finance:unlocked_achievements');
    const unlockedList: string[] = raw ? JSON.parse(raw) : [];
    const newlyUnlocked: string[] = [];

    const achievements = [
      {
        id: 'first_goal',
        title: 'Primeiro Passo 🎯',
        desc: 'Adicionou sua primeira meta financeira.',
        isUnlocked: params.goalsCount > 0,
      },
      {
        id: 'saver_init',
        title: 'Poupador Iniciante 💰',
        desc: 'Registrou pelo menos 3 transações no app.',
        isUnlocked: params.transactionsCount >= 3,
      },
      {
        id: 'in_black',
        title: 'Mente Saudável 🟢',
        desc: 'Manteve o saldo geral do mês no azul.',
        isUnlocked: params.balance > 0,
      },
      {
        id: 'budget_boss',
        title: 'Mestre dos Gastos 🛡️',
        desc: 'Configurou seu primeiro limite de orçamento.',
        isUnlocked: params.budgetsCount > 0,
      },
    ];

    // Sincroniza o cache local
    unlockedList.forEach(id => processedAchievements.add(id));

    for (const a of achievements) {
      // Verifica se a conquista foi alcançada, se não está no AsyncStorage e se não foi processada nesta sessão
      if (a.isUnlocked && !unlockedList.includes(a.id) && !processedAchievements.has(a.id)) {
        processedAchievements.add(a.id); // Registra no cache de memória antes de processar de forma assíncrona
        newlyUnlocked.push(a.id);
        await notifyAchievementUnlocked(a.title, a.desc);
      }
    }

    if (newlyUnlocked.length > 0) {
      const updatedList = [...unlockedList, ...newlyUnlocked];
      await AsyncStorage.setItem('@kod_finance:unlocked_achievements', JSON.stringify(updatedList));
    }
  } catch (e) {
    console.error('Erro ao verificar conquistas:', e);
  }
}

/** Saldo negativo */
export async function notifyNegativeBalance(balance: number) {
  await sendLocal(
    '🔴 Saldo negativo',
    `Seu saldo está em R$ ${balance.toFixed(2)}. Revise seus gastos para equilibrar as finanças.`,
  );
}
