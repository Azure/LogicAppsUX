import type { ConfirmProps } from '../confirm';
import { Confirm } from '../confirm';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('ui/dialogs/_confirm', () => {
  let minimal: ConfirmProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      hidden: false,
      message: 'Message',
      title: 'Title',
      onConfirm: vi.fn(),
      onDismiss: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  it('should render', () => {
    const confirm = renderer.render(<Confirm {...minimal} />);

    expect(confirm).toMatchSnapshot();
  });
});
