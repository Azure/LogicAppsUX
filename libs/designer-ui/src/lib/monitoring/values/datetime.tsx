import { FormatDateOptions, useIntl } from 'react-intl';
import { RawValue } from './raw';
import type { ValueProps } from './types';

const options: FormatDateOptions = {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: 'numeric',
  month: 'numeric',
  second: 'numeric',
  timeZone: 'UTC',
  year: 'numeric',
};

export const DateTimeValue: React.FC<ValueProps> = (props) => {
  const { value } = props;
  const intl = useIntl();
  const valueAsString = intl.formatDate(value, options);

  return <RawValue {...props} value={valueAsString} />;
};
