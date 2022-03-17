
import { OperationInfo, OperationManifest, SettingScope } from '../common/models/operationmanifest';
import { OperationManifestService as IOperationManifestService } from '../operationmanifest';
import { equals } from '@microsoft-logic-apps/utils';
import { UnsupportedException, UnsupportedExceptionCode } from '../common/exceptions/unsupported';

const invokefunction = 'invokefunction';
const javascriptcode = 'javascriptcode';
const compose = 'compose';
const function_ = 'function';
const liquid = 'liquid';
const serviceprovider = 'serviceprovider';
const workflow = 'workflow';
const xmlvalidation = 'xmlvalidation';
const xslt = 'xslt';
const flatfiledecoding = 'flatfiledecoding';
const flatfileencoding = 'flatfileencoding';
const swiftdecode = 'swiftdecode';
const swiftencode = 'swiftencode';
const foreach = 'foreach';
const initializevariable = 'initializevariable';
export const azureFunctionConnectorId = '/connectionProviders/azureFunctionOperation';

// TODO(psamband): Need to figure out how to identify without hard coding.
const supportedManifestTypes = [
    compose,
    foreach,
    function_,
    initializevariable,
    invokefunction,
    javascriptcode,
    liquid,
    serviceprovider,
    workflow,
    xmlvalidation,
    xslt,
    flatfiledecoding,
    flatfileencoding,
    swiftdecode,
    swiftencode,
];

export interface OperationManifestServiceOptions {
}

export class OperationManifestService implements IOperationManifestService {
    private operationManifests: Record<string, OperationManifest> = {};

    constructor(private readonly options: OperationManifestServiceOptions) {
    }

    isSupported(operationType: string): boolean {
        const normalizedOperationType = operationType.toLowerCase();
        return supportedManifestTypes.indexOf(normalizedOperationType) > -1;
    }

    async getOperationInfo(definition: any): Promise<OperationInfo> {
        // tslint:disable-line: no-any
        if (isInBuiltOperation(definition)) {
            return getBuiltInOperationInfo(definition);
        } else if (isServiceProviderOperation(definition)) {
            return {
                connectorId: definition.inputs.serviceProviderConfiguration.serviceProviderId,
                operationId: definition.inputs.serviceProviderConfiguration.operationId,
            };
        }

        throw new UnsupportedException(`Operation type: ${definition.type} does not support manifest.`);
    }

    async getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
        const operationManifestKey = `${connectorId}-${operationId}`;

        const cachedOperationManifest = this.operationManifests[operationManifestKey];

        if (cachedOperationManifest) {
            return cachedOperationManifest;
        }

        if (operationId === foreach) {
            return foreachManifest;
        }
        // NOTE(psamband): HACK to get operation manifest of dataOperation connector's action.
        if (equals(connectorId, 'connectionProviders/dataOperation')) {
            connectorId = 'connectionProviders/dataOperationNew';
        }

        throw new UnsupportedException('Operation Manifest not implemented for other operations');
    }
}

function isServiceProviderOperation(definition: any): boolean {
    // tslint:disable-line: no-any
    return equals(definition.type, 'ServiceProvider');
}

function isInBuiltOperation(definition: any): boolean {
    // tslint:disable-line: no-any
    switch (definition.type.toLowerCase()) {
        case compose:
        case foreach:
        case function_:
        case initializevariable:
        case invokefunction:
        case javascriptcode:
        case liquid:
        case workflow:
        case xslt:
        case xmlvalidation:
        case flatfiledecoding:
        case flatfileencoding:
        case swiftdecode:
        case swiftencode:
            return true;

        default:
            return false;
    }
}

function getBuiltInOperationInfo(definition: any): OperationInfo {
    // tslint:disable-line: no-any
    const normalizedOperationType = definition.type.toLowerCase();
    const kind = definition.kind ? definition.kind.toLowerCase() : undefined;

    if (kind === undefined) {
        return inBuiltOperationsMetadata[normalizedOperationType];
    }

    switch (normalizedOperationType) {
        case liquid:
            const connectorId = 'connectionProviders/liquidOperations';
            switch (kind) {
                case 'jsontojson':
                    return {
                        connectorId,
                        operationId: 'liquidJsonToJson',
                    };
                case 'jsontotext':
                    return {
                        connectorId,
                        operationId: 'liquidJsonToText',
                    };
                case 'xmltojson':
                    return {
                        connectorId,
                        operationId: 'liquidXmlToJson',
                    };
                case 'xmltotext':
                    return {
                        connectorId,
                        operationId: 'liquidXmlToText',
                    };
                default:
                    throw new UnsupportedException(`Unsupported operation kind ${kind}`);
            }
        default:
            throw new UnsupportedException(`Unsupported built in operation type ${normalizedOperationType}`);
    }
}

const inBuiltOperationsMetadata: Record<string, OperationInfo> = {
    [compose]: {
        connectorId: 'connectionProviders/dataOperationNew',
        operationId: 'composeNew',
    },
    [foreach]: {
        connectorId: 'connectionProviders/control',
        operationId: 'foreach',
    },
    [function_]: {
        connectorId: azureFunctionConnectorId,
        operationId: 'azureFunction',
    },
    [initializevariable]: {
        connectorId: 'connectionProviders/variable',
        operationId: 'initializevariable',
    },
    [invokefunction]: {
        connectorId: 'connectionProviders/localFunctionOperation',
        operationId: 'invokeFunction',
    },
    [javascriptcode]: {
        connectorId: 'connectionProviders/inlineCode',
        operationId: 'javaScriptCode',
    },
    [workflow]: {
        connectorId: 'connectionProviders/localWorkflowOperation',
        operationId: 'invokeWorkflow',
    },
    [xmlvalidation]: {
        connectorId: 'connectionProviders/xmlOperations',
        operationId: 'xmlValidation',
    },
    [xslt]: {
        connectorId: 'connectionProviders/xmlOperations',
        operationId: 'xmlTransform',
    },
    [flatfiledecoding]: {
        connectorId: 'connectionProviders/flatFileOperations',
        operationId: 'flatFileDecoding',
    },
    [flatfileencoding]: {
        connectorId: 'connectionProviders/flatFileOperations',
        operationId: 'flatFileEncoding',
    },
    [swiftdecode]: {
        connectorId: 'connectionProviders/swiftOperations',
        operationId: 'swiftDecode',
    },
    [swiftencode]: {
        connectorId: 'connectionProviders/swiftOperations',
        operationId: 'swiftEncode',
    },
};

const foreachManifest: OperationManifest = {
    properties: {
        iconUri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxwYXRoIGQ9Ik0xMSAyMGg3LjJsMSAxaC05LjJ2LTguM2wtMS4zIDEuMy0uNy0uNyAyLjUtMi41IDIuNSAyLjUtLjcuNy0xLjMtMS4zem0xMi4zLTJsLjcuNy0yLjUgMi41LTIuNS0yLjUuNy0uNyAxLjMgMS4zdi03LjNoLTcuMmwtMS0xaDkuMnY4LjN6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==',
        brandColor: '#486991',
        description: 'Executes a block of actions for each item in the input array.',

        inputs: {
            type: 'array',
            title: 'Select an output from previous steps'
        },
        isInputsOptional: false,

        outputs: {},
        isOutputsOptional: false,

        settings: {
            trackedProperties: {
                scopes: [SettingScope.Action],
            },
        },
    },
};
