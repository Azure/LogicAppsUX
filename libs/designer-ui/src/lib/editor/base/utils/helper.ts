import type { Segment } from '../';
import { ValueSegmentType } from '../../models/parameter';

export const removeFirstAndLast = (segments: Segment[], removeFirst?: string, removeLast?: string): Segment[] => {
  const n = segments.length - 1;
  segments.forEach((segment, i) => {
    const currentSegment = segment;
    if (currentSegment.type === ValueSegmentType.LITERAL) {
      if (i === 0 && currentSegment.value.charAt(0) === removeFirst) {
        currentSegment.value = currentSegment.value.slice(1);
      } else if (i === n && currentSegment.value.charAt(currentSegment.value.length - 1) === removeLast) {
        currentSegment.value = currentSegment.value.slice(0, -1);
      }
    }
  });
  return segments;
};
