import type { ComponentType } from "react";
import ContourExercise from "./contour";
import IntervalExercise from "./interval";
import ChordExercise from "./chord";
import ScaleExercise from "./scale";
import DegreeExercise from "./degree";
import RhythmExercise from "./rhythm";
import MelodyExercise from "./melody";
import {
  ChordIcon,
  ContourIcon,
  IntervalIcon,
  MelodyIcon,
  RhythmIcon,
  ScaleIcon,
} from "../components/Icon";

export type ModuleId =
  | "contour"
  | "interval"
  | "chord"
  | "scale"
  | "degree"
  | "rhythm"
  | "melody";

export type ModuleDef = {
  id: ModuleId;
  name: string;
  description: string;
  Icon: ComponentType<{ className?: string; size?: number | string }>;
  Component: ComponentType;
};

export const MODULES: ModuleDef[] = [
  {
    id: "contour",
    name: "上下行",
    description: "判断相邻两音是上行还是下行",
    Icon: ContourIcon,
    Component: ContourExercise,
  },
  {
    id: "degree",
    name: "音级识别",
    description: "听一个音阶里的音，判断它是第几级",
    Icon: ScaleIcon,
    Component: DegreeExercise,
  },
  {
    id: "interval",
    name: "音程识别",
    description: "听两个音判断它们的音程关系",
    Icon: IntervalIcon,
    Component: IntervalExercise,
  },
  {
    id: "rhythm",
    name: "节奏听写",
    description: "听一段节奏，从候选项中选出对的那一个",
    Icon: RhythmIcon,
    Component: RhythmExercise,
  },
  {
    id: "scale",
    name: "音阶识别",
    description: "听一个音阶判断它属于哪种调式",
    Icon: ScaleIcon,
    Component: ScaleExercise,
  },
  {
    id: "chord",
    name: "和弦识别",
    description: "听一个和弦判断它的性质",
    Icon: ChordIcon,
    Component: ChordExercise,
  },
  {
    id: "melody",
    name: "旋律听写",
    description: "听一段旋律，在迷你钢琴上输入听到的音",
    Icon: MelodyIcon,
    Component: MelodyExercise,
  },
];

export function getModule(id: ModuleId): ModuleDef {
  return MODULES.find((m) => m.id === id) ?? MODULES[0];
}
