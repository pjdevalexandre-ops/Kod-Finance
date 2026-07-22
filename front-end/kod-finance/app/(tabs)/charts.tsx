import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VictoryPie, VictoryBar, VictoryChart, VictoryAxis, VictoryLine, VictoryTooltip } from 'victory-native';
import { useFinance } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

function currentMonth() { return new Date().toISOString().slice(0, 7); }
function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function addMonths(base: string, n: number): string {
  const [y, m] = base.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthShort(m: string) {
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return names[parseInt(m.split('-')[1], 10) - 1];
}

export default function ChartsScreen() {
  const { themeMode } = useApp();
  const theme  = FinanceTheme[themeMode];
  const finance = useFinance();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  const monthT  = useMemo(() => finance.getMonthTransactions(selectedMonth), [finance, selectedMonth]);
  const monthBal = useMemo(() => finance.getMonthBalance(selectedMonth), [finance, selectedMonth]);

  // Top 5 despesas do mês
  const topExpenses = useMemo(() =>
    [...monthT]
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    [monthT]
  );

  // Por categoria (pizza)
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthT.filter(t => t.type === 'expense').forEach(t => {
      map[t.categoryId] = (map[t.categoryId] ?? 0) + t.value;
    });
    return Object.entries(map)
      .map(([id, value]) => {
        const cat = finance.getCategoryById(id);
        return { x: cat?.name ?? 'Outros', y: value, color: cat?.color ?? '#6366f1' };
      })
      .sort((a, b) => b.y - a.y)
      .slice(0, 6);
  }, [monthT, finance]);

  // Linha de evolução: últimos 6 meses
  const evolutionData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(currentMonth(), i - 5);
      const b = finance.getMonthBalance(m);
      return { x: monthShort(m), y: b.balance };
    });
  }, [finance]);

  // Navegação de mês
  function prevMonth() { setSelectedMonth(m => addMonths(m, -1)); }
  function nextMonth() {
    const next = addMonths(selectedMonth, 1);
    if (next <= currentMonth()) setSelectedMonth(next);
  }

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-');
    const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${names[parseInt(m, 10) - 1]} ${y}`;
  })();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header com navegação de mês ─────────── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Análises</Text>
        </View>

        <View style={[styles.monthNav, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={nextMonth}
            style={[styles.navBtn, { opacity: selectedMonth >= currentMonth() ? 0.3 : 1 }]}
            disabled={selectedMonth >= currentMonth()}
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Resumo do mês ────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard label="Entradas" value={monthBal.income} color={theme.incomeText} theme={theme} />
          <StatCard label="Saídas"   value={monthBal.expense} color={theme.expenseText} theme={theme} />
          <StatCard label="Saldo"    value={monthBal.balance} color={monthBal.balance >= 0 ? theme.incomeText : theme.expenseText} theme={theme} />
        </View>

        {/* ── Linha de evolução ─────────────────────── */}
        <Card title="Evolução do saldo" subtitle="Últimos 6 meses" theme={theme}>
          <VictoryChart
            width={SCREEN_W - Spacing.xl * 2 - 32}
            height={200}
            padding={{ top: 20, bottom: 40, left: 60, right: 20 }}
          >
            <VictoryAxis
              style={{ axis: { stroke: theme.border }, tickLabels: { fill: theme.textSecondary, fontSize: 10 } }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
              style={{ axis: { stroke: theme.border }, tickLabels: { fill: theme.textSecondary, fontSize: 10 } }}
            />
            <VictoryLine
              data={evolutionData}
              style={{ data: { stroke: theme.primary, strokeWidth: 3 } }}
              animate={{ duration: 500 }}
            />
          </VictoryChart>
        </Card>

        {/* ── Pizza por categoria ──────────────────── */}
        {byCategory.length > 0 ? (
          <Card title="Despesas por categoria" subtitle={monthLabel} theme={theme}>
            <View style={{ alignItems: 'center' }}>
              <VictoryPie
                data={byCategory}
                width={SCREEN_W - Spacing.xl * 2 - 32}
                height={220}
                colorScale={byCategory.map(d => d.color)}
                labels={({ datum }: any) => `${datum.x}\n${((datum.y / monthBal.expense) * 100).toFixed(0)}%`}
                style={{ labels: { fontSize: 10, fill: theme.text, fontWeight: '600' } }}
                innerRadius={50}
                padAngle={2}
              />
            </View>
            {byCategory.map(cat => (
              <View key={cat.x} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                <Text style={[styles.legendName, { color: theme.text }]}>{cat.x}</Text>
                <Text style={[styles.legendValue, { color: theme.textSecondary }]}>{formatCurrency(cat.y)}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Card title="Despesas por categoria" subtitle={monthLabel} theme={theme}>
            <Text style={[styles.empty, { color: theme.textMuted }]}>Sem despesas neste mês</Text>
          </Card>
        )}

        {/* ── Top 5 gastos ─────────────────────────── */}
        {topExpenses.length > 0 && (
          <Card title="Maiores gastos" subtitle={monthLabel} theme={theme}>
            {topExpenses.map((t, i) => {
              const cat = finance.getCategoryById(t.categoryId);
              return (
                <View key={t.id} style={styles.topItem}>
                  <Text style={[styles.topRank, { color: theme.textMuted }]}>#{i + 1}</Text>
                  <Text style={styles.topEmoji}>{cat?.icon ?? '📦'}</Text>
                  <View style={styles.topInfo}>
                    <Text style={[styles.topDesc, { color: theme.text }]} numberOfLines={1}>{t.description}</Text>
                    <Text style={[styles.topCat, { color: theme.textSecondary }]}>{cat?.name ?? 'Outros'}</Text>
                  </View>
                  <Text style={[styles.topValue, { color: theme.expenseText }]}>{formatCurrency(t.value)}</Text>
                </View>
              );
            })}
          </Card>
        )}

        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>
    </View>
  );
}

function Card({ title, subtitle, theme, children }: {
  title: string; subtitle?: string; theme: any; children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function StatCard({ label, value, color, theme }: {
  label: string; value: number; color: string; theme: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 56 : 36 },

  header: { marginBottom: Spacing.xl },
  title:  { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold },

  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.sm, marginBottom: Spacing.xl },
  navBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center' },
  statLabel:{ fontSize: FontSize.xs, marginBottom: 4 },
  statValue:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  card:       { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.xl },
  cardHeader: { marginBottom: Spacing.md },
  cardTitle:  { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cardSub:    { fontSize: FontSize.xs, marginTop: 2 },

  legendRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: FontSize.sm },
  legendValue:{ fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  topItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.05)' },
  topRank:    { fontSize: FontSize.sm, width: 24, textAlign: 'center' },
  topEmoji:   { fontSize: 20 },
  topInfo:    { flex: 1 },
  topDesc:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  topCat:     { fontSize: FontSize.xs, marginTop: 2 },
  topValue:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  empty: { textAlign: 'center', paddingVertical: Spacing.xl, fontSize: FontSize.sm },
});
