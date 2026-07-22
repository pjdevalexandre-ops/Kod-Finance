# 🔧 Código de Referência - Snippets Importantes

## 📍 1. Navegação para Editar (index.tsx)

```typescript
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  // Botão de edição em TransactionCard
  <TransactionCard 
    data={item} 
    onEdit={() => router.push(`/edit-transaction?id=${item.id}`)}
    onDelete={() => handleDelete(item.id)}
  />
}
```

---

## 📍 2. Receber Parâmetro de Rota (edit-transaction.tsx)

```typescript
import { useLocalSearchParams } from "expo-router";

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction } = useFinance();

  // Carregar transação pelo ID
  useEffect(() => {
    if (id) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        setDescription(transaction.description);
        setValue(transaction.value.toString());
        // ... preencher mais campos
      }
    }
  }, [id, transactions]);
}
```

---

## 📍 3. Atualizar Transação no Contexto

```typescript
// Em edit-transaction.tsx
function handleSave() {
  if (id) {
    updateTransaction(id, {
      description: description.trim(),
      value: numericValue,
      type,
      category: category.trim() || undefined,
    });
    router.back(); // Volta à tela anterior
  }
}
```

---

## 📍 4. Tema Escuro - Template Padrão

Adicione este código no topo de qualquer arquivo de tela:

```typescript
import { FinanceTheme } from "@/constants/theme";

const DARK_MODE = true; // 🌙 Mude para false para light mode
const theme = DARK_MODE ? FinanceTheme.dark : FinanceTheme.light;

// Nos estilos, use assim:
<View style={[styles.container, { backgroundColor: theme.background }]}>
  <Text style={[styles.title, { color: theme.text }]}>
    Titulo
  </Text>

  {/* Aplicar cores dinamicamente */}
  <TouchableOpacity 
    style={[styles.button, { backgroundColor: theme.primary }]}
  >
    <Text style={styles.buttonText}>Clique-me</Text>
  </TouchableOpacity>
</View>
```

---

## 📍 5. Adicionar com Data Customizada

```typescript
// Em app/add-transaction.tsx
const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

function handleAdd() {
  addTransaction({
    description: description.trim(),
    value: numericValue,
    type,
    category: category.trim() || undefined,
    date: new Date(date).toISOString(), // ← Data customizada
  });
}
```

---

## 📍 6. Formatar Data para Exibição

```typescript
// Converter ISO string para DD/MM/YYYY
const dateObj = new Date(data.date);
const formattedDate = dateObj.toLocaleDateString('pt-BR');
// Resultado: "25/03/2026"

// Em componente
<Text style={[styles.date, { color: theme.textSecondary }]}>
  • {formattedDate}
</Text>
```

---

## 📍 7. Filtrar Transações

```typescript
const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

const filtered = transactions.filter(t => {
  if (filter === 'income') return t.type === 'income';
  if (filter === 'expense') return t.type === 'expense';
  return true;
});

// Botões de filtro
<TouchableOpacity
  style={[
    styles.filterButton,
    filter === 'income' && { backgroundColor: theme.income }
  ]}
  onPress={() => setFilter('income')}
>
  <Text>Entradas</Text>
</TouchableOpacity>
```

---

## 📍 8. Ordenar Transações

```typescript
const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'value-desc'>('date-desc');

const sorted = [...filtered].sort((a, b) => {
  if (sortBy === 'date-desc') {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  }
  if (sortBy === 'date-asc') {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  }
  if (sortBy === 'value-desc') {
    return b.value - a.value;
  }
  return 0;
});
```

---

## 📍 9. Gráfico de Pizza (Victory Native)

```typescript
import { VictoryPie } from "victory-native";

const pieData = [
  { x: "Entradas", y: totalIncome, fill: theme.income },
  { x: "Saídas", y: totalExpense, fill: theme.expense },
];

<VictoryPie
  data={pieData}
  width={Dimensions.get("window").width - 60}
  height={300}
  colorScale={[theme.income, theme.expense]}
  labels={({ datum }) => `${datum.x}\nR$ ${datum.y.toFixed(0)}`}
  style={{
    labels: {
      fill: "#fff",
      fontSize: 12,
      fontWeight: "bold",
    },
  }}
/>
```

---

## 📍 10. Gráfico de Barras (Victory Native)

