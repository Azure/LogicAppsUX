import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { RunHistory, type RunHistoryProps } from '../runhistory';

describe('lib/overview/runhistory', () => {
  let minimal: RunHistoryProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      items: [],
      onOpenRun: jest.fn(),
    };
  });

  it('renders', () => {
    const tree = renderer.create(<RunHistory {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders a shimmered details list', () => {
    const tree = renderer.create(<RunHistory {...minimal} loading />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with items', () => {
    const items = [
      {
        duration: '1s',
        id: '/workflows/run/versions/08585581919959304835',
        identifier: '08585581919959304835',
        startTime: '2022-02-04T17:58:19.6012324Z',
        status: 'Succeeded',
      },
    ];
    const tree = renderer.create(<RunHistory {...minimal} items={items} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
