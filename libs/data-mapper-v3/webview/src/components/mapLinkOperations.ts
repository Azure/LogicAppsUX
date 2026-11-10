import { ParameterType, type FunctoidParameter, type MapFunctoid, type MapLink, type MapPage } from '../../../src/model/mapModel';
import type { SchemaNode } from '../../../src/model/schemaModel';
import type { FunctoidSummary } from '../../../src/protocol/mapEditorProtocol';

export interface LinkValidationContext {
  sourceRoot?: SchemaNode;
  targetRoot?: SchemaNode;
  definitions?: FunctoidSummary[];
  targetValues?: Record<string, string>;
}

export function getSchemaMatchSuggestions(
  page: MapPage,
  selected: SchemaNode,
  oppositeRoot: SchemaNode,
  side: 'source' | 'target',
  context: LinkValidationContext
): { node: SchemaNode; score: number }[] {
  const tokens = (name: string): Set<string> =>
    new Set(
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
    );
  const selectedTokens = tokens(selected.name);
  const suggestions: { node: SchemaNode; score: number }[] = [];
  const visit = (candidate: SchemaNode): void => {
    if (
      (candidate.type === 'attribute') === (selected.type === 'attribute') &&
      (candidate.children.length === 0) === (selected.children.length === 0)
    ) {
      const source = side === 'source' ? selected : candidate;
      const target = side === 'source' ? candidate : selected;
      const error = validateMappingLink(
        page,
        {
          id: 'suggested-link',
          sourceId: source.path,
          sourcePath: source.path,
          sourceType: 'schemaNode',
          targetId: target.path,
          targetPath: target.path,
          targetType: 'schemaNode',
        },
        context
      );
      if (!error) {
        const candidateTokens = tokens(candidate.name);
        const overlap = Array.from(selectedTokens).filter((token) => candidateTokens.has(token)).length;
        const union = new Set([...selectedTokens, ...candidateTokens]).size;
        const sameName = selected.name.toLowerCase() === candidate.name.toLowerCase();
        const sameType =
          !!selected.dataType && selected.dataType.replace(/^(xs|xsd):/, '') === candidate.dataType?.replace(/^(xs|xsd):/, '');
        const score = Math.round((sameName ? 85 : union ? (75 * overlap) / union : 0) + (sameType ? 15 : 0));
        if (score >= 40) {
          suggestions.push({ node: candidate, score });
        }
      }
    }
    for (const child of schemaChildren(candidate)) {
      visit(child);
    }
  };
  visit(oppositeRoot);
  return suggestions.sort((left, right) => right.score - left.score || left.node.path.localeCompare(right.node.path)).slice(0, 8);
}

export interface MappingClipboard {
  functoids: MapFunctoid[];
  links: MapLink[];
  linkParameters?: { functoidId: string; parameter: FunctoidParameter; position: number }[];
}

export function synchronizeFunctoidLinks(page: MapPage): void {
  for (const functoid of page.functoids) {
    const incoming = page.links.filter((link) => link.targetType === 'functoid' && link.targetId === functoid.id).map((link) => link.id);
    functoid.inputLinks = [...new Set([...functoid.inputLinks.filter((id) => incoming.includes(id)), ...incoming])];
    functoid.outputLinks = page.links
      .filter((link) => link.sourceType === 'functoid' && link.sourceId === functoid.id)
      .map((link) => link.id);
    functoid.parameters = functoid.parameters.filter(
      (parameter) => parameter.type !== ParameterType.Link || incoming.includes(parameter.value)
    );
    for (const id of functoid.inputLinks) {
      if (!functoid.parameters.some((parameter) => parameter.type === ParameterType.Link && parameter.value === id)) {
        functoid.parameters.push({ index: functoid.parameters.length, type: ParameterType.Link, value: id, guid: crypto.randomUUID() });
      }
    }
    functoid.parameters.forEach((parameter, index) => {
      parameter.index = index;
    });
  }
}

export function copyMappingSelection(page: MapPage, linkIds: string[], functoidIds: string[]): MappingClipboard {
  const selectedFunctoids = new Set(functoidIds);
  const selectedLinks = new Set(linkIds);
  const copied: MappingClipboard = {
    functoids: page.functoids.filter((functoid) => selectedFunctoids.has(functoid.id)),
    links: page.links.filter((link) => {
      const endpoints = [
        ...(link.sourceType === 'functoid' ? [link.sourceId] : []),
        ...(link.targetType === 'functoid' ? [link.targetId] : []),
      ];
      return selectedLinks.has(link.id) || (endpoints.length > 0 && endpoints.every((id) => selectedFunctoids.has(id)));
    }),
  };
  copied.linkParameters = page.functoids.flatMap((functoid) =>
    functoid.parameters.flatMap((parameter, position) =>
      parameter.type === ParameterType.Link && copied.links.some((link) => link.id === parameter.value)
        ? [{ functoidId: functoid.id, parameter, position }]
        : []
    )
  );
  return structuredClone(copied);
}

