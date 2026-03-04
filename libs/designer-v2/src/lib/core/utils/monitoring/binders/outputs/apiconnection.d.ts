import { type BoundParameter, type OutputParameter, type BoundParameters, type OutputParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
export default class ApiConnectionOutputsBinder extends Binder {
    bind(outputs: any, parameters?: OutputParameters): BoundParameters;
    protected bindOutputParameterToTypedOutputs(outputs: any, parameter: OutputParameter): BoundParameter;
    protected shouldShowUntypedOutputs(parameters: OutputParameters | undefined): boolean;
    protected makeUntypedOutputsParameters(outputs: any): BoundParameters;
}
