import { useEffect, useState } from "react";
import { getHistory, type RoundEntry } from "../lib/history";
import { subscribe } from "../lib/storage";

/** 订阅某模块的历史记录，返回最新的 entries 数组 */
export function useHistory(moduleId: string): RoundEntry[] {
  const [entries, setEntries] = useState<RoundEntry[]>(() =>
    getHistory(moduleId),
  );

  useEffect(() => {
    setEntries(getHistory(moduleId));
    return subscribe(`history/${moduleId}`, () => {
      setEntries(getHistory(moduleId));
    });
  }, [moduleId]);

  return entries;
}
