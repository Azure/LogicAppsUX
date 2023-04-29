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
  } else if (isXml(value) || format === 'xml') {
    return <XmlValue {...props} />;
  } else if (isContentLink(value)) {
    return <BodyLinkValue {...props} />;
  } else if (typeof value === 'number') {
    return <NumberValue {...props} />;
  } else if (format === 'date-time') {
    return <DateTimeValue {...props} />;
  } else if (format === 'decimal') {
    return <DecimalValue {...props} />;
  } else if (format === 'html') {
    return <HtmlValue {...props} />;
  } else if (format === 'key-value-pairs') {
    return <KeyValuePairs {...props} />;
  } else {
    return <RawValue {...props} />;
  }
};
