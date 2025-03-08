import type { EditOrDeleteButtonProps } from '../workflowparametersButtons';
import { EditOrDeleteButton } from '../workflowparametersButtons';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/workflowparameters/workflowparametersButtons', () => {
  let minimal: EditOrDeleteButtonProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      //   showDelete: true,
      definition: { id: 'test' },
      setIsEditable: vi.fn(),
      setExpanded: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const button = renderer.render(<EditOrDeleteButton {...minimal} />);
    expect(button).toMatchSnapshot();
  });

  it('should render EditButton when no prop provided.', () => {
    renderer.render(<EditOrDeleteButton {...minimal} />);
    const button = renderer.getRenderOutput();
    const { onClick: clickHandler } = button.props;
    expect(clickHandler).toBeDefined();
  });

  it('should render DeleteButton when no prop provided.', () => {
    const props = { ...minimal, showDelete: true };
    renderer.render(<EditOrDeleteButton {...props} />);
    const button = renderer.getRenderOutput();
    const { onClick: clickHandler } = button.props;
    expect(clickHandler).toBeDefined();
  });
});
