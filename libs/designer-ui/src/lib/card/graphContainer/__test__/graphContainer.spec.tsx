import { describe, it, expect } from 'vitest';
import renderer from 'react-test-renderer';
import { GraphContainer } from '../index';

describe('GraphContainer component', () => {
  it('renders with default props', () => {
    const container = renderer.create(<GraphContainer id="test-container" />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    // Class names are now dynamic with makeStyles, we can't check for specific strings
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });

  it('renders with selected prop', () => {
    const container = renderer.create(<GraphContainer id="test-container" selected={true} />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    // With makeStyles, we can't check for specific class strings, but we verify the className exists
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });

  it('renders with active prop set to false', () => {
    const container = renderer.create(<GraphContainer id="test-container" active={false} />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    // With makeStyles, we can't check for specific class strings
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });

  it('renders with selected and active props', () => {
    const container = renderer.create(<GraphContainer id="test-container" selected={true} active={false} />).toJSON();
    expect(container).toMatchSnapshot();
    expect(container).toHaveProperty('props.className');
    // With makeStyles, we can't check for specific class strings
    expect(container).toHaveProperty('props.data-automation-id', 'msla-graph-container-test_container');
  });
});
