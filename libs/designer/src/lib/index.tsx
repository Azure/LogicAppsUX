import * as Models from './common/models/workflow';
import { serializeWorkflow as serializeBJSWorkflow } from './core/actions/bjsworkflow/serializer';
import * as Core from './core/index';
import * as UI from './ui/index';

if (process.env.NODE_ENV === 'development') {
  if (process.env)
    (window as any).DesignerModule = {
      UI,
      Core,
      Models,
      serializeBJSWorkflow,
    };
}
export * from './ui/index';
export * from './core/index';
export * from './common/models/workflow';
export * from './common/models/customcode';
export { default as Constants } from './common/constants';
export { serializeWorkflow as serializeBJSWorkflow } from './core/actions/bjsworkflow/serializer';
export { updateCallbackUrl } from './core/actions/bjsworkflow/initialize';
export { ReactQueryProvider } from './core/ReactQueryProvider';
export { isOpenApiSchemaVersion } from './common/utilities/Utils';
