import { useState, useEffect } from 'react';
import type { Todo, Priority } from '../types';
import { saveTodosToIDB, loadTodosFromIDB } from '../lib/db';

const LS_KEY = 'todos';

/** localStorage 에서 즉시 로드 (초기 렌더 동기) */
function loadFromLS(): Todo[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
}

export function useTodos(onTodosChange?: () => void) {
  const [todos, setTodos] = useState<Todo[]>(loadFromLS);

  // IndexedDB 에서 최신 데이터로 동기화 (마운트 시 1회)
  useEffect(() => {
    loadTodosFromIDB()
      .then((idbTodos) => {
        if (idbTodos.length > 0) setTodos(idbTodos);
      })
      .catch(() => {});
  }, []);

  // todos 변경 → localStorage + IndexedDB 저장
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(todos));
    saveTodosToIDB(todos).catch(() => {});
    onTodosChange?.();
  }, [todos, onTodosChange]);

  function addTodo(
    text: string,
    priority: Priority,
    dueDate: string | null,
    category: string
  ) {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      priority,
      dueDate,
      category,
      createdAt: new Date().toISOString(),
    };
    setTodos((prev) => [todo, ...prev]);
  }

  function toggleTodo(id: string) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  function updateTodo(id: string, changes: Partial<Omit<Todo, 'id' | 'createdAt'>>) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  }

  return { todos, addTodo, toggleTodo, deleteTodo, updateTodo };
}
