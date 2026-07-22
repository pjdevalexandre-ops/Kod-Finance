// utils/dateUtils.ts
export function formatDateInput(value: string): string {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, '');

  // Limita a 8 dígitos (DDMMYYYY)
  const limited = digits.slice(0, 8);

  // Aplica a máscara DD/MM/YYYY
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 4) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  } else {
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  }
}

export function parseDateInput(value: string): string {
  // Converte DD/MM/YYYY para YYYY-MM-DD
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return value;
}