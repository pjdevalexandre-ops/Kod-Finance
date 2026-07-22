import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { FinanceTheme } from '@/constants/theme';
import { formatDateInput, parseDateInput } from '@/utils/dateUtils';
import { formatMoneyInput, parseFormattedMoney } from '@/utils/moneyUtils';

export default function GoalsScreen() {
  const { goals, addGoal, deleteGoal, themeMode } = useApp();
  const theme = FinanceTheme[themeMode];
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [dueDateDisplay, setDueDateDisplay] = useState(new Date().toLocaleDateString('pt-BR'));
  const [description, setDescription] = useState('');
  const [isCreateExpanded, setIsCreateExpanded] = useState(false);

  function handleAddGoal() {
    const target = parseFormattedMoney(targetAmount);
    const current = parseFormattedMoney(currentAmount);

    if (!title.trim() || isNaN(target) || target <= 0) {
      Alert.alert('Atenção', 'Nome da meta e valor alvo são obrigatórios.');
      return;
    }

    const parsedDate = parseDateInput(dueDateDisplay);
    const dateObj = new Date(parsedDate + 'T12:00:00');
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Data inválida', 'Por favor, informe o prazo no formato DD/MM/AAAA (ex: 01/01/2026)');
      return;
    }

    addGoal({
      title: title.trim(),
      targetAmount: target,
      currentAmount: current,
      dueDate: dateObj.toISOString(),
      description: description.trim() || undefined,
    });

    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setDueDateDisplay(new Date().toLocaleDateString('pt-BR'));
    setDescription('');

    Alert.alert('Meta criada', 'Sua nova meta foi adicionada com sucesso.');
  }

  function getProgress(goal: { currentAmount: number; targetAmount: number }) {
    const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    return `${percent.toFixed(0)}%`;
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
        <Text style={[styles.title, { color: theme.text }]}>Metas</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Defina metas, prazos e acompanhe o progresso financeiro.</Text>

      {/* METAS ATIVAS PRIMEIRO */}
      {goals.length > 0 ? (
        goals
          .filter(goal => !goal.achieved) // Mostrar apenas metas não concluídas primeiro
          .map(goal => (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                <Text style={[styles.goalStatus, { color: theme.expense }]}>Em andamento</Text>
              </View>
              <Text style={[styles.goalText, { color: theme.textSecondary }]}>Prazo: {new Date(goal.dueDate).toLocaleDateString('pt-BR')}</Text>
              <Text style={[styles.goalText, { color: theme.text }]}>Progresso: R$ {goal.currentAmount.toFixed(2)} / R$ {goal.targetAmount.toFixed(2)} ({getProgress(goal)})</Text>
              {goal.description ? <Text style={[styles.goalDescription, { color: theme.textSecondary }]}>{goal.description}</Text> : null}
              <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.primary }]} onPress={() => router.push(`/edit-goal?id=${goal.id}`)}>
                <Text style={styles.editText}>Editar meta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteButton, { borderColor: theme.border }]} onPress={() => deleteGoal(goal.id)}>
                <Text style={[styles.deleteText, { color: theme.text }]}>Remover meta</Text>
              </TouchableOpacity>
            </View>
          ))
      ) : null}

      {/* METAS CONCLUÍDAS */}
      {goals.filter(goal => goal.achieved).length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20, marginBottom: 10 }]}>Metas Concluídas</Text>
          {goals
            .filter(goal => goal.achieved)
            .map(goal => (
              <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                  <Text style={[styles.goalStatus, { color: theme.income }]}>Concluída</Text>
                </View>
                <Text style={[styles.goalText, { color: theme.textSecondary }]}>Prazo: {new Date(goal.dueDate).toLocaleDateString('pt-BR')}</Text>
                <Text style={[styles.goalText, { color: theme.text }]}>Progresso: R$ {goal.currentAmount.toFixed(2)} / R$ {goal.targetAmount.toFixed(2)} ({getProgress(goal)})</Text>
                {goal.description ? <Text style={[styles.goalDescription, { color: theme.textSecondary }]}>{goal.description}</Text> : null}
                <TouchableOpacity style={[styles.deleteButton, { borderColor: theme.border }]} onPress={() => deleteGoal(goal.id)}>
                  <Text style={[styles.deleteText, { color: theme.text }]}>Remover meta</Text>
                </TouchableOpacity>
              </View>
            ))}
        </>
      )}

      {/* SEÇÃO DE CRIAR NOVA META - MINIMIZADA */}
      <TouchableOpacity 
        style={[styles.createCard, { backgroundColor: theme.primary, borderColor: theme.primary }]}
        onPress={() => setIsCreateExpanded(!isCreateExpanded)}
      >
        <View style={styles.createHeader}>
          <Text style={[styles.createTitle, { color: '#fff' }]}>Adicionar Meta</Text>
        </View>
      </TouchableOpacity>

      {isCreateExpanded && (
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
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Valor atual (R$)"
            placeholderTextColor={theme.textSecondary}
            keyboardType="decimal-pad"
            value={currentAmount}
            onChangeText={(text) => setCurrentAmount(formatMoneyInput(text))}
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

          <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleAddGoal}>
            <Text style={styles.buttonText}>Salvar meta</Text>
          </TouchableOpacity>
        </View>
      )}

      {goals.length === 0 && !isCreateExpanded && (
        <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Nenhuma meta criada ainda. Toque em "Criar nova meta" para começar.</Text>
        </View>
      )}

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
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
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  goalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalText: {
    fontSize: 14,
    marginBottom: 6,
  },
  goalDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  deleteButton: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
  },
  editButton: {
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  editText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    fontSize: 14,
  },
  createCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 20,
    marginBottom: 20,
  },
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 20,
    fontWeight: '300',
  },
});
