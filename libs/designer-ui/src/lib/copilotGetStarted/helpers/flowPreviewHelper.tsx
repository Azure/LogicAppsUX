import type { OperationInfo } from "../../chatbot/components/flowDiffPreview";
import type { OperationContract } from "../components/flowPreview";
import Constants from '../../constants';

/* NOTE: Will either rename OperationInfo or change to utilize same data types as Designer */
export function toOperationInfo(operationName: string, operation: OperationContract): OperationInfo {
    return {
        operationName,
        operationType: operation.type,
        operationKind: operation.kind,
        connectionName: operation?.inputs?.host?.connectionName ?? operation?.connectionName ?? '',
        operationId: operation?.inputs?.host?.operationId ?? '',
        overrides: {
            displayName: operation?.metadata?.flowSystemMetadata?.portalOperationApiDisplayNameOverride,
            iconUri: operation?.metadata?.flowSystemMetadata?.portalOperationIconOverride,
            brandColor: operation?.metadata?.flowSystemMetadata?.portalOperationBrandColorOverride,
            operationId: operation?.metadata?.flowSystemMetadata?.portalOperationId,
        },
    };
}

export function isVariableOperation(operationType: string): boolean {
    return [
        Constants.NODE.TYPE.INCREMENT_VARIABLE,
        Constants.NODE.TYPE.INITIALIZE_VARIABLE,
        Constants.NODE.TYPE.DECREMENT_VARIABLE,
        Constants.NODE.TYPE.SET_VARIABLE
    ].includes(operationType);
}

export function isControlFlowOperation(operationType: string): boolean {
    return [
        Constants.NODE.TYPE.FOREACH,
        Constants.NODE.TYPE.SCOPE,
        Constants.NODE.TYPE.UNTIL,
        Constants.NODE.TYPE.IF,
        Constants.NODE.TYPE.SWITCH
    ].includes(operationType);
}

export function getCaseDisplayName(caseName: string) {
    return caseName.replaceAll('_', '');
}