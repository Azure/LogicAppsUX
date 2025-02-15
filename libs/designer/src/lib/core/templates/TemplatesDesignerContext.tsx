import type {
  IApiManagementService,
  IAppServiceService,
  IConnectionParameterEditorService,
  IConnectionService,
  IFunctionService,
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
  apimService?: IApiManagementService;
  functionService?: IFunctionService;
  appServiceService?: IAppServiceService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
  templateService?: ITemplateService;
  uiInteractionsService?: IDesignerUiInteractionsService;
  experimentationService?: IExperimentationService;
}

export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
