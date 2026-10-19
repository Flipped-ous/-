import React, { useId, useRef } from 'react';

/** Two small numeric fields avoid the platform clock dialog and nested scrollers. */
export function TimeField({
  value,
  onChange,
  allowClear = true,
}: {
  value: string;
  onChange: (value: string) => void;
  allowClear?: boolean;
}) {
  const minuteRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [hour = '', minute = ''] = value.split(':');
  const hasValue = Boolean(hour || minute);
  const invalid = (hour !== '' && Number(hour) > 23) ||
    (minute !== '' && Number(minute) > 59);

  const update = (part: 'hour' | 'minute', raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    const nextHour = part === 'hour' ? digits : hour;
    const nextMinute = part === 'minute' ? digits : minute;
    onChange(nextHour || nextMinute ? `${nextHour}:${nextMinute}` : '');
  };

  const normalize = (part: 'hour' | 'minute') => {
    const current = part === 'hour' ? hour : minute;
    if (current.length === 1) update(part, current.padStart(2, '0'));
  };

  const inputClass = 'w-9 h-11 bg-transparent text-center text-[18px] font-medium tabular-nums text-[#28231D] dark:text-[#EDE6DE] placeholder:text-[#B7AB9C] dark:placeholder:text-[#796F64] outline-none selection:bg-[#A55340]/15';

  return (
    <div>
      <div className="flex items-center gap-3">
        <div role="group" aria-label="具体时刻"
          className={`inline-flex items-center gap-1 px-3 rounded-xl border bg-[#F5F1E8]/70 dark:bg-[#342E28] focus-within:border-[#A55340]/60 ${invalid ? 'border-[#A55340]/60' : 'border-[#746B61]/15'}`}>
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#9E9284] mr-1">schedule</span>
          <input aria-label="小时" aria-describedby={invalid ? hintId : undefined}
            aria-invalid={hour !== '' && Number(hour) > 23}
            type="text" inputMode="numeric" autoComplete="off" enterKeyHint="next"
            pattern="(?:[01]?[0-9]|2[0-3])" maxLength={2} required={hasValue}
            placeholder="--" value={hour} className={inputClass}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => update('hour', event.target.value)}
            onBlur={() => normalize('hour')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                minuteRef.current?.focus();
              }
            }} />
          <span aria-hidden="true" className="text-[16px] text-[#9E9284]">:</span>
          <input ref={minuteRef} aria-label="分钟" aria-describedby={invalid ? hintId : undefined}
            aria-invalid={minute !== '' && Number(minute) > 59}
            type="text" inputMode="numeric" autoComplete="off" enterKeyHint="done"
            pattern="[0-5]?[0-9]" maxLength={2} required={hasValue}
            placeholder="--" value={minute} className={inputClass}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => update('minute', event.target.value)}
            onBlur={() => normalize('minute')} />
        </div>
        {allowClear && hasValue && (
          <button type="button" className="min-h-11 px-1 text-[12px] text-[#786E64] dark:text-[#A89E92] cursor-pointer"
            onClick={() => onChange('')}>清除时间</button>
        )}
      </div>
      {invalid && <p id={hintId} role="status" className="mt-1.5 text-[11px] text-[#A55340]">小时填 00–23，分钟填 00–59</p>}
    </div>
  );
}
