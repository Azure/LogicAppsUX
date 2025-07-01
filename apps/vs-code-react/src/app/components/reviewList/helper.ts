import { ShimmerElementType } from '@fluentui/react';
import type { IShimmerElement } from '@fluentui/react';

export const getValidationListColumns = () => {
  return [
    { key: 'action', name: 'action', fieldName: 'action', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'status', name: 'status', fieldName: 'status', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

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
