import { useEffect, useState, useCallback } from 'react';

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

const MUTED_KEY = 'notif-muted';

export function useNotifications() {
  const [permission, setPermission] = useState<NotifPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as NotifPermission;
  });

  const [muted, setMuted] = useState(() => localStorage.getItem(MUTED_KEY) === 'true');

  // Service Worker 등록
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const basePath = import.meta.env.BASE_URL || '/';
    const swPath = new URL('sw.js', basePath).pathname;
    navigator.serviceWorker
      .register(swPath)
      .then((reg) => {
        console.log('[SW] 등록 완료:', reg.scope);
        reg.active?.postMessage({ type: 'SET_MUTED', muted: localStorage.getItem(MUTED_KEY) === 'true' });
      })
      .catch((err) => {
        console.error('[SW] 등록 실패:', err);
      });
  }, []);

  // 알림 권한 요청
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);

    if (result === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'CHECK_NOW' });
    }
  }, []);

  // 알림 뮤트 토글
  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTED_KEY, String(next));
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'SET_MUTED', muted: next });
    });
  }, [muted]);

  // 1분마다 SW에 CHECK_NOW 전송 (SW가 idle로 종료되어도 앱이 깨워줌)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || permission !== 'granted' || muted) return;
    const id = setInterval(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'CHECK_NOW' });
      });
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [permission, muted]);

  // todos 변경 시 SW에 즉시 재체크 요청
  const notifySW = useCallback(() => {
    if (!('serviceWorker' in navigator) || permission !== 'granted' || muted) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'CHECK_NOW' });
    });
  }, [permission, muted]);

  // 마감 초과된 미완료 항목 전부 즉시 Windows 알림 (3개씩 배치, 클라이언트 타이머로 순차 요청)
  const notifyOverdueNow = useCallback(() => {
    if (!('serviceWorker' in navigator) || permission !== 'granted' || muted) return;

    const sendBatch = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'NOTIFY_ALL_OVERDUE' });
      });
    };

    sendBatch();

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'OVERDUE_BATCH_DONE') return;
      if (event.data.remaining > 0) {
        setTimeout(sendBatch, 15000);
      } else {
        navigator.serviceWorker.removeEventListener('message', handler);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
  }, [permission, muted]);

  return { permission, muted, requestPermission, toggleMute, notifySW, notifyOverdueNow };
}
