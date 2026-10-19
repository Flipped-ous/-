import { localDateValue } from './taskEdit.ts';

/** Calendar arithmetic stays in local noon, including DST transitions. */
export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return localDateValue(date) === value ? date : null;
}

export function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  const count = Math.ceil((offset + length) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), 1 - offset + index, 12);
    return { value: localDateValue(date), day: date.getDate(), inMonth: date.getMonth() === first.getMonth() };
  });
}

export function dateSummary(value: string, now = new Date()) {
  const date = parseCalendarDate(value);
  if (!date) return '不安排';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const relative = value === localDateValue(now) ? '今天 · ' : value === localDateValue(tomorrow) ? '明天 · ' : '';
  const year = date.getFullYear() === now.getFullYear() ? '' : `${date.getFullYear()}年`;
  return `${relative}${year}${date.getMonth() + 1}月${date.getDate()}日`;
}
