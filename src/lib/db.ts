import type { Todo } from '../types';

const DB_NAME = 'todo-app-db';
const DB_VERSION = 1;
const STORE_TODOS = 'todos';
const STORE_SENT = 'sentNotifications';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TODOS)) {
        db.createObjectStore(STORE_TODOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SENT)) {
        db.createObjectStore(STORE_SENT, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTodosToIDB(todos: Todo[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_TODOS, 'readwrite');
  const store = tx.objectStore(STORE_TODOS);
  store.clear();
  for (const todo of todos) store.put(todo);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadTodosFromIDB(): Promise<Todo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE_TODOS, 'readonly')
      .objectStore(STORE_TODOS)
      .getAll();
    req.onsuccess = () => resolve((req.result as Todo[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}
