import { type BoundParameters, type InputParameter, type OperationManifest, type ParameterInfo, type SwaggerParser } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
export declare class ManifestInputsBinder extends Binder {
    private _operationManifest;
    constructor(manifest: OperationManifest, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined);
    bind(inputs: any, inputParameters: Record<string, InputParameter>, customSwagger: SwaggerParser | undefined): Promise<BoundParameters>;
    getParameterValue(inputs: any, parameter: InputParameter): any;
    private _getValueByParameterKey;
}
