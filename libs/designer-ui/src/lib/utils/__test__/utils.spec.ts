import Constants from '../../constants';
import { getDurationString, getDurationStringPanelMode, getStatusString } from '../utils';

describe('ui/utils/utils', () => {
  describe('getDurationString', () => {
    it(`returns -- if you try to get a duration for NaN milliseconds`, () => {
      expect(getDurationString(NaN)).toBe('--');
    });

    it(`returns 0s if you try to get a duration for 0 milliseconds`, () => {
      expect(getDurationString(0)).toBe('0s');
      expect(getDurationString(0, /* abbreviated */ false)).toBe('0 seconds');
    });

    it('returns a duration in seconds if the duration is less than 60 seconds', () => {
      expect(getDurationString(15 * 1000)).toBe('15s');
      expect(getDurationString(15 * 1000, /* abbreviated */ false)).toBe('15 seconds');
    });

    it('exactly 1 seconds should return a singular second', () => {
      expect(getDurationString(1000, /* abbreviated */ false)).toBe('1 second');
    });

    it('returns a duration in minutes if the duration is less than 60 minutes', () => {
      expect(getDurationString(15 * 60 * 1000)).toBe('15m');
      expect(getDurationString(15 * 60 * 1000, /* abbreviated */ false)).toBe('15 minutes');
    });

    it('exactly 1 minute should return a singular minute', () => {
      expect(getDurationString(1000 * 60, /* abbreviated */ false)).toBe('1 minute');
    });
    it('returns a duration in hours if the duration is less than 24 hours', () => {
      expect(getDurationString(15 * 60 * 60 * 1000)).toBe('15h');
      expect(getDurationString(15 * 60 * 60 * 1000, /* abbreviated */ false)).toBe('15 hours');
    });

    it('exactly 1 hour should return a singular hour', () => {
      expect(getDurationString(1000 * 60 * 60, /* abbreviated */ false)).toBe('1 hour');
    });

    it('returns a duration in days if the duration is greater than or equal to 24 hours', () => {
      expect(getDurationString(15 * 24 * 60 * 60 * 1000)).toBe('15d');
      expect(getDurationString(15 * 24 * 60 * 60 * 1000, /* abbreviated */ false)).toBe('15 days');
    });

    it('exactly 1 day should return a singular day', () => {
      expect(getDurationString(1000 * 60 * 60 * 24, /* abbreviated */ false)).toBe('1 day');
    });
  });

  describe('getDurationStringPanelMode', () => {
    it(`returns -- if you try to get a duration for NaN milliseconds`, () => {
      expect(getDurationStringPanelMode(NaN)).toBe('--');
    });

    it(`returns 0s if you try to get a duration for 0 milliseconds`, () => {
      expect(getDurationStringPanelMode(0)).toBe('0s');
      expect(getDurationStringPanelMode(0, /* abbreviated */ false)).toBe('0 seconds');
    });

    it('returns a duration in seconds with one decimal point precision if the duration is less than 1 second', () => {
      expect(getDurationStringPanelMode(0.5 * 1000)).toBe('0.5s');
      expect(getDurationStringPanelMode(0.5 * 1000, /* abbreviated */ false)).toBe('0.5 seconds');
    });

    it('returns a duration in seconds if the duration is less than 60 seconds', () => {
      expect(getDurationStringPanelMode(15 * 1000)).toBe('15s');
      expect(getDurationStringPanelMode(15 * 1000, /* abbreviated */ false)).toBe('15 seconds');
    });

    it('exactly 1 second should return a singular second', () => {
      expect(getDurationStringPanelMode(1000, /* abbreviated */ false)).toBe('1 second');
    });

    it('returns a duration in minutes and seconds if the duration is less than 60 minutes', () => {
      expect(getDurationStringPanelMode(15.5 * 60 * 1000)).toBe('15m 30s');
      expect(getDurationStringPanelMode(15.5 * 60 * 1000, /* abbreviated */ false)).toBe('15 minutes 30 seconds');
    });

    it('returns a duration in hours and minutes if the duration is less than 24 hours', () => {
      expect(getDurationStringPanelMode(15.5 * 60 * 60 * 1000)).toBe('15h 30m');
      expect(getDurationStringPanelMode(15.5 * 60 * 60 * 1000, /* abbreviated */ false)).toBe('15 hours 30 minutes');
    });

    it('returns a duration in days and hours if the duration is greater than or equal to 24 hours', () => {
      expect(getDurationStringPanelMode(15.5 * 24 * 60 * 60 * 1000)).toBe('15d 12h');
      expect(getDurationStringPanelMode(15.5 * 24 * 60 * 60 * 1000, /* abbreviated */ false)).toBe('15 days 12 hours');
    });
  });

  for (const { expectedValue, hasRetries, status } of [
    { expectedValue: 'Aborted', hasRetries: false, status: Constants.STATUS.ABORTED },
    { expectedValue: 'Cancelled', hasRetries: false, status: Constants.STATUS.CANCELLED },
    { expectedValue: 'Failed', hasRetries: false, status: Constants.STATUS.FAILED },
    { expectedValue: 'Faulted', hasRetries: false, status: Constants.STATUS.FAULTED },
    { expectedValue: 'Ignored', hasRetries: false, status: Constants.STATUS.IGNORED },
    { expectedValue: 'Skipped', hasRetries: false, status: Constants.STATUS.SKIPPED },
    { expectedValue: 'Succeeded', hasRetries: false, status: Constants.STATUS.SUCCEEDED },
    { expectedValue: 'Succeeded with retries', hasRetries: true, status: Constants.STATUS.SUCCEEDED },
    { expectedValue: 'Timed Out', hasRetries: false, status: Constants.STATUS.TIMEDOUT },
    { expectedValue: 'Waiting', hasRetries: false, status: Constants.STATUS.WAITING },
  ]) {
    it(`should return '${expectedValue}' when status is '${status}' and hasRetries is ${hasRetries}`, () => {
      expect(getStatusString(status, hasRetries)).toBe(expectedValue);
    });
  }
});
