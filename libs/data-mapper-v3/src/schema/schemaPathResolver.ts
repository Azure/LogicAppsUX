import type { SchemaNode } from '../model/schemaModel';
import type { MapLink } from '../model/mapModel';

export interface PathAttribute {
    name: string;
    schemaPath?: string;
    structuralPath?: string;
    namespace?: string;
}

export interface PathNode<T> {
    name: string;
    path: string;
    schemaPath?: string;
    structuralPath?: string;
    instancePath?: string;
    namespace?: string;
    children?: T[];
    attributes?: PathAttribute[];
}

export interface ResolvedSchemaPath<T> {
    path: string;
    node: T;
    attribute?: PathAttribute;
    ancestors: T[];
}

interface XPathStep {
    name: string;
    namespace?: string;
    position?: string;
}

function xpathSteps(path: string): XPathStep[] | undefined {
    if (!path.includes('local-name()')) { return undefined; }
    const pattern = /\/(@?)\*\[([^\]]+)\](?:\[position\(\)='(\d+)'\])?/gy;
    const steps: XPathStep[] = [];
    let offset = 0;
    while (offset < path.length) {
        pattern.lastIndex = offset;
        const match = pattern.exec(path);
        if (!match) { return undefined; }
        let name: string | undefined;
        let namespace: string | undefined;
        let position = match[3];
        for (const predicate of match[2].split(/\s+and\s+/)) {
            const localName = /^local-name\(\)='([^']+)'$/.exec(predicate);
            const namespaceUri = /^namespace-uri\(\)='([^']*)'$/.exec(predicate);
            const inlinePosition = /^position\(\)='(\d+)'$/.exec(predicate);
            if (localName && !name) {
                name = localName[1];
            } else if (namespaceUri && namespace === undefined) {
                namespace = namespaceUri[1];
            } else if (inlinePosition && !position) {
                position = inlinePosition[1];
            } else {
                return undefined;
            }
        }
        if (!name) { return undefined; }
        if (name !== '<Schema>' && name !== '<schema>') {
            steps.push({ name: match[1] + name, namespace, position });
        }
        offset = pattern.lastIndex;
    }
    return steps;
}

/** Decode complete TOM paths; never truncate unsupported predicates. */
export function simplifySchemaPath(path: string): string {
    const steps = xpathSteps(path);
    return steps ? '/' + steps.map(step => `${step.name}${step.position ? `[${step.position}]` : ''}`).join('/') : path;
}

export function linkSchemaPath(link: MapLink, side: 'source' | 'target'): string {
    const path = link[`${side}Path`] || link[`${side}Id`];
    const original = link[`${side}BtmPath`];
    return original && simplifySchemaPath(original) === path ? original : path;
}

const structuralSegment = /^<(?:Schema|Sequence|Choice|All|Group:[^<>]+|AttrGroup:[^<>]+)>(?:\[\d+\])?$/;

export function instancePathParts(path: string): string[] {
    return simplifySchemaPath(path).split('/').filter(part => !!part && !structuralSegment.test(part));
}

// TOM suppresses some outer particles. Match only groups actually present in
// the parsed schema, in order and at the same element level.
function matchesStructure(path: string, structure: string): boolean {
    const requested = path.split('/').filter(Boolean);
    let positions = new Set([0]);
    for (const segment of structure.split('/').filter(Boolean)) {
        const next = new Set<number>();
        for (const position of positions) {
            if (structuralSegment.test(segment)) { next.add(position); }
            if (requested[position] === segment ||
                (!/\[\d+\]$/.test(requested[position] || '') && requested[position] === segment.replace(/\[\d+\]$/, ''))) {
                next.add(position + 1);
            }
        }
        positions = next;
    }
    return positions.has(requested.length);
}

export class SchemaPathResolver<T extends PathNode<T> = SchemaNode> {
    private readonly identities = new Map<string, ResolvedSchemaPath<T>[]>();
    private readonly aliases = new Map<string, ResolvedSchemaPath<T>[]>();
    private readonly flattened = new Map<string, ResolvedSchemaPath<T>[]>();

    constructor(tree?: { rootElement?: T }, private readonly ignoreNamespaces = false) {
        const add = (index: Map<string, ResolvedSchemaPath<T>[]>, key: string, entry: ResolvedSchemaPath<T>): void => {
            const entries = index.get(key) || [];
            if (!entries.includes(entry)) { entries.push(entry); }
            index.set(key, entries);
        };
        const visit = (node: T, parents: T[]): void => {
            const ancestors = [...parents, node];
            const entry = { path: node.path, node, ancestors };
            add(this.identities, node.path, entry);
            add(this.aliases, node.schemaPath || node.path, entry);
            add(this.flattened, node.instancePath || node.path, entry);
            for (const attribute of node.attributes || []) {
                const attrEntry = { ...entry, path: `${node.path}/@${attribute.name}`, attribute };
                add(this.identities, attrEntry.path, attrEntry);
                add(this.aliases, attribute.schemaPath || `${node.schemaPath || node.path}/@${attribute.name}`, attrEntry);
                add(this.flattened, `${node.instancePath || node.path}/@${attribute.name}`, attrEntry);
            }
            node.children?.forEach(child => visit(child, ancestors));
        };
        if (tree?.rootElement) { visit(tree.rootElement, []); }
    }

    public resolve(path: string, ignoreNamespaces = this.ignoreNamespaces): ResolvedSchemaPath<T> | undefined {
        const key = simplifySchemaPath(path);
        const steps = ignoreNamespaces ? undefined : xpathSteps(path)?.filter(step => !structuralSegment.test(step.name));
        const matchesNamespaces = (entry: ResolvedSchemaPath<T>): boolean => {
            const nodes = [...entry.ancestors, ...(entry.attribute ? [entry.attribute] : [])];
            return !steps || (steps.length === nodes.length &&
                steps.every((step, index) => step.namespace === undefined || step.namespace === (nodes[index].namespace || '')));
        };
        const flat = this.flattened.get(key);
        const exact = flat && flat.length > 1 ? flat : this.aliases.get(key) || this.identities.get(key);
        if (exact) {
            const matches = exact.filter(matchesNamespaces);
            return matches.length === 1 ? matches[0] : undefined;
        }
        const instancePath = '/' + instancePathParts(key).map(part => part.replace(/\[\d+\]$/, '')).join('/');
        const matches = this.flattened.get(instancePath)?.filter(entry => matchesNamespaces(entry) && matchesStructure(
            key,
            entry.attribute?.structuralPath || entry.attribute?.schemaPath ||
                (entry.attribute ? `${entry.node.structuralPath || entry.node.schemaPath || entry.node.path}/@${entry.attribute.name}`
                    : entry.node.structuralPath || entry.node.schemaPath || entry.node.path)
        ));
        return matches?.length === 1 ? matches[0] : undefined;
    }

    public require(path: string): ResolvedSchemaPath<T> {
        const result = this.resolve(path);
        if (!result) { throw new Error(`Unresolved or ambiguous schema path '${path}'`); }
        return result;
    }

    public resolveValues(values: Record<string, string> = {}): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [path, value] of Object.entries(values)) {
            const resolved = this.require(path).path;
            if (Object.prototype.hasOwnProperty.call(result, resolved) && result[resolved] !== value) {
                throw new Error(`Conflicting values for schema path '${path}'`);
            }
            result[resolved] = value;
        }
        return result;
    }
}
