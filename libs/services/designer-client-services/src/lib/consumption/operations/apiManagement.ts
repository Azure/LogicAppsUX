const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iLTI4MCAzNzIgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibS0yODAgMzcyaDMydjMyaC0zMnoiIGZpbGw9IiM2ODIxN2EiLz4NCiA8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzgzNjkgMCAwIC4zODM2OSAtMTY2LjIgMjQyLjY0KSIgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0tMjU5LjUgMzg2LjVoLTguOWMtNC40IDAtOC0zLjYtOC04LjFzMy40LTguMSA4LTguMWMwLjggMCAxLjcgMC4yIDIuNyAwLjNsMS43IDAuNSAwLjUtMS43YzEuNi01LjIgNi42LTguNCAxMi4zLTguNCA2LjkgMCAxMi4yIDUuMyAxMi4yIDEyLjIgMCAxLjEtMC4yIDIuMi0wLjUgMy4zbC0wLjcgMi41IDIuNy0wLjNoMC41YzIgMCAzLjYgMS43IDMuNiAzLjZzLTEuNCAzLjMtMy4xIDMuNmgtOC45Yy0wLjMtMi41LTEuNi00LjctMy4zLTYuNC0yLjItMi4yLTUuMi0zLjUtOC4zLTMuNS0yLjIgMC00LjQgMC42LTYuMSAxLjdsMS45IDNjMS40LTAuOCAyLjgtMS4xIDQuNC0xLjEgMi4yIDAgNC40IDAuOCA1LjggMi41IDEuNiAxLjYgMi41IDMuNiAyLjUgNS44cy0wLjggNC40LTIuNSA1LjhjLTEuNiAxLjctMy42IDIuNS01LjggMi41LTEuNiAwLTMuMS0wLjUtNC40LTEuNGwtMS45IDNjMS45IDEuMSA0LjEgMS45IDYuMSAxLjkgMy4xIDAgNi4xLTEuMSA4LjMtMy40IDEuOS0xLjkgMy00LjQgMy4zLTdoOS4xIDAuMmMzLjYtMC4zIDYuMy0zLjQgNi4zLTcuMiAwLTMtMi44LTUuOC02LjEtNi40IDAuMi0wLjYgMC4yLTAuOSAwLjItMS45IDAtOC44LTYuMi0xNS44LTE2LjEtMTUuOC02LjMgMC0xMS45IDMuNi0xNC4yIDkuNC0wLjggMC0xLjQtMC4zLTIuMy0wLjMtNi41LTAuMS0xMS43IDQuOS0xMS43IDExLjMgMCA2LjMgNS4yIDExLjMgMTEuNCAxMS4zaDkuOHoiLz4NCiAgPGNpcmNsZSBjeD0iLTI1Ny4yIiBjeT0iMzg3LjgiIHI9IjUuNiIvPg0KIDwvZz4NCjwvc3ZnPg0K';

const brandColor = '#68217A';

const api = {
  id: '/connectionProviders/apiManagementOperation',
  name: 'connectionProviders/apiManagementOperation',
  displayName: 'Azure API Management',
  description: 'Azure API Management',
  iconUri,
  brandColor,
};

export const apiManagementGroup = {
  id: '/connectionProviders/apiManagementOperation',
  name: 'connectionProviders/apiManagementOperation',
  properties: {
    displayName: 'Azure API Management',
    description: 'Azure API Management',
    iconUri,
    brandColor,
    capabilities: ['actions', 'triggers'],
  },
};

export const apiManagementActionOperation = {
  id: 'apimanagement',
  name: 'apimanagement',
  type: 'apimanagement',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure API Management action',
    description: 'Show API Management APIs in my subscription',
    visibility: 'Important',
    operationType: 'ApiManagement',
    brandColor,
    iconUri,
  },
};

export const apiManagementTriggerOperation = {
  id: 'apimanagementtrigger',
  name: 'apimanagementtrigger',
  type: 'apimanagement',
  properties: {
    api,
    capabilities: ['azureResourceSelection'],
    summary: 'Choose an Azure API Management Trigger',
    description: 'Show API Management APIs in my subscription',
    visibility: 'Important',
    operationType: 'ApiManagement',
    brandColor,
    iconUri,
    trigger: 'single',
  },
};
