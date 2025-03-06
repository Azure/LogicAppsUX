import { createAsyncThunk } from '@reduxjs/toolkit';
import type { CustomTemplateServiceOptions } from '../../customTemplates/CustomTemplatesContext';
import {
  BaseExperimentationService,
  DevLogger,
  type ILoggerService,
  InitConnectionParameterEditorService,
  InitConnectionService,
  InitConnectorService,
  InitExperimentationServiceService,
  InitGatewayService,
  InitLoggerService,
  InitOAuthService,
  InitOperationManifestService,
  InitTenantService,
  InitUiInteractionsService,
  InitWorkflowService,
} from '@microsoft/logic-apps-shared';

export const initializeCustomTemplateServices = createAsyncThunk(
  'initializeCustomTemplateServices',
  async ({
    connectionService,
    operationManifestService,
    connectorService,
    workflowService,
    oAuthService,
    gatewayService,
    tenantService,
    connectionParameterEditorService,
    loggerService,
    uiInteractionsService,
    experimentationService,
  }: CustomTemplateServiceOptions) => {
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitOAuthService(oAuthService);
    InitWorkflowService(workflowService);

    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitLoggerService(loggerServices);

    if (connectorService) {
      InitConnectorService(connectorService);
    }

    if (gatewayService) {
      InitGatewayService(gatewayService);
    }
    if (tenantService) {
      InitTenantService(tenantService);
    }
    if (connectionParameterEditorService) {
      InitConnectionParameterEditorService(connectionParameterEditorService);
    }
    if (uiInteractionsService) {
      InitUiInteractionsService(uiInteractionsService);
    }

    // Experimentation service is being used to A/B test features in the designer so in case client does not want to use the A/B test feature,
    // we are always defaulting to the false implementation of the experimentation service.
    InitExperimentationServiceService(experimentationService ?? new BaseExperimentationService());

    return true;
  }
);
