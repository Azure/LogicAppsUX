import type { BaseEditorProps } from '../base';
import { BaseEditor } from '../base';
import SingleLinePlugin from './stringPlugins/SingleLinePlugin';

export interface StringEditorProps extends BaseEditorProps {
  singleLine?: boolean;
}

export const StringEditor = ({ placeholder, className, singleLine }: StringEditorProps) => {
  return (
    <BaseEditor placeholder={placeholder} className={className}>
      {singleLine ? <SingleLinePlugin /> : null}
    </BaseEditor>
  );
};
