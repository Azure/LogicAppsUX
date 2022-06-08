export interface Schema {
    name: string;
    type: string;
    targetNamespace: string;
    namespaces: Map<string, string>;
    rootNode: SchemaNode;
}

export interface SchemaNode {
    key: string;
    name: string;
    namespacePrefix: string;
    namespaceUri: string;
    nodeDataType: string;
    optional?: boolean;
    repeating?: boolean;
    attribute?: boolean;
    children: SchemaNode[];
}