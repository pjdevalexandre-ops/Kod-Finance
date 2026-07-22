# ❓ FAQ & Troubleshooting

## ❌ Erros Comuns

### 1. **"Módulo 'victory-native' não encontrado"**

**Sintoma:**
```
Cannot find module 'victory-native'
```

**Solução:**
```bash
cd front-end/kod-finance
npm install victory-native
npm start
# Pressione 'r' para recarregar
```

---

### 2. **"useFinance must be used within FinanceProvider"**

**Sintoma:**
```
Error: useFinance must be used within FinanceProvider
```

**Causa:** Componente não está dentro de `<FinanceProvider>`

**Solução:** Verificar `app/_layout.tsx` (root provider):
```typescript
import { FinanceProvider } from "@/context/FinanceContext";

export default function RootLayout() {
  return (
    <FinanceProvider>
      {/* seu app aqui */}
    </FinanceProvider>
  );
}
```

---

### 3. **Tema não muda ao alternar DARK_MODE**

**Sintoma:** Após mudar `const DARK_MODE = false`, a tela não muda

**Solução:** 
1. Salve o arquivo
2. Pressione 'r' no terminal do Expo
3. Se não funcionar, recarregue completamente:
   ```bash
   npm start
   # ou
   expo start -c  # -c = clear cache
   ```

---

### 4. **Datas aparecem em formato errado**

**Sintoma:** Data exibe `Invalid Date` ou formato incorreto

**Solução:** Verificar formato ao adicionar:
```typescript
// Formato CORRETO
date: new Date(date).toISOString()  // ✅ Correto

// Formato ERRADO
date: date  // ❌ String simples não funciona
```

---

### 5. **Rota `/edit-transaction?id=123` não funciona**

**Sintoma:** Clicar no botão de editar não navega

**Solução:** 
1. Confirme que arquivo `app/edit-transaction.tsx` existe
2. Verifique sintaxe da navegação:
```typescript
// ✅ Correto
router.push(`/edit-transaction?id=${item.id}`)

// ❌ Errado
router.push(`/edit-transaction?id=${item.id}`)  // Sem `/`
```

---

### 6. **Gráficos não aparecem em charts.tsx**

**Sintoma:** Tela de gráficos branca ou vazia

**Solução Passo a Passo:**

1. **Verificar instalação:**
   ```bash
   npm list victory-native
   ```

2. **Verificar dados:**
   ```typescript
   // Adicione no topo de charts.tsx temporariamente
   console.log('Total Income:', totalIncome);
   console.log('Total Expense:', totalExpense);
   console.log('Category Data:', categoryData);
   ```

3. **Tentar recarregar:**
   ```bash
   npm start
   # Pressione 'r'
   ```

4. **Se persistir, reinstale:**
   ```bash
   npm install victory-native
   npm start -c
   ```

---

### 7. **Transações não salvam corretamente**

**Sintoma:** Adiciona mas não aparece na lista, ou desaparece após recarregar

**Solução:** Verificar AsyncStorage:
```typescript
// Em context/FinanceContext.tsx
async function saveTransactions() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    console.log('✅ Salvo com sucesso');
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
  }
}
```

---

### 8. **Botão de editar não aparece nos cartões**

**Sintoma:** Apenas o botão de deletar aparece

**Solução:** Verificar se `onEdit` é passado:
```typescript
// ✅ Correto
<TransactionCard 
  data={item} 
  onEdit={() => router.push(`/edit-transaction?id=${item.id}`)}
  onDelete={() => handleDelete(item.id)}
/>

// ❌ Errado
<TransactionCard 
  data={item} 
  onDelete={() => handleDelete(item.id)}
/>
```

---

## ❓ Perguntas Frequentes

### P1: Como mudar a cor do tema?

**R:** Edite `constants/theme.ts`:
```typescript
export const FinanceTheme = {
  dark: {
    background: '#121212',  // ← Mude aqui
    income: '#4ade80',      // ← Verde entradas
    expense: '#f87171',     // ← Vermelho saídas
    primary: '#22c55e',     // ← Verde botões
  }
}
```

Depois aplique em cada tela com:
```typescript
<View style={[styles.container, { backgroundColor: theme.background }]}>
```

---

### P2: Como adicionar um novo filtro (por mês)?

**R:** Em `app/(tabs)/index.tsx`, adicione:
```typescript
const [filterMonth, setFilterMonth] = useState<string | null>(null);

const filteredByMonth = filtered.filter(t => {
  if (!filterMonth) return true;
  const month = new Date(t.date).toLocaleDateString('pt-BR', { 
    month: '2-digit', 
    year: 'numeric' 
  });
  return month === filterMonth;
});
```

---

### P3: Como usar light mode em uma tela e dark mode em outra?

