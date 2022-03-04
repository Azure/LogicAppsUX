import type { ConfirmProps } from '../confirm';
import { Confirm } from '../confirm';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/dialogs/_confirm', () => {
  let minimal: ConfirmProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      hidden: false,
      message: 'Message',
      title: 'Title',
      onConfirm: jest.fn(),
      onDismiss: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  it('should render', () => {
    const confirm = renderer.render(<Confirm {...minimal} />);

    expect(confirm).toMatchSnapshot();
  });
});
