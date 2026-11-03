import { InitLoggerService, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowState } from '../../state/workflow/workflowInterfaces';
import { getWorkflowExtractionSelection, normalizeWorkflowExtractionRoots, WorkflowExtractionError } from '../workflowExtractionSelection';

const compose = (): LogicAppsV2.ComposeAction => ({ type: 'Compose', inputs: 'literal', runAfter: {} });
const stateFor = (actions: LogicAppsV2.Actions): WorkflowState => {
  const { graph, nodesMetadata, actionData } = Deserialize({
    triggers: { Request: { type: 'Request', kind: 'Http', inputs: {} } },
    actions,
  });
  return { graph, nodesMetadata, operations: actionData, idReplacements: {} } as WorkflowState;
};
const condition = (): LogicAppsV2.IfAction => ({
  type: 'If',
  expression: '@true',
  actions: {
    Nested: { type: 'Scope', actions: { Inner: compose() }, runAfter: {} },
    Then: { ...compose(), runAfter: { Nested: ['Succeeded'] } },
  },
  else: { actions: { Otherwise: compose() } },
  runAfter: {},
});
const completeCondition = ['Condition', 'Nested', 'Inner', 'Then', 'Otherwise'];

describe('extraction-only selection normalization', () => {
  beforeEach(() => InitLoggerService([]));

  it('resolves nested actions through Condition branch graphs and collapses them to one atomic root', () => {
    const state = stateFor({ Condition: condition() });
    const before = structuredClone(state);
    expect(state.nodesMetadata.Nested.graphId).not.toBe('Condition');
    expect(getWorkflowExtractionSelection(state, [...completeCondition].reverse())).toEqual(['Condition']);
    expect(state).toEqual(before);
  });

  it.each(['Scope', 'Foreach', 'Until'])('collapses a fully selected %s with nested branches', (type) => {
    const state = stateFor({
      Root: { type, actions: { Condition: condition() }, runAfter: {} } as LogicAppsV2.ActionDefinition,
    });
    expect(getWorkflowExtractionSelection(state, ['Root', ...completeCondition])).toEqual(['Root']);
  });

  it('ignores virtual case/subgraph/header/footer nodes without mistaking a same-named real sibling for a branch', () => {
    const state = stateFor({
      Switch: {
        type: 'Switch',
        expression: '@true',
        cases: {
          Sibling: { case: true, actions: { Branch: compose() } },
          Empty: { case: false, actions: {} },
        },
        default: { actions: { Default: compose() } },
        runAfter: {},
      },
      Sibling: { ...compose(), runAfter: { Switch: ['Succeeded'] } },
    });
    const virtualCase = Object.keys(state.nodesMetadata).find((id) => id.startsWith('Sibling') && !Object.hasOwn(state.operations, id))!;
    expect(virtualCase).not.toBe('Sibling');
    expect(
      getWorkflowExtractionSelection(state, [
        'Switch',
        virtualCase,
        `${virtualCase}-#subgraph`,
        'Switch-#scope',
        'Switch-defaultCase',
        'Switch-addCase',
        'Branch',
        'Default',
        'Sibling',
      ])
    ).toEqual(['Switch', 'Sibling']);
  });

  it('does not require cards for empty branches', () => {
    const state = stateFor({
      Condition: { type: 'If', expression: '@true', actions: { Then: compose() }, else: { actions: {} }, runAfter: {} },
    });
    expect(getWorkflowExtractionSelection(state, ['Condition', 'Then'])).toEqual(['Condition']);
  });

  it('keeps virtual case identity distinct from a differently-cased real sibling action', () => {
    const state = stateFor({
      Switch: {
        type: 'Switch',
        expression: '@true',
        cases: { sibling: { case: true, actions: { Branch: compose() } } },
        default: { actions: {} },
        runAfter: {},
      },
      Sibling: { ...compose(), runAfter: { Switch: ['Succeeded'] } },
    });
    expect(state.nodesMetadata.Branch.graphId).toBe('sibling');
    expect(getWorkflowExtractionSelection(state, ['Switch', 'sibling', 'Branch', 'Sibling'])).toEqual(['Switch', 'Sibling']);
  });

  it('ignores Until header/footer cards but still requires all real loop actions', () => {
    const state = stateFor({
      Loop: { type: 'Until', expression: '@true', actions: { Probe: compose() }, limit: { count: 2, timeout: 'PT1M' }, runAfter: {} },
    });
    expect(getWorkflowExtractionSelection(state, ['Loop', 'Probe', 'Loop-#subgraph', 'Loop-#footer'])).toEqual(['Loop']);
  });

  it('retains atomic-container selection with a sibling and permits an empty container', () => {
    const state = stateFor({ Condition: condition(), After: { ...compose(), runAfter: { Condition: ['Succeeded'] } } });
    expect(getWorkflowExtractionSelection(state, ['Condition', 'After'])).toEqual(['Condition', 'After']);
    expect(getWorkflowExtractionSelection(stateFor({ Empty: { type: 'Scope', actions: {}, runAfter: {} } }), ['Empty'])).toEqual(['Empty']);
  });

  it.each([
    ['Condition', 'Nested', 'Inner', 'Then'],
    ['Condition', 'Nested', 'Then', 'Otherwise'],
    ['Condition', 'Inner', 'Then', 'Otherwise'],
  ])('rejects incomplete descendant coverage %j', (...ids) => {
    const state = stateFor({ Condition: condition() });
    expect(() => getWorkflowExtractionSelection(state, ids)).toThrow(expect.objectContaining({ code: 'incomplete-container-selection' }));
  });

  it.each([
    ['Nested', 'Inner', 'Then', 'Otherwise'],
    ['Condition', 'Missing'],
    ['Condition', 'Request'],
    ['Condition', 'Condition-unknown'],
  ])('rejects missing, trigger, or wrong-scope selections %j', (...ids) => {
    const state = stateFor({ Condition: condition() });
    expect(() => getWorkflowExtractionSelection(state, ids)).toThrow(expect.objectContaining({ code: 'selection-not-top-level' }));
  });

  it('canonicalizes real action casing before checking coverage and rejects duplicate aliases', () => {
    const state = stateFor({ Condition: condition() });
    expect(
      getWorkflowExtractionSelection(
        state,
        completeCondition.map((id) => id.toUpperCase())
      )
    ).toEqual(['Condition']);
    expect(() => getWorkflowExtractionSelection(state, ['Condition', 'condition'])).toThrow(
      expect.objectContaining({ code: 'invalid-selection' })
    );
    expect(() => getWorkflowExtractionSelection(state, [...completeCondition, 'Inner'])).toThrow(WorkflowExtractionError);
  });

  it('rejects ambiguous action identities and malformed ownership instead of silently flattening', () => {
    expect(() =>
      normalizeWorkflowExtractionRoots(
        new Map([
          ['A', { isContainer: true }],
          ['a', { isContainer: false }],
        ]),
        ['A']
      )
    ).toThrow(expect.objectContaining({ code: 'duplicate-action' }));
    expect(() => normalizeWorkflowExtractionRoots(new Map([['A', { isContainer: true, parentId: 'A' }]]), ['A'])).toThrow(
      expect.objectContaining({ code: 'invalid-selection' })
    );
    const state = stateFor({ Condition: condition() });
    state.nodesMetadata.Otherwise.graphId = 'UnknownGraph';
    expect(() => getWorkflowExtractionSelection(state, completeCondition)).toThrow(/unknown workflow scope/);
  });
});
