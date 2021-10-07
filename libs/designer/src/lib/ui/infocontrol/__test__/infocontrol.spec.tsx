import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { InfoControl, InfoControlProps } from '../../infocontrol';

describe('ui/infocontrol/_infocontrol', () => {
  let minimal: InfoControlProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      infoText: 'anything',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct the info control correctly', () => {
    renderer.render(<InfoControl {...minimal} />);

    const infoControl = renderer.getRenderOutput();
    expect(infoControl).toBeDefined();
  });

  it('should render info control with dismiss button when dismissible as true', () => {
    const onDismissClicked = jest.fn();
    renderer.render(<InfoControl {...minimal} dismissible={true} onDismissClicked={onDismissClicked} />);

    const infoControl = renderer.getRenderOutput();
    expect(infoControl.props.dismissButtonAriaLabel).toBe('Dismiss');
    expect(infoControl.props.onDismiss).toEqual(onDismissClicked);
  });

  it('should render info control without dismiss icon when dismissible as false or not specified', () => {
    renderer.render(<InfoControl {...minimal} dismissible={false} />);

    const infoControl = renderer.getRenderOutput();
    expect(infoControl.props.onDismiss).toBeUndefined();
  });
});
