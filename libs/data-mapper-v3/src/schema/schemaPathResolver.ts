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
  if (!path.includes('local-name()')) {
    return undefined;
  }
  const pattern = /\/(@?)\*\[([^\]]+)\](?:\[position\(\)='(\d+)'\])?/gy;
  const steps: XPathStep[] = [];
  let offset = 0;
  while (offset < path.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(path);
    if (!match) {
      return undefined;
    }
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
    if (!name) {
      return undefined;
    }
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
  return steps ? `/${steps.map((step) => `${step.name}${step.position ? `[${step.position}]` : ''}`).join('/')}` : path;
}

export function normalizeSingleSourcePath(path: string, rootName: string): string {
  const steps = xpathSteps(path);
  const names = steps?.map((step) => step.name) || path.split('/').filter(Boolean);
  if (names[0] !== 'Root' || names[1] !== 'InputMessagePart_0' || names[2] !== rootName) {
    return path;
  }
  if (!steps) {
    return path.replace(/^\/Root\/InputMessagePart_0/, '');
  }
  const selectors = path.match(/\/@?\*\[[^\]]+\](?:\[position\(\)='\d+'\])?/g)!;
  const schemaStep = /local-name\(\)='<[Ss]chema>'/.test(selectors[0]) ? selectors.shift()! : '';
  return schemaStep + selectors.slice(2).join('');
}

export function linkSchemaPath(link: MapLink, side: 'source' | 'target'): string {
  const path = link[`${side}Path`] || link[`${side}Id`];
  const original = link[`${side}BtmPath`];
  const root = instancePathParts(path)[0];
  return original &&
    (simplifySchemaPath(original) === path || (side === 'source' && normalizeSingleSourcePath(simplifySchemaPath(original), root) === path))
    ? original
    : path;
}

const structuralSegment = /^<(?:Schema|Sequence|Choice|All|Group:[^<>]+|AttrGroup:[^<>]+)>(?:\[\d+\])?$/;

export function instancePathParts(path: string): string[] {
  return simplifySchemaPath(path)
    .split('/')
    .filter((part) => !!part && !structuralSegment.test(part));
}

// TOM suppresses some outer particles. Match only groups actually present in
// the parsed schema, in order and at the same element level.
function matchesStructure(path: string, structure: string): boolean {
  const requested = path.split('/').filter(Boolean);
  const segments = structure.split('/').filter(Boolean);
  let positions = new Set([0]);
  for (const [index, segment] of segments.entries()) {
    const next = new Set<number>();
    const structural = structuralSegment.test(segment);
    let singleton = structural;
    for (let nested = index + 1; nested < segments.length && structuralSegment.test(segments[nested]); nested++) {
      if (segments[nested] !== segment && segments[nested].replace(/\[\d+\]$/, '') === segment) {
        singleton = false;
      }
    }
    for (const position of positions) {
      if (structural) {
        next.add(position);
      }
      if (
        requested[position] === segment ||
        (!/\[\d+\]$/.test(requested[position] || '') && requested[position] === segment.replace(/\[\d+\]$/, '')) ||
        (singleton && requested[position] === `${segment}[1]`)
      ) {
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

  constructor(
    tree?: { rootElement?: T },
    private readonly ignoreNamespaces = false
  ) {
    const add = (index: Map<string, ResolvedSchemaPath<T>[]>, key: string, entry: ResolvedSchemaPath<T>): void => {
      const entries = index.get(key) || [];
      if (!entries.includes(entry)) {
        entries.push(entry);
      }
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
      node.children?.forEach((child) => visit(child, ancestors));
    };
    if (tree?.rootElement) {
      visit(tree.rootElement, []);
    }
  }

  public resolve(path: string, ignoreNamespaces = this.ignoreNamespaces): ResolvedSchemaPath<T> | undefined {
    const key = simplifySchemaPath(path);
    const parsedSteps = xpathSteps(path);
    const tomPath = !!parsedSteps && /^\/\*\[[^\]]*local-name\(\)='<[Ss]chema>'[^\]]*\]/.test(path);
    const steps = ignoreNamespaces ? undefined : parsedSteps?.filter((step) => !structuralSegment.test(step.name));
    const matchesNamespaces = (entry: ResolvedSchemaPath<T>): boolean => {
      const nodes = [...entry.ancestors, ...(entry.attribute ? [entry.attribute] : [])];
      return (
        !steps ||
        (steps.length === nodes.length &&
          steps.every((step, index) => step.namespace === undefined || step.namespace === (nodes[index].namespace || '')))
      );
    };
    const findMatches = (candidate: string): ResolvedSchemaPath<T>[] => {
      const flat = this.flattened.get(candidate);
      const exact = flat && flat.length > 1 ? flat : this.aliases.get(candidate) || this.identities.get(candidate);
      if (exact) {
        return exact.filter(matchesNamespaces);
      }
      const instancePath = `/${instancePathParts(candidate)
        .map((part) => part.replace(/\[\d+\]$/, ''))
        .join('/')}`;
      return (this.flattened.get(instancePath) || []).filter(
        (entry) =>
          matchesNamespaces(entry) &&
          matchesStructure(
            candidate,
            entry.attribute?.structuralPath ||
              entry.attribute?.schemaPath ||
              (entry.attribute
                ? `${entry.node.structuralPath || entry.node.schemaPath || entry.node.path}/@${entry.attribute.name}`
                : entry.node.structuralPath || entry.node.schemaPath || entry.node.path)
          )
      );
    };
    const matches = findMatches(key);
    const terminal = parsedSteps?.at(-1);
    if (terminal && tomPath && !terminal.name.startsWith('@') && !structuralSegment.test(terminal.name)) {
      const attributePath = `${key.slice(0, key.lastIndexOf('/') + 1)}@${key.slice(key.lastIndexOf('/') + 1)}`;
      matches.push(...findMatches(attributePath));
    }
    if (tomPath && ignoreNamespaces && matches.length > 1) {
      const first = matches[0];
      const namespaces = new Set(matches.map((entry) => entry.node.namespace || ''));
      const parentStructures = new Set(
        matches.map((entry) => {
          const structure = entry.node.structuralPath || entry.node.schemaPath || entry.node.path;
          return structure.slice(0, structure.lastIndexOf('/'));
        })
      );
      if (
        namespaces.size === matches.length &&
        parentStructures.size === 1 &&
        matches.every(
          (entry) =>
            !entry.attribute &&
            entry.ancestors.length === first.ancestors.length &&
            entry.ancestors.slice(0, -1).every((ancestor, index) => ancestor === first.ancestors[index])
        )
      ) {
        return first;
      }
    }
    return matches.length === 1 ? matches[0] : undefined;
  }

  public require(path: string): ResolvedSchemaPath<T> {
    const result = this.resolve(path);
    if (!result) {
      throw new Error(`Unresolved or ambiguous schema path '${path}'`);
    }
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
