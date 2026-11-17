import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { convertTimezoneManifest } from '../../../../../designer-client-services/lib/base/manifests/datetime';
import { getFrequencyValues, getScheduleDayValues, getScheduleHourValues, getTimezoneValues } from '../recurrence';

const alberta = { value: 'Alberta Standard Time', displayName: '(UTC-06:00) Mountain Time (Alberta)' };

describe('time zone options', () => {
  it('includes Alberta and preserves existing recurrence time zones', () => {
    const options = getTimezoneValues(createIntl({ locale: 'en' }));

    expect(options.filter((option) => option.value === alberta.value)).toEqual([alberta]);
    expect(options).toContainEqual({ value: 'Mountain Standard Time', displayName: '(UTC-07:00) Mountain Time (US & Canada)' });
    expect(options).toContainEqual({ value: 'Canada Central Standard Time', displayName: '(UTC-06:00) Saskatchewan' });
  });

  it.each(['sourceTimeZone', 'destinationTimeZone'])('includes Alberta in the %s convert action options', (property) => {
    const input = convertTimezoneManifest.properties.inputs.properties[property];

    expect(input['x-ms-editor-options'].options.filter((option: { value: string }) => option.value === alberta.value)).toEqual([alberta]);
    expect(input['x-ms-editor-options'].options).toContainEqual({
      value: 'Mountain Standard Time',
      displayName: '(UTC-07:00) Mountain Time (US & Canada)',
    });
    expect(input['x-ms-editor']).toBe('combobox');
    expect(input.enum).toBeUndefined();
    expect(input.default).toBe('UTC');
  });
});

describe('recurrence schedule options', () => {
  const intl = createIntl({ locale: 'en' });

  it('preserves the supported recurrence frequencies', () => {
    expect(getFrequencyValues(intl).map(({ value }) => value)).toEqual(['Month', 'Week', 'Day', 'Hour', 'Minute', 'Second']);
  });

  it('offers every hour of the day in order', () => {
    expect(getScheduleHourValues(intl).map(({ value }) => value)).toEqual(Array.from({ length: 24 }, (_, hour) => String(hour)));
  });

  it('offers the days of the week in order', () => {
    expect(getScheduleDayValues(intl).map(({ value }) => value)).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
  });
});
