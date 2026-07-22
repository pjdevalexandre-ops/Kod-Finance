import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinance } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

import { formatDateInput, parseDateInput } from '@/utils/dateUtils';

export default function EditTransaction() {
  const { themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction, categories } = useFinance();

  const [description, setDescription] = useState('');
  const [rawValue, setRawValue]       = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [type, setType]               = useState<'income' | 'expense'>('expense');
  const [note, setNote]               = useState('');
  const [dateDisplay, setDateDisplay] = useState(new Date().toLocaleDateString('pt-BR'));

  useEffect(() => {
    if (id) {
      const t = transactions.find(t => t.id === id);
      if (t) {
        setDescription(t.description);
        setRawValue(t.value.toString());
        setCategoryId(t.categoryId);
        setType(t.type);
        setNote(t.note ?? '');
        
        // Converte YYYY-MM-DD para DD/MM/YYYY
        try {
          const isoDate = t.date.slice(0, 10);
          const parts = isoDate.split('-');
          if (parts.length === 3) {
            setDateDisplay(`${parts[2]}/${parts[1]}/${parts[0]}`);
          }
        } catch (e) {
          setDateDisplay(new Date().toLocaleDateString('pt-BR'));
        }
      }
    }
  }, [id, transactions]);

  const parsedValue = parseFloat(rawValue.replace(',', '.')) || 0;

  const incomeCategories  = categories.filter(c => ['salary','freelance','investment'].includes(c.id) || c.isCustom);
  const expenseCategories = categories.filter(c => !['salary','freelance','investment'].includes(c.id));
  const relevantCategories = type === 'income' ? incomeCategories : expenseCategories;

  function handleSave() {
    if (!description.trim()) { Alert.alert('Informe uma descrição'); return; }
    if (!parsedValue || parsedValue <= 0) { Alert.alert('Informe um valor válido'); return; }
    if (!categoryId) { Alert.alert('Selecione uma categoria'); return; }
    if (!id) return;

    const parsedDate = parseDateInput(dateDisplay);
    const dateObj = new Date(parsedDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Data inválida', 'Por favor, informe a data no formato DD/MM/AAAA (ex: 01/01/2026)');
      return;
    }

    updateTransaction(id, {
      description: description.trim(),
      value: parsedValue,
      type,
      categoryId,
      note: note.trim(),
      date: dateObj.toISOString(),
    });

    Alert.alert('✅ Transação atualizada!', '', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Editar transação</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.content}>
          {/* Tipo */}
          <View style={[styles.typeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {(['expense', 'income'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  type === t && { backgroundColor: t === 'income' ? theme.income : theme.expense },
                ]}
                onPress={() => { setType(t); setCategoryId(''); }}
              >
                <MaterialCommunityIcons
                  name={t === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
                  size={18}
                  color={type === t ? '#fff' : theme.textSecondary}
                />
                <Text style={[styles.typeBtnText, { color: type === t ? '#fff' : theme.textSecondary }]}>
                  {t === 'income' ? 'Receita' : 'Despesa'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Valor */}
          <View style={[styles.valueCard, { backgroundColor: type === 'income' ? theme.income : theme.expense }]}>
            <Text style={styles.valueLabel}>Valor</Text>
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

          {/* Descrição */}
          <Field label="Descrição" theme={theme}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Almoço"
              placeholderTextColor={theme.textMuted}
            />
          </Field>

          {/* Data */}
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

          {/* Categorias */}
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
                <Text style={[styles.catName, { color: categoryId === cat.id ? '#fff' : theme.text }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Observação */}
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

          {/* Salvar */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={handleSave}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>Salvar alterações</Text>
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
  backBtn:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  content:      { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['4xl'] },

  typeRow:      { flexDirection: 'row', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.xl },
  typeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md },
  typeBtnText:  { fontSize: FontSize.base, fontWeight: FontWeight.semibold },

  valueCard:    { borderRadius: Radius.xl, padding: Spacing.xxl, marginBottom: Spacing.xl, alignItems: 'center' },
  valueLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginBottom: Spacing.sm },
  valueInputRow:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  valueCurrency:{ color: 'rgba(255,255,255,0.9)', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  valueInput:   { color: '#fff', fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, minWidth: 120, textAlign: 'center' },

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
