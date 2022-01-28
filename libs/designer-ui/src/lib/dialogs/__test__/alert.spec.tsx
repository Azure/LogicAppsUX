import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Alert, AlertProps } from '../alert';

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
