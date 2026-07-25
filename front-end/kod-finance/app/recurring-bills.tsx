import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinance, RecurringBill } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight, shadows } from '@/constants/theme';
import { formatMoneyInput, parseFormattedMoney } from '@/utils/moneyUtils';
import { formatDateInput, parseDateInput } from '@/utils/dateUtils';
import { scheduleBillDueDateReminders } from '@/services/notifications';

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function RecurringBillsScreen() {
  const router = useRouter();
  const { themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const finance = useFinance();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [dueDateStr, setDueDateStr] = useState(new Date().toLocaleDateString('pt-BR'));
  const [categoryId, setCategoryId] = useState('');
  const [reminderDays, setReminderDays] = useState('3');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const currentMonth = currentMonthStr();
  const todayDay = new Date().getDate();

  // Categorias de despesas
  const expenseCategories = useMemo(() =>
    finance.categories.filter(c => !['salary', 'freelance', 'investment'].includes(c.id)),
    [finance.categories]
  );

  // Divisão das contas no mês
  const pendingBills = useMemo(() =>
    finance.recurringBills.filter(b => {
      if (b.startDate) {
        const startMonthYear = b.startDate.substring(0, 7); // 'YYYY-MM'
        if (startMonthYear > currentMonth) {
          return false;
        }
      }
      return b.lastPaidMonth !== currentMonth;
    }),
    [finance.recurringBills, currentMonth]
  );

  const paidBills = useMemo(() =>
    finance.recurringBills.filter(b => b.lastPaidMonth === currentMonth),
    [finance.recurringBills, currentMonth]
  );

  const totalPending = useMemo(() =>
    pendingBills.reduce((acc, b) => acc + b.value, 0),
    [pendingBills]
  );

  const totalMonthlyCommitment = useMemo(() =>
    finance.recurringBills.reduce((acc, b) => acc + b.value, 0),
    [finance.recurringBills]
  );

  async function handleAddBill() {
    const val = parseFormattedMoney(rawValue);
    const remDays = parseInt(reminderDays, 10) || 3;

    const parsedDate = parseDateInput(dueDateStr);
    const dateObj = new Date(parsedDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Data inválida', 'Por favor, informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    const day = dateObj.getDate();

    if (!description.trim()) { Alert.alert('Atenção', 'Informe o nome da conta (ex: Aluguel).'); return; }
    if (!val || val <= 0) { Alert.alert('Atenção', 'Informe um valor válido.'); return; }
    if (!categoryId) { Alert.alert('Atenção', 'Selecione uma categoria.'); return; }

    setSaving(true);
    try {
      finance.addRecurringBill({
        description: description.trim(),
        value: val,
        dueDay: day,
        categoryId,
        reminderDaysBefore: remDays,
        note: note.trim() || undefined,
        startDate: parsedDate,
      });

      // Reagenda alertas de vencimento com a nova conta
      await scheduleBillDueDateReminders(finance.recurringBills);

      setDescription('');
      setRawValue('');
      setDueDateStr(new Date().toLocaleDateString('pt-BR'));
      setCategoryId('');
      setNote('');
      setIsFormOpen(false);

      Alert.alert('✅ Conta Fixa Salva', 'Sua despesa recorrente foi registrada. Enviaremos lembretes de vencimento!');
    } catch (e) {
      Alert.alert('Erro ao salvar conta fixa');
    } finally {
      setSaving(false);
    }
  }

  async function handlePayBill(bill: RecurringBill) {
    Alert.alert(
      'Confirmar Pagamento',
      `Deseja marcar "${bill.description}" (R$ ${bill.value.toFixed(2)}) como paga neste mês?\n\nIsso criará automaticamente o lançamento de despesa no extrato do mês.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Pagamento',
          onPress: async () => {
            finance.payRecurringBill(bill.id, currentMonth);
            Alert.alert('🎉 Pago!', `A conta "${bill.description}" foi marcada como paga e registrada no seu extrato.`);
          },
        },
      ]
    );
  }

  function handleDeleteBill(id: string, name: string) {
    Alert.alert('Excluir Conta Fixa', `Deseja remover "${name}" do controle de despesas recorrentes?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => finance.deleteRecurringBill(id),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* ── Header ──────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Contas Fixas & Vencimentos</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* ── Resumo de Comprometimento Mensal ────────── */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Mensal Fixo</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formatCurrency(totalMonthlyCommitment)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Pendente no Mês</Text>
              <Text style={[styles.summaryValue, { color: pendingBills.length > 0 ? theme.expense : theme.income }]}>
                {formatCurrency(totalPending)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Botão para Expandir Cadastro de Nova Conta ── */}
        <TouchableOpacity
          style={[styles.addCardBtn, { backgroundColor: theme.primary }, shadows.primary]}
          onPress={() => setIsFormOpen(prev => !prev)}
        >
          <MaterialCommunityIcons name={isFormOpen ? "minus-circle-outline" : "plus-circle-outline"} size={22} color="#fff" />
          <Text style={styles.addCardBtnText}>{isFormOpen ? "Fechar Formulário" : "Nova Conta Fixa (Aluguel, Luz...)"}</Text>
        </TouchableOpacity>

        {/* ── Formulário de Cadastro ───────────────── */}
        {isFormOpen && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Cadastrar Despesa Recorrente</Text>

            <Field label="Nome da Conta" theme={theme}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Aluguel, Luz, Internet"
                placeholderTextColor={theme.textMuted}
              />
            </Field>

            <Field label="Valor Mensal" theme={theme}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={rawValue}
                onChangeText={(t) => setRawValue(formatMoneyInput(t))}
                placeholder="R$ 0,00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
              />
            </Field>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Field label="Data do Vencimento" theme={theme}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={dueDateStr}
                    onChangeText={(txt) => setDueDateStr(formatDateInput(txt))}
                    placeholder="Ex: 10/08/2026"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Avisar Antecipado" theme={theme}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={reminderDays}
                    onChangeText={setReminderDays}
                    placeholder="3 dias antes"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </Field>
              </View>
            </View>

            {/* Categorias */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {expenseCategories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: categoryId === cat.id ? cat.color : theme.background,
                      borderColor: categoryId === cat.id ? cat.color : theme.border,
                    },
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text style={[styles.catName, { color: categoryId === cat.id ? '#fff' : theme.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Field label="Observações (opcional)" theme={theme}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={note}
                onChangeText={setNote}
                placeholder="Ex: Código do cliente ou pix do proprietário"
                placeholderTextColor={theme.textMuted}
              />
            </Field>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }, { opacity: saving ? 0.7 : 1 }]}
              onPress={handleAddBill}
              disabled={saving}
            >
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar Conta Fixa'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Contas Pendentes Neste Mês ───────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contas a Pagar este Mês</Text>
          <Text style={[styles.badgeCount, { backgroundColor: theme.expenseLight, color: theme.expense }]}>
            {pendingBills.length}
          </Text>
        </View>

        {pendingBills.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={36} color={theme.income} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma conta pendente para este mês! Todas em dia.
            </Text>
          </View>
        ) : (
          pendingBills.map(bill => {
            const cat = finance.getCategoryById(bill.categoryId);
            const daysLeft = bill.dueDay - todayDay;

            let dueStatusColor = theme.textSecondary;
            let dueStatusText = `Vence dia ${bill.dueDay}`;

            if (daysLeft === 0) {
              dueStatusColor = theme.expense;
              dueStatusText = '🚨 Vence HOJE!';
            } else if (daysLeft > 0 && daysLeft <= 3) {
              dueStatusColor = theme.warning;
              dueStatusText = `⚠️ Vence em ${daysLeft} dia(s)`;
            } else if (daysLeft < 0) {
              dueStatusColor = theme.expense;
              dueStatusText = `❗ Venceu dia ${bill.dueDay}`;
            }

            return (
              <View key={bill.id} style={[styles.billCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.billHeader}>
                  <View style={styles.billTitleGroup}>
                    <Text style={styles.billEmoji}>{cat?.icon ?? '📄'}</Text>
                    <View>
                      <Text style={[styles.billTitle, { color: theme.text }]}>{bill.description}</Text>
                      <Text style={[styles.billDueStatus, { color: dueStatusColor }]}>{dueStatusText}</Text>
                    </View>
                  </View>
                  <Text style={[styles.billValue, { color: theme.text }]}>{formatCurrency(bill.value)}</Text>
                </View>

                {bill.note ? (
                  <Text style={[styles.billNote, { color: theme.textSecondary }]}>Obs: {bill.note}</Text>
                ) : null}

                <View style={styles.billFooter}>
                  <TouchableOpacity
                    style={[styles.payBtn, { backgroundColor: theme.income }]}
                    onPress={() => handlePayBill(bill)}
                  >
                    <MaterialCommunityIcons name="check-bold" size={16} color="#fff" />
                    <Text style={styles.payBtnText}>Marcar como Pago</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteBill(bill.id, bill.description)}
                    style={{ padding: 6, borderRadius: 8, backgroundColor: theme.background }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ── Contas Já Pagas Neste Mês ───────────────── */}
        {paidBills.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Pagas este Mês</Text>
              <Text style={[styles.badgeCount, { backgroundColor: theme.incomeLight, color: theme.income, marginTop: 24 }]}>
                {paidBills.length}
              </Text>
            </View>

            {paidBills.map(bill => {
              const cat = finance.getCategoryById(bill.categoryId);
              return (
                <View key={bill.id} style={[styles.paidCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.billTitleGroup}>
                    <Text style={styles.billEmoji}>{cat?.icon ?? '📄'}</Text>
                    <View>
                      <Text style={[styles.billTitle, { color: theme.text, textDecorationLine: 'line-through' }]}>
                        {bill.description}
                      </Text>
                      <Text style={[styles.paidTag, { color: theme.income }]}>✅ Pago no mês</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.billValue, { color: theme.textSecondary }]}>{formatCurrency(bill.value)}</Text>
                    <TouchableOpacity 
                      onPress={() => handleDeleteBill(bill.id, bill.description)}
                      style={{ padding: 6, borderRadius: 8, backgroundColor: theme.background, marginTop: 4 }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.expense} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── Gerenciar Todas as Contas Fixas ─────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Todas as Contas Cadastradas</Text>
          <Text style={[styles.badgeCount, { backgroundColor: theme.primaryLight, color: theme.primary, marginTop: 24 }]}>
            {finance.recurringBills.length}
          </Text>
        </View>

        {finance.recurringBills.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Nenhuma conta cadastrada ainda.
            </Text>
          </View>
        ) : (
          finance.recurringBills.map(bill => {
            const cat = finance.getCategoryById(bill.categoryId);
            return (
              <View key={`manage-${bill.id}`} style={[styles.paidCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 8 }]}>
                <View style={[styles.billTitleGroup, { flex: 1 }]}>
                  <Text style={styles.billEmoji}>{cat?.icon ?? '📄'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.billTitle, { color: theme.text }]} numberOfLines={1}>
                      {bill.description}
                    </Text>
                    <Text style={[styles.paidTag, { color: theme.textSecondary, textDecorationLine: 'none' }]}>
                      Vence todo dia {bill.dueDay}
                      {bill.startDate ? ` • Início: ${bill.startDate.split('-').reverse().join('/')}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={[styles.billValue, { color: theme.text }]}>{formatCurrency(bill.value)}</Text>
                  <TouchableOpacity 
                    onPress={() => handleDeleteBill(bill.id, bill.description)}
                    style={{ padding: 6, borderRadius: 8, backgroundColor: theme.background, marginTop: 4 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, theme, children }: { label: string; theme: any; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 10 : 30,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  summaryCard: {
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: FontSize.xs, marginBottom: 4 },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  divider: { width: 1, height: 36, marginHorizontal: 12 },

  addCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: Radius.lg, marginBottom: Spacing.xl,
  },
  addCardBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },

  formCard: {
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.xl, gap: 12,
  },
  formTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 6 },
  fieldWrapper: {},
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginBottom: 6 },
  fieldBox: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  input: { fontSize: FontSize.base },
  rowFields: { flexDirection: 'row', gap: 12 },

  catScroll: { flexDirection: 'row', marginBottom: 6 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, marginRight: 8,
  },
  catEmoji: { fontSize: 16 },
  catName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: Radius.lg, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.base },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  badgeCount: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, overflow: 'hidden',
  },

  emptyBox: {
    alignItems: 'center', padding: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, gap: 8,
  },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },

  billCard: {
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, gap: 12,
  },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  billEmoji: { fontSize: 24 },
  billTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  billDueStatus: { fontSize: FontSize.xs, marginTop: 2, fontWeight: FontWeight.medium },
  billValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  billNote: { fontSize: FontSize.xs, fontStyle: 'italic' },

  billFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md,
  },
  payBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  deleteBtn: { padding: 8, borderRadius: Radius.md, borderWidth: 1 },

  paidCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm, opacity: 0.85,
  },
  paidTag: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginTop: 2 },
});
