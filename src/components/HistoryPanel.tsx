import { useEffect, useMemo, useState } from "react";
import {
  aggregate,
  aggregateSince,
  clearHistory,
  DAY_MS,
  tagBreakdown,
  type RoundEntry,
  type TagStat,
} from "../lib/history";
import { useHistory } from "../hooks/useHistory";
import { GhostButton } from "./ui";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CrossIcon } from "./Icon";

/**
 * 模块底部历史面板：显示累计 / 近 7 天 / 近 30 天准确率，
 * 题点弱点 (tag 维度)，最近 N 轮，重置按钮。
 */
export function HistoryPanel({
  moduleId,
  /** 给 tag 提供更友好的显示名（可选） */
  formatTag,
  /** 重置本次会话计数（StatBadge 那一行） */
  onResetSession,
}: {
  moduleId: string;
  formatTag?: (tag: string) => string;
  onResetSession?: () => void;
}) {
  const entries = useHistory(moduleId);
  const [open, setOpen] = useState(false);
  // 面板打开时每分钟刷新一次"now"，让"近 7/30 天"窗口能滑动；关上后停掉省电
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const all = useMemo(() => aggregate(entries), [entries]);
  const last7 = useMemo(
    () => aggregateSince(entries, now - 7 * DAY_MS),
    [entries, now],
  );
  const last30 = useMemo(
    () => aggregateSince(entries, now - 30 * DAY_MS),
    [entries, now],
  );
  const tags = useMemo(() => tagBreakdown(entries).slice(0, 8), [entries]);
  const recent = useMemo(() => [...entries].reverse().slice(0, 12), [entries]);

  const hasData = entries.length > 0;

  return (
    <section className="rounded-3xl bg-zinc-950/32 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-white/2 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-semibold text-white/70">历史记录</h3>
          {hasData ? (
            <span className="text-xs text-white/50 tabular-nums truncate">
              累计 {all.rounds} 轮 · {(all.accuracy * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs text-white/40">暂无数据</span>
          )}
        </div>
        {open ? (
          <ArrowUpIcon size={16} className="text-white/40 shrink-0" />
        ) : (
          <ArrowDownIcon size={16} className="text-white/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1 flex flex-col gap-4 text-sm border-t border-white/6">
          {!hasData ? (
            <p className="text-white/40 text-center py-4">
              答题之后这里会出现你的历史记录。
            </p>
          ) : (
            <>
              {/* 三段聚合 */}
              <div className="grid grid-cols-3 gap-2">
                <SummaryTile label="累计" agg={all} />
                <SummaryTile label="近 30 天" agg={last30} />
                <SummaryTile label="近 7 天" agg={last7} />
              </div>

              {/* 弱点 */}
              {tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-white/40">
                      按题型
                    </span>
                    <span className="text-[11px] text-white/30">
                      正确率从低到高
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {tags.map((t) => (
                      <TagRow key={t.tag} stat={t} formatTag={formatTag} />
                    ))}
                  </ul>
                </div>
              )}

              {/* 最近轮次 */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider text-white/40">
                  最近轮次
                </span>
                <ul className="flex flex-wrap gap-1.5">
                  {recent.map((e, i) => (
                    <RecentRoundDot
                      key={`${e.ts}-${i}`}
                      entry={e}
                      formatTag={formatTag}
                    />
                  ))}
                </ul>
              </div>

              {/* 操作行 */}
              <div className="flex flex-wrap gap-2 justify-end pt-1">
                {onResetSession && (
                  <GhostButton onClick={onResetSession}>
                    清空本次会话
                  </GhostButton>
                )}
                <GhostButton
                  onClick={() => {
                    if (confirm("确定要清空本模块的全部历史记录吗？此操作不可撤销。")) {
                      clearHistory(moduleId);
                    }
                  }}
                  className="bg-rose-500/15! hover:bg-rose-500/25! text-rose-200!"
                >
                  清空全部历史
                </GhostButton>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function SummaryTile({
  label,
  agg,
}: {
  label: string;
  agg: ReturnType<typeof aggregate>;
}) {
  const acc = Number.isNaN(agg.accuracy) ? null : agg.accuracy;
  return (
    <div className="rounded-xl bg-zinc-950/45 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums leading-tight">
        {acc === null ? "—" : `${(acc * 100).toFixed(0)}%`}
      </div>
      <div className="text-[11px] text-white/40 tabular-nums">
        {agg.rounds} 轮 · {agg.itemCorrect}/{agg.itemTotal}
      </div>
    </div>
  );
}

function TagRow({
  stat,
  formatTag,
}: {
  stat: TagStat;
  formatTag?: (tag: string) => string;
}) {
  const acc = Number.isNaN(stat.accuracy) ? 0 : stat.accuracy;
  const pct = Math.round(acc * 100);
  const colorClass =
    acc >= 0.85
      ? "bg-emerald-400"
      : acc >= 0.6
        ? "bg-zinc-300"
        : "bg-rose-400";
  return (
    <li className="flex items-center gap-3">
      <span className="w-20 sm:w-24 truncate text-white/70 text-xs">
        {formatTag ? formatTag(stat.tag) : stat.tag}
      </span>
      <div className="flex-1 h-2 bg-white/5 rounded overflow-hidden">
        <div
          className={`${colorClass} h-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-white/50 tabular-nums w-20 text-right">
        {pct}% · {stat.itemCorrect}/{stat.itemTotal}
      </span>
    </li>
  );
}

function RecentRoundDot({
  entry,
  formatTag,
}: {
  entry: RoundEntry;
  formatTag?: (tag: string) => string;
}) {
  const isPerfect = entry.items > 0 && entry.correct === entry.items;
  const isZero = entry.correct === 0;
  const acc = entry.items === 0 ? 0 : entry.correct / entry.items;
  const cls = isPerfect
    ? "bg-emerald-500/30 border-emerald-400/60 text-emerald-100"
    : isZero
      ? "bg-rose-500/25 border-rose-400/60 text-rose-100"
      : acc >= 0.5
        ? "bg-white/12 border-zinc-200/45 text-zinc-100"
        : "bg-rose-500/15 border-rose-400/40 text-rose-100";
  const tagText = entry.tags?.[0] ? (formatTag ? formatTag(entry.tags[0]) : entry.tags[0]) : null;
  const ago = formatRelative(entry.ts);
  return (
    <li
      title={`${new Date(entry.ts).toLocaleString()}${tagText ? " · " + tagText : ""}`}
      className={`px-2 py-1 rounded-md border text-[11px] tabular-nums inline-flex items-center gap-1 ${cls}`}
    >
      {isPerfect ? (
        <CheckIcon size={11} />
      ) : isZero ? (
        <CrossIcon size={11} />
      ) : null}
      <span>
        {entry.correct}/{entry.items}
      </span>
      <span className="opacity-60">· {ago}</span>
    </li>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 时前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
