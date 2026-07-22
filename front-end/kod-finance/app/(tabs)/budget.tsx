import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Platform, StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFinance } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight, shadows } from '@/constants/theme';
import { notifyBudgetWarning } from '@/services/notifications';

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

export default function BudgetScreen() {
  const { themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const { categories, budgets, setBudget, deleteBudget, getBudgetUsage, addCategory, deleteCategory } = useFinance();

  const month = currentMonth();
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);

  // Categorias de despesa (excluindo receita por natureza)
  const expenseCategories = categories.filter(c =>
    !['salary', 'freelance', 'investment'].includes(c.id)
  );

  // Categorias com orçamento definido este mês
  const budgetedCats = useMemo(() =>
    expenseCategories.filter(c => budgets.some(b => b.categoryId === c.id && b.month === month)),
    [expenseCategories, budgets, month]
  );

  // Categorias sem orçamento (disponíveis para adicionar)
  const unbudgetedCats = useMemo(() =>
    expenseCategories.filter(c => !budgets.some(b => b.categoryId === c.id && b.month === month)),
    [expenseCategories, budgets, month]
  );

  // Total orçado vs gasto
  const totals = useMemo(() => {
    let totalLimit = 0, totalSpent = 0;
    budgetedCats.forEach(c => {
      const u = getBudgetUsage(c.id, month);
      totalLimit += u.limit;
      totalSpent += u.spent;
    });
    return { totalLimit, totalSpent };
  }, [budgetedCats, getBudgetUsage, month]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ──────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Orçamento</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {monthLabel(month)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => setShowNewBudgetModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Resumo do mês ────────────────────────── */}
        {budgetedCats.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.summaryTitle, { color: theme.textSecondary }]}>Total orçado</Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {formatCurrency(totals.totalLimit)}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <View style={[
                styles.progressFill,
                {
                  width: `${Math.min((totals.totalSpent / totals.totalLimit) * 100, 100)}%` as any,
                  backgroundColor: totals.totalSpent > totals.totalLimit ? theme.expense : theme.primary,
                }
              ]} />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryMeta, { color: theme.textSecondary }]}>
                Gasto: {formatCurrency(totals.totalSpent)}
              </Text>
              <Text style={[styles.summaryMeta, { color: theme.textSecondary }]}>
                Restante: {formatCurrency(Math.max(0, totals.totalLimit - totals.totalSpent))}
              </Text>
            </View>
          </View>
        )}

        {/* ── Lista de orçamentos ──────────────────── */}
        {budgetedCats.length === 0 ? (
          <EmptyBudget theme={theme} onAdd={() => setShowNewBudgetModal(true)} />
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Por categoria</Text>
            {budgetedCats.map(cat => (
              <BudgetCard
                key={cat.id}
                category={cat}
                month={month}
                theme={theme}
                getBudgetUsage={getBudgetUsage}
                onDelete={() => {
                  Alert.alert('Remover orçamento', `Remover o orçamento de "${cat.name}"?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Remover', style: 'destructive', onPress: () => deleteBudget(cat.id, month) },
                  ]);
                }}
              />
            ))}
          </>
        )}

        {/* ── Categorias personalizadas ────────────── */}
        <View style={styles.catSection}>
          <View style={styles.catSectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Minhas categorias</Text>
            <TouchableOpacity onPress={() => setShowNewCategoryModal(true)}>
              <Text style={[styles.addCatLink, { color: theme.primary }]}>+ Nova</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categories.filter(c => c.isCustom).map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, { backgroundColor: cat.color + '22' }]}
                onLongPress={() =>
                  Alert.alert(`Categoria: ${cat.name}`, 'O que deseja fazer?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: () => deleteCategory(cat.id) },
                  ])
                }
              >
                <Text style={styles.catChipEmoji}>{cat.icon}</Text>
                <Text style={[styles.catChipName, { color: cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            {categories.filter(c => c.isCustom).length === 0 && (
              <Text style={[styles.noCat, { color: theme.textMuted }]}>
                Nenhuma categoria personalizada ainda
              </Text>
            )}
          </ScrollView>
        </View>

        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>

      {/* ── Modal: Novo orçamento ──────────────────── */}
      <NewBudgetModal
        visible={showNewBudgetModal}
        onClose={() => setShowNewBudgetModal(false)}
        categories={unbudgetedCats}
        month={month}
        theme={theme}
        onSave={(categoryId: string, limit: number) => {
          setBudget({ categoryId, limitAmount: limit, month });
          setShowNewBudgetModal(false);
        }}
      />

      {/* ── Modal: Nova categoria ──────────────────── */}
      <NewCategoryModal
        visible={showNewCategoryModal}
        onClose={() => setShowNewCategoryModal(false)}
        theme={theme}
        onSave={(name: string, icon: string, color: string) => {
          addCategory({ name, icon, color });
          setShowNewCategoryModal(false);
        }}
      />
    </View>
  );
}

// ─── BudgetCard ───────────────────────────────────────────────
function BudgetCard({ category, month, theme, getBudgetUsage, onDelete }: any) {
  const { spent, limit, pct } = getBudgetUsage(category.id, month);
  const overBudget = spent > limit;
  const barColor   = overBudget ? theme.expense : pct >= 80 ? theme.warning : theme.income;

  // Notifica se passou de 80%
  if (pct >= 80 && pct < 100) {
    notifyBudgetWarning(category.name, pct, spent, limit).catch(() => {});
  }

  return (
    <TouchableOpacity
      style={[styles.budgetCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onLongPress={onDelete}
      activeOpacity={0.9}
    >
      <View style={styles.budgetCardHeader}>
        <View style={[styles.catIconCircle, { backgroundColor: category.color + '22' }]}>
          <Text style={styles.catIconEmoji}>{category.icon}</Text>
        </View>
        <View style={styles.budgetCardInfo}>
          <Text style={[styles.budgetCatName, { color: theme.text }]}>{category.name}</Text>
          <Text style={[styles.budgetMeta, { color: theme.textSecondary }]}>
            {formatCurrency(spent)} de {formatCurrency(limit)}
          </Text>
        </View>
        <View style={styles.budgetPctBox}>
          <Text style={[styles.budgetPct, { color: barColor }]}>
            {pct.toFixed(0)}%
          </Text>
          {overBudget && (
            <MaterialCommunityIcons name="alert-circle" size={14} color={theme.expense} />
          )}
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.border, marginTop: Spacing.md }]}>
        <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>

      {overBudget && (
        <Text style={[styles.overBudgetWarning, { color: theme.expense }]}>
          ⚠️ Acima do limite em {formatCurrency(spent - limit)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── EmptyBudget ─────────────────────────────────────────────
function EmptyBudget({ theme, onAdd }: any) {
  return (
    <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <MaterialCommunityIcons name="wallet-outline" size={48} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Sem orçamentos</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Defina quanto quer gastar por categoria para ter controle real do seu dinheiro.
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
        onPress={onAdd}
      >
        <Text style={styles.emptyBtnText}>Criar primeiro orçamento</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── NewBudgetModal ───────────────────────────────────────────
function NewBudgetModal({ visible, onClose, categories, theme, onSave }: any) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [limit, setLimit] = useState('');

  function handleSave() {
    const val = parseFloat(limit.replace(',', '.'));
    if (!selectedCat) { Alert.alert('Selecione uma categoria'); return; }
    if (!val || val <= 0) { Alert.alert('Informe um valor válido'); return; }
    onSave(selectedCat, val);
    setSelectedCat(null);
    setLimit('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Novo orçamento</Text>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Categoria</Text>
          <ScrollView style={styles.modalCatList} showsVerticalScrollIndicator={false}>
            {categories.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.modalCatItem,
                  { backgroundColor: selectedCat === c.id ? c.color + '22' : theme.background },
                ]}
                onPress={() => setSelectedCat(c.id)}
              >
                <Text style={styles.modalCatEmoji}>{c.icon}</Text>
                <Text style={[styles.modalCatName, { color: theme.text }]}>{c.name}</Text>
                {selectedCat === c.id && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={c.color} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>
            Limite (R$)
          </Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={limit}
            onChangeText={setLimit}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={theme.textMuted}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── NewCategoryModal ─────────────────────────────────────────
const EMOJI_OPTIONS = ['🛒','🎵','✈️','🏋️','💈','🐾','🎁','🏥','⚡','🍕','🛠️','📦'];
const COLOR_OPTIONS = ['#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#6366f1','#22c55e'];

function NewCategoryModal({ visible, onClose, theme, onSave }: any) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6366f1');

  function handleSave() {
    if (!name.trim()) { Alert.alert('Informe um nome'); return; }
    onSave(name.trim(), icon, color);
    setName(''); setIcon('📦'); setColor('#6366f1');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Nova categoria</Text>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Nome</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Academia"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Ícone</Text>
          <View style={styles.emojiRow}>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, icon === e && { borderColor: theme.primary, borderWidth: 2 }]}
                onPress={() => setIcon(e)}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Cor</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 100 },

  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xxl },
  title:    { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold },
  subtitle: { fontSize: FontSize.sm, marginTop: 2 },
  addBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...shadows.md },

  summaryCard:  { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.xl },
  summaryTitle: { fontSize: FontSize.sm, marginBottom: 4 },
  summaryValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  summaryMeta:  { fontSize: FontSize.xs },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },

  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.8 },

  budgetCard:       { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, marginBottom: Spacing.md },
  budgetCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  catIconCircle:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  catIconEmoji:     { fontSize: 20 },
  budgetCardInfo:   { flex: 1 },
  budgetCatName:    { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  budgetMeta:       { fontSize: FontSize.xs, marginTop: 2 },
  budgetPctBox:     { alignItems: 'flex-end', gap: 2 },
  budgetPct:        { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  overBudgetWarning:{ fontSize: FontSize.xs, marginTop: Spacing.sm, fontWeight: FontWeight.medium },

  emptyBox:     { alignItems: 'center', padding: Spacing['3xl'], borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed', gap: Spacing.sm, marginVertical: Spacing.xl },
  emptyTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyText:    { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { marginTop: Spacing.md, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.full },
  emptyBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.base },

  catSection:       { marginTop: Spacing.xl },
  catSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  addCatLink:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  catScroll:        { flexDirection: 'row' },
  catChip:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginRight: Spacing.sm, gap: 6 },
  catChipEmoji:     { fontSize: 16 },
  catChipName:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  noCat:            { fontSize: FontSize.sm, paddingVertical: Spacing.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xxl, maxHeight: '85%' },
  modalTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.xl },
  modalLabel:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
  modalInput:   { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: FontSize.base, marginBottom: Spacing.md },
  modalCatList: { maxHeight: 200, marginBottom: Spacing.sm },
  modalCatItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.xs, gap: Spacing.md },
  modalCatEmoji:{ fontSize: 20 },
  modalCatName: { flex: 1, fontSize: FontSize.base },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  modalBtn:     { flex: 1, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  modalBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },

  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  emojiBtn: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  colorBtn: { width: 32, height: 32, borderRadius: 16 },
  colorBtnSelected: { borderWidth: 3, borderColor: '#fff' },
});
