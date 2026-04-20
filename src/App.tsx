import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { useDarkMode } from './hooks/useDarkMode';
import { useNotifications } from './hooks/useNotifications';
import { useLocale } from './lib/LocaleContext';
import { LOCALES } from './lib/i18n';
import TodoForm from './components/TodoForm';
import TodoItem from './components/TodoItem';
import FilterBar from './components/FilterBar';
import AlertModal from './components/AlertModal';
import type { FilterStatus } from './components/FilterBar';
import type { Priority } from './types';

export default function App() {
  const { t, locale, setLocale } = useLocale();
  const { permission, muted, requestPermission, toggleMute, notifySW, notifyOverdueNow } = useNotifications();

  const handleTodosChange = useCallback(() => notifySW(), [notifySW]);
  const { todos, addTodo, toggleTodo, deleteTodo, updateTodo } = useTodos(handleTodosChange);

  // 앱 로드 및 마감 초과 항목 변경 시 즉시 Windows 알림 발송
  const overdueIds = useMemo(
    () => todos.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate).getTime() < Date.now()).map((t) => t.id).join(','),
    [todos]
  );
  useEffect(() => {
    if (overdueIds) notifyOverdueNow();
  }, [overdueIds, notifyOverdueNow]);
  const { dark, toggle } = useDarkMode();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const categories = useMemo(
    () => [...new Set(todos.map((t) => t.category))].sort(),
    [todos]
  );

  const { activeItems, completedItems } = useMemo(() => {
    const base = todos.filter((todo) => {
      if (filterStatus === 'active' && todo.completed) return false;
      if (filterStatus === 'completed' && !todo.completed) return false;
      if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
      if (filterCategory && todo.category !== filterCategory) return false;
      return true;
    });
    const active = base.filter((t) => !t.completed).sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return {
      activeItems: active,
      completedItems: base.filter((t) => t.completed),
    };
  }, [todos, filterStatus, filterPriority, filterCategory]);

  const filtered = [...activeItems, ...completedItems];

  function clearCompleted() {
    todos.filter((todo) => todo.completed).forEach((todo) => deleteTodo(todo.id));
  }

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.filter((todo) => todo.completed).length;

  const currentLocale = LOCALES.find((l) => l.value === locale)!;

  const notifBtnInfo = (() => {
    if (permission === 'unsupported') return null;
    if (permission === 'granted' && muted) return { icon: '🔕', label: t.notif.muted, title: t.notif.mutedTitle, style: 'text-gray-400 dark:text-gray-400', onClick: toggleMute };
    if (permission === 'granted') return { icon: '🔔', label: t.notif.granted, title: t.notif.grantedTitle, style: 'text-indigo-500 dark:text-indigo-400', onClick: toggleMute };
    if (permission === 'denied') return { icon: '🔕', label: t.notif.denied, title: t.notif.deniedTitle, style: 'text-red-400', onClick: undefined };
    return { icon: '🔔', label: t.notif.request, title: t.notif.requestTitle, style: 'text-gray-400 dark:text-gray-300', onClick: requestPermission };
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {alertOpen && (
        <AlertModal todos={todos} onClose={() => setAlertOpen(false)} />
      )}
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t.header.title}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {t.header.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* 알람 버튼 */}
            <button
              onClick={() => setAlertOpen(true)}
              title={locale === 'ko' ? `미완료 ${activeCount}건` : `${activeCount} incomplete`}
              className="relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-red-500 font-semibold">{activeCount}</span>
            </button>

            {/* 언어 선택 드롭다운 */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <span className={`${currentLocale.flagClass} rounded-sm`} style={{ width: '1.2em', height: '0.9em' }} />
                <span>{currentLocale.label}</span>
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                  {LOCALES.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => { setLocale(l.value); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                        locale === l.value
                          ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className={`${l.flagClass} rounded-sm flex-shrink-0`} style={{ width: '1.2em', height: '0.9em' }} />
                      <span>{l.label}</span>
                      {locale === l.value && (
                        <svg className="w-3.5 h-3.5 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 알림 버튼 */}
            {notifBtnInfo && (
              <button
                onClick={notifBtnInfo.onClick}
                disabled={permission === 'denied'}
                title={notifBtnInfo.title}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium transition-colors shadow-sm ${
                  notifBtnInfo.onClick
                    ? 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer'
                    : 'cursor-default'
                } ${notifBtnInfo.style}`}
              >
                <span>{notifBtnInfo.icon}</span>
                <span>{notifBtnInfo.label}</span>
              </button>
            )}

            {/* 다크 모드 */}
            <button
              onClick={toggle}
              className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title={dark ? t.theme.light : t.theme.dark}
            >
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.36l-.71.71M6.34 17.66l-.71.71M17.66 17.66l-.71-.71M6.34 6.34l-.71-.71M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 알림 차단 배너 */}
        {permission === 'denied' && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {t.notif.deniedBanner}
          </div>
        )}

        {/* 입력 폼 */}
        <div className="mb-6">
          <TodoForm categories={categories} onAdd={addTodo} />
        </div>

        {/* 필터 */}
        <div className="mb-4">
          <FilterBar
            status={filterStatus}
            onStatusChange={setFilterStatus}
            priority={filterPriority}
            onPriorityChange={setFilterPriority}
            category={filterCategory}
            onCategoryChange={setFilterCategory}
            categories={categories}
            total={todos.length}
            active={activeCount}
            completed={completedCount}
          />
        </div>

        {/* 투두 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-sm">
              {todos.length === 0 ? t.empty.noTodos : t.empty.noMatch}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 미완료 */}
            {activeItems.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onUpdate={updateTodo}
              />
            ))}

            {/* 완료 영역 구분선 */}
            {activeItems.length > 0 && completedItems.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  {locale === 'ko' ? `완료 ${completedItems.length}건` : `${completedItems.length} completed`}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={clearCompleted}
                  className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  {t.filter.clearCompleted}
                </button>
              </div>
            )}

            {/* 완료 */}
            {completedItems.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onUpdate={updateTodo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
