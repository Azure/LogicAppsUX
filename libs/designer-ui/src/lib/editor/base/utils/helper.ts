import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';

export const removeFirstAndLast = (segments: ValueSegment[], removeFirst?: string, removeLast?: string): ValueSegment[] => {
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

export const showCollapsedValidation = (collapsedValue: ValueSegment[]): boolean => {
  return (
    collapsedValue?.length === 1 &&
    (collapsedValue[0].type === ValueSegmentType.TOKEN ||
      (collapsedValue[0].type === ValueSegmentType.LITERAL &&
        collapsedValue[0].value.trim().startsWith('"') &&
        collapsedValue[0].value.trim().endsWith('"')))
  );
};
