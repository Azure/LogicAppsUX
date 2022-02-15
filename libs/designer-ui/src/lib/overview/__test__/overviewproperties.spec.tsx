import renderer from 'react-test-renderer';
import { OverviewProperties, type OverviewPropertiesProps } from '../overviewproperties';
import type { CallbackInfo } from '../types';

describe('lib/overview/overviewproperties', () => {
  let minimal: OverviewPropertiesProps;

  beforeEach(() => {
    minimal = {
      callbackInfo: {
        value: 'callbackInfo.value',
      },
      name: 'name',
      stateType: 'stateType',
    };
  });

  it('renders', () => {
    const tree = renderer.create(<OverviewProperties {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the operation options property', () => {
    const tree = renderer.create(<OverviewProperties {...minimal} operationOptions="operationOptions" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the stateless run mode property', () => {
    const tree = renderer.create(<OverviewProperties {...minimal} statelessRunMode="statelessRunMode" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the callback URL property', () => {
    const callbackInfo: CallbackInfo = {
      value: 'callbackInfo.value',
    };
    const tree = renderer.create(<OverviewProperties {...minimal} callbackInfo={callbackInfo} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
