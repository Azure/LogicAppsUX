import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { OverviewCommandBar, type OverviewCommandBarProps } from '../overviewcommandbar';
import type { CallbackInfo } from '../types';

describe('lib/overview/overviewcommandbar', () => {
  let minimal: OverviewCommandBarProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      onRefresh: jest.fn(),
      onRunTrigger: jest.fn(),
    };
  });

  it('renders', () => {
    const tree = renderer.create(<OverviewCommandBar {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with Run trigger button', () => {
    const callbackInfo: CallbackInfo = {
      value: 'workflowProperties.callbackInfo.value',
    };
    const tree = renderer.create(<OverviewCommandBar {...minimal} callbackInfo={callbackInfo} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