```typescript
import { VictoryBar, VictoryChart, VictoryAxis } from "victory-native";

const categoryData = [
  { x: "Alimentação", y: 150 },
  { x: "Transporte", y: 80 },
  { x: "Saúde", y: 200 },
];

<VictoryChart width={400} height={300}>
  <VictoryAxis
    style={{
      axis: { stroke: theme.border },
      tickLabels: { fill: theme.text, fontSize: 10 },
    }}
  />
  <VictoryAxis
    dependentAxis
    style={{
      axis: { stroke: theme.border },
      tickLabels: { fill: theme.text, fontSize: 10 },
    }}
  />
  <VictoryBar
    data={categoryData}
    style={{ data: { fill: theme.expense } }}
    barWidth={50}
  />
</VictoryChart>
```

---

## 📍 11. Calcular Dados para Gráficos

```typescript
function getCategoryData() {
  const categories: { [key: string]: { income: number; expense: number } } = {};

  transactions.forEach(t => {
    const cat = t.category || "Sem categoria";
    if (!categories[cat]) {
      categories[cat] = { income: 0, expense: 0 };
    }
    if (t.type === "income") {
      categories[cat].income += t.value;
    } else {
      categories[cat].expense += t.value;
    }
  });

  return Object.entries(categories).map(([name, values]) => ({
    x: name.substring(0, 10),
    income: values.income,
    expense: values.expense,
  }));
}
```

---

## 📍 12. Contexto - Tipos de Dados

```typescript
// Em context/FinanceContext.tsx

export interface Transaction {
  id: string;              // Timestamp como string
  description: string;     // Descrição da transação
  value: number;          // Valor (sempre positivo)
  type: 'income' | 'expense'; // Tipo de transação
  category?: string;      // Opcional: categoria
  date: string;           // ISO string (ex: "2026-03-25T10:30:00.000Z")
}

interface FinanceContextData {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  balance: number;
  totalIncome: number;
  totalExpense: number;
}
```

---

## 📍 13. Paleta de Cores - Temas

```typescript
// Em constants/theme.ts

export const FinanceTheme = {
  light: {
    background: '#f5f5f5',
    card: '#fff',
    text: '#000',
    textSecondary: '#666',
    income: '#2ecc71',
    expense: '#e74c3c',
    primary: '#4CAF50',
    border: '#ddd',
  },
  dark: {
    background: '#121212',
    card: '#1e1e1e',
    text: '#fff',
    textSecondary: '#aaa',
    income: '#4ade80',
    expense: '#f87171',
    primary: '#22c55e',
    border: '#333',
  },
};
```

---

## 📍 14. Card com Tema e Data

```typescript
// Em components/TransactionCard.js
import { FinanceTheme } from "@/constants/theme";

const DARK_MODE = true;
const theme = DARK_MODE ? FinanceTheme.dark : FinanceTheme.light;

export default function TransactionCard({ data, onDelete, onEdit }) {
  const isIncome = data.type === "income";
  const dateObj = new Date(data.date);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.leftContent}>
        <Text style={[styles.description, { color: theme.text }]}>
          {data.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.category, { color: theme.textSecondary }]}>
            {data.category || "Sem categoria"}
          </Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>
            • {formattedDate}
          </Text>
        </View>
      </View>
      {/* ... botões de ação */}
    </View>
  );
}
```

---

## 📍 15. Validação de Data

```typescript
// Validar se data é válida
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Usar em input
<TextInput
  placeholder="YYYY-MM-DD"
  value={date}
  onChangeText={(text) => {
    if (isValidDate(text)) {
      setDate(text);
    }
  }}
/>
```

---

## 🚀 Instalação Rápida de Dependências

```bash
# Victory Native (gráficos)
npm install victory-native

# Date Picker (opcional - para melhorar UX)
npm install expo-calendar

# Salvar
npm install
```

---

## 🔗 Importações Essenciais

```typescript
// Navegação
import { useRouter, useLocalSearchParams } from "expo-router";

// Estado & Efeitos
import { useState, useEffect } from "react";

// Components do React Native
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";

// Context
import { useFinance } from "@/context/FinanceContext";

// Tema
import { FinanceTheme } from "@/constants/theme";

// Gráficos
import { VictoryPie, VictoryBar, VictoryChart, VictoryAxis } from "victory-native";
```

---

## 💾 Estrutura de Arquivo Mínima para Nova Tela

```typescript
import { View, Text, StyleSheet } from "react-native";
import { useFinance } from "@/context/FinanceContext";
import { FinanceTheme } from "@/constants/theme";

const DARK_MODE = true;
const theme = DARK_MODE ? FinanceTheme.dark : FinanceTheme.light;

export default function MyScreen() {
  const { transactions } = useFinance();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Minha Tela</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
```

---

**Todos os snippets estão prontos para copiar e colar! ✨**
