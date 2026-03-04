import type { Connection } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../core';
export declare const titleCase: (s: string) => string;
export declare const isOpenApiSchemaVersion: (definition: any) => any;
export declare const getSKUDefaultHostOptions: (sku: string) => {
    recurrenceInterval: {
        interval: number;
        frequency: string;
    };
    maximumWaitingRuns: {
        min: number;
        max: number;
    };
} | {
    recurrenceInterval?: undefined;
    maximumWaitingRuns?: undefined;
};
export declare const isDynamicConnection: (feature?: string) => boolean;
export declare class AgentUtils {
    static ModelType: {
        AzureOpenAI: string;
        FoundryService: string;
        APIM: string;
        V1ChatCompletionsService: string;
    };
    static isConnector: (connectorId?: string) => boolean;
    static isDeploymentOrModelIdParameter: (parameterName?: string) => boolean;
    static isAgentModelTypeParameter: (parameterName?: string) => boolean;
    static filterDynamicConnectionFeatures: (connections: Connection, nodeId?: string, state?: RootState) => boolean;
}
