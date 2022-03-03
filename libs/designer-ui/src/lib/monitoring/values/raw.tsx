import { useMemo } from 'react';
import { Colorizer, type Language } from '../../colorizer';
import Constants from '../../constants';
import type { ValueProps } from './types';

export const RawValue: React.FC<ValueProps> = ({ displayName, value, visible = true }) => {
  const { language, valueAsString } = useMemo(() => {
    const valueAsString = (typeof value === 'string' ? value : JSON.stringify(value, null, 2)) || Constants.ZERO_WIDTH_SPACE;
    const language: { language: Language } | undefined = typeof value === 'string' ? undefined : { language: 'json' };
    return {
      language,
      valueAsString,
    };
  }, [value]);

  if (!visible) {
    return null;
  }

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name">{displayName}</label>
      <div className="msla-colorizer-json-body">
        <Colorizer ariaLabel={displayName} code={valueAsString} {...language} />
      </div>
    </section>
  );
};
