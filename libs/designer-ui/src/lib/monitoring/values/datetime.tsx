import { useState } from 'react';
import { RawValue } from './raw';
import type { ValueProps } from './types';
import type { FormatDateOptions } from 'react-intl';
import { useIntl } from 'react-intl';

const options: FormatDateOptions = {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: 'numeric',
  month: 'numeric',
  second: 'numeric',
  year: 'numeric',
};

export const DateTimeValue: React.FC<ValueProps> = (props) => {
  const { value } = props;
  const [showUTC, toggleUTC] = useState(false);
  const intl = useIntl();
  const localTimeLabel = intl.formatMessage({
    defaultMessage: 'Local Time',
    id: 'ca7S+o',
    description: 'Text for local time',
  });
  const valueAsString = `${intl.formatDate(value, options)} (${localTimeLabel})`;
  const valueAsUTCString = `${intl.formatDate(value, { ...options, timeZone: 'UTC' })} (UTC)`;

  return <RawValue {...props} value={showUTC ? valueAsUTCString : valueAsString} utcProps={{ showUTC, toggleUTC }} />;
};
