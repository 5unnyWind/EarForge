/**
 * 本地存储统一封装
 * - JSON 序列化
 * - 失败兜底（无痕模式 / 配额已满 / SSR）
 * - 跨标签同步（storage 事件） + 同标签同步（自定义事件）
 */

const NAMESPACE = "music-practice";
const SAME_TAB_EVENT = `${NAMESPACE}:storage`;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function nsKey(key: string): string {
  return `${NAMESPACE}/${key}`;
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(nsKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[storage] read ${key} failed`, e);
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(nsKey(key), JSON.stringify(value));
    dispatchSameTab(key, value);
  } catch (e) {
    console.warn(`[storage] write ${key} failed`, e);
  }
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(nsKey(key));
    dispatchSameTab(key, null);
  } catch {
    /* ignore */
  }
}

/** 订阅某 key 的变化（含跨标签 storage 事件 + 同标签自定义事件） */
export function subscribe(
  key: string,
  handler: (newValue: unknown) => void,
): () => void {
  if (!isBrowser()) return () => {};
  const fullKey = nsKey(key);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== fullKey) return;
    try {
      handler(e.newValue ? JSON.parse(e.newValue) : null);
    } catch {
      handler(null);
    }
  };
  const onSameTab = (e: Event) => {
    const detail = (e as CustomEvent<{ key: string; value: unknown }>).detail;
    if (detail?.key === key) handler(detail.value);
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(SAME_TAB_EVENT, onSameTab as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SAME_TAB_EVENT, onSameTab as EventListener);
  };
}

function dispatchSameTab(key: string, value: unknown) {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent(SAME_TAB_EVENT, { detail: { key, value } }),
  );
}
