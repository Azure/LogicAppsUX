import type { BindFunction, BoundParameter, BoundParameters, InputParameter, OutputParameter, ParameterInfo, ReduceFunction } from '@microsoft/logic-apps-shared';
export declare abstract class Binder {
    private _nodeParameters;
    private _metadata;
    constructor(nodeParameters: Record<string, ParameterInfo>, metadata: Record<string, any> | undefined);
    protected buildBoundParameter(displayName: string, value: any, visibility?: string, additionalProperties?: Partial<BoundParameter>): BoundParameter;
    protected getParameterDisplayName(parameter: OutputParameter): string;
    protected getParameterValue(_inputs: any, _parameter: InputParameter): any;
    protected bindData: (data: any, parameter: OutputParameter | InputParameter) => BoundParameter | undefined;
    protected makeBoundParameter(key: string, displayName: string, value: any, visibility?: string, additionalProperties?: Partial<BoundParameter>): BoundParameters;
    protected makeReducer(inputs: any, binder: BindFunction): ReduceFunction<BoundParameters, InputParameter>;
    private _getAdditionalProperties;
    private _makeBoundParameters;
    protected _makeOptionalBoundParameter(key: string, displayName: string, value: any, visibility?: string, additionalProperties?: Partial<BoundParameter>): BoundParameters | undefined;
}
