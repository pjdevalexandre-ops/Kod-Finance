import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Platform, StatusBar, Pressable, Modal, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinance } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight, shadows } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import api from '@/services/api';
import { notifyNegativeBalance, checkAndNotifyAchievements } from '@/services/notifications';

// ─── Helpers ──────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

const INSIGHTS = [
  { icon: 'lightbulb-on-outline', title: 'Regra dos 50/30/20', text: 'Tente direcionar 50% da sua renda para necessidades básicas, 30% para desejos pessoais e 20% para poupar/investir.' },
  { icon: 'shield-check-outline', title: 'Reserva de Emergência', text: 'Antes de fazer grandes compras parceladas, garanta uma reserva que cubra entre 3 e 6 meses das suas despesas básicas.' },
  { icon: 'arrow-down-bold-hexagon-outline', title: 'Cuidado com pequenos gastos', text: 'Taxas bancárias e serviços de assinatura que você não usa com frequência podem virar uma grande despesa acumulada no ano.' },
  { icon: 'leaf', title: 'Consumo Consciente', text: 'Aguarde 24 horas antes de comprar um item por impulso. Pergunte-se se você realmente precisa ou se é apenas desejo momentâneo.' },
  { icon: 'piggy-bank-outline', title: 'Poupe primeiro, gaste depois', text: 'Ao receber suas entradas, separe imediatamente o valor que deseja economizar antes de pagar outras contas.' },
];

