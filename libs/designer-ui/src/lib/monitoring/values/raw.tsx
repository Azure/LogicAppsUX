import { useMemo } from 'react';
import Constants from '../../constants';
import CustomEditor, { EditorLanguage } from '../../editor';
import type { ValueProps } from './types';

export const RawValue: React.FC<ValueProps> = ({ displayName, value, visible = true }) => {
  const { height, language, valueAsString } = useMemo(() => {
    const valueAsString = (typeof value === 'string' ? value : JSON.stringify(value, null, 2)) || Constants.ZERO_WIDTH_SPACE;
    const language = typeof value === 'string' ? undefined : { language: EditorLanguage.json };
    const height = 19 * Math.min(valueAsString.split('\n').length, 10);
    return {
      height,
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
        <CustomEditor defaultValue={valueAsString} height={height} {...language} lineNumbers="off" minimapEnabled={false} readOnly={true} />
      </div>
    </section>
  );
};
