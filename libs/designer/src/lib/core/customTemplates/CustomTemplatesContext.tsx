import type {
  IConnectionParameterEditorService,
  IConnectionService,
  IGatewayService,
  ITenantService,
  ILoggerService,
  IOAuthService,
  ITemplateService,
  IWorkflowService,
  IOperationManifestService,
  IDesignerUiInteractionsService,
  IExperimentationService,
  IConnectorService,
} from '@microsoft/logic-apps-shared';
import { createContext } from 'react';

export interface CustomTemplatesDesignerContext {
  readOnly?: boolean;
}

export interface CustomTemplateServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  connectorService?: IConnectorService;
  workflowService: IWorkflowService;
  gatewayService?: IGatewayService;
  tenantService?: ITenantService;
  loggerService?: ILoggerService;
  oAuthService: IOAuthService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
  templateService?: ITemplateService;
  uiInteractionsService?: IDesignerUiInteractionsService;
  experimentationService?: IExperimentationService;
}

export const CustomTemplatesWrappedContext = createContext<CustomTemplatesDesignerContext | null>(null);