export function pasteMappingSelection(
  page: MapPage,
  clipboard: MappingClipboard,
  definitions: FunctoidSummary[] = [],
  context?: LinkValidationContext
): { linkIds: string[]; functoidIds: string[]; skipped: number; errors: string[] } {
  const copied = structuredClone(clipboard);
  const functoidIds = new Map(copied.functoids.map((functoid) => [functoid.id, `f_${crypto.randomUUID()}`]));
  const linkIds = new Map<string, string>();
  const errors: string[] = [];
  let skipped = 0;
  for (const link of copied.links) {
    const sourceId = link.sourceType === 'functoid' ? functoidIds.get(link.sourceId) || link.sourceId : link.sourceId;
    const targetId = link.targetType === 'functoid' ? functoidIds.get(link.targetId) || link.targetId : link.targetId;
    const id = `link_${crypto.randomUUID()}`;
    const candidate = { ...link, id, sourceId, targetId };
    const validationPage = {
      ...page,
      functoids: [
        ...page.functoids.map((functoid) => {
          const input = copied.linkParameters?.find((item) => item.functoidId === functoid.id && item.parameter.value === link.id);
          return input ? { ...functoid, parameters: [...functoid.parameters, { ...input.parameter, value: id }] } : functoid;
        }),
        ...copied.functoids.map((functoid) => ({
          ...functoid,
          id: functoidIds.get(functoid.id)!,
          inputLinks: functoid.inputLinks.flatMap((inputId) => {
            const mapped = inputId === link.id ? id : linkIds.get(inputId);
            return mapped ? [mapped] : [];
          }),
          parameters: functoid.parameters.flatMap((parameter) => {
            if (parameter.type !== ParameterType.Link) {
              return [parameter];
            }
            const mapped = parameter.value === link.id ? id : linkIds.get(parameter.value);
            return mapped ? [{ ...parameter, value: mapped }] : [];
          }),
        })),
      ],
    };
    const error = validateMappingLink(validationPage, candidate, context, context?.definitions ?? definitions);
    if (error) {
      skipped++;
      errors.push(`${link.id}: ${error}`);
      continue;
    }
    linkIds.set(link.id, id);
    page.links.push(candidate);
  }
  for (const functoid of copied.functoids) {
    const parameterGuids = new Map(
      functoid.parameters.filter((parameter) => parameter.guid).map((parameter) => [parameter.guid!, crypto.randomUUID()])
    );
    functoid.id = functoidIds.get(functoid.id)!;
    functoid.x += 30;
    functoid.y += 30;
    functoid.inputLinks = functoid.inputLinks.flatMap((id) => (linkIds.has(id) ? [linkIds.get(id)!] : []));
    functoid.outputLinks = functoid.outputLinks.flatMap((id) => (linkIds.has(id) ? [linkIds.get(id)!] : []));
    functoid.parameters = functoid.parameters
      .filter((parameter) => parameter.type !== ParameterType.Link || linkIds.has(parameter.value))
      .map((parameter) => ({
        ...parameter,
        value: parameter.type === ParameterType.Link ? linkIds.get(parameter.value)! : parameter.value,
        guid: parameter.guid ? parameterGuids.get(parameter.guid) : undefined,
      }));
    if (functoid.tableLooping) {
      functoid.tableLooping.rows = functoid.tableLooping.rows.map((row) => row.map((cell) => parameterGuids.get(cell) || cell));
    }
    page.functoids.push(functoid);
  }
  synchronizeFunctoidLinks(page);
  for (const input of copied.linkParameters ?? []) {
    const id = linkIds.get(input.parameter.value);
    const target = page.functoids.find((functoid) => functoid.id === input.functoidId);
    if (!id || !target || functoidIds.has(input.functoidId)) {
      continue;
    }
    target.parameters = target.parameters.filter((parameter) => parameter.type !== ParameterType.Link || parameter.value !== id);
    target.parameters.splice(Math.min(input.position, target.parameters.length), 0, { ...input.parameter, value: id });
    target.parameters.forEach((parameter, index) => {
      parameter.index = index;
    });
    target.inputLinks = target.parameters.filter((parameter) => parameter.type === ParameterType.Link).map((parameter) => parameter.value);
  }
  return { linkIds: [...linkIds.values()], functoidIds: [...functoidIds.values()], skipped, errors };
}

