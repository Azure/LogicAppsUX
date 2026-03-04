import { type OutputParameter, type BoundParameters, type OperationManifest, type ParameterInfo } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
export declare class ManifestOutputsBinder extends Binder {
    private _operationManifest;
    constructor(manifest: OperationManifest, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined);
    bind(outputs: any, outputsParameters: Record<string, OutputParameter>): Promise<BoundParameters>;
    getParameterValue(outputs: any, parameter: OutputParameter): any;
    private _getValueByParameterKey;
}
