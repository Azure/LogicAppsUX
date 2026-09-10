import type { CompileResult } from '../compiler/xsltCompiler';
import type { FunctoidCategory, MapDocument } from '../model/mapModel';
import type { SchemaTree } from '../model/schemaModel';

export type SchemaSide = 'source' | 'target';

export interface FunctoidSummary {
    id: number;
    name: string;
    category: FunctoidCategory;
    description: string;
    minInputs: number;
    maxInputs: number;
    hasOutput: boolean;
    tooltip: string;
}

export interface AssemblyMethodInfo {
    name: string;
    signature: string;
    isStatic: boolean;
    returnType: string;
    parameterTypes: string[];
}

export interface AssemblyClassInfo {
    className: string;
    methods: AssemblyMethodInfo[];
}

export interface MapperViewState {
    map: MapDocument | null;
    sourceSchema: SchemaTree | null;
    targetSchema: SchemaTree | null;
    functoids: FunctoidSummary[];
    selectedLink: string | null;
    selectedFunctoid: string | null;
    activePage: number;
}

export interface MapEditorVsCodeApi {
    postMessage(message: WebviewToHostMessage): void;
    getState(): unknown;
    setState(state: unknown): void;
}

export function createInitialMapperViewState(): MapperViewState {
    return {
        map: null,
        sourceSchema: null,
        targetSchema: null,
        functoids: [],
        selectedLink: null,
        selectedFunctoid: null,
        activePage: 0
    };
}

export const WEBVIEW_TO_HOST_MESSAGE_TYPES = [
    'ready',
    'update',
    'compile',
    'loadSchema',
    'testMap',
    'generateInstance',
    'testMapWithInput',
    'browseAssembly',
    'exportXslt',
    'deployToLogicApps',
    'copilotPrompt',
    'browseCopilotContext',
    'removeCopilotContext',
    'clearCopilotContext'
] as const;

export const HOST_TO_WEBVIEW_MESSAGE_TYPES = [
    'init',
    'documentChanged',
    'schemaLoaded',
    'compileResult',
    'assemblySelected',
    'instanceGenerated',
    'testMapResult',
    'copilotResult',
    'copilotContextChanged'
] as const;

export type WebviewToHostMessage =
    | { type: 'ready' }
    | { type: 'update'; data: MapDocument }
    | { type: 'compile'; data: MapDocument }
    | { type: 'loadSchema'; side: SchemaSide }
    | { type: 'testMap' }
    | { type: 'generateInstance'; side: SchemaSide }
    | { type: 'testMapWithInput'; data: { inputXml: string; map: MapDocument } }
    | { type: 'browseAssembly' }
    | { type: 'exportXslt'; data: MapDocument }
    | { type: 'deployToLogicApps'; data: MapDocument }
    | { type: 'copilotPrompt'; data: { prompt: string; activePage: number } }
    | { type: 'browseCopilotContext' }
    | { type: 'removeCopilotContext'; data: { id: string } }
    | { type: 'clearCopilotContext' };

export type HostToWebviewMessage =
    | {
        type: 'init';
        data: {
            map: MapDocument;
            sourceSchema: SchemaTree | null;
            targetSchema: SchemaTree | null;
            functoids: FunctoidSummary[];
        };
    }
    | { type: 'documentChanged'; data: MapDocument }
    | {
        type: 'schemaLoaded';
        data: { side: SchemaSide; schema: SchemaTree; path: string };
    }
    | { type: 'compileResult'; data: CompileResult }
    | {
        type: 'assemblySelected';
        data: { path: string; classes: AssemblyClassInfo[] };
    }
    | {
        type: 'instanceGenerated';
        data: { side: SchemaSide; xml: string; error?: string };
    }
    | {
        type: 'testMapResult';
        data: { output: string; error?: string };
    }
    | {
        type: 'copilotResult';
        data: {
            success: boolean;
            applied: boolean;
            message: string;
            map?: MapDocument;
        };
    }
    | {
        type: 'copilotContextChanged';
        data: {
            files: Array<{ id: string; name: string; size: number }>;
            message?: string;
        };
    };

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function hasObjectData(message: Record<string, unknown>): boolean {
    return isObject(message.data);
}

function isSchemaSide(value: unknown): value is SchemaSide {
    return value === 'source' || value === 'target';
}

export function isWebviewToHostMessage(value: unknown): value is WebviewToHostMessage {
    if (!isObject(value) || typeof value.type !== 'string') {
        return false;
    }

    switch (value.type) {
        case 'ready':
        case 'testMap':
        case 'browseAssembly':
        case 'browseCopilotContext':
        case 'clearCopilotContext':
            return true;
        case 'update':
        case 'compile':
        case 'exportXslt':
        case 'deployToLogicApps':
            return hasObjectData(value);
        case 'copilotPrompt': {
            const data = value.data;
            return isObject(data)
                && typeof data.prompt === 'string'
                && typeof data.activePage === 'number';
        }
        case 'removeCopilotContext': {
            const data = value.data;
            return isObject(data) && typeof data.id === 'string';
        }
        case 'loadSchema':
        case 'generateInstance':
            return isSchemaSide(value.side);
        case 'testMapWithInput': {
            const data = value.data;
            return isObject(data)
                && typeof data.inputXml === 'string'
                && isObject(data.map);
        }
        default:
            return false;
    }
}

export function isHostToWebviewMessage(value: unknown): value is HostToWebviewMessage {
    if (!isObject(value) || typeof value.type !== 'string' || !isObject(value.data)) {
        return false;
    }
    const data = value.data;

    switch (value.type) {
        case 'init':
            return isObject(data.map)
                && Array.isArray(data.functoids)
                && (data.sourceSchema === null || isObject(data.sourceSchema))
                && (data.targetSchema === null || isObject(data.targetSchema));
        case 'documentChanged':
            return true;
        case 'schemaLoaded':
            return isSchemaSide(data.side)
                && isObject(data.schema)
                && typeof data.path === 'string';
        case 'compileResult':
            return typeof data.success === 'boolean'
                && Array.isArray(data.errors)
                && Array.isArray(data.warnings);
        case 'assemblySelected':
            return typeof data.path === 'string'
                && Array.isArray(data.classes);
        case 'instanceGenerated':
            return isSchemaSide(data.side)
                && typeof data.xml === 'string';
        case 'testMapResult':
            return typeof data.output === 'string';
        case 'copilotResult':
            return typeof data.success === 'boolean'
                && typeof data.applied === 'boolean'
                && typeof data.message === 'string'
                && (data.map === undefined || isObject(data.map));
        case 'copilotContextChanged':
            return Array.isArray(data.files)
                && data.files.every(file => isObject(file)
                    && typeof file.id === 'string'
                    && typeof file.name === 'string'
                    && typeof file.size === 'number')
                && (data.message === undefined || typeof data.message === 'string');
        default:
            return false;
    }
}
