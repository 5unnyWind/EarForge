import type { ReactNode } from "react";

/** 表单字段壳 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-white/60 text-xs uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-amber-300/80">{hint}</span>}
    </label>
  );
}

/** 分段按钮 */
export function SegBar<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap bg-black/30 rounded-lg p-1 border border-white/10 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-2 sm:py-1.5 min-h-[36px] sm:min-h-0 rounded-md text-sm transition ${
            value === opt.id
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/60 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 self-start min-h-[36px] py-1"
    >
      <span
        className={`w-11 h-6 rounded-full transition relative ${
          checked ? "bg-indigo-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
      {label && <span className="text-sm text-white/80">{label}</span>}
    </button>
  );
}

/** 多选 chip 列表 */
export function ChipMulti<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (id: T) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`px-2.5 py-1.5 min-h-[32px] rounded-md text-xs border transition active:scale-[0.97] ${
              on
                ? "bg-indigo-500/30 border-indigo-400 text-white"
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 圆形音圈 */
export function NoteDot({
  index,
  label,
  active,
  onClick,
}: {
  index: number | string;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <div className="flex flex-col items-center">
      <Tag
        onClick={onClick}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all ${
          active ? "scale-125 ring-4 ring-amber-300/80 shadow-amber-400/50" : ""
        } ${onClick ? "cursor-pointer hover:brightness-110 active:scale-95" : ""}`}
      >
        {index}
      </Tag>
      {label && (
        <span
          className={`text-xs mt-1 tabular-nums ${
            active ? "text-amber-300 font-semibold" : "text-white/60"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function StatBadge({
  rounds,
  correct,
  total,
  allTime,
}: {
  rounds: number;
  correct: number;
  total: number;
  /** 长期累计；可选 */
  allTime?: { rounds: number; itemTotal: number; accuracy: number };
}) {
  const accuracy = total === 0 ? 0 : (correct / total) * 100;
  return (
    <div className="text-right">
      <div className="text-xs text-white/50">本次 第 {rounds} 轮</div>
      <div className="text-lg font-semibold tabular-nums">
        {accuracy.toFixed(0)}%{" "}
        <span className="text-xs font-normal text-white/50">
          ({correct}/{total})
        </span>
      </div>
      {allTime && allTime.rounds > 0 && (
        <div className="text-[11px] text-white/40 tabular-nums mt-0.5">
          累计 {allTime.rounds} 轮 ·{" "}
          {Number.isNaN(allTime.accuracy)
            ? "—"
            : `${(allTime.accuracy * 100).toFixed(0)}%`}
        </div>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-500 hover:bg-indigo-400 active:scale-[0.97] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed disabled:active:scale-100 font-semibold text-white shadow-lg shadow-indigo-500/30 transition ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 min-h-[40px] rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-sm font-medium transition ${className}`}
    >
      {children}
    </button>
  );
}

export function SuccessButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed disabled:active:scale-100 font-semibold text-white transition ${className}`}
    >
      {children}
    </button>
  );
}

export function InstrumentBadge({
  label,
  loading,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span className="text-xs uppercase tracking-wider text-white/40 shrink-0">
        乐器
      </span>
      <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 font-medium text-sm sm:text-base truncate">
        {loading ? "加载中…" : label}
      </span>
    </div>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-white/40 text-center leading-relaxed px-2">
      {children}
    </p>
  );
}