export function moveMappingSelection(
  source: MapPage,
  destination: MapPage,
  linkIds: string[],
  functoidIds: string[]
): { linkIds: string[]; functoidIds: string[] } {
  if (source === destination) {
    return { linkIds: [], functoidIds: [] };
  }
  const selectedLinks = new Set(linkIds);
  const selectedFunctoids = new Set(functoidIds);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const link of source.links) {
      if (
        !selectedLinks.has(link.id) &&
        !(link.sourceType === 'functoid' && selectedFunctoids.has(link.sourceId)) &&
        !(link.targetType === 'functoid' && selectedFunctoids.has(link.targetId))
      ) {
        continue;
      }
      selectedLinks.add(link.id);
      for (const id of [
        link.sourceType === 'functoid' ? link.sourceId : undefined,
        link.targetType === 'functoid' ? link.targetId : undefined,
      ]) {
        if (id && !selectedFunctoids.has(id)) {
          selectedFunctoids.add(id);
          expanded = true;
        }
      }
    }
  }
  destination.links.push(...source.links.filter((link) => selectedLinks.has(link.id)));
  destination.functoids.push(...source.functoids.filter((functoid) => selectedFunctoids.has(functoid.id)));
  source.links = source.links.filter((link) => !selectedLinks.has(link.id));
  source.functoids = source.functoids.filter((functoid) => !selectedFunctoids.has(functoid.id));
  synchronizeFunctoidLinks(source);
  synchronizeFunctoidLinks(destination);
  return { linkIds: [...selectedLinks], functoidIds: [...selectedFunctoids] };
}

function schemaChildren(node: SchemaNode): SchemaNode[] {
  return [
    ...(node.attributes ?? []).map(
      (attribute): SchemaNode => ({
        name: attribute.name,
        path: `${node.path}/@${attribute.name}`,
        type: 'attribute',
        dataType: attribute.type,
        schemaPath: attribute.schemaPath,
        structuralPath: attribute.structuralPath,
        namespace: attribute.namespace,
        defaultValue: attribute.defaultValue,
        fixedValue: attribute.fixedValue,
        wildcard: attribute.wildcard,
        children: [],
        attributes: [],
        isOptional: !attribute.required,
      })
    ),
    ...node.children,
  ];
}

