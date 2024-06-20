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
} from '@microsoft/logic-apps-shared';
import { createContext } from 'react';

export interface TemplatesDesignerContext {
  readOnly?: boolean;
}

export interface TemplateServiceOptions {
  connectionService: IConnectionService;
  gatewayService?: IGatewayService;
  tenantService?: ITenantService;
  loggerService?: ILoggerService;
  oAuthService: IOAuthService;
  apimService?: IApiManagementService;
  functionService?: IFunctionService;
  appServiceService?: IAppServiceService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
}

export const TemplatesWrappedContext = createContext<TemplatesDesignerContext | null>(null);
