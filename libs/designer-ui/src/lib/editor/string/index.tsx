import { useState } from 'react';
import type { BaseEditorProps } from '../base';
import { BaseEditor } from '../base';
import type { ValueSegment } from '../models/parameter';
import { Value } from './stringPlugins/Change';
import SingleLine from './stringPlugins/SingleLine';

export interface StringEditorProps extends BaseEditorProps {
  singleLine?: boolean;
}

export const StringEditor = ({ placeholder, className, singleLine, initialValue }: StringEditorProps) => {
  const [value, setValue] = useState(initialValue as ValueSegment[]);
  const onValueChange = (newValue: ValueSegment[]): void => setValue(newValue);

  return (
    <BaseEditor
      placeholder={placeholder}
      className={className}
      initialValue={value as any}
      BasePlugins={{ tokens: true }}>
      {singleLine ? <SingleLine /> : null}
      <Value setValue={onValueChange} />
    </BaseEditor>
  );
};
