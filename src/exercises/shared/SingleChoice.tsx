import type { ReactNode } from "react";

export type ChoiceState = "idle" | "selected" | "correct" | "wrong";

export function ChoiceChip({
  label,
  sub,
  hotkey,
  state,
  onClick,
  disabled,
}: {
  label: string;
  sub?: string;
  hotkey?: string;
  state: ChoiceState;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls =
    state === "correct"
      ? "bg-emerald-500/30 border-emerald-400 text-emerald-100"
      : state === "wrong"
        ? "bg-rose-500/30 border-rose-400 text-rose-100"
        : state === "selected"
          ? "bg-indigo-500/30 border-indigo-400 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-3 py-2 min-h-[44px] rounded-lg text-sm border transition flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] ${cls}`}
    >
      <span>{label}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
      {hotkey && (
        <span className="hidden sm:inline absolute -top-1 -right-1 text-[9px] text-white/50 bg-black/60 rounded px-1">
          {hotkey}
        </span>
      )}
    </button>
  );
}

export function ChoiceGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 justify-center">{children}</div>;
}
