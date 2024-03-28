const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNTliMmQ5Ii8+DQogPHBhdGggZD0ibTI0LjYyOCA4aC0xNy44NDN2MTZoMTguNDI5di0xNnptLTAuNjcwMTYgNy4zNzE3aC0zLjc2OTZjLTAuMzM1MDgtMi4wOTQyLTIuMDk0Mi0zLjY4NTktNC4yNzIzLTMuNjg1OS0xLjE3MjggMC0yLjI2MTggMC41MDI2Mi0zLjA5OTUgMS4yNTY1bDAuODM3NyAwLjgzNzdjMC41ODYzOS0wLjU4NjM5IDEuMzQwMy0wLjkyMTQ3IDIuMTc4LTAuOTIxNDcgMS42NzU0IDAgMy4wOTk1IDEuMzQwMyAzLjA5OTUgMy4wOTk1cy0xLjI1NjUgMy4wOTk1LTIuOTMxOSAzLjA5OTVjLTAuODM3NyAwLTEuNTkxNi0wLjMzNTA4LTIuMTc4LTAuOTIxNDdsLTAuODM3NyAwLjgzNzdjMC44Mzc3IDAuODM3NyAxLjkyNjcgMS4yNTY1IDMuMDk5NSAxLjI1NjUgMi4xNzggMCAzLjkzNzItMS41OTE2IDQuMjcyMy0zLjY4NTloMy43Njk2djYuMTE1MmgtMTYuMDg0di02LjExNTJoNi45NTI5YzAuMjUxMzEgMC4zMzUwOCAwLjU4NjM5IDAuNTg2MzkgMS4wODkgMC41ODYzOSAwLjY3MDE2IDAgMS4yNTY1LTAuNTg2MzkgMS4yNTY1LTEuMjU2NSAwLTAuNjcwMTYtMC41ODYzOS0xLjI1NjUtMS4yNTY1LTEuMjU2NS0wLjQxODg1IDAtMC44Mzc3IDAuMjUxMzEtMS4wODkgMC41ODYzOWgtNi45NTI5di02LjAzMTRoMTZ2Ni4xOTl6IiBmaWxsPSIjZmZmIiBzdHJva2Utd2lkdGg9Ii44Mzc3Ii8+DQo8L3N2Zz4NCg==';

const brandColor = '#59B2D9';

const api = {
  id: '/connectionProviders/appservice',
  name: 'connectionProviders/appservice',
  displayName: 'Azure App Services',
  description: 'Azure App Services',
  iconUri,
  brandColor,
};

export const appServiceGroup = {
  id: '/connectionProviders/appservice',
  name: 'connectionProviders/appservice',
  properties: {
    displayName: 'Azure App Services',
    description: 'Azure App Services',
    iconUri,
    brandColor,
    capabilities: ['actions', 'triggers'],
  },
};

export const appServiceActionOperation = {
  id: 'appservice',
  name: 'appservice',
  type: 'appservice',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure App Services action',
    description: 'Show APIs for App Services in my subscription',
    visibility: 'Important',
    operationType: 'http',
    brandColor,
    iconUri,
  },
};

export const appServiceTriggerOperation = {
  id: 'appservicetrigger',
  name: 'appservicetrigger',
  type: 'appservice',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure App Services trigger',
    description: 'Show APIs for App Services in my subscription',
    visibility: 'Important',
    operationType: 'http',
    brandColor,
    iconUri,
    trigger: 'single',
  },
};
