import type { BoundParameters, OperationManifest, OutputParameter, ParameterInfo } from '@microsoft/logic-apps-shared';
export default class OutputsBinder {
    bind(outputs: any, type: string, outputParametersByName: Record<string, OutputParameter>, manifest?: OperationManifest, nodeParameters?: Record<string, ParameterInfo>, operationMetadata?: Record<string, any>): Promise<BoundParameters[]>;
}
