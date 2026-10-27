export function todayISO(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isValidISODate(value: string | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Pone en mayúscula solo la primera letra (los textos de es-ES van en minúscula). */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "1 sesión" / "3 sesiones" sin depender de Intl.PluralRules. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatDateLong(iso: string): string {
  return capitalize(
    parseLocalDate(iso).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  );
}

export function formatDateShort(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function parseNullableNumber(value: string): number | null {
  const trimmed = value.replace(',', '.').trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatWeight(value: number): string {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} kg`;
}
