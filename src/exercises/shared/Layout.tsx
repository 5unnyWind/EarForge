import type { ComponentType, ReactNode } from "react";
import { PrimaryButton, StatBadge } from "../../components/ui";
import { HeadphonesIcon } from "../../components/Icon";

export function ExerciseHeader({
  title,
  description,
  stats,
  allTime,
}: {
  title: string;
  description: string;
  stats: { rounds: number; correct: number; total: number };
  allTime?: { rounds: number; itemTotal: number; accuracy: number };
}) {
  return (
    <header className="flex items-start justify-between gap-3 flex-wrap px-1 sm:px-2">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
        <p className="text-sm text-zinc-300/60">{description}</p>
      </div>
      <StatBadge
        rounds={stats.rounds}
        correct={stats.correct}
        total={stats.total}
        allTime={allTime}
      />
    </header>
  );
}

export function IdleCard({
  Icon = HeadphonesIcon,
  hint,
  onStart,
  error,
}: {
  Icon?: ComponentType<{ className?: string; size?: number | string }>;
  hint: string;
  onStart: () => void;
  error: string | null;
}) {
  return (
    <div className="relative overflow-hidden text-center py-9 rounded-[1.75rem] bg-zinc-950/38 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.35),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/35 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />
      <div className="mb-4 flex justify-center text-zinc-100/90">
        <Icon size={56} className="drop-shadow-[0_4px_16px_rgba(255,255,255,0.2)]" />
      </div>
      <h3 className="text-xl font-semibold mb-2">准备好了吗？</h3>
      <p className="text-zinc-300/65 text-sm mb-6 px-4">{hint}</p>
      <PrimaryButton onClick={onStart}>开始练习</PrimaryButton>
      {error && <p className="mt-4 text-sm text-rose-300">出错了：{error}</p>}
    </div>
  );
}

export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-zinc-950/32 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.065),0_16px_46px_rgba(0,0,0,0.18)] backdrop-blur-xl p-4 sm:p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-zinc-100/68 mb-3 sm:mb-4">设置</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">{children}</div>
    </section>
  );
}
