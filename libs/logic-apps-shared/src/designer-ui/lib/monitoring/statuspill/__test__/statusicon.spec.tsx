import renderer from 'react-test-renderer';
import { StatusIcon } from '../statusicon';

describe('lib/monitoring/statuspill/statusicon', () => {
  for (const { hasRetries, status } of [
    { hasRetries: false, status: 'Aborted' },
    { hasRetries: false, status: 'Cancelled' },
    { hasRetries: false, status: 'Failed' },
    { hasRetries: false, status: 'Running' },
    { hasRetries: false, status: 'Skipped' },
    { hasRetries: false, status: 'Succeeded' },
    { hasRetries: true, status: 'Succeeded' },
    { hasRetries: false, status: 'TimedOut' },
    { hasRetries: false, status: 'Unknown' },
    { hasRetries: false, status: 'Waiting' },
  ]) {
    it(`renders (status = ${status}, has retries = ${hasRetries})`, () => {
      const tree = renderer.create(<StatusIcon hasRetries={hasRetries} status={status} />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  }
});
