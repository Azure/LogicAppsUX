import type { IntlShape } from 'react-intl';

export const TimeUnit = {
  Milliseconds: 'Milliseconds',
  Seconds: 'Seconds',
  Minutes: 'Minutes',
  Hours: 'Hours',
  Days: 'Days',
};

export const toFriendlyDurationString = (start: Date, end: Date, intl: IntlShape): string => {
  const round = (num: number, places: number): number => {
    const multiplier = 10 ** places;
    return Math.round(num * multiplier) / multiplier;
  };

  const totalMilliseconds = getDuration(start, end, TimeUnit.Milliseconds);
  const totalSeconds = getDuration(start, end, TimeUnit.Seconds);
  const totalMinutes = getDuration(start, end, TimeUnit.Minutes);
  const totalHours = getDuration(start, end, TimeUnit.Hours);
  const totalDays = getDuration(start, end, TimeUnit.Days);

  // Find the first duration that has at least 1 unit, starting with days
  if (totalDays >= 1) {
    const count = round(totalDays, 2);

    const durationDay = intl.formatMessage(
      {
        defaultMessage: '{count} Day',
        description: 'Day',
        id: 'ms6605397ae4d0',
      },
      { count }
    );

    const durationDays = intl.formatMessage(
      {
        defaultMessage: '{count} Days',
        description: 'Days',
        id: 'msa0100bd85395',
      },
      { count }
    );

    return count === 1 ? durationDay : durationDays;
  }

  if (totalHours >= 1) {
    const count = round(totalHours, 2);

    const durationHour = intl.formatMessage(
      {
        defaultMessage: '{count} Hour',
        description: 'Hour',
        id: 'msc0083dfb3892',
      },
      { count }
    );

    const durationHours = intl.formatMessage(
      {
        defaultMessage: '{count} Hours',
        description: 'Hours',
        id: 'msb0941e7ba8ea',
      },
      { count }
    );

    return count === 1 ? durationHour : durationHours;
  }

  if (totalMinutes >= 1) {
    const count = round(totalMinutes, 2);

    const durationMinute = intl.formatMessage(
      {
        defaultMessage: '{count} Minute',
        description: 'Minute',
        id: 'msc5f5d41b3e5d',
      },
      { count }
    );

    const durationMinutes = intl.formatMessage(
      {
        defaultMessage: '{count} Minutes',
        description: 'Minutes',
        id: 'ms99a3f52bf085',
      },
      { count }
    );

    return count === 1 ? durationMinute : durationMinutes;
  }

  if (totalSeconds >= 1) {
    const count = round(totalSeconds, 2);

    const durationSecond = intl.formatMessage(
      {
        defaultMessage: '{count} Second',
        description: 'Second',
        id: 'ms00c31f6ed06c',
      },
      { count }
    );

    const durationSeconds = intl.formatMessage(
      {
        defaultMessage: '{count} Seconds',
        description: 'Seconds',
        id: 'ms7edf011fc7ee',
      },
      { count }
    );

    return count === 1 ? durationSecond : durationSeconds;
  }

  const count = round(totalMilliseconds, 2);

  const durationMillisecond = intl.formatMessage(
    {
      defaultMessage: '{count} Millisecond',
      description: 'Millisecond',
      id: 'msa20e49380eae',
    },
    { count }
  );

  const durationMilliseconds = intl.formatMessage(
    {
      defaultMessage: '{count} Milliseconds',
      description: 'Milliseconds',
      id: 'ms85eb033ec0c7',
    },
    { count }
  );

  return count === 1 ? durationMillisecond : durationMilliseconds;
};

export const getDuration = (start: Date, end: Date, unit: string): number => {
  const totalMilliseconds = end.getTime() - start.getTime();

  switch (unit) {
    case TimeUnit.Milliseconds:
      return totalMilliseconds;
    case TimeUnit.Seconds:
      return totalMilliseconds / 1000;
    case TimeUnit.Minutes:
      return totalMilliseconds / 1000 / 60;
    case TimeUnit.Hours:
      return totalMilliseconds / 1000 / 60 / 60;
    case TimeUnit.Days:
      return totalMilliseconds / 1000 / 60 / 60 / 24;
    default:
      throw new Error('unit');
  }
};
