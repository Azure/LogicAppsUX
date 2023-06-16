const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY0IDY0IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzOTk5YzYiIHN0cm9rZS13aWR0aD0iLjUiLz4NCiA8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzEwMDggMCAwIC4zMTAwOCA2LjA3NzUgNi4wNzc1KSIgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im02MS42IDMyLjRjMC42LTAuNiAwLjQtMS41IDAtMmwtMi43LTIuNy0xMi4xLTExLjhjLTAuNi0wLjYtMS4zLTAuNi0xLjkgMHMtMC43IDEuNSAwIDJsMTIuNyAxMi40YzAuNiAwLjYgMC42IDEuNSAwIDJsLTEyLjkgMTIuOWMtMC42IDAuNi0wLjYgMS41IDAgMiAwLjYgMC42IDEuNSAwLjQgMS45IDBsMTItMTEuOSAwLjEtMC4xeiIvPg0KICA8cGF0aCBkPSJtMi40IDMyLjRjLTAuNi0wLjYtMC40LTEuNSAwLTJsMi43LTIuNyAxMi4xLTExLjhjMC42LTAuNiAxLjMtMC42IDEuOSAwczAuNyAxLjUgMCAybC0xMi41IDEyLjVjLTAuNiAwLjYtMC42IDEuNSAwIDJsMTIuNyAxMi45YzAuNiAwLjYgMC42IDEuNSAwIDItMC42IDAuNi0xLjUgMC40LTEuOSAwbC0xMi4yLTExLjgtMC4xLTAuMXoiLz4NCiAgPHBvbHlnb24gcG9pbnRzPSI0NS43IDYuMiAyOC42IDYuMiAxOS40IDMyLjEgMzAuNiAzMi4yIDIxLjggNTcuOCA0NiAyMy42IDM0LjIgMjMuNiIvPg0KIDwvZz4NCjwvc3ZnPg0K';

const brandColor = '#3999C6';

export const functionGroup = {
  id: 'connectionProviders/function',
  name: 'connectionProviders/function',
  properties: {
    displayName: 'Azure Functions',
    description: 'Azure Functions',
    iconUri,
    brandColor,
    capabilities: ['actions'],
  },
};

export const functionOperation = {
  id: 'azureFunction',
  name: 'azureFunction',
  type: 'azureFunction',
  properties: {
    api: {
      id: 'connectionProviders/function',
      name: 'connectionProviders/function',
      displayName: 'Azure Functions',
      iconUri,
      brandColor,
      description: 'Azure Functions',
    },
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure function',
    description: 'Show Azure Functions in my subscription',
    visibility: 'Important',
    operationType: 'function',
    brandColor,
    iconUri,
  },
};
