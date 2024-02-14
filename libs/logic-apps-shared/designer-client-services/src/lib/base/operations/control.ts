export const foreachOperation = {
  name: 'foreach',
  id: 'foreach',
  type: 'Foreach',
  properties: {
    api: {
      id: 'connectionProviders/control',
      name: 'control',
      brandColor: '#8C3900',
      description: 'Control operations',
      displayName: 'Control',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
    },
    summary: 'For each',
    description: 'Executes a block of actions for each item in the input array.',
    visibility: 'Important',
    operationType: 'Foreach',
    brandColor: '#486991',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/foreach.svg',
  },
};

export const untilOperation = {
  name: 'until',
  id: 'until',
  type: 'Until',
  properties: {
    api: {
      id: 'connectionProviders/control',
      name: 'control',
      brandColor: '#8C3900',
      description: 'Control operations',
      displayName: 'Control',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
    },
    summary: 'Until',
    description: 'Executes a block of actions until a specified condition evaluates to true.',
    visibility: 'Important',
    operationType: 'Until',
    brandColor: '#486991',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/until.svg',
  },
};

export const scopeOperation = {
  name: 'scope',
  id: 'scope',
  type: 'Scope',
  properties: {
    api: {
      id: 'connectionProviders/control',
      name: 'control',
      brandColor: '#8C3900',
      description: 'Control operations',
      displayName: 'Control',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
    },
    summary: 'Scope',
    description: 'Encapsulate a block of actions and inherit the last terminal status (Succeeded, Failed, Cancelled) of actions inside.',
    visibility: 'Important',
    operationType: 'Scope',
    brandColor: '#8C3900',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/scope.svg',
  },
};

export const ifOperation = {
  name: 'if',
  id: 'if',
  type: 'If',
  properties: {
    api: {
      id: 'connectionProviders/control',
      name: 'control',
      brandColor: '#8C3900',
      description: 'Control operations',
      displayName: 'Control',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
    },
    summary: 'Condition',
    description: 'Identifies which block of actions to execute based on the evaluation of condition input.',
    visibility: 'Important',
    operationType: 'If',
    brandColor: '#484F58',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/condition.svg',
  },
};

export const switchOperation = {
  name: 'switch',
  id: 'switch',
  type: 'Switch',
  properties: {
    api: {
      id: 'connectionProviders/control',
      name: 'control',
      brandColor: '#8C3900',
      description: 'Control operations',
      displayName: 'Control',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
    },
    summary: 'Switch',
    description: 'Identifies a single case to execute based on the evaluation of switch input.',
    visibility: 'Important',
    operationType: 'Switch',
    brandColor: '#484F58',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/switch.svg',
  },
};

export const terminateOperation = {
  name: 'terminate',
  id: 'terminate',
  type: 'Terminate',
  properties: {
    api: {
      id: 'connectionProviders/control',
      name: 'control',
      brandColor: '#8C3900',
      description: 'Control operations',
      displayName: 'Control',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
    },
    summary: 'Terminate',
    description: 'Terminate the execution of a Logic App run.',
    visibility: 'Important',
    operationType: 'Terminate',
    brandColor: '#F41700',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/terminate.svg',
  },
};
