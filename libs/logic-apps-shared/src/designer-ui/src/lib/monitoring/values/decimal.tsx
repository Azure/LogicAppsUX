import { useIntl } from 'react-intl';
import { RawValue } from './raw';
import type { ValueProps } from './types';

export const DecimalValue: React.FC<ValueProps> = (props) => {
  const intl = useIntl();
  const valueAsString = localizeDecimalNumber(props.value, intl.locale);

  return <RawValue {...props} value={valueAsString} />;
};

// Do not use intl.formatNumber. This works around the numeric precision limits of JavaScript.
function localizeDecimalNumber(value: any, locale: string): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  let formattedValue = String(value);

  const format = new Intl.NumberFormat(locale ?? navigator.language);
  const parts = format.formatToParts(-1.2);
  const minusSignPart = parts.find((part) => part.type === 'minusSign');
  if (minusSignPart) {
    formattedValue = formattedValue.replace('-', minusSignPart.value);
  }

  const decimalPart = parts.find((part) => part.type === 'decimal');
  if (decimalPart) {
    formattedValue = formattedValue.replace('.', decimalPart.value);
  }

  return formattedValue;
}
