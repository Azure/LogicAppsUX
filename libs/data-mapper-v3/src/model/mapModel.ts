/**
 * BizTalk Data Mapper - Core Model Types
 * Represents the object model for .btm map files
 */

export interface MapDocument {
    name: string;
    version: string;
    sourceSchema: SchemaReference;
    targetSchema: SchemaReference;
    pages: MapPage[];
    options: MapOptions;
    targetValues?: Record<string, string>;
    customXsltPath?: string;
    customExtensionXmlPath?: string;
    customXslt?: string;
    customExtensionXml?: string;
    scriptTypePrecedence?: ScriptTypePreference[];
}

export interface ScriptTypePreference {
    type: ScriptType;
    enabled: boolean;
}

export interface SchemaReference {
    location: string;
    rootName?: string;
    namespace?: string;
    inlineSchemaXml?: string;
}

export interface MapOptions {
    omitXmlDeclaration: boolean;
    xsltVersion: '1.0' | '2.0';
    xsltEncoding: string;
    preserveSequenceOrder: boolean;
    treatElementsAsRecords: boolean;
    optimizeValueMapping: boolean;
    generateDefaultFixedNodes: boolean;
    ignoreNamespacesForLinks: boolean;
    outputMethod: 'xml' | 'html' | 'text';
    copyProcessingInstructions?: boolean;
    generateDebuggingInformation?: boolean;
}

export interface MapPage {
    id: string;
    name: string;
    links: MapLink[];
    functoids: MapFunctoid[];
}

export interface MapLink {
    id: string;
    sourceId: string;
    sourcePath?: string;
    targetId: string;
    targetPath?: string;
    sourceType: LinkEndpointType;
    targetType: LinkEndpointType;
    label?: string;
    sourceLinkOption?: SourceLinkOption;
    targetLinkOption?: TargetLinkOption;
}

export enum SourceLinkOption {
    ValueCopy = 'valueCopy',
    NameCopy = 'nameCopy',
    MixedCopy = 'mixedCopy'
}

export enum TargetLinkOption {
    Flattening = 'flattening',
    TopDown = 'topDown',
    BottomUp = 'bottomUp'
}

export enum LinkEndpointType {
    SchemaNode = 'schemaNode',
    Functoid = 'functoid'
}

export interface MapFunctoid {
    id: string;
    functoidId: number;
    category: FunctoidCategory;
    name: string;
    x: number;
    y: number;
    inputLinks: string[];
    outputLinks: string[];
    parameters: FunctoidParameter[];
    scriptType?: ScriptType;
    scriptContent?: string;
    scriptImplementations?: ScriptImplementation[];
    tableLooping?: TableLoopingData;
}

export interface ScriptImplementation {
    type: ScriptType;
    content?: string;
    assemblyReferences?: string[];
    assemblyPath?: string;
    className?: string;
    methodName?: string;
    parameterTypes?: string[];
    returnType?: string;
    isStatic?: boolean;
}

export interface FunctoidParameter {
    index: number;
    value: string;
    type: ParameterType;
    guid?: string;
    defaultValue?: string;
}

export interface TableLoopingData {
    columns: number;
    gated: boolean;
    rows: string[][];
}

export enum ParameterType {
    Constant = 'constant',
    Link = 'link',
    ScriptType = 'scriptType',
    ScriptBody = 'scriptBody',
    AssemblyPath = 'assemblyPath',
    ClassName = 'className',
    MethodName = 'methodName'
}

export enum FunctoidCategory {
    String = 'String',
    Math = 'Math',
    Logical = 'Logical',
    DateTime = 'DateTime',
    Conversion = 'Conversion',
    Scientific = 'Scientific',
    Cumulative = 'Cumulative',
    DatabaseLookup = 'DatabaseLookup',
    Advanced = 'Advanced',
    Custom = 'Custom'
}

export enum ScriptType {
    Inline = 'inline',
    ExternalAssembly = 'externalAssembly',
    InlineCSharp = 'inlineCSharp',
    InlineVbNet = 'inlineVbNet',
    InlineJScript = 'inlineJScript',
    InlineXslt = 'inlineXslt',
    InlineXsltCallTemplate = 'inlineXsltCallTemplate'
}

export const DEFAULT_MAP_OPTIONS: MapOptions = {
    omitXmlDeclaration: false,
    xsltVersion: '1.0',
    xsltEncoding: 'UTF-8',
    preserveSequenceOrder: true,
    treatElementsAsRecords: false,
    optimizeValueMapping: true,
    generateDefaultFixedNodes: true,
    ignoreNamespacesForLinks: false,
    outputMethod: 'xml',
    copyProcessingInstructions: false,
    generateDebuggingInformation: false
};
