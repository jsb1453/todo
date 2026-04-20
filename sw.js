/**
 * Service Worker — 마감 알림
 *
 * 규칙:
 *  - 마감 1시간 전 ~ 마감 직전: 30분 슬롯 단위로 1회씩
 *  - 마감 이후: 10분 슬롯 단위로 계속
 *
 * slot 키 = `${todoId}-pre-${slot}` / `${todoId}-over-${slot}`
 * SW 생존 중에는 Set 으로 중복 방지.
 */

const DB_NAME = 'todo-app-db';
const DB_VERSION = 1;
const STORE_TODOS = 'todos';
const STORE_SENT = 'sentNotifications';

/** @returns {Promise<IDBDatabase>} */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_TODOS)) {
        db.createObjectStore(STORE_TODOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SENT)) {
        db.createObjectStore(STORE_SENT, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getTodos() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db
        .transaction(STORE_TODOS, 'readonly')
        .objectStore(STORE_TODOS)
        .getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function wasSent(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = db
        .transaction(STORE_SENT, 'readonly')
        .objectStore(STORE_SENT)
        .get(key);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

async function markSent(key) {
  try {
    const db = await openDB();
    db.transaction(STORE_SENT, 'readwrite')
      .objectStore(STORE_SENT)
      .put({ key, sentAt: Date.now() });
  } catch {
    // ignore
  }
}

/** 오래된 sent 기록 정리 (3일 이상) */
async function cleanOldSent() {
  try {
    const db = await openDB();
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const tx = db.transaction(STORE_SENT, 'readwrite');
    const store = tx.objectStore(STORE_SENT);
    const req = store.getAll();
    req.onsuccess = () => {
      for (const record of req.result) {
        if (record.sentAt < cutoff) store.delete(record.key);
      }
    };
  } catch {
    // ignore
  }
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

async function checkAndNotify() {
  const todos = await getTodos();
  const now = Date.now();

  for (const todo of todos) {
    if (todo.completed || !todo.dueDate) continue;

    const deadline = new Date(todo.dueDate).getTime();
    const diff = deadline - now; // 양수 = 아직 안 지남, 음수 = 초과

    const MS_30M = 30 * 60 * 1000;
    const MS_10M = 10 * 60 * 1000;
    const MS_60M = 60 * 60 * 1000;

    let notifyKey = '';
    let title = '';
    let body = '';

    if (diff > 0 && diff <= MS_60M) {
      // 마감 1시간 이내 — 30분 슬롯
      const slot = Math.floor(diff / MS_30M); // 1 or 0
      notifyKey = `${todo.id}-pre-${slot}`;
      const mins = Math.ceil(diff / 60000);
      title = '⏰ 마감 임박!';
      body = `${mins}분 후 마감\n[${todo.category}] ${todo.text}\n마감: ${formatDateTime(todo.dueDate)}`;
    } else if (diff <= 0) {
      // 마감 초과 — 10분 슬롯
      const slot = Math.floor(Math.abs(diff) / MS_10M);
      notifyKey = `${todo.id}-over-${slot}`;
      const mins = Math.floor(Math.abs(diff) / 60000);
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      const elapsed = hrs > 0 ? `${hrs}시간 ${remainMins}분` : `${mins}분`;
      title = '🚨 마감 초과!';
      body = `${elapsed} 경과\n[${todo.category}] ${todo.text}\n마감: ${formatDateTime(todo.dueDate)}`;
    }

    if (!notifyKey) continue;

    const alreadySent = await wasSent(notifyKey);
    if (alreadySent) continue;

    try {
      await self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notifyKey,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { todoId: todo.id, origin: self.location.origin },
        actions: [
          { action: 'open', title: '앱 열기' },
          { action: 'dismiss', title: '닫기' },
        ],
      });
      await markSent(notifyKey);
    } catch (err) {
      console.error('[SW] 알림 발송 실패:', err);
    }
  }
}

// ── 이벤트 핸들러 ──────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([self.clients.claim(), cleanOldSent(), checkAndNotify()])
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_NOW') {
    checkAndNotify();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.origin ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

// 1분마다 마감 체크
setInterval(checkAndNotify, 60 * 1000);
