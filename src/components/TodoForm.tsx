import { useState, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Priority } from '../types';
import DateTimePicker from './DateTimePicker';
import { useLocale } from '../lib/LocaleContext';

interface Props {
  categories: string[];
  onAdd: (text: string, priority: Priority, dueDate: string | null, category: string) => void;
}

const PRIORITY_VALUES: Priority[] = ['high', 'medium', 'low'];

function defaultDueDate(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const rounded = Math.round(d.getMinutes() / 5) * 5;
  d.setMinutes(rounded, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TodoForm({ categories, onAdd }: Props) {
  const { t } = useLocale();
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // text 변경 시마다 높이 재계산
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const cat = showCatInput ? newCategory.trim() || '기타' : category || '기타';
    onAdd(trimmed, priority, dueDate || null, cat);
    setText('');
    setDueDate(defaultDueDate());
    setNewCategory('');
    setShowCatInput(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        // Shift+Enter / Ctrl+Enter / Cmd+Enter: 커서 위치에 줄바꿈 삽입
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = text.substring(0, start) + '\n' + text.substring(end);
        setText(next);
        // 다음 렌더 후 커서 위치 복원
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 1;
        });
      } else {
        // Enter 단독: 제출
        e.preventDefault();
        submit();
      }
    }
  }

  const priorityLabels: Record<Priority, string> = {
    high: t.priority.high,
    medium: t.priority.medium,
    low: t.priority.low,
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4"
    >
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.form.placeholder}
            rows={1}
            style={{ resize: 'none', minHeight: '2.6rem', overflow: 'hidden' }}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
          />
          <span className="absolute bottom-2 right-3 text-xs text-gray-300 dark:text-gray-600 pointer-events-none select-none">
            Shift/Ctrl+↵
          </span>
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors flex-shrink-0"
        >
          {t.form.add}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* 우선순위 */}
        <div className="flex gap-1">
          {PRIORITY_VALUES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                priority === p
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {priorityLabels[p]}
            </button>
          ))}
        </div>

        {/* 마감 일시 */}
        <DateTimePicker value={dueDate} onChange={setDueDate} />

        {/* 카테고리 */}
        {!showCatInput ? (
          <div className="flex gap-1 items-center">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">{t.form.selectCategory}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCatInput(true)}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t.form.newCategory}
            </button>
          </div>
        ) : (
          <div className="flex gap-1 items-center">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t.form.newCategoryPlaceholder}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => setShowCatInput(false)}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t.form.cancel}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