export function findLinkingNode(root: SchemaNode, path: string): SchemaNode | undefined {
  if (root.path === path) {
    return root;
  }
  for (const child of schemaChildren(root)) {
    const found = findLinkingNode(child, path);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function linkSchemaSubtrees(
  page: MapPage,
  source: SchemaNode,
  target: SchemaNode,
  strategy: 'name' | 'structure',
  context?: LinkValidationContext
): string[] {
  const added: string[] = [];
  const visited = new Set<string>();
  const visit = (from: SchemaNode, to: SchemaNode, linkNode: boolean): void => {
    const key = JSON.stringify([from.path, to.path]);
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    const sourceChildren = schemaChildren(from);
    const targetChildren = schemaChildren(to);
    if (
      linkNode &&
      to.children.length === 0 &&
      !page.links.some(
        (link) =>
          link.sourceType === 'schemaNode' &&
          link.targetType === 'schemaNode' &&
          (link.sourcePath || link.sourceId) === from.path &&
          (link.targetPath || link.targetId) === to.path
      )
    ) {
      const id = `link_${crypto.randomUUID()}`;
      const candidate: MapLink = {
        id,
        sourceId: from.path,
        sourcePath: from.path,
        targetId: to.path,
        targetPath: to.path,
        sourceType: 'schemaNode',
        targetType: 'schemaNode',
      };
      if (!validateMappingLink(page, candidate, { sourceRoot: source, targetRoot: target, ...context })) {
        page.links.push(candidate);
        added.push(id);
      }
    }
    targetChildren.forEach((child, index) => {
      const matches =
        strategy === 'name'
          ? sourceChildren.filter(
              (candidate) => candidate.name === child.name && (candidate.type === 'attribute') === (child.type === 'attribute')
            )
          : sourceChildren[index]
            ? [sourceChildren[index]]
            : [];
      for (const match of matches) {
        visit(match, child, true);
      }
    });
  };
  visit(source, target, source.children.length === 0 && target.children.length === 0);
  return added;
}

export function replaceLinkEndpoint(
  page: MapPage,
  linkId: string,
  end: 'source' | 'target',
  endpoint: { type: 'schemaNode' | 'functoid'; id: string },
  maxInputs = Number.POSITIVE_INFINITY,
  context?: LinkValidationContext
): string | undefined {
  const link = page.links.find((candidate) => candidate.id === linkId);
  if (!link) {
    return 'Link no longer exists';
  }
  const candidate: MapLink = {
    ...link,
    [`${end}Id`]: endpoint.id,
    [`${end}Type`]: endpoint.type,
    [`${end}Path`]: endpoint.type === 'schemaNode' ? endpoint.id : undefined,
    [`${end}BtmPath`]: undefined,
  };
  const error = validateMappingLink(page, candidate, context) || validateLinkCandidate(page, candidate, maxInputs);
  if (error) {
    return error;
  }
  Object.assign(link, candidate);
  synchronizeFunctoidLinks(page);
  return undefined;
}

function linkInputIndex(page: MapPage, target: MapFunctoid, candidate: MapLink): number {
  const incoming = page.links.filter((link) => link.targetType === 'functoid' && link.targetId === target.id && link.id !== candidate.id);
  incoming.push(candidate);
  const slots = new Map<number, string | undefined>();
  for (const parameter of target.parameters) {
    if (parameter.type === ParameterType.Constant) {
      slots.set(parameter.index, undefined);
    } else if (parameter.type === ParameterType.Link && incoming.some((link) => link.id === parameter.value)) {
      slots.set(parameter.index, parameter.value);
    }
  }
  incoming.sort((left, right) => {
    const leftIndex = target.inputLinks.indexOf(left.id);
    const rightIndex = target.inputLinks.indexOf(right.id);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
  for (const link of incoming) {
    if ([...slots.values()].includes(link.id)) {
      continue;
    }
    let index = 0;
    while (slots.has(index)) {
      index++;
    }
    slots.set(index, link.id);
  }
  return [...slots].find(([, id]) => id === candidate.id)![0];
}

export function validateMappingLink(
  page: MapPage,
  candidate: MapLink,
  context?: LinkValidationContext,
  definitions: FunctoidSummary[] = context?.definitions ?? []
): string | undefined {
  const source = candidate.sourceType === 'functoid' ? page.functoids.find((item) => item.id === candidate.sourceId) : undefined;
  const target = candidate.targetType === 'functoid' ? page.functoids.find((item) => item.id === candidate.targetId) : undefined;
  const sourceDefinition = definitions.find((definition) => definition.id === source?.functoidId);
  const targetDefinition = definitions.find((definition) => definition.id === target?.functoidId);
  const graphError = validateLinkCandidate(page, candidate, targetDefinition?.maxInputs);
  if (graphError) {
    return graphError;
  }
  if (sourceDefinition?.hasOutput === false) {
    return 'Source functoid has no output';
  }
  const sourceCategory = sourceDefinition?.category ?? source?.category;
  const sourceIsLogical = sourceCategory === 'Logical' && !!source && ![374, 375].includes(source.functoidId);
  if (source?.functoidId === 524 && (!target || ![574, 575].includes(target.functoidId))) {
    return 'Database Lookup may only connect to database extraction functoids';
  }
  if (source && target) {
    const scriptType = source.parameters.find((parameter) => parameter.type === ParameterType.ScriptType)?.value || source.scriptType;
    if (scriptType === 'inlineXslt' || scriptType === 'inlineXsltCallTemplate') {
      return 'Inline XSLT functoids may only connect to target schema nodes';
    }
    if ([424, 801, 802, 376].includes(source.functoidId)) {
      return 'Source functoid may only connect to target schema nodes';
    }
    if (source.functoidId === 703 && target.functoidId !== 704) {
      return 'Table Looping may only feed Table Extractor functoids';
    }
    if (
      sourceIsLogical &&
      (targetDefinition?.category ?? target.category) !== 'Logical' &&
      ![374, 375, 376, 260, 800, 703, 707].includes(target.functoidId)
    ) {
      return 'Logical output is not supported by this target functoid';
    }
  }
  if (target) {
    const index = linkInputIndex(page, target, candidate);
    if ([574, 575].includes(target.functoidId) && index === 0 && source?.functoidId !== 524) {
      return 'Database extraction first input must come from Database Lookup';
    }
    if (target.functoidId === 704) {
      if (index === 0 && source?.functoidId !== 703) {
        return 'Table Extractor first input must come from Table Looping';
      }
      if (index !== 0) {
        return 'Table Extractor second input must be a constant column number';
      }
    }
    if ([424, 801, 802].includes(target.functoidId) && candidate.sourceType !== 'schemaNode') {
      return 'Looping and Mass Copy inputs must come from source schema nodes';
    }
    if (target.functoidId === 703) {
      if (index === 0 && candidate.sourceType !== 'schemaNode') {
        return 'Table Looping first input must come from a source schema node';
      }
      if (index === 1) {
        return 'Table Looping second input must be a constant column count';
      }
    }
    if (
      source &&
      (([374, 375].includes(target.functoidId) && index === 0) || target.functoidId === 376) &&
      !sourceIsLogical &&
      source.functoidId !== 260
    ) {
      return 'Conditional input must come from a schema node, logical functoid or scripting functoid';
    }
  }
  if (context) {
    for (const end of ['source', 'target'] as const) {
      if (candidate[`${end}Type`] !== 'schemaNode') {
        continue;
      }
      const root = end === 'source' ? context.sourceRoot : context.targetRoot;
      if (!root) {
        return `${end} schema is not loaded`;
      }
      const path = candidate[`${end}Path`] || candidate[`${end}Id`];
      const node = findLinkingNode(root, path);
      if (!node) {
        return `${end} schema node no longer exists: ${path}`;
      }
      if ((node.type !== 'element' && node.type !== 'attribute') || node.wildcard) {
        return `${end} must be an element or attribute`;
      }
      if (end === 'source' && target?.functoidId === 802 && node.type !== 'element') {
        return 'Mass Copy requires a source element';
      }
      if (end === 'target') {
        const cannotOccur = (ancestor: SchemaNode): boolean =>
          ancestor.maxOccurs === 0 || schemaChildren(ancestor).some((child) => !!findLinkingNode(child, path) && cannotOccur(child));
        if (cannotOccur(root)) {
          return 'Target schema node cannot occur';
        }
        if (node.fixedValue !== undefined || Object.prototype.hasOwnProperty.call(context.targetValues ?? {}, path)) {
          return 'Target schema node has a fixed or assigned value';
        }
        if ((sourceIsLogical || (source && [703, 802, 376].includes(source.functoidId))) && node.type !== 'element') {
          return 'Source functoid requires a target element';
        }
        if (source && [424, 801].includes(source.functoidId) && node.path === root.path && node.children.length > 0) {
          return 'Looping cannot connect to the target root record';
        }
        if (source?.functoidId === 703 && node.maxOccurs !== 'unbounded' && !(typeof node.maxOccurs === 'number' && node.maxOccurs > 1)) {
          return 'Table Looping requires a repeating target element';
        }
        if (source?.functoidId === 376 && !node.nillable) {
          return 'Nil Value requires a nillable target element';
        }
      }
    }
  }
  return undefined;
}

function validateLinkCandidate(page: MapPage, candidate: MapLink, maxInputs = Number.POSITIVE_INFINITY): string | undefined {
  if (
    page.links.some(
      (other) =>
        other.id !== candidate.id &&
        (other.sourceType === 'schemaNode' ? other.sourcePath || other.sourceId : other.sourceId) ===
          (candidate.sourceType === 'schemaNode' ? candidate.sourcePath || candidate.sourceId : candidate.sourceId) &&
        (other.targetType === 'schemaNode' ? other.targetPath || other.targetId : other.targetId) ===
          (candidate.targetType === 'schemaNode' ? candidate.targetPath || candidate.targetId : candidate.targetId) &&
        other.sourceType === candidate.sourceType &&
        other.targetType === candidate.targetType
    )
  ) {
    return 'Link already exists';
  }
  if (
    (candidate.sourceType === 'functoid' && !page.functoids.some((functoid) => functoid.id === candidate.sourceId)) ||
    (candidate.targetType === 'functoid' && !page.functoids.some((functoid) => functoid.id === candidate.targetId))
  ) {
    return 'Functoid no longer exists';
  }
  if (candidate.targetType === 'functoid') {
    const functoid = page.functoids.find((item) => item.id === candidate.targetId)!;
    const constants = functoid.parameters.filter((parameter) => parameter.type === ParameterType.Constant).length;
    const incoming = page.links.filter(
      (other) => other.id !== candidate.id && other.targetType === 'functoid' && other.targetId === candidate.targetId
    ).length;
    if (incoming + constants >= maxInputs) {
      return 'Functoid input limit reached';
    }
  }
  if (candidate.sourceType === 'functoid' && candidate.targetType === 'functoid') {
    const pending = [candidate.targetId];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const id = pending.pop()!;
      if (id === candidate.sourceId) {
        return 'Link would create a cycle';
      }
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      for (const other of page.links) {
        if (other.id !== candidate.id && other.sourceType === 'functoid' && other.targetType === 'functoid' && other.sourceId === id) {
          pending.push(other.targetId);
        }
      }
    }
  }
  return undefined;
}
