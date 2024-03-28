const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDUwIDUwIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjI4MGNjIi8+DQogPGcgdHJhbnNmb3JtPSJtYXRyaXgoLjQxMDI2IDAgMCAuNDEwMjYgNS41Mzg1IDEzLjEyOCkiIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJtMzYgMTh2NmgtMTZ2LThoLTV2OWMwIDEuNjU3IDEuMzQzIDMgMyAzaDE5YzEuNjU3IDAgMy0xLjM0MyAzLTN2LTEwaC00eiIvPg0KICA8cG9seWdvbiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLC0xOCkiIHBvaW50cz0iMzMuNSAzMyA0Mi41IDMzIDM4IDI3Ii8+DQogIDxyZWN0IHg9IjYiIHk9Ii0xNCIgd2lkdGg9IjIyIiBoZWlnaHQ9IjIiLz4NCiAgPHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSIyMiIgaGVpZ2h0PSIyIi8+DQogIDxyZWN0IHg9IjYiIHk9Ii0xNCIgd2lkdGg9IjIiIGhlaWdodD0iMjgiLz4NCiAgPHJlY3QgeD0iMjYiIHk9Ii0xNCIgd2lkdGg9IjIiIGhlaWdodD0iMjgiLz4NCiAgPHJlY3QgeD0iMTAiIHk9Ii04IiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIxMCIgeT0iLTIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyIi8+DQogIDxyZWN0IHg9IjEwIiB5PSI0IiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIzMSIgeT0iNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIiLz4NCiAgPHJlY3QgeD0iMzEiIHk9Ii0yIiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIzMSIgeT0iLTgiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyIi8+DQogPC9nPg0KPC9zdmc+DQo=';

const brandColor = '#2280CC';

const api = {
  id: '/connectionProviders/batch',
  name: 'connectionProviders/batch',
  displayName: 'Batch Operations',
  iconUri,
  brandColor,
  description: 'Batch Operations',
};

export const selectBatchWorkflowGroup = {
  id: api.id,
  name: api.name,
  properties: {
    displayName: api.displayName,
    description: api.description,
    iconUri,
    brandColor,
    capabilities: ['actions', 'triggers'],
  },
};

export const sendToBatchOperation = {
  id: 'sendToBatch',
  name: 'sendToBatch',
  type: 'sendToBatch',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Send to batch trigger workflow',
    description: 'Sends messages to a Logic App with batch triggers in the same region',
    visibility: 'Important',
    operationType: 'SendToBatch',
    brandColor,
    iconUri,
  },
};

export const batchTriggerOperation = {
  id: 'batch',
  name: 'batch',
  type: 'batch',
  properties: {
    api,
    annotation: { family: 'batch', status: 'Production' },
    summary: 'Batch Trigger',
    description: 'Batches related messages together and releases the messages from the trigger when a specified release criteria is met.',
    visibility: 'Important',
    operationType: 'Batch',
    brandColor,
    iconUri,
    trigger: 'Single',
  },
};
