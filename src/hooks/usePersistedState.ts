import { useCallback, useEffect, useRef, useState } from "react";
import { readJSON, subscribe, writeJSON } from "../lib/storage";

/**
 * 持久化 useState：
 * - 初始值优先取 localStorage，没有则用 initial
 * - 修改后自动写回；同标签 / 跨标签都能同步
 *
 * 注意：副作用（写 localStorage、派发同标签事件）放在 setter 主体里，
 * 而不是 setState updater 内部，以兼容 React Concurrent Mode 的投机执行。
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const initialRef = useRef(initial);
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initialRef.current));

  // 始终持有最新 value 的 ref，给 set(prev => ...) 做"读取当前值"用
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    return subscribe(key, (v) => {
      if (v === null) {
        setValue(initialRef.current);
      } else {
        setValue(v as T);
      }
    });
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (p: T) => T)(valueRef.current)
          : next;
      // 引用相同时跳过：避免 set(currentObj) 这种无意义的写入和事件风暴
      if (Object.is(resolved, valueRef.current)) return;
      valueRef.current = resolved;
      writeJSON(key, resolved);
      setValue(resolved);
    },
    [key],
  );

  return [value, set];
}
