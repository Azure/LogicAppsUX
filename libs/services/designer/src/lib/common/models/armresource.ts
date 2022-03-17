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
