import {
  InitConnectionService,
  InitOperationManifestService,
  StandardConnectionService,
  StandardOperationManifestService,
} from '@microsoft-logic-apps/designer-client-services';

export const InitializeServices = () => {
  InitConnectionService(new StandardConnectionService({baseUrl: 'https://management.azure.com/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/sites/DanielleStd/hostruntime/runtime/webhooks/workflow/api/management', apiVersion: '2018-11-01'}));
  InitOperationManifestService(new StandardOperationManifestService({}));
};
