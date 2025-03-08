import { describe, expect, it } from 'vitest';
import { canDropItem } from '../helpers';

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
});
