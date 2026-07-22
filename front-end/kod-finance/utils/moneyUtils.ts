/**
 * Formata um valor para o padrão monetário brasileiro com separador de milhares
 * @param value - Valor numérico ou string
 * @returns Valor formatado como "1.234,56"
 */
export function formatMoney(value: number | string): string {
  if (!value) return '0,00';
  
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  
  if (isNaN(numValue)) return '0,00';
  
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata entrada de valor monetário enquanto o usuário digita
 * Permite apenas números, vírgula e ponto (converte ponto em vírgula)
 * @param value - Valor digitado pelo usuário
 * @returns Valor formatado com separador de milhares
 */
export function formatMoneyInput(value: string): string {
  // Remove tudo que não é número, vírgula ou ponto
  let cleaned = value.replace(/[^\d.,]/g, '');
  
  // Se não há nada, retorna vazio
  if (!cleaned) return '';
  
  // Substitui ponto por vírgula (padrão brasileiro)
  cleaned = cleaned.replace(/\./g, ',');
  
  // Remove múltiplas vírgulas, mantendo apenas a última
  const parts = cleaned.split(',');
  if (parts.length > 2) {
    cleaned = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1];
  }
  
  // Separa inteira e decimal
  const [integerPart, decimalPart] = cleaned.split(',');
  
  // Limita decimal a 2 casas
  const limitedDecimal = decimalPart ? decimalPart.slice(0, 2) : '';
  
  // Adiciona separador de milhares na parte inteira
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retorna com decimal se existir
  return limitedDecimal ? `${formattedInteger},${limitedDecimal}` : formattedInteger;
}

/**
 * Converte valor formatado para número puro (remove formatação)
 * @param formattedValue - Valor formatado como "1.234,56"
 * @returns Valor numérico como 1234.56
 */
export function parseFormattedMoney(formattedValue: string): number {
  if (!formattedValue) return 0;
  
  // Remove separador de milhares (ponto) e substitui vírgula por ponto
  const cleaned = formattedValue.replace(/\./g, '').replace(',', '.');
  
  return parseFloat(cleaned) || 0;
}
