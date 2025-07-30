import { ShimmerElementType } from '@fluentui/react';
import type { IShimmerElement } from '@fluentui/react';

export const getShimmerElements = () => {
  const shimmerFirstRow: IShimmerElement[] = [
    { type: ShimmerElementType.gap, width: '15%' },
    { type: ShimmerElementType.line, width: '100%' },
  ];

  const shimmerSecondRow = [
    { type: ShimmerElementType.gap, width: '35%' },
    { type: ShimmerElementType.line, width: '100%' },
  ];
  return { firstRow: shimmerFirstRow, secondRow: shimmerSecondRow };
};
