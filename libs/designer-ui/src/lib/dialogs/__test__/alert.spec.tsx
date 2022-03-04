import type { AlertProps } from '../alert';
import { Alert } from '../alert';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/dialogs/_alert', () => {
  let minimal: AlertProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      hidden: false,
      message: 'Message',
      title: 'Title',
      onDismiss: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  it('should render', () => {
    const alert = renderer.render(<Alert {...minimal} />);
    expect(alert).toMatchSnapshot();
  });
});
