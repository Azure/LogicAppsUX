import { describe, expect, it } from 'vitest';
import { canDropItem, getDownstreamDependencies } from '../helpers';

describe('getDownstreamDependencies', () => {
  it('should return empty set when no nodes depend on the given node', () => {
    const allNodesDependencies = {
      node1: new Set(['node2', 'node3']),
      node2: new Set(['node3']),
      node3: new Set([]),
    };

    const result = getDownstreamDependencies('node4', allNodesDependencies);
    expect(result.size).toBe(0);
  });

  it('should return nodes that directly depend on the given node', () => {
    const allNodesDependencies = {
      node1: new Set(['node2', 'node3']),
      node2: new Set(['node3']),
      node3: new Set([]),
      node4: new Set(['node2']),
    };

    const result = getDownstreamDependencies('node2', allNodesDependencies);
    expect(result.size).toBe(2);
    expect(result.has('node1')).toBe(true);
    expect(result.has('node4')).toBe(true);
  });

  it('should handle node IDs with and without tags', () => {
    const allNodesDependencies = {
      node1: new Set(['node2-#tag']),
      node2: new Set(['node3']),
      node3: new Set(['node2']),
    };

    const result = getDownstreamDependencies('node2-#tag', allNodesDependencies);
    expect(result.size).toBe(2);
    expect(result.has('node1')).toBe(true);
    expect(result.has('node3')).toBe(true);
  });
});

describe('canDropItem', () => {
  const emptySet = new Set<string>();

  it('Try to drag item to right above same node', () => {
    expect(
      canDropItem(
        { id: 'Condition-#scope', dependencies: [], isScope: true },
        emptySet,
        {
          Complete_the_message_in_a_queue: emptySet,
          Scope: emptySet,
          Business_logic: emptySet,
          'When_one_or_more_messages_are_received_from_a_queue_(browse-lock)': emptySet,
        },
        emptySet,
        'Condition',
        'Complete_the_message_in_a_queue'
      )
    ).toBeFalsy();
  });

  it('Try to drag item to top of the parent node', () => {
    expect(
      canDropItem(
        { id: 'Condition-#scope', dependencies: [], isScope: true },
        emptySet,
        { Scope: emptySet, Business_logic: emptySet, 'When_one_or_more_messages_are_received_from_a_queue_(browse-lock)': emptySet },
        emptySet,
        'Complete_the_message_in_a_queue',
        'Scope'
      )
    ).toBeTruthy();
  });

  it('Try to drag scope item to in its own node', () => {
    expect(
      canDropItem(
        { id: 'Scope-#scope', dependencies: [], isScope: true },
        emptySet,
        { 'When_one_or_more_messages_are_received_from_a_queue_(browse-lock)': emptySet, Scope: emptySet },
        emptySet,
        'Business_logic',
        'Scope-#scope'
      )
    ).toBeFalsy();
  });

  it('should prevent drop when node would be moved after its dependents', () => {
    const upstreamNodes = new Set(['trigger', 'useVariable']);
    const upstreamNodesDependencies = {
      trigger: emptySet,
      useVariable: new Set(['initVariable']),
    };
    const allNodesDependencies = {
      trigger: emptySet,
      initVariable: emptySet,
      useVariable: new Set(['initVariable']),
    };

    expect(
      canDropItem(
        { id: 'initVariable', dependencies: [] },
        upstreamNodes,
        upstreamNodesDependencies,
        emptySet,
        undefined,
        undefined,
        false,
        false,
        allNodesDependencies
      )
    ).toBeFalsy();
  });

  it('should allow drop when node has downstream dependencies that are not upstream', () => {
    const upstreamNodes = new Set(['trigger']);
    const upstreamNodesDependencies = {
      trigger: emptySet,
    };
    const allNodesDependencies = {
      trigger: emptySet,
      initVariable: emptySet,
      useVariable: new Set(['initVariable']),
    };

    expect(
      canDropItem(
        { id: 'initVariable', dependencies: [] },
        upstreamNodes,
        upstreamNodesDependencies,
        emptySet,
        undefined,
        undefined,
        false,
        false,
        allNodesDependencies
      )
    ).toBeTruthy();
  });

  it('should prevent drop when variable initialization would be moved after usage', () => {
    const upstreamNodes = new Set(['trigger', 'parseJson', 'action2']);
    const upstreamNodesDependencies = {
      trigger: emptySet,
      parseJson: new Set(['Initialize_ArrayVariable']),
      action2: new Set(['Initialize_ArrayVariable', 'parseJson']),
    };
    const allNodesDependencies = {
      trigger: emptySet,
      Initialize_ArrayVariable: emptySet,
      parseJson: new Set(['Initialize_ArrayVariable']),
      action2: new Set(['Initialize_ArrayVariable', 'parseJson']),
      action3: new Set(['action2']),
    };

    expect(
      canDropItem(
        { id: 'Initialize_ArrayVariable', dependencies: [] },
        upstreamNodes,
        upstreamNodesDependencies,
        emptySet,
        'action3',
        'action2',
        false,
        false,
        allNodesDependencies
      )
    ).toBeFalsy();
  });
});
