import type { BoundParameters, InputParameter, LAOperation, OperationManifest, ParameterInfo, SwaggerParser } from '@microsoft/logic-apps-shared';
export default class InputsBinder {
    bind(inputs: any, type: string, inputParametersByName: Record<string, InputParameter>, operation: LAOperation | undefined, manifest?: OperationManifest, customSwagger?: SwaggerParser, nodeParameters?: Record<string, ParameterInfo>, operationMetadata?: Record<string, any>): Promise<BoundParameters[]>;
}
