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
  IExperimentationService,
  IConnectorService,
  IResourceService,
  ITemplateResourceService,
} from '@microsoft/logic-apps-shared';
import { createContext } from 'react';

export interface TemplatesDesignerContext {
  readOnly?: boolean;
}

export interface TemplateServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  connectorService?: IConnectorService;
  workflowService?: IWorkflowService;
  gatewayService?: IGatewayService;
  tenantService?: ITenantService;
  loggerService?: ILoggerService;
  oAuthService: IOAuthService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
  templateService: ITemplateService;
  experimentationService?: IExperimentationService;
  resourceService?: IResourceService;
  templateResourceService?: ITemplateResourceService;
}

export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
