export const createConnectionKey = (sourceId: string, targetId: string): string => `${sourceId}-to-${targetId}`;

export const addReactFlowPrefix = (key: string, type: 'source' | 'target') => `${type}-${key}`;

export const getSourceIdFromConnection = (connectionId: string): string => connectionId.split('-')[0];

export const getDestinationIdFromConnection = (connectionId: string): string => connectionId.split('-')[1];
