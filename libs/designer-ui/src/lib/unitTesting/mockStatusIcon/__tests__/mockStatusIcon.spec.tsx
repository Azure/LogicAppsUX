import { MockStatusIcon } from '../index';
import TestRenderer from 'react-test-renderer';
// biome-ignore lint/correctness/noUnusedImports: actually is used
import React from 'react';
import { describe, it, expect } from 'vitest';

describe('ui/unitTesting/mockStatusIcon', () => {
  it('should render the empty status when no completed property is send.', () => {
    const mockStatusIcon = TestRenderer.create(
      <MockStatusIcon
        id="test-id"
        nodeMockResults={{
          output: {},
          actionResult: '',
        }}
      />
    );
    expect(mockStatusIcon).toMatchSnapshot();
  });

  it('should render the completed status.', () => {
    const mockStatusIcon = TestRenderer.create(
      <MockStatusIcon
        id="test-id"
        nodeMockResults={{
          output: {},
          actionResult: '',
          isCompleted: true,
        }}
      />
    );
    expect(mockStatusIcon).toMatchSnapshot();
  });

  it('should render the empty status.', () => {
    const mockStatusIcon = TestRenderer.create(
      <MockStatusIcon
        id="test-id"
        nodeMockResults={{
          output: {},
          actionResult: '',
          isCompleted: false,
        }}
      />
    );
    expect(mockStatusIcon).toMatchSnapshot();
  });
});
