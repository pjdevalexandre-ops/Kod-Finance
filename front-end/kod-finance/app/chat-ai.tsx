import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinance } from '@/context/FinanceContext';
import { useApp } from '@/context/AppContext';
import { FinanceTheme, Spacing, Radius, FontSize, FontWeight, shadows } from '@/constants/theme';
import { askKodAI } from '@/services/gemini';

interface Message {
  id: string;
  sender: 'user' | 'kod';
  text: string;
  timestamp: Date;
}

export default function ChatAIScreen() {
  const router = useRouter();
  const { user, goals, themeMode } = useApp();
  const finance = useFinance();
  const theme = FinanceTheme[themeMode];
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Envia mensagem inicial do Kod
  useEffect(() => {
    const firstName = user.name?.split(' ')[0] || 'Visitante';
    setMessages([
      {
        id: 'welcome',
        sender: 'kod',
        text: `Olá, ${firstName}! Sou o Kod, seu consultor financeiro pessoal com Inteligência Artificial. 🤖\n\nPosso analisar seus gastos, te dar conselhos personalizados ou ajudar a ajustar suas metas. Como posso ajudar você hoje?`,
        timestamp: new Date(),
      },
    ]);
  }, [user.name]);

  // Prepara o contexto de finanças para enviar à IA
  function buildFinanceContext() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthData = finance.getMonthBalance(currentMonth);

    const transStr = finance.transactions.slice(0, 15).map(t => {
      const cat = finance.getCategoryById(t.categoryId);
      return `- ${t.type === 'income' ? 'Receita' : 'Despesa'}: ${t.description} | R$ ${t.value.toFixed(2)} | Categoria: ${cat?.name ?? 'Outros'} | Data: ${new Date(t.date).toLocaleDateString('pt-BR')}`;
    }).join('\n');

    const goalsStr = goals.map(g => {
      const pct = ((g.currentAmount / g.targetAmount) * 100).toFixed(0);
      return `- Meta: "${g.title}" | Progresso: R$ ${g.currentAmount.toFixed(2)} de R$ ${g.targetAmount.toFixed(2)} (${pct}% concluído) | Prazo: ${new Date(g.dueDate).toLocaleDateString('pt-BR')}`;
    }).join('\n');

    const budgetsStr = finance.budgets.map(b => {
      const cat = finance.getCategoryById(b.categoryId);
      const usage = finance.getBudgetUsage(b.categoryId, currentMonth);
      return `- Limite para ${cat?.name ?? 'Outros'}: R$ ${b.limitAmount.toFixed(2)} | Gasto: R$ ${usage.spent.toFixed(2)} (${usage.pct.toFixed(0)}% do limite)`;
    }).join('\n');

    return `
DADOS DO USUÁRIO:
- Nome: ${user.name || 'Usuário Kod Finance'}
- Saldo Geral Atual: R$ ${finance.balance.toFixed(2)}
- Entradas do mês atual: R$ ${monthData.income.toFixed(2)}
- Saídas do mês atual: R$ ${monthData.expense.toFixed(2)}
- Saldo líquido do mês atual: R$ ${monthData.balance.toFixed(2)}

METAS FINANCEIRAS ATIVAS:
${goalsStr || 'Nenhuma meta criada ainda.'}

LIMITES DE ORÇAMENTO DO MÊS:
${budgetsStr || 'Nenhum limite de orçamento configurado este mês.'}

ÚLTIMAS TRANSAÇÕES:
${transStr || 'Nenhuma transação registrada ainda.'}
    `;
  }

  async function handleSend() {
    if (!inputText.trim() || loading) return;

    const userMessageText = inputText.trim();
    setInputText('');

    const newUserMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMessageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const context = buildFinanceContext();
      const aiResponse = await askKodAI(userMessageText, context);

      const newKodMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'kod',
        text: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newKodMessage]);
    } catch (error: any) {
      console.error('Kod AI Error:', error);
      const errorMsg = 'Desculpe, tive um problema temporário ao conectar com a Inteligência Artificial. Por favor, tente novamente em instantes.';
      
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'kod',
          text: errorMsg,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 98}
      >
        {/* Header */}
        <View style={[styles.header, { borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: theme.card }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Kod AI Assistant</Text>
            <Text style={[styles.headerSub, { color: theme.primary }]}>online</Text>
          </View>
        </View>

        {/* Lista de Mensagens */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isKod = item.sender === 'kod';
            return (
              <View
                style={[
                  styles.messageWrapper,
                  isKod ? styles.messageKodAlign : styles.messageUserAlign,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isKod
                      ? { backgroundColor: theme.card, borderBottomLeftRadius: 4 }
                      : { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
                  ]}
                >
                  <Text style={[styles.messageText, isKod ? { color: theme.text } : { color: '#fff' }]}>
                    {item.text}
                  </Text>
                </View>
                <Text style={[styles.messageTime, { color: theme.textMuted }]}>
                  {item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        {/* Indicador de digitação */}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingBubble, { backgroundColor: theme.card }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Kod analisando...</Text>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={[
          styles.inputBar, 
          { 
            backgroundColor: theme.card, 
            borderTopColor: theme.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16
          }
        ]}>
          <TextInput
            style={[styles.textInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pergunte ao Kod sobre suas despesas..."
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.primary }, (!inputText.trim() || loading) && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  headerSub: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  messageWrapper: {
    marginBottom: Spacing.md,
    maxWidth: '80%',
  },
  messageKodAlign: {
    alignSelf: 'flex-start',
  },
  messageUserAlign: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageText: {
    fontSize: FontSize.sm + 1,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: FontSize.xs - 1,
    marginTop: 4,
    marginHorizontal: 8,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm + 1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
