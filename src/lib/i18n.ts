export type Locale = 'ko' | 'en';

export const LOCALES: { value: Locale; flagClass: string; label: string }[] = [
  { value: 'ko', flagClass: 'fi fi-kr', label: '한국어' },
  { value: 'en', flagClass: 'fi fi-us', label: 'English' },
];

export const translations = {
  ko: {
    header: {
      title: '할 일 목록',
      subtitle: '오늘도 하나씩 해나가요 ✨',
    },
    notif: {
      granted: '알림 켜짐',
      muted: '알림 꺼짐',
      denied: '알림 차단됨',
      request: '알림 허용',
      grantedTitle: '클릭하여 알림 끄기',
      mutedTitle: '클릭하여 알림 켜기',
      deniedTitle: '브라우저 설정에서 알림을 허용해주세요',
      requestTitle: '마감 알림 허용',
      deniedBanner:
        '🔕 브라우저에서 알림이 차단되어 있습니다. 주소창 자물쇠 아이콘 → 알림 허용 후 새로고침 해주세요.',
    },
    form: {
      placeholder: '할 일을 입력하세요...',
      add: '추가',
      selectCategory: '카테고리 선택',
      newCategory: '+ 새 카테고리',
      newCategoryPlaceholder: '새 카테고리명',
      cancel: '취소',
    },
    priority: {
      high: '🔴 높음',
      medium: '🟡 중간',
      low: '🟢 낮음',
      all: '전체 우선순위',
    },
    datetime: {
      datePlaceholder: '날짜 선택',
      hour: '시',
      minute: '분',
      removeTitle: '마감일 제거',
    },
    filter: {
      all: '전체',
      active: '진행 중',
      completed: '완료',
      totalLabel: '전체',
      activeLabel: '진행 중',
      completedLabel: '완료',
      clearCompleted: '완료 항목 삭제',
      allCategories: '전체 카테고리',
    },
    todo: {
      edit: '수정',
      delete: '삭제',
    },
    confirm: {
      completeTitle: '할 일 완료',
      completeMessage: '이 항목을 완료로 표시하시겠습니까?',
      confirm: '완료',
      cancel: '취소',
      undoTitle: '완료 취소',
      undoMessage: '이 항목을 다시 미완료로 되돌리겠습니까?',
      undo: '되돌리기',
      deleteAllTitle: '완료 항목 일괄 삭제',
      deleteAllMessage: (n: number) => `완료된 항목 ${n}개를 모두 삭제하시겠습니까?`,
      deleteAll: '전체 삭제',
    },
    empty: {
      noTodos: '할 일을 추가해보세요!',
      noMatch: '해당 조건의 항목이 없습니다.',
    },
    theme: {
      dark: '다크 모드',
      light: '라이트 모드',
    },
  },
  en: {
    header: {
      title: 'Todo List',
      subtitle: "Let's tackle it one by one ✨",
    },
    notif: {
      granted: 'Notifications On',
      muted: 'Notifications Off',
      denied: 'Notifications Blocked',
      request: 'Enable Notifications',
      grantedTitle: 'Click to turn off notifications',
      mutedTitle: 'Click to turn on notifications',
      deniedTitle: 'Allow notifications in browser settings',
      requestTitle: 'Allow deadline notifications',
      deniedBanner:
        '🔕 Notifications are blocked. Click the lock icon in the address bar → Allow, then refresh.',
    },
    form: {
      placeholder: 'Enter a task...',
      add: 'Add',
      selectCategory: 'Select category',
      newCategory: '+ New category',
      newCategoryPlaceholder: 'Category name',
      cancel: 'Cancel',
    },
    priority: {
      high: '🔴 High',
      medium: '🟡 Medium',
      low: '🟢 Low',
      all: 'All priorities',
    },
    datetime: {
      datePlaceholder: 'Select date',
      hour: 'h',
      minute: 'm',
      removeTitle: 'Remove deadline',
    },
    filter: {
      all: 'All',
      active: 'Active',
      completed: 'Done',
      totalLabel: 'Total',
      activeLabel: 'Active',
      completedLabel: 'Done',
      clearCompleted: 'Clear completed',
      allCategories: 'All categories',
    },
    todo: {
      edit: 'Edit',
      delete: 'Delete',
    },
    confirm: {
      completeTitle: 'Complete Task',
      completeMessage: 'Mark this task as completed?',
      confirm: 'Complete',
      cancel: 'Cancel',
      undoTitle: 'Undo Completion',
      undoMessage: 'Move this task back to active?',
      undo: 'Undo',
      deleteAllTitle: 'Delete All Completed',
      deleteAllMessage: (n: number) => `Delete all ${n} completed tasks?`,
      deleteAll: 'Delete All',
    },
    empty: {
      noTodos: 'Add your first task!',
      noMatch: 'No tasks match the filter.',
    },
    theme: {
      dark: 'Dark mode',
      light: 'Light mode',
    },
  },
} as const;

export type T = typeof translations[Locale];
