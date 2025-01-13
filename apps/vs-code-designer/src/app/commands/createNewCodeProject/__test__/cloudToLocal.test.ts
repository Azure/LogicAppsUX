import { extractConnectionDetails } from '../cloudToLocalHelper';
import type { ConnectionReferenceModel } from '@microsoft/vscode-extension-logic-apps';
import { describe, it, expect, vi } from 'vitest';
import { beforeEach } from 'vitest';

vi.mock('fs');
describe('extractConnectionDetails and ChangAuthToRaw are being tested for cloudToLocal.', () => {
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

      const expectedDetails = [
        {
          WORKFLOWS_LOCATION_NAME: 'eastus2',
          WORKFLOWS_RESOURCE_GROUP_NAME: 'vs-code-debug',
          WORKFLOWS_SUBSCRIPTION_ID: '346751b2-0de1-405c-ad29-acb7ba73797f',
        },
      ];

      extractConnectionDetails(parsedconnection).then((result) => {
        expect(result).toEqual(expectedDetails);
      });
    });
  });
});