**R:** Cada tela tem seu próprio `const DARK_MODE`. Basta alternar:
```typescript
// Home - dark mode
// app/(tabs)/index.tsx
const DARK_MODE = true;

// Gráficos - light mode
// app/(tabs)/charts.tsx
const DARK_MODE = false;
```

---

### P4: Como exportar as transações para CSV?

**R:** Adicione função no Context:
```typescript
export async function exportToCSV() {
  const csv = transactions
    .map(t => `${t.description},${t.value},${t.type},${t.date}`)
    .join('\n');
  
  const headers = 'Descrição,Valor,Tipo,Data\n';
  return headers + csv;
}
```

---

### P5: Como adicionar sincronização com servidor?

**R:** Você já tem Prisma configurado! Adicione em `FinanceContext.tsx`:
```typescript
async function syncWithServer() {
  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transactions),
    });
    // Handle response
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
  }
}
```

---

### P6: Como adicionar confirmação antes de editar?

**R:** Adicione Alert em `index.tsx`:
```typescript
function handleEdit(id: string) {
  Alert.alert(
    "Editar",
    "Deseja editar esta transação?",
    [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Editar", 
        onPress: () => router.push(`/edit-transaction?id=${id}`)
      }
    ]
  );
}

// Depois use:
onEdit={() => handleEdit(item.id)}
```

---

### P7: Como mostrar saldo em gráfico de linha?

**R:** Use Victory Line:
```typescript
import { VictoryLine, VictoryChart } from "victory-native";

const balanceHistory = calculateMonthlyBalance();

<VictoryChart>
  <VictoryLine
    data={balanceHistory}
    x="month"
    y="balance"
    style={{ data: { stroke: theme.primary } }}
  />
</VictoryChart>
```

---

### P8: Como vaciar todas as transações (cache)?

**R:** Adicione função no Context:
```typescript
async function clearAllTransactions() {
  setTransactions([]);
  await AsyncStorage.removeItem(STORAGE_KEY);
}
```

Depois em uma tela:
```typescript
<TouchableOpacity onPress={() => {
  Alert.alert("Limpar", "Remover todas as transações?", [
    { text: "Cancelar", style: "cancel" },
    { 
      text: "Limpar", 
      onPress: () => clearAllTransactions(),
      style: "destructive"
    }
  ]);
}}>
  <Text>Limpar Dados</Text>
</TouchableOpacity>
```

---

### P9: Como melhorar performance com muitas transações?

**R:** Use `useMemo`:
```typescript
import { useMemo } from "react";

const sorted = useMemo(() => {
  return [...filtered].sort((a, b) => {
    // lógica de ordenação
  });
}, [filtered, sortBy]);
```

---

### P10: Como adicionar categorias pré-definidas?

**R:** Crie um componente de Picker:
```typescript
const CATEGORIES = ["Alimentação", "Transporte", "Saúde", "Educação", "Outro"];

<Picker
  selectedValue={category}
  onValueChange={(itemValue) => setCategory(itemValue)}
>
  {CATEGORIES.map(cat => (
    <Picker.Item key={cat} label={cat} value={cat} />
  ))}
</Picker>
```

---

## 🔍 Debugar Problemas

### 1. Ver logs do console
```bash
# Terminal do Expo
npm start
# Aparece: https://localhost:8081
# Na web, abra DevTools (F12)
```

### 2. Inspecionar estado do Context
```typescript
// No inicio de qualquer componente
const { transactions, balance } = useFinance();
console.log('Transações atuais:', transactions);
console.log('Saldo:', balance);
```

### 3. Verificar AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkStorage() {
  const data = await AsyncStorage.getItem('@kod_finance:transactions');
  console.log('Dados salvos:', JSON.parse(data || '[]'));
}
```

---

## ✅ Checklist de Verificação

Antes de reportar erro, verifique:

- [ ] `npm install` foi executado?
- [ ] `victory-native` está instalado? (`npm list victory-native`)
- [ ] Arquivo que está editando está salvo?
- [ ] Pressionou 'r' para recarregar app?
- [ ] Erro aparece no console do Expo?
- [ ] DARK_MODE está true/false conforme desejado?
- [ ] AsyncStorage está funcionando?
- [ ] FinanceProvider envolve o app inteiro?

---

## 🚨 Reportando Bugs

Se encontrar um bug, recolha:

1. **Screenshot do erro**
2. **Arquivo e linha onde ocorre**
3. **Passos para reproduzir**
4. **Output do console**

Exemplo:
```
Arquivo: app/edit-transaction.tsx, linha 42
Erro: "Cannot read property 'id' of undefined"
Passos: 1. Home 2. Clica editar 3. Erro

Console output: 
  useLocalSearchParams returned: {}
```

---

**Problemas resolvidos? Ótimo! 🎉 Seu app está pronto para usar!**
