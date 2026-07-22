/**
 * Kod Finance — Design System
 * Cores neutras com preto puro no fundo escuro e acentos no verde oficial da Kod (#00bf63).
 */

export type ThemeMode = 'light' | 'dark';

// ─── Paleta base ───────────────────────────────────────────────
const palette = {
  green50:   '#eefdf5',
  green100:  '#d5fae6',
  green400:  '#2be686',
  green500:  '#00bf63', // Verde oficial Kod solicitado pelo usuário
  green600:  '#00a354',
  green700:  '#008041',

  emerald400: '#34d399',
  emerald500: '#10b981',

  rose400:   '#fb7185',
  rose500:   '#f43f5e',

  amber400:  '#fbbf24',
  amber500:  '#f59e0b',

  neutral50:  '#fafafa',
  neutral100: '#f4f4f5',
  neutral200: '#e4e4e7',
  neutral300: '#d4d4d8',
  neutral400: '#a1a1aa',
  neutral500: '#71717a',
  neutral600: '#52525b',
  neutral700: '#3f3f46',
  neutral800: '#27272a',
  neutral900: '#18181b',
  neutral950: '#09090b',

  white: '#ffffff',
  black: '#000000',
};

// ─── Tema escuro (Preto Puro - AMOLED style) ───────────────────
const dark = {
  background:    '#000000', // Preto puro absoluto
  backgroundAlt: '#09090b',
  card:          '#121214', // Card escuro neutro
  cardElevated:  '#1c1c1f',
  border:        '#27272a', // Borda neutra
  borderLight:   '#18181b',

  text:          '#f4f4f5', // Texto claro neutro
  textSecondary: '#a1a1aa',
  textMuted:     '#52525b',

  primary:       palette.green500,
  primaryLight:  '#0e2619',
  primaryGlow:   'rgba(0,191,99,0.18)',

  secondary:     palette.green600,
  secondaryGlow: 'rgba(0,163,84,0.15)',

  income:        palette.emerald500,
  incomeLight:   'rgba(16,185,129,0.15)',
  incomeText:    palette.emerald400,

  expense:       palette.rose500,
  expenseLight:  'rgba(244,63,94,0.15)',
  expenseText:   palette.rose400,

  warning:       palette.amber500,
  warningLight:  'rgba(245,158,11,0.15)',

  tabBar:        '#09090b',
  tabBarBorder:  '#18181b',
  tabActive:     palette.green500,
  tabInactive:   '#52525b',

  shadow: '#000',
};

// ─── Tema claro ────────────────────────────────────────────────
const light = {
  background:    '#f8f9fa', // Cinza claro neutro e limpo
  backgroundAlt: '#f1f3f5',
  card:          '#ffffff',
  cardElevated:  '#f8f9fa',
  border:        '#e4e4e7', // Borda neutra clara
  borderLight:   '#f4f4f5',

  text:          '#09090b', // Texto escuro neutro
  textSecondary: '#71717a',
  textMuted:     '#a1a1aa',

  primary:       palette.green600,
  primaryLight:  '#d5fae6',
  primaryGlow:   'rgba(0,163,84,0.10)',

  secondary:     palette.green700,
  secondaryGlow: 'rgba(0,128,65,0.10)',

  income:        palette.emerald500,
  incomeLight:   'rgba(16,185,129,0.10)',
  incomeText:    '#059669',

  expense:       palette.rose500,
  expenseLight:  'rgba(244,63,94,0.10)',
  expenseText:   '#e11d48',

  warning:       palette.amber500,
  warningLight:  'rgba(245,158,11,0.10)',

  tabBar:        '#ffffff',
  tabBarBorder:  '#e4e4e7',
  tabActive:     palette.green600,
  tabInactive:   '#a1a1aa',

  shadow: palette.green500,
};

export const FinanceTheme: Record<ThemeMode, typeof dark> = { dark, light };

// ─── Tokens de espaçamento ─────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

// ─── Border radius ─────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

// ─── Tipografia ────────────────────────────────────────────────
export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
};

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
};

// ─── Sombras ───────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  primary: {
    shadowColor: palette.green500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

// ─── Categorias padrão ─────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  { id: 'food',         name: 'Alimentação',   icon: '🍔', color: '#f59e0b' },
  { id: 'transport',    name: 'Transporte',    icon: '🚗', color: '#3b82f6' },
  { id: 'housing',      name: 'Moradia',       icon: '🏠', color: '#8b5cf6' },
  { id: 'health',       name: 'Saúde',         icon: '❤️', color: '#ef4444' },
  { id: 'education',    name: 'Educação',      icon: '📚', color: '#10b981' },
  { id: 'leisure',      name: 'Lazer',         icon: '🎮', color: '#ec4899' },
  { id: 'clothing',     name: 'Vestuário',     icon: '👕', color: '#14b8a6' },
  { id: 'subscriptions',name: 'Assinaturas',   icon: '📱', color: '#6366f1' },
  { id: 'salary',       name: 'Salário',       icon: '💼', color: '#22c55e' },
  { id: 'freelance',    name: 'Freelance',     icon: '💻', color: '#0ea5e9' },
  { id: 'investment',   name: 'Investimentos', icon: '📈', color: '#a855f7' },
  { id: 'other',        name: 'Outros',        icon: '📦', color: '#71717a' },
];

// ─── Compatibilidade legada ─────────────────────────────────────
export const Colors = {
  light: { text: light.text, background: light.background, tint: light.primary, icon: light.textSecondary, tabIconDefault: light.tabInactive, tabIconSelected: light.tabActive },
  dark:  { text: dark.text,  background: dark.background,  tint: dark.primary,  icon: dark.textSecondary,  tabIconDefault: dark.tabInactive,  tabIconSelected: dark.tabActive  },
};
