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
      ? "bg-emerald-400/18 border-emerald-300/70 text-emerald-100"
      : state === "wrong"
        ? "bg-rose-400/18 border-rose-300/70 text-rose-100"
        : state === "selected"
          ? "bg-white/16 border-zinc-200/60 text-white shadow-sm shadow-white/5"
          : "bg-white/5 border-white/10 text-zinc-300/75 hover:bg-white/10 hover:text-white";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative px-3 py-2 min-h-[44px] rounded-xl text-sm border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] ${cls}`}
    >
      <span>{label}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
      {hotkey && (
        <span className="hidden sm:inline absolute -top-1 -right-1 text-[9px] text-zinc-200/65 bg-zinc-950/80 rounded px-1 border border-white/10">
          {hotkey}
        </span>
      )}
    </button>
  );
}

export function ChoiceGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 justify-center">{children}</div>;
}
