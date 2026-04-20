import { useState, useEffect } from 'react';
import type { Todo, Priority } from '../types';
import { useLocale } from '../lib/LocaleContext';

interface Props {
  todos: Todo[];
  onClose: () => void;
}

const PRIORITY_LABEL: Record<Priority, Record<string, string>> = {
  high: { ko: '높음', en: 'High' },
  medium: { ko: '중간', en: 'Medium' },
  low: { ko: '낮음', en: 'Low' },
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400',
  low: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
};

function formatDueDate(dueDate: string, locale: string): string {
  const d = new Date(dueDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (locale === 'ko') {
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${timePart}`;
  }
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()} ${timePart}`;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

export default function AlertModal({ todos, onClose }: Props) {
  const { locale } = useLocale();
  const [blink, setBlink] = useState(false);

  const incomplete = todos
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const now = Date.now();
      const aTime = a.dueDate ? now - new Date(a.dueDate).getTime() : -Infinity;
      const bTime = b.dueDate ? now - new Date(b.dueDate).getTime() : -Infinity;
      return bTime - aTime;
    });

  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 1000);
    return () => clearInterval(id);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const headerBg = blink
    ? 'bg-red-600 dark:bg-red-700'
    : 'bg-orange-500 dark:bg-orange-600';

  const borderColor = blink
    ? 'border-red-500 dark:border-red-600'
    : 'border-orange-400 dark:border-orange-500';

  const title = locale === 'ko'
    ? `⚠️ 미완료 항목 ${incomplete.length}건`
    : `⚠️ ${incomplete.length} Incomplete Item${incomplete.length !== 1 ? 's' : ''}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full max-w-lg mx-4 rounded-2xl border-2 shadow-2xl overflow-hidden transition-colors duration-300 ${borderColor} bg-white dark:bg-gray-900`}
      >
        {/* 헤더 */}
        <div className={`flex items-center justify-between px-5 py-4 transition-colors duration-300 ${headerBg}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <span className="text-white font-bold text-base tracking-wide">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/20"
            title={locale === 'ko' ? '닫기' : 'Close'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {incomplete.length === 0 ? (
            <div className="py-14 text-center text-gray-400 dark:text-gray-500">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-sm font-medium">
                {locale === 'ko' ? '미완료 항목이 없습니다!' : 'No incomplete items!'}
              </p>
            </div>
          ) : (
            incomplete.map((todo) => {
              const overdue = isOverdue(todo.dueDate);
              return (
                <div
                  key={todo.id}
                  className={`flex items-start gap-3 px-5 py-4 transition-colors ${
                    overdue ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'
                  }`}
                >
                  {/* 우선순위 dot */}
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    todo.priority === 'high' ? 'bg-red-500' :
                    todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium break-words leading-snug ${
                      overdue ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-100'
                    }`}>
                      {todo.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[todo.priority]}`}>
                        {PRIORITY_LABEL[todo.priority][locale] ?? PRIORITY_LABEL[todo.priority].en}
                      </span>
                      {todo.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                          {todo.category}
                        </span>
                      )}
                      {todo.dueDate && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          overdue
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {overdue ? '⚠️ ' : '📅 '}{formatDueDate(todo.dueDate, locale)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {locale === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
