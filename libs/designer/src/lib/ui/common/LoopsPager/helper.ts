export const getForeachItemsCount = (action: LogicAppsV2.WorkflowRunAction): number | undefined => {
  const { inputsLink, iterationCount, repetitionCount } = action || {};

  // Until actions have an iterationCount property when using the 2016-10-01 or later API.
  if (typeof iterationCount === 'number') {
    return iterationCount;
  }

  if (typeof repetitionCount === 'number') {
    return repetitionCount;
  }

  // Foreach actions have a foreachItemsCount property in its inputsLink's metadata object when using the 2016-06-01 or later API.
  if (inputsLink) {
    const { metadata } = inputsLink;
    if (metadata) {
      const { foreachItemsCount } = metadata;
      if (typeof foreachItemsCount === 'number') {
        return foreachItemsCount;
      }
    }
  }

  return undefined;
};
