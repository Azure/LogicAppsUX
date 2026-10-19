import type { WorkflowState } from '../state/workflow/workflowInterfaces';

export class WorkflowExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'WorkflowExtractionError';
  }
}

export interface ExtractionSelectionAction {
  parentId?: string;
  isContainer: boolean;
}

export const isExtractionContainer = (type: string): boolean => /^(scope|if|switch|foreach|until)$/i.test(type);

/**
 * An explicitly expanded selection must cover every real descendant. A container
 * selected on its own remains atomic, as it did before extraction supported
 * expanded selections.
 */
export function normalizeWorkflowExtractionRoots(actions: Map<string, ExtractionSelectionAction>, selectedIds: string[]): string[] {
  const canonicalIds = new Map<string, string>();
  for (const id of actions.keys()) {
    if (canonicalIds.has(id.toLowerCase())) {
      throw new WorkflowExtractionError('duplicate-action', `Action "${id}" has an ambiguous action name.`);
    }
    canonicalIds.set(id.toLowerCase(), id);
  }
  const selected = new Set<string>();
  for (const id of selectedIds) {
    const canonicalId = canonicalIds.get(id.toLowerCase());
    if (!canonicalId) {
      throw new WorkflowExtractionError('selection-not-top-level', `Selected action "${id}" is missing or is not an extractable action.`);
    }
    if (selected.has(canonicalId)) {
      throw new WorkflowExtractionError(
        'invalid-selection',
        'Select distinct actions to extract; the selection contains a duplicate action.'
      );
    }
    selected.add(canonicalId);
  }
  const ancestors = (id: string): string[] => {
    const result: string[] = [];
    let parent = actions.get(id)?.parentId;
    while (parent) {
      if (!actions.has(parent) || parent === id || result.includes(parent)) {
        throw new WorkflowExtractionError('invalid-selection', 'The selected actions have an invalid container hierarchy.');
      }
      result.push(parent);
      parent = actions.get(parent)?.parentId;
    }
    return result;
  };
  const roots = [...selected].filter((id) => !ancestors(id).some((parent) => selected.has(parent)));
  if (roots.some((id) => actions.get(id)?.parentId)) {
    throw new WorkflowExtractionError(
      'selection-not-top-level',
      'Select complete top-level containers rather than actions inside an unselected container.'
    );
  }
  for (const root of roots) {
    const descendants = [...actions.keys()].filter((id) => ancestors(id).includes(root));
    if (descendants.some((id) => selected.has(id)) && descendants.some((id) => !selected.has(id))) {
      throw new WorkflowExtractionError(
        'incomplete-container-selection',
        `Select every action inside "${root}", including all branches and nested containers, or select only the container.`
      );
    }
  }
  if (!roots.length || (roots.length === 1 && !actions.get(roots[0])?.isContainer)) {
    throw new WorkflowExtractionError('invalid-selection', 'Select at least two distinct actions or one complete container to extract.');
  }
  return roots;
}

/** Resolve real action ancestry through virtual branch/case graphs, never by ID suffix. */
export function getWorkflowExtractionSelection(state: WorkflowState, selectedIds: string[]): string[] {
  const operationIds = new Map(Object.keys(state.operations).map((id) => [id.toLowerCase(), id]));
  const metadataIds = new Map(Object.keys(state.nodesMetadata).map((id) => [id.toLowerCase(), id]));
  const virtualIds = new Set<string>();
  const isRealAction = (id: string) => Object.prototype.hasOwnProperty.call(state.operations, id);
  const getMetadata = (id: string) => state.nodesMetadata[id] ?? state.nodesMetadata[metadataIds.get(id.toLowerCase()) ?? id];
  const collectVirtualIds = (node: NonNullable<WorkflowState['graph']>) => {
    if (!isRealAction(node.id)) {
      virtualIds.add(node.id);
    }
    node.children?.forEach(collectVirtualIds);
  };
  if (state.graph) {
    collectVirtualIds(state.graph);
  }
  const actions = new Map<string, ExtractionSelectionAction>();
  for (const [id, operation] of Object.entries(state.operations)) {
    const metadata = getMetadata(id);
    if (!metadata || metadata.isTrigger) {
      continue;
    }
    let graphId = metadata.graphId;
    const seen = new Set<string>([id]);
    let parentId: string | undefined;
    while (graphId && graphId !== 'root') {
      if (seen.has(graphId)) {
        throw new WorkflowExtractionError('invalid-selection', 'The selected actions have an invalid container hierarchy.');
      }
      seen.add(graphId);
      parentId = isRealAction(graphId) ? graphId : virtualIds.has(graphId) ? undefined : operationIds.get(graphId.toLowerCase());
      if (parentId) {
        break;
      }
      const branch = getMetadata(graphId);
      if (!branch) {
        throw new WorkflowExtractionError('invalid-selection', 'The selected actions have an unknown workflow scope.');
      }
      graphId = branch.graphId;
    }
    actions.set(id, { parentId, isContainer: isExtractionContainer(operation.type) });
  }
  return normalizeWorkflowExtractionRoots(
    actions,
    selectedIds.filter((id) => isRealAction(id) || !virtualIds.has(id))
  );
}
