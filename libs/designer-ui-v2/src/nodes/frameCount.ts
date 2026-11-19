import { defaultNodeFrameCountStrings, type NodeFrameCountUnit, type NodeFrameStrings } from './strings';

export interface NodeFrameCountLabel {
  count: number;
  unit: NodeFrameCountUnit;
}

export const formatFrameCount = (frameStrings: NodeFrameStrings, { count, unit }: NodeFrameCountLabel): string => {
  const formatter = frameStrings.counts?.[unit] ?? (unit === 'actions' ? frameStrings.actionCount : defaultNodeFrameCountStrings[unit]);
  return formatter(count);
};
