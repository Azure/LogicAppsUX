/// <reference types="react" />
import type { IConnectionParameterEditorService, IConnectionService, IGatewayService, ITenantService, ILoggerService, IOAuthService, ITemplateService, IWorkflowService, IOperationManifestService, IExperimentationService, IConnectorService, IResourceService, ITemplateResourceService } from '@microsoft/logic-apps-shared';
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
export declare const TemplatesWrappedContext: import("react").Context<TemplatesDesignerContext | null>;
