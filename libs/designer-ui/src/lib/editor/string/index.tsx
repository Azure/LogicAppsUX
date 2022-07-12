import type { BaseEditorProps } from '../base';
import { BaseEditor } from '../base';
import SingleLine from './stringPlugins/SingleLine';

export interface StringEditorProps extends BaseEditorProps {
  singleLine?: boolean;
}

export const StringEditor = ({ placeholder, className, singleLine }: StringEditorProps) => {
  return (
    <BaseEditor placeholder={placeholder} className={className}>
      {singleLine ? <SingleLine /> : null}
    </BaseEditor>
  );
};
