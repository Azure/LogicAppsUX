// Internal count helpers: deliberately not re-exported from the package barrel so the public surface stays the
// `countLabel` prop plus string dictionaries.
import { useId } from 'react';
import type { ActionNodeCardStrings, NodeFrameCountLabel, NodeFrameStrings } from './strings';
import { defaultNodeFrameCountStrings, defaultNodeFrameStrings } from './strings';

/**
 * Resolves count text for frames and collapsed cards alike. Unit formatters come first; for `actions`, a host's
 * legacy `actionCount` formatter is honored before English defaults so dictionaries localized before `counts`
 * existed keep their wording.
 */
export const formatNodeFrameCount = (
  frameStrings: NodeFrameStrings = defaultNodeFrameStrings,
  { count, unit }: NodeFrameCountLabel
): string => {
  const formatter = frameStrings.counts?.[unit] ?? (unit === 'actions' ? frameStrings.actionCount : defaultNodeFrameCountStrings[unit]);
  return formatter(count);
};
/**
 * NodeText props for a card's optional count plus the card root's `aria-describedby`. Hosts commonly give cards an
 * explicit aria-label, which hides the visible count from assistive tech, so the count span describes the card.
 * Undefined count props keep the subtitle-only layout unchanged.
 */
export const useNodeCount = (
  countLabel: NodeFrameCountLabel | undefined,
  strings: Pick<ActionNodeCardStrings, 'frame'>,
  describedBy: string | undefined
) => {
  const countId = useId();
  if (!countLabel) {
    return { textProps: undefined, describedBy };
  }
  return {
    textProps: { count: formatNodeFrameCount(strings.frame, countLabel), countUnit: countLabel.unit, countId },
    describedBy: describedBy ? `${describedBy} ${countId}` : countId,
  };
};
