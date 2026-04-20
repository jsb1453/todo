import { useRef } from 'react';
import { useLocale } from '../lib/LocaleContext';

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function currentTimeRounded() {
  const now = new Date();
  const rounded = Math.round(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(rounded, 0, 0);
  return {
    hour: String(d.getHours()).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
  };
}

function parse(value: string) {
  if (!value) return { dateStr: '', ...currentTimeRounded() };
  const [datePart = '', timePart = ''] = value.split('T');
  const [hour = '09', minute = '00'] = timePart.split(':');
  return { dateStr: datePart, hour, minute };
}

function formatDateLabel(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (locale === 'ko') return `${y}년 ${Number(m)}월 ${Number(d)}일`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

const SELECT_CLS =
  'px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

export default function DateTimePicker({ value, onChange }: Props) {
  const { t, locale } = useLocale();
  const { dateStr, hour, minute } = parse(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value;
    if (!d) { onChange(''); return; }
    onChange(`${d}T${hour}:${minute}`);
  }

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.click();
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* 달력 팝업 */}
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className={`${SELECT_CLS} flex items-center gap-1.5 min-w-[6rem]`}
        >
          <span>📅</span>
          <span>{dateStr ? formatDateLabel(dateStr, locale) : t.datetime.datePlaceholder}</span>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={dateStr}
          onChange={handleDateChange}
          tabIndex={-1}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', top: '100%', left: 0 }}
        />
      </div>

      {dateStr && (
        <>
          <select
            value={hour}
            onChange={(e) => onChange(`${dateStr}T${e.target.value}:${minute}`)}
            className={SELECT_CLS}
          >
            {HOURS.map((h) => <option key={h} value={h}>{h}{t.datetime.hour}</option>)}
          </select>
          <select
            value={minute}
            onChange={(e) => onChange(`${dateStr}T${hour}:${e.target.value}`)}
            className={SELECT_CLS}
          >
            {MINUTES.map((m) => <option key={m} value={m}>{m}{t.datetime.minute}</option>)}
          </select>
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 text-sm hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title={t.datetime.removeTitle}
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
