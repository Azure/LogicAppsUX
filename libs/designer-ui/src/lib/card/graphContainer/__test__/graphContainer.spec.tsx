import { describe, it, expect } from 'vitest';
import renderer from 'react-test-renderer';
import { GraphContainer } from '../index';
import React from 'react';

describe('GraphContainer component', () => {
  it('renders with default props', () => {
    const container = renderer.create(<GraphContainer id="test-container" />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    expect(container).not.toHaveProperty('props.className', expect.stringContaining('selected'));
    expect(container).not.toHaveProperty('props.className', expect.stringContaining('msla-card-inactive'));
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });

  it('renders with selected prop', () => {
    const container = renderer.create(<GraphContainer id="test-container" selected={true} />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    expect(container).toHaveProperty('props.className', expect.stringContaining('selected'));
    expect(container).not.toHaveProperty('props.className', expect.stringContaining('msla-card-inactive'));
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });

  it('renders with active prop set to false', () => {
    const container = renderer.create(<GraphContainer id="test-container" active={false} />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    expect(container).not.toHaveProperty('props.className', expect.stringContaining('selected'));
    expect(container).toHaveProperty('props.className', expect.stringContaining('msla-card-inactive'));
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });

  it('renders with selected and active props', () => {
    const container = renderer.create(<GraphContainer id="test-container" selected={true} active={false} />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    expect(container).toHaveProperty('props.className', expect.stringContaining('selected'));
    expect(container).toHaveProperty('props.className', expect.stringContaining('msla-card-inactive'));
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });
});
