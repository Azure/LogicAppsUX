import { type InputParameter, type BoundParameters, type LAOperation, type ParameterInfo } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
export default class ApiConnectionInputsBinder extends Binder {
    private _operation;
    constructor(operation: LAOperation, nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined);
    bind(inputs: any, inputParameters: Record<string, InputParameter>): Promise<BoundParameters>;
    getParameterValue(inputs: any, parameter: InputParameter): any;
    private _makePathObject;
    private _makeUntypedInputsParameters;
}
