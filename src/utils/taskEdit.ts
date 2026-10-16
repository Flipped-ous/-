/** Local calendar dates avoid UTC day shifts and preserve an edited task's exact date. */
export function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function quickDate(
  option: 'today' | 'tomorrow' | 'weekend',
  now = new Date(),
): string {
  const date = new Date(now);
  if (option === 'tomorrow') date.setDate(date.getDate() + 1);
  if (option === 'weekend')
    date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
  return localDateValue(date);
}

export function buildDueAt(date: string, time = ''): string | undefined {
  if (!date) return undefined;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = (time || '00:00').split(':').map(Number);
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    !Number.isFinite(result.getTime()) ||
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    hour > 23 ||
    minute > 59
  )
    throw new Error('请选择有效的日期和时间');
  return result.toISOString();
}
