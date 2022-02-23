import { Colorizer } from '../../colorizer';
import Constants from '../../constants';
import { RawValue } from './raw';
import type { ValueProps } from './types';
import { isXml } from './utils';

export const XmlValue: React.FC<ValueProps> = (props) => {
  const { displayName, value, visible = true } = props;
  if (!visible) {
    return null;
  }

  let valueAsString: string;
  if (isXml(value)) {
    try {
      valueAsString = encoded_atob(value.$content) || Constants.ZERO_WIDTH_SPACE;
    } catch {
      return <RawValue {...props} />;
    }
  } else {
    valueAsString = String(value) || Constants.ZERO_WIDTH_SPACE;
  }

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name">{displayName}</label>
      <div className="msla-colorizer-json-body">
        <Colorizer code={valueAsString} />
      </div>
    </section>
  );
};

function encoded_atob(value: string): string {
  return decodeURIComponent(escape(removeByteOrderMark(atob(value))));
}

// https://en.wikipedia.org/wiki/Byte_order_mark#UTF-8
function removeByteOrderMark(value: string): string {
  return value.replace(/^\u00ef\u00bb\u00bf/, '');
}
