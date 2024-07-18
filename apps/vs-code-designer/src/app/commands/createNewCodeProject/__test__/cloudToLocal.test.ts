import { extractConnectionDetails, changeAuthTypeToRaw } from '../cloudToLocalHelper';
import type { ConnectionReferenceModel } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect, vi } from 'vitest';
import { beforeEach } from 'vitest';

vi.mock('fs');
describe('Your Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractConnectionDetails for ConnectionReferenceModel', () => {
    it('should extract connection details correctly', () => {
      let connectionObject = {
        managedApiConnections: {
          connKey: {
            api: {
              id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/providers/Microsoft.Web/locations/eastus2/managedApis/applicationinsights',
            },
            connection: {
              id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/applicationinsights',
            },
            authentication: {
              type: 'ManagedServiceIdentity',
            },
            connectionRuntimeUrl: 'runtime-url',
          },
        },
      };
      const newconnection = JSON.stringify(connectionObject);
      const parsedconnection: ConnectionReferenceModel = JSON.parse(newconnection);

      const details = extractConnectionDetails(parsedconnection);

      const expectedDetails = [
        {
          WORKFLOWS_LOCATION_NAME: 'eastus2',
          WORKFLOWS_RESOURCE_GROUP_NAME: 'vs-code-debug',
          WORKFLOWS_SUBSCRIPTION_ID: '346751b2-0de1-405c-ad29-acb7ba73797f',
          WORKFLOWS_TENANT_ID: '72f988bf-86f1-41af-91ab-2d7cd011db47',
        },
      ];

      expect(details).toEqual(expectedDetails);
    });
  });

  describe('ChangeAuthToRaw for ConnectionReferenceModel', () => {
    it('should change authentication type to Raw', () => {
      // Setup
      let connectionsJsonContent = {
        managedApiConnections: {
          applicationinsights: {
            api: {
              id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/providers/Microsoft.Web/locations/eastus2/managedApis/applicationinsights',
            },
            connection: {
              id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/applicationinsights',
            },
            authentication: {
              type: 'ManagedServiceIdentity',
            },
          },
        },
      };
      const jsonString = JSON.stringify(connectionsJsonContent);
      const connection: ConnectionReferenceModel = JSON.parse(jsonString);

      changeAuthTypeToRaw(connection);

      const expectedConnection = JSON.stringify({
        managedApiConnections: {
          applicationinsights: {
            api: {
              id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/providers/Microsoft.Web/locations/eastus2/managedApis/applicationinsights',
            },
            connection: {
              id: '/subscriptions/346751b2-0de1-405c-ad29-acb7ba73797f/resourceGroups/vs-code-debug/providers/Microsoft.Web/connections/applicationinsights',
            },
            authentication: {
              type: 'Raw',
              scheme: 'Key',
              parameter: "@appsetting('applicationinsights-connectionKey')",
            },
          },
        },
      });
      expect(JSON.stringify(connection)).toEqual(expectedConnection);
    });
  });
});
