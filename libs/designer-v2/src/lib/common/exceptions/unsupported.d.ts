import { BaseException } from '@microsoft/logic-apps-shared';
export declare const UnsupportedExceptionName = "Common.UnsupportedException";
export declare const UnsupportedExceptionCode: {
    readonly MANIFEST_NOT_FOUND: "ManifestNotFound";
    readonly OPERATION_NOT_FOUND: "OperationInfoNotFound";
    readonly RUNTIME_EXPRESSION: "RuntimeExpressionInDynamicCall";
    readonly RENDER_MULTIPLE_TRIGGERS: "RenderMultipleTriggers";
    readonly RENDER_NO_TRIGGERS: "RenderNoTriggers";
    readonly CONTINUATION_TOKEN: "ContinuationToken";
    readonly MSI_CONNECTION: "MsiConnectionPresent";
    readonly INVALID_CONNECTION: "InvalidConnection";
};
export type UnsupportedExceptionCode = (typeof UnsupportedExceptionCode)[keyof typeof UnsupportedExceptionCode];
export declare class UnsupportedException extends BaseException {
    constructor(message: string, code?: UnsupportedExceptionCode, data?: Record<string, any>);
}
