import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { getTemplateConnections, getTemplateParameters } from '../configuretemplate';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, test, expect } from 'vitest';
import { RootState } from '../../../state/templates/store';

let spy: any;

describe('actions/configuretemplate', () => {
    let dispatch: ThunkDispatch<unknown, unknown, AnyAction>;
    let mockedState: RootState;
    const resourceService = {
        getResource: (id: string) => {
            if (id.endsWith('connections')) {
                return Promise.resolve(standardConnections);
            } else if (id.endsWith('consumptionWorkflow')) {
                return Promise.resolve(consumptionWorkflow);
            } else if (id.endsWith('id1')) {
                return Promise.resolve(workflow1);
            }  else if (id.endsWith('id2')) {
                return Promise.resolve(workflow2);
            }
        }
    }

    
    describe('getTemplateConnections', () => {
        beforeEach(() => {
            dispatch = vi.fn();
            mockedState = {
                workflow: {
                    subscriptionId: 'sub1',
                    resourceGroup: 'rg1',
                    workflowAppName: 'wf1',
                    logicAppName: 'la1',
                    isConsumption: false,
                },
                template: {
                    workflows: {
                        'id1': { id: 'id1' },
                        'id2': { id: 'id2'},
                    },
                },
            } as any;
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        test('should return all connections for consumption workflow', () => {

        });

        test('should return only used connections for standard workflows selected in app', () => {

        });
    });

    describe('getTemplateParameters', () => {
        beforeEach(() => {
            dispatch = vi.fn();
            mockedState = {

            };
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        test('should return only used parameters from consumption workflow', () => {

        });

        test('should return only used parameters for standard workflows selected in app', () => {

        });
    });
});

const workflow1 = {
    definition: {
        "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
        "actions": {
            "HTTP": {
                "type": "Http",
                "inputs": {
                    "uri": "http://uri.com",
                    "method": "GET",
                    "body": "hello@{triggerBody()}abc@{parameters('AISearch_Index_Name')}yes@{concat('abc', substring(parameters('AISearch_Index_File'), 'test'))}"
                },
                "runAfter": {},
                "runtimeConfiguration": {
                    "contentTransfer": {
                        "transferMode": "Chunked"
                    }
                }
            },
            "Index_a_document": {
                "type": "ServiceProvider",
                "inputs": {
                    "parameters": {
                        "indexName": "brbenn-vector",
                        "document": {
                            "chunk_id": "aaa"
                        }
                    },
                    "serviceProviderConfiguration": {
                        "connectionName": "azureaisearch-1",
                        "operationId": "indexDocument",
                        "serviceProviderId": "/serviceProviders/azureaisearch"
                    }
                },
                "runAfter": {
                    "HTTP": [
                        "SUCCEEDED"
                    ]
                }
            }
        },
        "contentVersion": "1.0.0.0",
        "outputs": {},
        "triggers": {
            "When_a_HTTP_request_is_received": {
                "type": "Request",
                "kind": "Http"
            }
        }
    },
    kind: "Stateful"
};

const workflow2 = {
    definition: {
        "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
        "actions": {
            "HTTP": {
                "type": "Http",
                "inputs": {
                    "uri": "http://uri.com",
                    "method": "GET",
                    "body": "hello@{triggerBody()}hello"
                },
                "runAfter": {},
                "runtimeConfiguration": {
                    "contentTransfer": {
                        "transferMode": "Chunked"
                    }
                }
            },
            "Get_emails_(V3)": {
                "type": "ApiConnection",
                "inputs": {
                    "host": {
                        "connection": {
                            "referenceName": "office365-1"
                        }
                    },
                    "method": "get",
                    "path": "/v3/Mail",
                    "body": "@concat(parameters('Parameter_1'), parameters('Parameter_2'))"
                },
                "runAfter": {
                    "HTTP": [
                        "SUCCEEDED"
                    ]
                }
            }
        },
        "contentVersion": "1.0.0.0",
        "outputs": {},
        "triggers": {
            "When_a_HTTP_request_is_received": {
                "type": "Request",
                "kind": "Http"
            }
        }
    },
    kind: "Stateful"
};

const consumptionWorkflow = {
    id: 'consumptionWorkflow',
    properties: {
        definition: {
            ...workflow2.definition,
            parameters: {
                '$connections': {},
                'Parameter_1': { type: 'String' },
                'Parameter_2': { type: 'String' },
            }
        },
        parameters: {
            '$connections': { value: { 'office365-1': { api: { id: '/shared/api1' } } } },
            'Parameter_1': { value: 'test' },
            'Parameter_2': { value: 'abc' },
        }
    }
};

const standardConnections = {
    managedApiConnections: { 'office365-1': { api: { id: '/shared/api1' } } },
    serviceProviderConnections: { 'azureaisearch-1': { serviceProvider: { id: '/serviceProviders/azureaisearch' } } },
};

const standardWorkflow = {
    id: 'standardWorkflow',
    properties: {
        definition: {
            ...workflow1.definition,
            parameters: {
                '$connections': {},
                'AISearch_Index_Name': { type: 'String' },
                'AISearch_Index_File': { type: 'String' },
            }
        },
        parameters: {
            '$connections': { value: { 'azureaisearch-1': { api: { id: 'api1' } } } },
            'AISearch_Index_Name': { value: 'test' },
            'AISearch_Index_File': { value: 'abc' },
        }
    }
}
