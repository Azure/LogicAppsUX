import { useIntl } from 'react-intl';
import { RawValue } from './raw';
import type { ValueProps } from './types';

export const NumberValue: React.FC<ValueProps> = (props) => {
  const intl = useIntl();
  const valueAsString = intl.formatNumber(props.value);

  return <RawValue {...props} value={valueAsString} />;
};
