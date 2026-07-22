// components/FinanceSummaryChart.tsx
// Gráfico visual de Entradas vs Saídas usando barras de progresso customizadas.
// Compatible com Expo/React Native sem dependências nativas extras.

import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

interface FinanceSummaryChartProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  theme: any;
}

export default function FinanceSummaryChart({
  totalIncome,
  totalExpense,
  balance,
  theme,
}: FinanceSummaryChartProps) {
  const total = totalIncome + totalExpense;
  const incomeRatio = total > 0 ? totalIncome / total : 0;
  const expenseRatio = total > 0 ? totalExpense / total : 0;

  // Animação da barra de entrada
  const incomeWidth = useSharedValue(0);
  const expenseWidth = useSharedValue(0);

  useEffect(() => {
    incomeWidth.value = withTiming(incomeRatio * 100, { duration: 900 });
    expenseWidth.value = withTiming(expenseRatio * 100, { duration: 900 });
  }, [incomeRatio, expenseRatio]);

  const incomeBarStyle = useAnimatedStyle(() => ({
    width: `${incomeWidth.value}%`,
  }));

  const expenseBarStyle = useAnimatedStyle(() => ({
    width: `${expenseWidth.value}%`,
  }));

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (total === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>📊 Distribuição Financeira</Text>

      {/* Barra combinada */}
      <View style={styles.combinedBarContainer}>
        <View style={styles.combinedBarTrack}>
          <Animated.View style={[styles.incomeSegment, incomeBarStyle]} />
          <Animated.View style={[styles.expenseSegment, expenseBarStyle]} />
        </View>
      </View>

      {/* Legenda */}
      <View style={styles.legendRow}>
        <LegendItem
          color="#2ecc71"
          label="Entradas"
          value={formatCurrency(totalIncome)}
          percent={Math.round(incomeRatio * 100)}
          theme={theme}
        />
        <LegendItem
          color="#e74c3c"
          label="Saídas"
          value={formatCurrency(totalExpense)}
          percent={Math.round(expenseRatio * 100)}
          theme={theme}
        />
      </View>

      {/* Saldo */}
      <View style={[styles.balanceRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Saldo líquido</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: balance >= 0 ? '#2ecc71' : '#e74c3c' },
          ]}
        >
          {formatCurrency(balance)}
        </Text>
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  value,
  percent,
  theme,
}: {
  color: string;
  label: string;
  value: string;
  percent: number;
  theme: any;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
          {label} · {percent}%
        </Text>
        <Text style={[styles.legendValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  combinedBarContainer: {
    marginBottom: 16,
  },
  combinedBarTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#e8edf2',
    overflow: 'hidden',
  },
  incomeSegment: {
    height: '100%',
    backgroundColor: '#2ecc71',
    borderRadius: 8,
  },
  expenseSegment: {
    height: '100%',
    backgroundColor: '#e74c3c',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  balanceLabel: {
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
});
