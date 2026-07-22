import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from '@/constants/theme';

// ─── Tipos ─────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
  categoryId: string;
  date: string; // ISO string
  note?: string;
}

export interface Budget {
  categoryId: string;
  limitAmount: number;
  month: string; // 'YYYY-MM'
}

export interface RecurringBill {
  id: string;
  description: string;
  value: number;
  dueDay: number; // 1 a 31
  categoryId: string;
  reminderDaysBefore: number; // Ex: 3
  lastPaidMonth?: string; // 'YYYY-MM' do último mês em que foi marcada como paga
  note?: string;
}

export interface FinanceContextData {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringBills: RecurringBill[];

  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addCategory: (c: Omit<Category, 'id' | 'isCustom'>) => Category;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  setBudget: (b: Budget) => void;
  deleteBudget: (categoryId: string, month: string) => void;

  addRecurringBill: (b: Omit<RecurringBill, 'id'>) => void;
  updateRecurringBill: (id: string, b: Partial<RecurringBill>) => void;
  deleteRecurringBill: (id: string) => void;
  payRecurringBill: (id: string, month: string) => void;

  // Derived helpers
  balance: number;
  totalIncome: number;
  totalExpense: number;
  getMonthTransactions: (month: string) => Transaction[]; // 'YYYY-MM'
  getMonthBalance: (month: string) => { income: number; expense: number; balance: number };
  getCategoryById: (id: string) => Category | undefined;
  getBudgetUsage: (categoryId: string, month: string) => { spent: number; limit: number; pct: number };
}

const FinanceContext = createContext<FinanceContextData>({} as FinanceContextData);

const KEYS = {
  transactions:    '@kod_finance:transactions_v2',
  categories:      '@kod_finance:categories_v2',
  budgets:         '@kod_finance:budgets_v2',
  recurringBills: '@kod_finance:recurring_bills_v2',
};

// ─── Debounce helper ───────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Provider ─────────────────────────────────────────────────
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions]     = useState<Transaction[]>([]);
  const [categories, setCategories]         = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets]               = useState<Budget[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [ready, setReady]                   = useState(false);

  // Debounced versions para salvar
  const dTransactions    = useDebounce(transactions, 600);
  const dCategories      = useDebounce(categories,   600);
  const dBudgets         = useDebounce(budgets,       600);
  const dRecurringBills = useDebounce(recurringBills, 600);

  // ── Carregar do AsyncStorage ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [tRaw, cRaw, bRaw, rRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.transactions),
          AsyncStorage.getItem(KEYS.categories),
          AsyncStorage.getItem(KEYS.budgets),
          AsyncStorage.getItem(KEYS.recurringBills),
        ]);

        if (tRaw) setTransactions(JSON.parse(tRaw));
        else setTransactions([]);

        if (cRaw) {
          const saved: Category[] = JSON.parse(cRaw);
          const customOnes = saved.filter(c => c.isCustom);
          setCategories([...DEFAULT_CATEGORIES, ...customOnes]);
        }

        if (bRaw) setBudgets(JSON.parse(bRaw));
        if (rRaw) setRecurringBills(JSON.parse(rRaw));
      } catch (e) {
        console.error('FinanceContext load error:', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ── Salvar (debounced) ───────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEYS.transactions, JSON.stringify(dTransactions)).catch(console.error);
  }, [dTransactions, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEYS.categories, JSON.stringify(dCategories)).catch(console.error);
  }, [dCategories, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEYS.budgets, JSON.stringify(dBudgets)).catch(console.error);
  }, [dBudgets, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEYS.recurringBills, JSON.stringify(dRecurringBills)).catch(console.error);
  }, [dRecurringBills, ready]);

  // ── Transações ───────────────────────────────────────────
  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...t, id: Date.now().toString() }, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, t: Partial<Transaction>) => {
    setTransactions(prev => prev.map(item => item.id === id ? { ...item, ...t } : item));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(item => item.id !== id));
  }, []);

  // ── Categorias ───────────────────────────────────────────
  const addCategory = useCallback((c: Omit<Category, 'id' | 'isCustom'>): Category => {
    const newCat: Category = { ...c, id: `custom_${Date.now()}`, isCustom: true };
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback((id: string, c: Partial<Category>) => {
    setCategories(prev => prev.map(item => item.id === id ? { ...item, ...c } : item));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(item => item.id !== id || !item.isCustom));
  }, []);

  const getCategoryById = useCallback((id: string) => {
    return categories.find(c => c.id === id);
  }, [categories]);

  // ── Orçamentos ───────────────────────────────────────────
  const setBudget = useCallback((b: Budget) => {
    setBudgets(prev => {
      const filtered = prev.filter(item => !(item.categoryId === b.categoryId && item.month === b.month));
      return [...filtered, b];
    });
  }, []);

  const deleteBudget = useCallback((categoryId: string, month: string) => {
    setBudgets(prev => prev.filter(b => !(b.categoryId === categoryId && b.month === month)));
  }, []);

  const getBudgetUsage = useCallback((categoryId: string, month: string) => {
    const budget = budgets.find(b => b.categoryId === categoryId && b.month === month);
    const spent  = transactions
      .filter(t => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(month))
      .reduce((s, t) => s + t.value, 0);
    const limit = budget?.limitAmount ?? 0;
    const pct   = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
    return { spent, limit, pct };
  }, [transactions, budgets]);

  // ── Despesas Fixas / Contas Recorrentes ──────────────────
  const addRecurringBill = useCallback((b: Omit<RecurringBill, 'id'>) => {
    setRecurringBills(prev => [{ ...b, id: Date.now().toString() }, ...prev]);
  }, []);

  const updateRecurringBill = useCallback((id: string, b: Partial<RecurringBill>) => {
    setRecurringBills(prev => prev.map(item => item.id === id ? { ...item, ...b } : item));
  }, []);

  const deleteRecurringBill = useCallback((id: string) => {
    setRecurringBills(prev => prev.filter(item => item.id !== id));
  }, []);

  const payRecurringBill = useCallback((id: string, month: string) => {
    setRecurringBills(prev => prev.map(bill => {
      if (bill.id !== id) return bill;

      // Cria a transação de pagamento de despesa automaticamente
      const dayStr = String(bill.dueDay).padStart(2, '0');
      const transactionDate = `${month}-${dayStr}T12:00:00.000Z`;
      
      addTransaction({
        description: bill.description,
        value: bill.value,
        type: 'expense',
        categoryId: bill.categoryId,
        date: new Date(transactionDate).toISOString(),
        note: bill.note ? `Pagamento de conta fixa: ${bill.note}` : 'Pagamento de conta fixa recorrente',
      });

      return { ...bill, lastPaidMonth: month };
    }));
  }, [addTransaction]);

  // ── Derivados ────────────────────────────────────────────
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
  const balance      = totalIncome - totalExpense;

  const getMonthTransactions = useCallback((month: string) => {
    return transactions.filter(t => t.date.startsWith(month));
  }, [transactions]);

  const getMonthBalance = useCallback((month: string) => {
    const monthT   = transactions.filter(t => t.date.startsWith(month));
    const income   = monthT.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
    const expense  = monthT.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  return (
    <FinanceContext.Provider value={{
      transactions, categories, budgets, recurringBills,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, updateCategory, deleteCategory,
      setBudget, deleteBudget,
      addRecurringBill, updateRecurringBill, deleteRecurringBill, payRecurringBill,
      balance, totalIncome, totalExpense,
      getMonthTransactions, getMonthBalance,
      getCategoryById, getBudgetUsage,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}