// ─── Componente principal ─────────────────────────────────────
export default function HomeScreen() {
  const router  = useRouter();
  const { user, goals, themeMode } = useApp();
  const finance = useFinance();
  const theme   = FinanceTheme[themeMode];

  const [balanceVisible, setBalanceVisible] = useState(true);

  // ─── Scan Receipt State ──────────────────────────────────────
  const [scanning, setScanning] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [scanResult, setScanResult] = useState({
    description: '',
    value: 0,
    category: 'other',
    date: new Date().toISOString().slice(0, 10),
  });
  const [scanValueInput, setScanValueInput] = useState('');

  // Categorias de despesas
  const expenseCategories = useMemo(() =>
    finance.categories.filter(c => !['salary', 'freelance', 'investment'].includes(c.id)),
    [finance.categories]
  );

  async function handleScanReceipt() {
    Alert.alert(
      'Escanear Nota / Recibo',
      'Escolha como deseja capturar a imagem da nota fiscal:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tirar Foto', onPress: () => processImagePick(true) },
        { text: 'Escolher da Galeria', onPress: () => processImagePick(false) },
      ]
    );
  }

  async function processImagePick(useCamera: boolean) {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', `O app precisa de permissão para acessar a ${useCamera ? 'câmera' : 'galeria'}.`);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const asset = result.assets[0];

      setScanning(true);

      console.log('Redimensionando e comprimindo recibo no dispositivo...');
      const manipResult = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.75, format: SaveFormat.JPEG, base64: true }
      );

      const base64Img = manipResult.base64;
      if (!base64Img) {
        throw new Error('Falha ao gerar o base64 da imagem compactada.');
      }

      const mimeType = 'image/jpeg';

      console.log('Enviando imagem otimizada para a IA do Gemini...');
      const response = await api.post('/ai/scan-receipt', {
        image: base64Img,
        mimeType: mimeType,
      });

      setScanning(false);

      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        if (data.error) {
          Alert.alert('Erro no processamento', 'A IA não conseguiu ler os dados desta imagem. Tente uma foto mais nítida ou digite manualmente.');
          return;
        }

        setScanResult({
          description: data.description || 'Despesa Escaneada',
          value: data.value || 0,
          category: data.category || 'other',
          date: data.date || new Date().toISOString().slice(0, 10),
        });
        setScanValueInput((data.value || 0).toString());
        setScanModalVisible(true);
      } else {
        Alert.alert('Erro ao escanear', 'Não foi possível obter os dados do recibo no momento.');
      }
    } catch (e: any) {
      setScanning(false);
      console.error('Erro ao processar imagem:', e);
      Alert.alert('Erro ao processar', 'Ocorreu um erro ao escanear a nota fiscal.');
    }
  }

  function handleSaveScannedTransaction() {
    const finalVal = parseFloat(scanValueInput.replace(',', '.')) || 0;
    if (!scanResult.description.trim()) {
      Alert.alert('Atenção', 'A descrição é obrigatória.');
      return;
    }
    if (finalVal <= 0) {
      Alert.alert('Atenção', 'O valor deve ser maior que zero.');
      return;
    }

    finance.addTransaction({
      description: scanResult.description.trim(),
      value: finalVal,
      type: 'expense',
      categoryId: scanResult.category,
      date: new Date(scanResult.date + 'T12:00:00.000Z').toISOString(),
    });

    setScanModalVisible(false);
    Alert.alert('🎉 Transação salva', 'A despesa da nota fiscal foi inserida com sucesso no extrato!');
  }

  const dailyTip = useMemo(() => {
    const dailyIndex = new Date().getDate() % INSIGHTS.length;
    return INSIGHTS[dailyIndex];
  }, []);

  const month = currentMonth();
  const monthData = useMemo(() => finance.getMonthBalance(month), [finance, month]);
  const monthTransactions = useMemo(() => finance.getMonthTransactions(month), [finance, month]);

  const todayDay = new Date().getDate();
  const urgentBills = useMemo(() => {
    return finance.recurringBills.filter(b => {
      if (b.lastPaidMonth === month) return false;
      const daysLeft = b.dueDay - todayDay;
      return daysLeft <= 3;
    });
  }, [finance.recurringBills, month, todayDay]);

  useEffect(() => {
    checkAndNotifyAchievements({
      goalsCount: goals.length,
      transactionsCount: finance.transactions.length,
      balance: finance.balance,
      budgetsCount: finance.budgets.length,
    });
  }, [goals.length, finance.transactions.length, finance.balance, finance.budgets.length]);

  // 5 transações mais recentes
  const recent = useMemo(() =>
    [...monthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
    [monthTransactions]
  );

  // % dos gastos em relação às receitas do mês
  const spendingPct = monthData.income > 0
    ? Math.min((monthData.expense / monthData.income) * 100, 100)
    : 0;

  // Health score (simples mas significativo)
  const healthScore = (() => {
    if (monthData.income === 0) return { label: 'Sem dados', emoji: '⚪', color: theme.textMuted };
    if (spendingPct <= 50)  return { label: 'Excelente', emoji: '🟢', color: theme.income };
    if (spendingPct <= 70)  return { label: 'Bom',       emoji: '🟡', color: theme.warning };
    if (spendingPct <= 90)  return { label: 'Atenção',   emoji: '🟠', color: theme.warning };
    return                          { label: 'Crítico',   emoji: '🔴', color: theme.expense };
  })();

  function handleDelete(id: string) {
    Alert.alert('Excluir transação', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => {
        finance.deleteTransaction(id);
        if (finance.balance - (finance.transactions.find(t => t.id === id)?.value ?? 0) < 0) {
          notifyNegativeBalance(finance.balance);
        }
      }},
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              {greeting()},
            </Text>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user.name?.split(' ')[0] || 'Usuário'} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: theme.primaryLight }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {(user.name?.[0] || 'U').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Card de Saldo ─────────────────────────── */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary }, shadows.primary]}>
          {/* Círculos decorativos */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          <View style={styles.balanceHeader}>
            <Text style={styles.balanceMonth}>{monthLabel(month)}</Text>
            <Pressable onPress={() => setBalanceVisible(v => !v)}>
              <MaterialCommunityIcons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>
          </View>

          <Text style={styles.balanceLabel}>Saldo do mês</Text>
          <Text style={styles.balanceValue}>
            {balanceVisible ? formatCurrency(monthData.balance) : 'R$ •••••'}
          </Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <View style={styles.balanceItemIcon}>
                <MaterialCommunityIcons name="arrow-down-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.balanceItemLabel}>Entradas</Text>
              <Text style={styles.balanceItemValue}>
                {balanceVisible ? formatCurrency(monthData.income) : '•••'}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <View style={[styles.balanceItemIcon, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <MaterialCommunityIcons name="arrow-up-circle-outline" size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.balanceItemLabel}>Saídas</Text>
              <Text style={styles.balanceItemValue}>
                {balanceVisible ? formatCurrency(monthData.expense) : '•••'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Saúde Financeira ─────────────────────── */}
        <View style={[styles.healthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.healthHeader}>
            <View>
              <Text style={[styles.healthTitle, { color: theme.text }]}>Saúde Financeira</Text>
              <Text style={[styles.healthSub, { color: theme.textSecondary }]}>
                {healthScore.emoji} {healthScore.label} — {spendingPct.toFixed(0)}% da renda comprometida
              </Text>
            </View>
          </View>

          {/* Barra de progresso */}
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[
              styles.progressFill,
              {
                width: `${spendingPct}%` as any,
                backgroundColor: healthScore.color,
              }
            ]} />
          </View>

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <QuickStat
              label="Transações"
              value={monthTransactions.length.toString()}
              icon="swap-horizontal"
              theme={theme}
            />
            <QuickStat
              label="Metas ativas"
              value={goals.filter(g => !g.achieved).length.toString()}
              icon="flag-outline"
              theme={theme}
            />
            <QuickStat
              label="Maior gasto"
              value={formatCurrency(
                Math.max(0, ...monthTransactions.filter(t => t.type === 'expense').map(t => t.value))
              )}
              icon="fire"
              theme={theme}
            />
          </View>
        </View>

        {/* ── Insight do Dia (Kod Company) ────────── */}
        <View style={[styles.insightCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.insightHeader}>
            <MaterialCommunityIcons name={dailyTip.icon as any} size={20} color={theme.primary} />
            <Text style={[styles.insightTitle, { color: theme.text }]}>{dailyTip.title}</Text>
          </View>
          <Text style={[styles.insightText, { color: theme.textSecondary }]}>
            {dailyTip.text}
          </Text>
        </View>

        {/* ── Banner de Contas Fixas a Vencer ────── */}
        {urgentBills.length > 0 && (
          <TouchableOpacity
            style={[styles.urgentBanner, { backgroundColor: theme.warningLight, borderColor: theme.warning }]}
            onPress={() => router.push('/recurring-bills' as any)}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.urgentTitle, { color: theme.text }]}>
                {urgentBills.length === 1
                  ? `Conta a vencer: ${urgentBills[0].description} (Dia ${urgentBills[0].dueDay})`
                  : `${urgentBills.length} contas a vencer em breve neste mês!`}
              </Text>
              <Text style={[styles.urgentSub, { color: theme.textSecondary }]}>
                Toque para visualizar e marcar como paga.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Ações rápidas ────────────────────────── */}
        <View style={styles.actionsRow}>
          <QuickAction
            icon="plus-circle-outline"
            label="Adicionar"
            onPress={() => router.push('/add-transaction')}
            theme={theme}
            primary
          />
          <QuickAction
            icon="calendar-clock"
            label="Contas Fixas"
            onPress={() => router.push('/recurring-bills' as any)}
            theme={theme}
          />
          <QuickAction
            icon="flag-outline"
            label="Metas"
            onPress={() => router.push('/goals')}
            theme={theme}
          />
          <QuickAction
            icon="camera-outline"
            label="Escanear Nota"
            onPress={handleScanReceipt}
            theme={theme}
          />
        </View>

        {/* ── Últimas transações ───────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Últimas transações</Text>
          {monthTransactions.length > 5 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/charts')}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>Ver todas</Text>
            </TouchableOpacity>
          )}
        </View>

        {recent.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="inbox-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma transação este mês
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: theme.primaryLight }]}
              onPress={() => router.push('/add-transaction')}
            >
              <Text style={[styles.emptyBtnText, { color: theme.primary }]}>Adicionar agora</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recent.map(item => (
            <TransactionRow
              key={item.id}
              item={item}
              theme={theme}
              getCategoryById={finance.getCategoryById}
              onEdit={() => router.push(`/edit-transaction?id=${item.id}`)}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        )}

        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }, shadows.primary]}
        onPress={() => router.push('/chat-ai' as any)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="robot" size={26} color="#fff" />
      </TouchableOpacity>
      {/* ── Modal de Confirmação do Escaneamento ──── */}
      <Modal visible={scanModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Confirmar Despesa da Nota</Text>

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Descrição</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={scanResult.description}
              onChangeText={(txt) => setScanResult(prev => ({ ...prev, description: txt }))}
              placeholder="Ex: Supermercado Extra"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Valor (R$)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={scanValueInput}
              onChangeText={setScanValueInput}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingBottom: 8 }}>
              {expenseCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: scanResult.category === cat.id ? cat.color : theme.background,
                      borderColor: scanResult.category === cat.id ? cat.color : theme.border,
                    },
                  ]}
                  onPress={() => setScanResult(prev => ({ ...prev, category: cat.id }))}
                >
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text style={[styles.catName, { color: scanResult.category === cat.id ? '#fff' : theme.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>Data</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={scanResult.date}
              onChangeText={(txt) => setScanResult(prev => ({ ...prev, date: txt }))}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={() => setScanModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleSaveScannedTransaction}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Overlay de Carregamento / Escaneamento com IA ── */}
      {scanning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: '#fff' }]}>Analisando nota fiscal...</Text>
          <Text style={[styles.loadingSub, { color: 'rgba(255,255,255,0.7)' }]}>A IA do Gemini está extraindo os valores</Text>
        </View>
      )}
    </View>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────

