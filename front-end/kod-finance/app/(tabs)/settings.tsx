import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase.config';
import { useApp } from '@/context/AppContext';
import { useFinance } from '@/context/FinanceContext';
import { FinanceTheme } from '@/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleMotivationalNotifications,
  cancelDailyReminder,
  setNotificationSoundEnabled,
} from '@/services/notifications';

export default function SettingsScreen() {
  const { user, updateProfile, themeMode, toggleTheme, signOut, goals } = useApp();
  const { transactions, budgets, balance: financeBalance } = useFinance();
  
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [freqMode, setFreqModeState] = useState<'single' | 'frequent'>('single');
  const theme = FinanceTheme[themeMode];

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  useEffect(() => {
    (async () => {
      const [rVal, sVal, fVal] = await Promise.all([
        AsyncStorage.getItem('@kod_finance:reminder_enabled'),
        AsyncStorage.getItem('@kod_finance:notification_sound'),
        AsyncStorage.getItem('@kod_finance:notification_freq'),
      ]);
      setReminderEnabled(rVal === 'true');
      if (sVal !== null) setSoundEnabledState(sVal === 'true');
      if (fVal === 'frequent' || fVal === 'single') setFreqModeState(fVal as any);
    })();
  }, []);

  async function handleToggleReminder(val: boolean) {
    setReminderEnabled(val);
    await AsyncStorage.setItem('@kod_finance:reminder_enabled', val ? 'true' : 'false');
    if (val) {
      await scheduleMotivationalNotifications(freqMode);
      Alert.alert('🔔 Lembretes Ativados', 'Enviaremos alertas para ajudar você a manter a disciplina financeira.');
    } else {
      await cancelDailyReminder();
      Alert.alert('🔕 Lembretes Desativados', 'Você não receberá mais notificações diárias.');
    }
  }

  async function handleToggleSound(val: boolean) {
    setSoundEnabledState(val);
    await setNotificationSoundEnabled(val);
    Alert.alert(val ? '🔔 Som Ativado' : '🔕 Modo Silencioso', val ? 'As notificações tocarão o efeito sonoro padrão do sistema.' : 'As notificações serão entregues em modo silencioso.');
  }

  async function handleSelectFrequency(mode: 'single' | 'frequent') {
    setFreqModeState(mode);
    await AsyncStorage.setItem('@kod_finance:notification_freq', mode);
    if (reminderEnabled) {
      await scheduleMotivationalNotifications(mode);
      Alert.alert(
        '⚙️ Frequência Atualizada',
        mode === 'frequent'
          ? 'Modo Alta Frequência ativado! Receba 3 mensagens ao longo do dia (Manhã, Tarde e Noite).'
          : 'Modo Lembrete Único ativado! Notificação às 20h30.'
      );
    }
  }

  const achievements = [
    {
      id: 'first_goal',
      title: 'Primeiro Passo 🎯',
      desc: 'Adicionou sua primeira meta financeira.',
      unlocked: goals.length > 0,
    },
    {
      id: 'saver_init',
      title: 'Poupador Iniciante 💰',
      desc: 'Registrou pelo menos 3 transações no app.',
      unlocked: transactions.length >= 3,
    },
    {
      id: 'in_black',
      title: 'Mente Saudável 🟢',
      desc: 'Manteve o saldo geral do mês no azul.',
      unlocked: financeBalance > 0,
    },
    {
      id: 'budget_boss',
      title: 'Mestre dos Gastos 🛡️',
      desc: 'Configurou seu primeiro limite de orçamento.',
      unlocked: budgets.length > 0,
    },
  ];

  async function handleSaveProfile() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Atenção', 'Nome e e-mail são necessários.');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    updateProfile({ name: name.trim(), email: email.trim() });
    setSaving(false);
    Alert.alert('✅ Perfil atualizado', 'Seus dados foram salvos com sucesso.');
  }

  async function handleResetPassword() {
    const targetEmail = user.email || email.trim();
    if (!targetEmail) {
      Alert.alert('Atenção', 'Nenhum e-mail associado à conta.');
      return;
    }

    Alert.alert(
      'Redefinir senha',
      `Enviar e-mail de redefinição para ${targetEmail}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setResetting(true);
            try {
              await sendPasswordResetEmail(auth, targetEmail);
              Alert.alert(
                '📬 E-mail enviado',
                'Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.'
              );
            } catch (err: any) {
              Alert.alert('Erro', 'Não foi possível enviar o e-mail. Tente novamente.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  }

  function handleSignOut() {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>Configurações</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Gerencie seu perfil, aparência e segurança.
        </Text>

        {/* ─── Seção: Perfil ─── */}
        <SectionCard theme={theme} title="Perfil" icon="account-circle-outline">
          <FieldLabel label="Nome" theme={theme} />
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={theme.textSecondary}
          />

          <FieldLabel label="E-mail" theme={theme} />
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Seu e-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={theme.textSecondary}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Salvar perfil</Text>
            )}
          </TouchableOpacity>
        </SectionCard>

        {/* ─── Seção: Preferências e Notificações ─── */}
        <SectionCard theme={theme} title="Preferências & Notificações" icon="cog-outline">
          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.text }]}>Modo claro</Text>
            <Switch
              value={themeMode === 'light'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={themeMode === 'light' ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={[styles.helpText, { color: theme.textSecondary, marginBottom: 12 }]}>
            Alterna entre tema escuro e claro em todo o aplicativo.
          </Text>

          <View style={{ backgroundColor: theme.border, height: 1, marginVertical: 12 }} />

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.text }]}>Lembretes Diários</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={reminderEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={[styles.helpText, { color: theme.textSecondary, marginBottom: 12 }]}>
            Alertas no celular para registrar contas e não perder a disciplina.
          </Text>

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.text }]}>Efeito Sonoro / Toque</Text>
            <Switch
              value={soundEnabled}
              onValueChange={handleToggleSound}
              trackColor={{ false: '#767577', true: theme.primary }}
              thumbColor={soundEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={[styles.helpText, { color: theme.textSecondary, marginBottom: 16 }]}>
            Tocar som de notificação padrão ao entregar os alertas.
          </Text>

          {reminderEnabled && (
            <>
              <View style={{ backgroundColor: theme.border, height: 1, marginVertical: 12 }} />
              <Text style={[styles.label, { color: theme.text, marginBottom: 8 }]}>Frequência de Notificações</Text>
              
              <TouchableOpacity
                style={[
                  styles.freqOption,
                  {
                    backgroundColor: freqMode === 'single' ? theme.primaryLight : theme.background,
                    borderColor: freqMode === 'single' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleSelectFrequency('single')}
              >
                <MaterialCommunityIcons
                  name={freqMode === 'single' ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={freqMode === 'single' ? theme.primary : theme.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.freqTitle, { color: theme.text }]}>1x ao dia (Noite - 20h30)</Text>
                  <Text style={[styles.freqSub, { color: theme.textSecondary }]}>Lembrete tradicional de fechamento do dia.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.freqOption,
                  {
                    backgroundColor: freqMode === 'frequent' ? theme.primaryLight : theme.background,
                    borderColor: freqMode === 'frequent' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleSelectFrequency('frequent')}
              >
                <MaterialCommunityIcons
                  name={freqMode === 'frequent' ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={freqMode === 'frequent' ? theme.primary : theme.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.freqTitle, { color: theme.text }]}>3x ao dia (Motivação & Disciplina)</Text>
                  <Text style={[styles.freqSub, { color: theme.textSecondary }]}>Manhã (08h30), Tarde (14h00) e Noite (20h30).</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </SectionCard>

        {/* ─── Seção: Conquistas (Gamificação) ─── */}
        <SectionCard theme={theme} title="Minhas Conquistas" icon="trophy-outline">
          <View style={styles.achievementsGrid}>
            {achievements.map(a => (
              <View
                key={a.id}
                style={[
                  styles.achievementItem,
                  { backgroundColor: theme.background, borderColor: a.unlocked ? theme.primary : theme.border },
                ]}
              >
                <View style={styles.achievementInfo}>
                  <Text style={[styles.achievementTitle, { color: theme.text, opacity: a.unlocked ? 1 : 0.6 }]}>
                    {a.title}
                  </Text>
                  <Text style={[styles.achievementDesc, { color: theme.textSecondary, opacity: a.unlocked ? 1 : 0.5 }]}>
                    {a.desc}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={a.unlocked ? 'check-decagram' : 'lock-outline'}
                  size={20}
                  color={a.unlocked ? theme.primary : theme.textMuted}
                />
              </View>
            ))}
          </View>
        </SectionCard>

        {/* ─── Seção: Segurança ─── */}
        <SectionCard theme={theme} title="Segurança" icon="shield-lock-outline">
          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: theme.border, opacity: resetting ? 0.6 : 1 }]}
            onPress={handleResetPassword}
            disabled={resetting}
          >
            {resetting ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <Text style={[styles.outlineButtonText, { color: theme.text }]}>Redefinir senha por e-mail</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerButton, { borderColor: '#e74c3c' }]}
            onPress={handleSignOut}
          >
            <Text style={styles.dangerButtonText}>Sair da conta</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ─── Seção: Sobre ─── */}
        <SectionCard theme={theme} title="Sobre" icon="information-outline">
          <InfoRow label="Versão" value="1.0.0" theme={theme} />
          <InfoRow label="App" value="Kod Finance" theme={theme} />
          <InfoRow label="Desenvolvedor" value="Kod Company" theme={theme} />
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────
function SectionCard({
  theme, title, icon, children,
}: {
  theme: any; title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon as any} size={20} color={theme.primary} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function FieldLabel({ label, theme }: { label: string; theme: any }) {
  return <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>;
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 22, lineHeight: 20 },

  section: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },

  label: { fontSize: 13, marginBottom: 7, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    marginBottom: 14,
  },

  primaryButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  outlineButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  outlineButtonText: { fontWeight: '600', fontSize: 15 },

  dangerButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#e74c3c', fontWeight: '700', fontSize: 15 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpText: { fontSize: 13, lineHeight: 18 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },

  achievementsGrid: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  achievementInfo: {
    flex: 1,
    paddingRight: 10,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  freqOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  freqTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  freqSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
