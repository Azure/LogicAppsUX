export const recurrenceOperation = {
  name: 'recurrence',
  id: 'recurrence',
  type: 'Recurrence',
  properties: {
    api: {
      id: 'connectionProviders/schedule',
      name: 'schedule',
      brandColor: '#1F85FF',
      description: 'Schedule operations',
      displayName: 'Schedule',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
    },
    capabilities: ['Stateful'],
    summary: 'Recurrence',
    description: 'Triggers an event to run at regular, customized time intervals.',
    trigger: 'single',
    visibility: 'Important',
    operationType: 'Recurrence',
    brandColor: '#1F85FF',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
  },
};

export const slidingWindowOperation = {
  name: 'slidingwindow',
  id: 'slidingwindow',
  type: 'SlidingWindow',
  properties: {
    api: {
      id: 'connectionProviders/schedule',
      name: 'schedule',
      brandColor: '#1F85FF',
      description: 'Schedule operations',
      displayName: 'Schedule',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
    },
    capabilities: ['Stateful'],
    summary: 'Sliding Window',
    description: 'Triggers a series of fixed-sized, non-overlapping, and contiguous time intervals from a specified start time.',
    visibility: 'Important',
    trigger: 'single',
    operationType: 'SlidingWindow',
    brandColor: '#1F85FF',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
  },
};

export const delayOperation = {
  name: 'delay',
  id: 'delay',
  type: 'Wait',
  properties: {
    api: {
      id: 'connectionProviders/schedule',
      name: 'schedule',
      brandColor: '#1F85FF',
      description: 'Schedule operations',
      displayName: 'Schedule',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
    },
    capabilities: ['Stateful'],
    summary: 'Delay',
    description: 'Sets how long an action should be delayed once the flow is triggered.',
    visibility: 'Important',
    operationType: 'Wait',
    brandColor: '#1F85FF',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/wait.svg',
  },
};

export const delayUntilOperation = {
  name: 'delayuntil',
  id: 'delayuntil',
  type: 'Wait',
  properties: {
    api: {
      id: 'connectionProviders/schedule',
      name: 'schedule',
      brandColor: '#1F85FF',
      description: 'Schedule operations',
      displayName: 'Schedule',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
    },
    capabilities: ['Stateful'],
    summary: 'Delay until',
    description: 'Delays an action until a specific date. For shorter time periods, use the Delay action instead.',
    visibility: 'Important',
    operationType: 'Wait',
    brandColor: '#1F85FF',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/wait_until.svg',
  },
};
