import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMotion } from '../motion/MotionProvider.tsx';

/** Native scrolling supplies touch inertia; CSS snap and scrollend settle the value. */
export function WheelPicker({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const config = useMotion();
  const uid = React.useId();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moving = useRef(false);
  const interacted = useRef(false);
  const callback = useRef(onChange);
  callback.current = onChange;
  const [position, setPosition] = useState(Math.max(0, values.indexOf(value)));
  const index = Math.max(0, values.indexOf(value));
  const settle = () => {
    const node = ref.current;
    if (!node) return;
    const next = Math.max(
      0,
      Math.min(values.length - 1, Math.round(node.scrollTop / 34)),
    );
    moving.current = false;
    setPosition(next);
    if (!interacted.current) return;
    node.scrollTo({
      top: next * 34,
      behavior: config.allowScaleEffects ? 'smooth' : 'instant',
    });
    callback.current(values[next]);
  };
  const settleRef = useRef(settle);
  settleRef.current = settle;
  useLayoutEffect(() => {
    if (!moving.current) {
      ref.current?.scrollTo({ top: index * 34, behavior: 'instant' });
      setPosition(index);
    }
  }, [index, values.length]);
  useEffect(() => {
    const node = ref.current;
    const end = () => {
      clearTimeout(timer.current);
      settleRef.current();
    };
    node?.addEventListener('scrollend', end);
    return () => {
      clearTimeout(timer.current);
      node?.removeEventListener('scrollend', end);
    };
  }, []);
  const choose = (next: number) => {
    interacted.current = true;
    moving.current = true;
    ref.current?.scrollTo({
      top: next * 34,
      behavior: config.allowScaleEffects ? 'smooth' : 'instant',
    });
    callback.current(values[next]);
  };
  return (
    <div className="wheel-column">
      <span className="text-[11px] text-[#786E64]">{label}</span>
      <div className="wheel-window">
        <div
          ref={ref}
          role="listbox"
          tabIndex={0}
          aria-label={label}
          aria-activedescendant={`${uid}-${index}`}
          className="wheel-scroll no-scrollbar"
          onPointerDown={() => {
            interacted.current = true;
          }}
          onWheel={() => {
            interacted.current = true;
          }}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
              return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? values.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        values.length - 1,
                        index + (event.key === 'ArrowDown' ? 1 : -1),
                      ),
                    );
            choose(next);
          }}
          onScroll={() => {
            moving.current = true;
            setPosition((ref.current?.scrollTop || 0) / 34);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => settleRef.current(), 130);
          }}
        >
          {values.map((option, i) => (
            <div
              key={option}
              id={`${uid}-${i}`}
              role="option"
              aria-selected={value === option}
              onClick={() => choose(i)}
              className="wheel-option"
              style={{
                opacity: Math.max(0.24, 1 - Math.abs(position - i) * 0.27),
                transform: config.allowScaleEffects
                  ? `scale(${Math.max(0.9, 1 - Math.abs(position - i) * 0.035)})`
                  : undefined,
              }}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
export function ScheduleWheels({
  kind,
  date,
  time,
  onDate,
  onTime,
}: {
  kind: 'date' | 'time';
  date: string;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
}) {
  const now = new Date();
  const [year, month, day] = (
    date ||
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  )
    .split('-')
    .map(Number);
  const [hour, minute] = (time || '18:00').split(':');
  const [baseYear] = useState(year);
  const days = new Date(year, month, 0).getDate();
  const changeDate = (y: number, m: number, d: number) =>
    onDate(`${y}-${pad(m)}-${pad(Math.min(d, new Date(y, m, 0).getDate()))}`);
  return (
    <div
      className="schedule-wheels"
      aria-label={kind === 'date' ? '日期滚轮' : '时间滚轮'}
    >
      {kind === 'date' ? (
        <>
          <WheelPicker
            label="年"
            values={Array.from({ length: 21 }, (_, i) =>
              String(baseYear - 10 + i),
            )}
            value={String(year)}
            onChange={(v) => changeDate(+v, month, day)}
          />
          <WheelPicker
            label="月"
            values={Array.from({ length: 12 }, (_, i) => pad(i + 1))}
            value={pad(month)}
            onChange={(v) => changeDate(year, +v, day)}
          />
          <WheelPicker
            label="日"
            values={Array.from({ length: days }, (_, i) => pad(i + 1))}
            value={pad(day)}
            onChange={(v) => changeDate(year, month, +v)}
          />
        </>
      ) : (
        <>
          <WheelPicker
            label="时"
            values={Array.from({ length: 24 }, (_, i) => pad(i))}
            value={hour}
            onChange={(v) => onTime(`${v}:${minute}`)}
          />
          <span className="self-center text-[#786E64]">:</span>
          <WheelPicker
            label="分"
            values={Array.from({ length: 60 }, (_, i) => pad(i))}
            value={minute}
            onChange={(v) => onTime(`${hour}:${v}`)}
          />
        </>
      )}
    </div>
  );
}
