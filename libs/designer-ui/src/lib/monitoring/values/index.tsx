import { BodyLinkValue } from './bodylink';
import { DateTimeValue } from './datetime';
import { DecimalValue } from './decimal';
import { HtmlValue } from './html';
import { KeyValuePairs } from './keyvaluepairs';
import { NumberValue } from './number';
import { RawValue } from './raw';
import type { ValueProps } from './types';
import { isContentLink, isXml } from './utils';
import { XmlValue } from './xml';

export const Value: React.FC<ValueProps> = (props) => {
  const { format, value, visible = true } = props;

  if (!visible) {
    return null;
  }
  if (isXml(value) || format === 'xml') {
    return <XmlValue {...props} />;
  }
  if (isContentLink(value)) {
    return <BodyLinkValue {...props} />;
  }
  if (typeof value === 'number') {
    return <NumberValue {...props} />;
  }
  if (format === 'date-time') {
    return <DateTimeValue {...props} />;
  }
  if (format === 'decimal') {
    return <DecimalValue {...props} />;
  }
  if (format === 'html') {
    return <HtmlValue {...props} />;
  }
  if (format === 'key-value-pairs') {
    return <KeyValuePairs {...props} />;
  }
  return <RawValue {...props} />;
};
