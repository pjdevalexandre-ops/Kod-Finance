import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Platform, KeyboardAvoidingView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinance } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight, shadows } from '@/constants/theme';
import { notifyIncomeAdded, notifyBudgetWarning } from '@/services/notifications';

import { formatDateInput, parseDateInput } from '@/utils/dateUtils';

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function addMonths(dateStr: string, monthsToAdd: number): string {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month, 1, 12, 0, 0);
  date.setMonth(date.getMonth() + monthsToAdd);

  const maxDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  date.setDate(targetDay);

  return date.toISOString();
}

export default function AddTransactionScreen() {
  const router  = useRouter();
  const { themeMode } = useApp();
  const theme   = FinanceTheme[themeMode];
  const finance = useFinance();

  const [type, setType]             = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [rawValue, setRawValue]     = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote]             = useState('');
  const [dateDisplay, setDateDisplay] = useState(new Date().toLocaleDateString('pt-BR'));
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [saving, setSaving]         = useState(false);

  const parsedValue = parseFloat(rawValue.replace(',', '.')) || 0;

  // Filtra categorias pelo tipo
  const incomeCategories  = finance.categories.filter(c => ['salary','freelance','investment'].includes(c.id) || (c.isCustom));
  const expenseCategories = finance.categories.filter(c => !['salary','freelance','investment'].includes(c.id));
  const relevantCategories = type === 'income' ? incomeCategories : expenseCategories;

  async function handleSave() {
    if (!description.trim()) { Alert.alert('Informe uma descrição'); return; }
    if (!parsedValue || parsedValue <= 0) { Alert.alert('Informe um valor válido'); return; }
    if (!categoryId) { Alert.alert('Selecione uma categoria'); return; }

    const parsedDate = parseDateInput(dateDisplay);
    const dateObj = new Date(parsedDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Data inválida', 'Por favor, informe a data no formato DD/MM/AAAA (ex: 01/01/2026)');
      return;
    }

    const isInstallments = categoryId === 'installments';
    const N = isInstallments ? (parseInt(installmentsCount, 10) || 2) : 1;

    if (isInstallments && N < 2) {
      Alert.alert('Quantidade de parcelas inválida', 'Para compras parceladas, o número mínimo é de 2 parcelas.');
      return;
    }

    setSaving(true);
    try {
      if (isInstallments) {
        // Cria N transações, uma para cada mês
        for (let i = 1; i <= N; i++) {
          const installmentDate = addMonths(parsedDate, i - 1);
          finance.addTransaction({
            description: `${description.trim()} (${i}/${N})`,
            value: parsedValue,
            type: 'expense',
            categoryId,
            note: note.trim() ? `${note.trim()} (Parcela ${i} de ${N})` : `Parcela ${i} de ${N}`,
            date: installmentDate,
          });
        }
      } else {
        // Fluxo normal de 1 transação
        finance.addTransaction({
          description: description.trim(),
          value: parsedValue,
          type,
          categoryId,
          note: note.trim(),
          date: dateObj.toISOString(),
        });
      }

      // Notificações
      if (type === 'income') {
        await notifyIncomeAdded(description.trim(), parsedValue);
      } else {
        // Verificar orçamento
        const month = parsedDate.slice(0, 7);
        const usage = finance.getBudgetUsage(categoryId, month);
        const newSpent = usage.spent + parsedValue;
        const pct = usage.limit > 0 ? (newSpent / usage.limit) * 100 : 0;
        if (usage.limit > 0 && pct >= 80) {
          const cat = finance.getCategoryById(categoryId);
          await notifyBudgetWarning(cat?.name ?? 'Categoria', pct, newSpent, usage.limit);
        }
      }

      router.back();
    } catch (e) {
      Alert.alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Header ──────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Nova transação</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.content}>
          {/* ── Tipo ──────────────────────────────── */}
          <View style={[styles.typeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {(['expense','income'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  type === t && {
                    backgroundColor: t === 'income' ? theme.income : theme.expense,
                  },
                ]}
                onPress={() => { setType(t); setCategoryId(''); }}
              >
                <MaterialCommunityIcons
                  name={t === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                  size={18}
                  color={type === t ? '#fff' : theme.textSecondary}
                />
                <Text style={[
                  styles.typeBtnText,
                  { color: type === t ? '#fff' : theme.textSecondary }
                ]}>
                  {t === 'income' ? 'Receita' : 'Despesa'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Valor grande ─────────────────────── */}
          <View style={[styles.valueCard, { backgroundColor: type === 'income' ? theme.income : theme.expense }]}>
            <Text style={styles.valueLabel}>
              {categoryId === 'installments' ? 'Valor de cada parcela' : 'Valor'}
            </Text>
            <View style={styles.valueInputRow}>
              <Text style={styles.valueCurrency}>R$</Text>
              <TextInput
                style={styles.valueInput}
                value={rawValue}
                onChangeText={setRawValue}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </View>
          </View>

          {/* ── Campos ───────────────────────────── */}
          <Field label="Descrição" theme={theme}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Almoço no trabalho"
              placeholderTextColor={theme.textMuted}
            />
          </Field>

          <Field label="Data" theme={theme}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={dateDisplay}
              onChangeText={(txt) => setDateDisplay(formatDateInput(txt))}
              placeholder="Ex: 01/01/2026"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
            />
          </Field>

          {/* ── Categorias ──────────────────────── */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {relevantCategories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: categoryId === cat.id ? cat.color : theme.card,
                    borderColor: categoryId === cat.id ? cat.color : theme.border,
                  },
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={styles.catEmoji}>{cat.icon}</Text>
                <Text style={[
                  styles.catName,
                  { color: categoryId === cat.id ? '#fff' : theme.text }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {categoryId === 'installments' && (
            <Field label="Quantidade de Parcelas" theme={theme}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={installmentsCount}
                onChangeText={(txt) => setInstallmentsCount(txt.replace(/[^0-9]/g, ''))}
                placeholder="Ex: 6"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                maxLength={3}
              />
            </Field>
          )}

          <Field label="Observação (opcional)" theme={theme}>
            <TextInput
              style={[styles.input, styles.inputMultiline, { color: theme.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="Detalhes adicionais..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />
          </Field>

          {/* ── Botão salvar ─────────────────────── */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: type === 'income' ? theme.income : theme.primary },
              shadows.primary,
              { opacity: saving ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar transação'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, theme, children }: { label: string; theme: any; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: Spacing.lg,
  },
  backBtn:     { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  content:     { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['4xl'] },

  typeRow: { flexDirection: 'row', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.xl },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md },
  typeBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },

  valueCard:       { borderRadius: Radius.xl, padding: Spacing.xxl, marginBottom: Spacing.xl, alignItems: 'center' },
  valueLabel:      { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginBottom: Spacing.sm },
  valueInputRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  valueCurrency:   { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  valueInput:      { color: '#fff', fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, minWidth: 120, textAlign: 'center' },

  fieldWrapper: { marginBottom: Spacing.lg },
  fieldLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  fieldBox:     { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  input:        { fontSize: FontSize.base, paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm },
  inputMultiline:{ minHeight: 80, textAlignVertical: 'top' },

  catScroll: { marginBottom: Spacing.xl },
  catChip:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, marginRight: Spacing.sm, gap: 6 },
  catEmoji:  { fontSize: 16 },
  catName:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, borderRadius: Radius.xl, gap: Spacing.sm, marginTop: Spacing.md },
  saveBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});