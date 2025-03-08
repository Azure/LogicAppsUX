import type { RetryPanelProps } from '../index';
import { RetryPanel } from '../index';
import { setIconOptions } from '@fluentui/react';
import React from 'react';
import renderer from 'react-test-renderer';
import ShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import timezoneMock from 'timezone-mock';
describe('lib/monitoring/retrypanel', () => {
  let minimal: RetryPanelProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
    timezoneMock.register('Etc/GMT-4');
  });

  afterAll(() => {
    timezoneMock.unregister();
  });

  beforeEach(() => {
    minimal = {
      retryHistories: [
        {
          clientRequestId: 'clientRequestId',
          code: 'code',
          startTime: '2022-02-08T19:52:00Z',
          endTime: '2022-02-10T19:52:00Z',
        },
      ],
    };
  });

  it('should render', () => {
    const tree = renderer.create(<RetryPanel {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render an end time and duration when available', () => {
    const props = {
      ...minimal,
      retryHistories: [
        {
          ...minimal.retryHistories[0],
          endTime: '2022-02-08T20:10:00Z',
        },
      ],
    };

    const tree = renderer.create(<RetryPanel {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render a service request ID when available', () => {
    const props = {
      ...minimal,
      retryHistories: [
        {
          ...minimal.retryHistories[0],
          serviceRequestId: 'serviceRequestId',
        },
      ],
    };

    const tree = renderer.create(<RetryPanel {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render an error when available', () => {
    const props: RetryPanelProps = {
      ...minimal,
      retryHistories: [
        {
          ...minimal.retryHistories[0],
          error: {
            error: {
              code: 'errorCode',
              message: 'errorMessage',
            },
          },
        },
      ],
    };

    const tree = renderer.create(<RetryPanel {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  describe('visible', () => {
    let renderer: ShallowRenderer.ShallowRenderer;

    beforeEach(() => {
      renderer = ShallowRenderer.createRenderer();
    });

    afterEach(() => {
      renderer.unmount();
    });

    it('should not render when not visible', () => {
      renderer.render(<RetryPanel {...minimal} visible={false} />);
      expect(renderer.getRenderOutput()).toBeNull();
    });
  });
});
