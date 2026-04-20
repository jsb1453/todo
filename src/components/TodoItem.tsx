import { useState, useEffect } from 'react';
import type { Todo, Priority } from '../types';
import { useLocale } from '../lib/LocaleContext';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: Partial<Omit<Todo, 'id' | 'createdAt'>>) => void;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
  medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400',
  low: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

function formatOverdueDuration(dueDate: string, locale: string): string {
  const diffMs = Date.now() - new Date(dueDate).getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (locale === 'ko') {
    if (days > 0) return `${days}일 ${hours}시간 ${minutes}분 지연`;
    if (hours > 0) return `${hours}시간 ${minutes}분 지연`;
    return `${minutes}분 지연`;
  } else {
    if (days > 0) return `${days}d ${hours}h ${minutes}m overdue`;
    if (hours > 0) return `${hours}h ${minutes}m overdue`;
    return `${minutes}m overdue`;
  }
}

function formatDueDate(dueDate: string, locale: string): string {
  const d = new Date(dueDate);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const sameYear = d.getFullYear() === now.getFullYear();
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (locale === 'ko') {
    const datePart = sameYear
      ? `${d.getMonth() + 1}월 ${d.getDate()}일`
      : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    return `${datePart} ${timePart}`;
  } else {
    const datePart = sameYear
      ? `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
      : `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}, ${d.getFullYear()}`;
    return `${datePart} ${timePart}`;
  }
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdate }: Props) {
  const { t, locale } = useLocale();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showConfirm, setShowConfirm] = useState(false);
  const [, setTick] = useState(0);

  const overdue = isOverdue(todo.dueDate) && !todo.completed;

  useEffect(() => {
    if (!overdue) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [overdue]);

  function saveEdit() {
    const trimmed = editText.trim();
    if (trimmed) onUpdate(todo.id, { text: trimmed });
    setEditing(false);
  }

  const priorityLabel: Record<Priority, string> = {
    high: t.priority.high,
    medium: t.priority.medium,
    low: t.priority.low,
  };

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
        todo.completed
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 opacity-60'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* 체크박스 */}
      <button
        onClick={() => setShowConfirm(true)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.completed
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : 'border-gray-300 dark:border-gray-500 hover:border-indigo-400'
        }`}
      >
        {todo.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* 본문 */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full px-2 py-1 rounded-lg border border-indigo-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none"
          />
        ) : (
          <p
            onDoubleClick={() => !todo.completed && setEditing(true)}
            className={`text-sm leading-relaxed break-words ${
              todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'
            }`}
          >
            {todo.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[todo.priority]}`}>
            {priorityLabel[todo.priority]}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
            {todo.category}
          </span>
          {todo.dueDate && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              overdue
                ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 font-semibold'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {overdue ? '⚠️ ' : '📅 '}{formatDueDate(todo.dueDate, locale)}
            </span>
          )}
          {overdue && todo.dueDate && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-medium">
              🕐 {formatOverdueDuration(todo.dueDate, locale)}
            </span>
          )}
        </div>
      </div>

      {/* 완료 확인 다이얼로그 */}
      {showConfirm && (
        <ConfirmDialog
          title={todo.completed ? t.confirm.undoTitle : t.confirm.completeTitle}
          message={todo.completed ? t.confirm.undoMessage : t.confirm.completeMessage}
          confirmLabel={todo.completed ? t.confirm.undo : t.confirm.confirm}
          cancelLabel={t.confirm.cancel}
          onConfirm={() => { onToggle(todo.id); setShowConfirm(false); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!todo.completed && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
            title={t.todo.edit}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
          title={t.todo.delete}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
