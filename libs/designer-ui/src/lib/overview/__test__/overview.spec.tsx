import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { Overview, type OverviewProps } from '../index';

describe('lib/overview', () => {
  let minimal: OverviewProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      runItems: [],
      workflowProperties: {
        callbackInfo: {
          value: 'workflowProperties.callbackInfo.value',
        },
        name: 'workflowProperties.name',
        operationOptions: 'workflowProperties.operationOptions',
        stateType: 'workflowProperties.stateType',
      },
      onLoadMoreRuns: jest.fn(),
      onLoadRuns: jest.fn(),
      onOpenRun: jest.fn(),
      onRunTrigger: jest.fn(),
      onVerifyRunId: jest.fn(),
    };
  });

  it('renders', () => {
    const tree = renderer.create(<Overview {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders a CORS notice', () => {
    const tree = renderer
      .create(<Overview {...minimal} corsNotice="To view runs, set '*' to allowed origins in the CORS setting." />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders an error message', () => {
    const tree = renderer.create(<Overview {...minimal} errorMessage="504 GatewayTimeout" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders a load more button when there are more runs', () => {
    const tree = renderer.create(<Overview {...minimal} hasMoreRuns />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders a shimmered run history details list when loading ', () => {
    const tree = renderer.create(<Overview {...minimal} loading />).toJSON();
  });
});
