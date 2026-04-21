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

let isMuted = false;

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
    return new Promise((resolve) => {
      const req = db
        .transaction(STORE_SENT, 'readwrite')
        .objectStore(STORE_SENT)
        .put({ key, sentAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

/** 오래된 sent 기록 정리 (3일 이상) */
async function cleanOldSent() {
  try {
    const db = await openDB();
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SENT, 'readwrite');
      const store = tx.objectStore(STORE_SENT);
      const req = store.getAll();
      req.onsuccess = () => {
        for (const record of req.result) {
          if (record.sentAt < cutoff) store.delete(record.key);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

function getBasePath() {
  // service worker scope에서 기본 경로 추출 (e.g., /todo/)
  const scope = self.registration?.scope || self.location.pathname;
  const match = scope.match(/^[^?#]*\//);
  return match ? match[0] : '/';
}

function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

/** 앱 실행 시 마감 초과된 미전송 항목을 최대 3개씩 발송
 *  매 호출마다 미전송 목록을 새로 조회하므로 offset 불필요
 */
async function notifyAllOverdue() {
  if (isMuted) return;
  const todos = await getTodos();
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const targets = [];
  for (const todo of todos) {
    if (todo.completed || !todo.dueDate) continue;
    if (new Date(todo.dueDate).getTime() > now) continue;
    const key = `${todo.id}-alarm-${today}`;
    const alreadySent = await wasSent(key);
    if (!alreadySent) targets.push({ todo, key });
  }

  const batch = targets.slice(0, 3);
  for (const { todo, key } of batch) {
    const diff = now - new Date(todo.dueDate).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const elapsed = hrs > 0 ? `${hrs}시간 ${mins % 60}분 경과` : `${mins}분 경과`;

    try {
      const basePath = getBasePath();
      await self.registration.showNotification('🚨 마감 초과 — 즉시 확인 필요', {
        body: `${elapsed}\n[${todo.category}] ${todo.text}\n마감: ${formatDateTime(todo.dueDate)}`,
        icon: `${basePath}favicon.ico`,
        badge: `${basePath}favicon.ico`,
        tag: key,
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        data: { todoId: todo.id, basePath },
        actions: [
          { action: 'open', title: '앱 열기' },
          { action: 'dismiss', title: '닫기' },
        ],
      });
      await markSent(key);
    } catch (err) {
      console.error('[SW] 즉시 알림 발송 실패:', err);
    }
  }

  // 전송 후 남은 미전송 항목 수를 클라이언트에 전달
  const remaining = targets.length - batch.length;
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'OVERDUE_BATCH_DONE', remaining });
  }
}

async function checkAndNotify() {
  if (isMuted) return;
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
      const basePath = getBasePath();
      await self.registration.showNotification(title, {
        body,
        icon: `${basePath}favicon.ico`,
        badge: `${basePath}favicon.ico`,
        tag: notifyKey,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { todoId: todo.id, basePath },
        actions: [
          { action: 'open', title: '앱 열기' },
          { action: 'dismiss', title: '닫기' },
        ],
      });
      await markSent(notifyKey);

      // 10초 후 자동 닫기
      setTimeout(async () => {
        const notifications = await self.registration.getNotifications({ tag: notifyKey });
        notifications.forEach((n) => n.close());
      }, 10000);
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
  // clients.claim()만 waitUntil에 포함 — 나머지는 페이지 로드와 무관하게 실행
  event.waitUntil(self.clients.claim());
  setTimeout(() => { cleanOldSent(); checkAndNotify(); }, 0);
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CHECK_NOW') {
    event.waitUntil(checkAndNotify());
  } else if (event.data?.type === 'NOTIFY_ALL_OVERDUE') {
    event.waitUntil(notifyAllOverdue());
  } else if (event.data?.type === 'SET_MUTED') {
    isMuted = !!event.data.muted;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const basePath = event.notification.data?.basePath ?? getBasePath();
  const targetUrl = new URL(basePath, self.location.origin).href.slice(0, -1); // 끝의 / 제거
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(basePath.slice(0, -1)) && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

// 앱이 열려 있는 동안 CHECK_NOW 메시지로 1분마다 체크 (useNotifications.ts 참고)
