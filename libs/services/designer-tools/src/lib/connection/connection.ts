export interface ArmResource<TProperties> {
    id: string;
    type: string;
    name: string;
    location?: string;
    kind?: string;
    tags?: Record<string, string>;
    properties: TProperties;
}


export interface ArmResources<TResource> {
    value: TResource[];
    nextLink?: string;
}

export interface ConnectionAndAppSetting<T> {
    connectionKey: string;
    connectionData: T;
    settings: Record<string, string>;
    pathLocation: string[];
}

export interface Principal {
    displayName: string;
    email: string;
    id: string;
    type: string;
}

export interface ConnectionStatusError {
    code: string;
    message: string;
}

export interface ConnectionStatus {
    error?: ConnectionStatusError;
    status: string;
    target?: string;
}

export interface ValueObject {
    value: any; // tslint:disable-line: no-any
}

export interface ConnectionParameterSet {
    name: string;
    values: Record<string, ValueObject>;
}

export interface ConnectionProperties extends Record<string, any> {
    // tslint:disable-line: no-any
    apiId: string;
    connectionParameters?: Record<string, ConnectionParameter>;
    connectionParametersSet?: ConnectionParameterSet;
    createdBy?: Principal;
    createdTime: string;
    displayName: string;
    iconUri: string;
    overallStatus?: string; // TODO(sopai): Make this a required property once APIHub changes are deployed to prod.
    parameterValueType?: string;
    statuses: ConnectionStatus[];
    testLinks?: TestLink[];
    accountName?: string;
}

export interface ServiceProviderConnectionModel {
    parameterValues: Record<string, any>; // tslint:disable-line: no-any
    serviceProvider: {
        id: string;
    };
    displayName?: string;
}

export interface FunctionsConnectionModel {
    function: {
        id: string;
    };
    triggerUrl: string;
    authentication: {
        type: string;
        name: string;
        value: string;
    };
    displayName?: string;
}

export interface ConsentLinkObject {
    objectId?: string;
    parameterName?: string;
    redirectUrl: string;
    tenantId?: string;
}


export interface ConfirmConsentCodeRequest {
    code: string;
    objectId: string;
    tenantId: string;
}

export interface ConsentLinkRequest {
    parameters: ConsentLinkObject[];
}

export interface ConsentLink {
    link: string;
    displayName?: string;
    status?: string;
}

export interface ConnectionInfo {
    connectionParametersSet?: ConnectionParameterSet;
    connectionParameters?: Record<string, any>; // tslint:disable-line: no-any
    internalAlternativeParameterValues?: Record<string, any>; // tslint:disable-line: no-any
    externalAlternativeParameterValues?: Record<string, any>; // tslint:disable-line: no-any
    displayName?: string;
    parameterName?: string;
}


interface LogicAppConsentResponse {
    value: ConsentLink[];
}

export interface ConnectionParametersMetadata {
    connectionParameters?: Record<string, ConnectionParameter>;
    connectionParameterSets?: ConnectionParameterSets;
    connectionType?: ConnectionType;
}

export interface ConnectionParameterSetUIDefinition {
    description: string;
    displayName: string;
}

export interface ConnectionParameterSets {
    uiDefinition: ConnectionParameterSetUIDefinition;
    values: ConnectionParameterSet[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Connection extends ArmResource<ConnectionProperties> {}

export interface ConnectionParameter {
    /**
     * @member {string} connectionId - A string with the connection ID of a dependent connector
     * @example /providers/Microsoft.PowerApps/apis/shared_onedrive/connections/{connectionName}
     */
    connectionId: string;

    /**
     * @member {string} id - A string with the API Hubs ID for a connection
     * @example tip1-shared/onedrive/{connectionName}
     */
    id: string;

    /**
     * @member {string} url - A string with the API Hubs full URL for a connection
     * @example https://tip1-shared.azure-apim.net/apim/onedrive/{connectionName}
     */
    url: string;
}

export interface TestLink {
    method: string;
    requestUri: string;
}