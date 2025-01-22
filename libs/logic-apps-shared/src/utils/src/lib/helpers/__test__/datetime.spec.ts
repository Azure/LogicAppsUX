import { getTestIntl, mockUseIntl } from '../../../../../intl/src/__test__/intl-test-helper';
import { getDuration, toFriendlyDurationString } from '../datetime';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/helpers/datetime', () => {
  it('should generate the duration values properly', () => {
    const start = new Date('2021-01-01T00:00:00Z');
    const end = new Date('2021-01-01T01:28:00Z');
    const duration = getDuration(start, end, 'Minutes');
    expect(duration).toEqual(88);
  });
  it('should generate the friendly duration string properly', () => {
    const start = new Date('2021-01-01T00:00:00Z');
    const end = new Date('2021-01-01T01:28:00Z');
    mockUseIntl();
    const intl = getTestIntl();
    const duration = toFriendlyDurationString(start, end, intl as any);
    expect(duration).toEqual('1.47 Hours');
  });
});
