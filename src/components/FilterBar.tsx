import type { Priority } from '../types';
import { useLocale } from '../lib/LocaleContext';

export type FilterStatus = 'all' | 'active' | 'completed';

interface Props {
  status: FilterStatus;
  onStatusChange: (s: FilterStatus) => void;
  priority: Priority | 'all';
  onPriorityChange: (p: Priority | 'all') => void;
  category: string;
  onCategoryChange: (c: string) => void;
  categories: string[];
  total: number;
  active: number;
  completed: number;
}

export default function FilterBar({
  status, onStatusChange,
  priority, onPriorityChange,
  category, onCategoryChange,
  categories,
  total, active, completed,
}: Props) {
  const { t } = useLocale();

  const STATUS_TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: t.filter.all },
    { value: 'active', label: t.filter.active },
    { value: 'completed', label: t.filter.completed },
  ];

  const PRIORITY_OPTIONS: { value: Priority | 'all'; label: string }[] = [
    { value: 'all', label: t.priority.all },
    { value: 'high', label: t.priority.high },
    { value: 'medium', label: t.priority.medium },
    { value: 'low', label: t.priority.low },
  ];

  return (
    <div className="space-y-3">
      {/* 통계 */}
      <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>{t.filter.totalLabel} <strong className="text-gray-700 dark:text-gray-200">{total}</strong></span>
        <span>{t.filter.activeLabel} <strong className="text-indigo-600 dark:text-indigo-400">{active}</strong></span>
        <span>{t.filter.completedLabel} <strong className="text-green-600 dark:text-green-400">{completed}</strong></span>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {/* 상태 탭 */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === tab.value
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 우선순위 필터 */}
        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as Priority | 'all')}
          className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* 카테고리 필터 */}
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">{t.filter.allCategories}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
