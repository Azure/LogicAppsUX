import Constants from '../../constants';
import type { ValueProps } from './types';

export const RawValue: React.FC<ValueProps> = (props) => {
  const { displayName, value, visible = true } = props;
  if (!visible) {
    return null;
  }

  const valueAsString = (typeof value === 'string' ? value : JSON.stringify(value, null, 2)) || Constants.ZERO_WIDTH_SPACE;

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name">{displayName}</label>
      <div className="msla-trace-value-text" tabIndex={0}>
        {valueAsString}
      </div>
    </section>
  );
};
