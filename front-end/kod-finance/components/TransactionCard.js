// components/TransactionCard.js
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FinanceTheme } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

export default function TransactionCard({ data, onDelete, onEdit }) {
  const { themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const isIncome = data.type === "income";
  
  // Formatar data
  const dateObj = new Date(data.date);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.leftContent}>
        <Text style={[styles.description, { color: theme.text }]}>{data.description}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { color: theme.textSecondary }]}>
            {data.category || "Sem categoria"}
          </Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            • {formattedDate}
          </Text>
        </View>
      </View>

      <View style={styles.rightContent}>
        <Text
          style={[
            styles.value,
            { color: isIncome ? theme.income : theme.expense },
          ]}
        >
          {isIncome ? "+" : "-"} R$ {data.value.toFixed(2)}
        </Text>
        
        <View style={styles.actionButtons}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.editButton}>
              <Text style={styles.actionText}>✏️</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
              <Text style={styles.actionText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  category: {
    fontSize: 12,
    marginTop: 0,
  },
  date: {
    fontSize: 12,
    marginLeft: 0,
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 5,
  },
  deleteButton: {
    padding: 5,
  },
  actionText: {
    fontSize: 18,
  },
});