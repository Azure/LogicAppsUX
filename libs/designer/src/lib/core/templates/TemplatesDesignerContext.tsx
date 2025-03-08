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

export interface TemplatesDesignerContext {
  readOnly?: boolean;
}

export interface TemplateServiceOptions {
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

export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
