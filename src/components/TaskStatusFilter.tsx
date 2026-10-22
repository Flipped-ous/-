import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../hooks/useDialog.ts';

const choices = [{ value: 'all', label: '全部' }, { value: 'pending', label: '待完成' }, { value: 'completed', label: '已完成' }] as const;
export function TaskStatusFilter({ value, onChange }: { value: 'all' | 'pending' | 'completed'; onChange: (value: 'all' | 'pending' | 'completed') => void }) {
  const [open, setOpen] = useState(false);
  useDialog(open, () => setOpen(false), '[aria-pressed="true"]');
  return <>
    <button type="button" className="task-status-trigger" aria-label={`完成状态筛选：${choices.find(choice => choice.value === value)?.label}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      {choices.find(choice => choice.value === value)?.label}<span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
    </button>
    {open && createPortal(<div className="agenda-backdrop">
      <div className="agenda-dimmer" onClick={() => setOpen(false)} />
      <section className="task-status-sheet" role="dialog" aria-modal="true" aria-label="完成状态筛选">
        <div className="sheet-handle" />
        <header className="agenda-header"><h2>完成状态</h2><button aria-label="关闭状态筛选" onClick={() => setOpen(false)}>×</button></header>
        <div className="task-status-choices" role="group" aria-label="完成状态">
          {choices.map(choice => <button type="button" key={choice.value} aria-pressed={choice.value === value} onClick={() => { onChange(choice.value); setOpen(false); }}>
            <span>{choice.label}</span><i aria-hidden="true">{choice.value === value ? '✓' : ''}</i>
          </button>)}
        </div>
      </section>
    </div>, document.body)}
  </>;
}
