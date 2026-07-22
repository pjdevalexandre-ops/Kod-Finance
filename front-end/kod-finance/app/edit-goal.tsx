import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { FinanceTheme } from '@/constants/theme';
import { formatDateInput, parseDateInput } from '@/utils/dateUtils';
import { formatMoneyInput, parseFormattedMoney } from '@/utils/moneyUtils';

export default function EditGoalScreen() {
  const { goals, updateGoal, themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueDateDisplay, setDueDateDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [addAmount, setAddAmount] = useState('');

  useEffect(() => {
    if (id) {
      const goal = goals.find(g => g.id === id);
      if (goal) {
        setTitle(goal.title);
        setTargetAmount(formatMoneyInput(goal.targetAmount.toFixed(2)));
        setDescription(goal.description || '');
        setAddAmount('');
        const dateObj = new Date(goal.dueDate);
        const formattedDate = dateObj.toLocaleDateString('pt-BR');
        setDueDateDisplay(formattedDate);
        setDueDate(goal.dueDate);
      }
    }
  }, [id, goals]);

  function handleSave() {
    if (!title.trim() || !targetAmount.trim()) {
      Alert.alert('Atenção', 'Título e valor alvo são obrigatórios.');
      return;
    }

    const target = parseFormattedMoney(targetAmount);
    const add = parseFormattedMoney(addAmount);
    const goal = goals.find(g => g.id === id);
    const newCurrentAmount = goal ? goal.currentAmount + add : add;

    if (isNaN(target) || target <= 0) {
      Alert.alert('Atenção', 'Valor alvo deve ser um número positivo.');
      return;
    }

    const parsedDate = parseDateInput(dueDateDisplay);
    const dateObj = new Date(parsedDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Data inválida', 'Por favor, informe o prazo no formato DD/MM/AAAA (ex: 01/01/2026)');
      return;
    }

    if (id) {
      updateGoal(id, {
        title: title.trim(),
        targetAmount: target,
        currentAmount: newCurrentAmount,
        dueDate: dateObj.toISOString(),
        description: description.trim() || undefined,
      });

      Alert.alert('Meta atualizada', `Adicionado R$ ${add.toFixed(2)} à meta.`);
      router.back();
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>Editar Meta</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Atualize o progresso e detalhes da sua meta.</Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Título da meta"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Valor alvo (R$)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          value={targetAmount}
          onChangeText={(text) => setTargetAmount(formatMoneyInput(text))}
        />
        <View style={[styles.currentAmountContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.currentAmountLabel, { color: theme.textSecondary }]}>Valor atual</Text>
          <Text style={[styles.currentAmountValue, { color: theme.text }]}>R$ {(goals.find(g => g.id === id)?.currentAmount || 0).toFixed(2)}</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Adicionar valor (R$)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          value={addAmount}
          onChangeText={(text) => setAddAmount(formatMoneyInput(text))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Prazo (Ex: 01/01/2026)"
          placeholderTextColor={theme.textSecondary}
          value={dueDateDisplay}
          onChangeText={(text) => setDueDateDisplay(formatDateInput(text))}
          keyboardType="numeric"
          maxLength={10}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, minHeight: 100 }]}
          placeholder="Descrição (opcional)"
          placeholderTextColor={theme.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleSave}>
          <Text style={styles.buttonText}>Salvar alterações</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 18,
    color: '#999',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentAmountContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentAmountValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});