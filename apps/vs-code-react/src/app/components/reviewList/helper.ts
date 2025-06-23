// Removed Fluent UI v8 shimmer dependencies - now using simple skeleton components

export const getValidationListColumns = () => {
  return [
    { key: 'action', name: 'action', fieldName: 'action', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'status', name: 'status', fieldName: 'status', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

// Shimmer elements are no longer needed with v9 Skeleton component
export const getShimmerElements = () => {
  return {
    firstRow: [],
    secondRow: [],
  };
};
