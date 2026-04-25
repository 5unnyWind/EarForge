import { INSTRUMENTS } from "../../audio/instruments";
import { Field, Toggle } from "../../components/ui";

export function InstrumentPicker({
  random,
  setRandom,
  fixedId,
  setFixedId,
}: {
  random: boolean;
  setRandom: (v: boolean) => void;
  fixedId: string;
  setFixedId: (v: string) => void;
}) {
  return (
    <Field label="乐器">
      <div className="flex flex-col gap-2">
        <Toggle
          label={random ? "每轮随机" : "固定一种"}
          checked={random}
          onChange={setRandom}
        />
        {!random && (
          <select
            value={fixedId}
            onChange={(e) => setFixedId(e.target.value)}
            className="bg-zinc-950/55 border border-white/12 rounded-xl px-3 py-2 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none focus:ring-2 focus:ring-white/20"
          >
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id} className="bg-zinc-900">
                {i.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </Field>
  );
}