function QuickStat({ label, value, icon, theme }: {
  label: string; value: string; icon: string; theme: any;
}) {
  return (
    <View style={styles.quickStatItem}>
      <MaterialCommunityIcons name={icon as any} size={16} color={theme.primary} />
      <Text style={[styles.quickStatValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, theme, primary }: {
  icon: string; label: string; onPress: () => void; theme: any; primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        { backgroundColor: primary ? theme.primary : theme.card, borderColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={24}
        color={primary ? '#fff' : theme.primary}
      />
      <Text style={[styles.quickActionLabel, { color: primary ? '#fff' : theme.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TransactionRow({ item, theme, getCategoryById, onEdit, onDelete }: {
  item: any; theme: any; getCategoryById: any; onEdit: () => void; onDelete: () => void;
}) {
  const category = getCategoryById(item.categoryId);
  const isIncome = item.type === 'income';
  const date     = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <TouchableOpacity
      style={[styles.txRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onEdit}
      activeOpacity={0.7}
    >
      {/* Ícone da categoria */}
      <View style={[styles.txIcon, { backgroundColor: category?.color + '22' || theme.primaryGlow }]}>
        <Text style={styles.txEmoji}>{category?.icon ?? '📦'}</Text>
      </View>

      {/* Descrição */}
      <View style={styles.txInfo}>
        <Text style={[styles.txDescription, { color: theme.text }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[styles.txCategory, { color: theme.textSecondary }]}>
          {category?.name ?? 'Outros'} • {date}
        </Text>
      </View>

      {/* Valor e Ações */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[styles.txValue, { color: isIncome ? theme.incomeText : theme.expenseText }]}>
          {isIncome ? '+' : '-'}{formatCurrency(item.value)}
        </Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation(); // Evita disparar o edit ao clicar na lixeira
            onDelete();
          }}
          style={{ padding: 6, borderRadius: 8, backgroundColor: theme.background }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.expense} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Estilos ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 100 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl },
  greeting:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  userName:    { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, marginTop: 2 },
  avatarBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Balance card
  balanceCard:   {
    borderRadius: Radius.xxl, padding: Spacing.xxl, marginBottom: Spacing.md,
    overflow: 'hidden', position: 'relative',
  },
  circle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -50, right: -50,
  },
  circle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: 20,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  balanceMonth:  { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  balanceLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, marginBottom: 4 },
  balanceValue:  { color: '#fff', fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  balanceRow:    { flexDirection: 'row', alignItems: 'center' },
  balanceDivider:{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.xl },
  balanceItem:   { flex: 1 },
  balanceItemIcon:{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  balanceItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginBottom: 2 },
  balanceItemValue: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Health card
  healthCard:    { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.md },
  healthHeader:  { marginBottom: Spacing.md },
  healthTitle:   { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  healthSub:     { fontSize: FontSize.sm, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.xl },
  progressFill:  { height: '100%', borderRadius: 3 },
  quickStats:    { flexDirection: 'row', justifyContent: 'space-between' },
  quickStatItem: { alignItems: 'center', gap: 2 },
  quickStatValue:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  quickStatLabel:{ fontSize: FontSize.xs },

  // Quick actions
  actionsRow:    { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  quickAction:   {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1,
  },
  quickActionLabel: { fontSize: 10, fontWeight: FontWeight.semibold },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAll:        { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Empty state
  emptyBox: {
    alignItems: 'center', paddingVertical: Spacing['3xl'],
    borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed', gap: Spacing.sm,
  },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center' },
  emptyBtn:     { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  emptyBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Transaction row
  txRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.sm, gap: Spacing.md,
  },
  txIcon:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txEmoji:       { fontSize: 20 },
  txInfo:        { flex: 1 },
  txDescription: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  txCategory:    { fontSize: FontSize.xs, marginTop: 2 },
  txValue:       { fontSize: FontSize.base, fontWeight: FontWeight.bold },

  // FAB
  fab: {
    position: 'absolute', right: Spacing.xl,
    bottom: Platform.OS === 'ios' ? 82 : 62,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  // Modal de Escaneamento
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xxl, maxHeight: '85%' },
  modalTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  modalLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  modalInput:   { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: FontSize.base, marginBottom: Spacing.md },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  modalBtn:     { flex: 1, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  modalBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  fieldLabel:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginBottom: 6 },
  catScroll:    { flexDirection: 'row', marginBottom: 6 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  catEmoji: { fontSize: 16 },
  catName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    gap: 10,
  },
  loadingText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  loadingSub: { fontSize: FontSize.xs },
  insightCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  insightTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  insightText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  urgentTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  urgentSub: {
    fontSize: FontSize.xs - 1,
    marginTop: 2,
  },
});