import { Field, SegBar } from "../../components/ui";

export type DifficultyPreset = "easy" | "medium" | "hard" | "custom";

const OPTIONS: { id: DifficultyPreset; label: string }[] = [
  { id: "easy", label: "简单" },
  { id: "medium", label: "中等" },
  { id: "hard", label: "困难" },
  { id: "custom", label: "自定义" },
];

export function DifficultyPresetPicker({
  value,
  onChange,
}: {
  value: DifficultyPreset;
  onChange: (value: DifficultyPreset) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <Field label="难度预设">
        <SegBar options={OPTIONS} value={value} onChange={onChange} />
      </Field>
    </div>
  );
}
