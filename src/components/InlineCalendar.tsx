import React, { useState } from 'react';
import { monthDays, parseCalendarDate } from '../utils/calendar.ts';
import { localDateValue, quickDate } from '../utils/taskEdit.ts';

export function InlineCalendar({ value, onChange, shortcuts: showShortcuts = true, week = false, dots = [], onToggleWeek, minDate }: { value: string; onChange: (value: string) => void; shortcuts?: boolean; week?: boolean; dots?: string[]; onToggleWeek?: () => void; minDate?: string }) {
  const [month, setMonth] = useState(() => parseCalendarDate(value) || new Date());
  React.useEffect(() => { if (value) setMonth(parseCalendarDate(value) || new Date()); }, [value]);
  const today = localDateValue(new Date());
  const shortcuts = [
    { value: quickDate('today'), label: '今天' },
    { value: quickDate('tomorrow'), label: '明天' },
    { value: quickDate('weekend'), label: '本周末' },
    { value: '', label: '不安排' },
  ];
  // On weekends, Today and Weekend can refer to the same date: highlight only one.
  const activeShortcut = shortcuts.findIndex((shortcut) => shortcut.value === value);
  const allDays = monthDays(month);
  const pivot = parseCalendarDate(value) || new Date();
  const monday = new Date(pivot); monday.setDate(pivot.getDate() - (pivot.getDay() + 6) % 7);
  const days = week ? Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setDate(date.getDate() + index); return { value: localDateValue(date), day: date.getDate(), inMonth: true }; }) : allDays;
  const shift = (direction: number) => {
    if (week) { const next = new Date(pivot); next.setDate(next.getDate() + direction * 7); onChange(localDateValue(next)); }
    else setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1, 12));
  };
  return <div className="inline-calendar">
    {showShortcuts && <div className="calendar-shortcuts" aria-label="快捷日期">
      {shortcuts.map((shortcut, index) => <button key={shortcut.label} type="button" aria-pressed={index === activeShortcut} onClick={() => onChange(shortcut.value)}>{shortcut.label}</button>)}
    </div>}
    <div className="calendar-paper">
      <div className="calendar-heading">
        <span aria-live="polite">{month.getFullYear()}年{month.getMonth() + 1}月</span>
        {!showShortcuts && <button type="button" className="calendar-today" onClick={() => { setMonth(new Date()); onChange(today); }}>今天</button>}
        <button type="button" aria-label={week ? '上一周' : '上个月'} onClick={() => shift(-1)}><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button>
        <button type="button" aria-label={week ? '下一周' : '下个月'} onClick={() => shift(1)}><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{'一二三四五六日'.split('').map(day => <span key={day}>{day}</span>)}</div>
      <div className="calendar-days" role="group" aria-label="选择日期">
        {days.map(day => <button key={day.value} type="button" disabled={!!minDate && day.value < minDate} aria-label={`${day.value}${dots.includes(day.value) ? '，有未完成任务' : ''}`} aria-pressed={value === day.value} aria-current={day.value === today ? 'date' : undefined} data-outside={!day.inMonth} onClick={() => onChange(day.value)}><span>{day.day}</span>{dots.includes(day.value) && <i aria-hidden="true" />}</button>)}
      </div>
    </div>
    {onToggleWeek && <button type="button" className="calendar-collapse" aria-expanded={!week} onClick={onToggleWeek}>{week ? '展开月历' : '收起为周历'} <span aria-hidden="true">{week ? '⌄' : '⌃'}</span></button>}
  </div>;
}

