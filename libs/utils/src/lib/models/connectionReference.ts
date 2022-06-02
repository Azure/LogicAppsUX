export interface ConnectionReference {
    api?: {
        id: string;
    };
    connection?: {
        id: string;
    };
    id?: string; // This is the same as apiId
    connectionId?: string;
    connectionName?: string;
    // connectionProperties?: Record<string, any>; 
    authentication?: ApiHubAuthentication;
    hidden?: boolean;
}

export interface ApiHubAuthentication {
    type: string;
    identity?: string;
}

export type ConnectionReferences = Record<string, ConnectionReference>;