import { describe, expect, it } from 'vitest';
import { isSharedNodeUiRequested } from '../sharedNodeUi';

describe('isSharedNodeUiRequested', () => {
  it.each([
    ['', false],
    ['?useSharedNodeUi=false', false],
    ['?useSharedNodeUi=1', false],
    ['?useSharedNodeUi=TRUE', false],
    ['?useSharedNodeUi=true', true],
    ['?runId=abc&useSharedNodeUi=true', true],
  ])('treats %j as %s', (search, expected) => {
    expect(isSharedNodeUiRequested(search)).toBe(expected);
  });
});
