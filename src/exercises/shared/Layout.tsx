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
    <header className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-white/60">{description}</p>
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
    <div className="text-center py-8 rounded-2xl bg-white/[0.04] border border-white/10">
      <div className="mb-4 flex justify-center text-indigo-300/90">
        <Icon size={56} className="drop-shadow-[0_4px_12px_rgba(99,102,241,0.35)]" />
      </div>
      <h3 className="text-xl font-semibold mb-2">准备好了吗？</h3>
      <p className="text-white/60 text-sm mb-6 px-4">{hint}</p>
      <PrimaryButton onClick={onStart}>开始练习</PrimaryButton>
      {error && <p className="mt-4 text-sm text-red-400">出错了：{error}</p>}
    </div>
  );
}

export function SettingsCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-3 sm:mb-4">设置</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">{children}</div>
    </section>
  );
}
