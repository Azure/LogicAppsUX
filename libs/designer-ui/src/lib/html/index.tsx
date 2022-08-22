import type { BaseEditorProps } from '../editor/base';
import { BaseEditor } from '../editor/base';

export const HTMLEditor = ({ placeholder, readonly, initialValue, GetTokenPicker }: BaseEditorProps): JSX.Element => {
  return (
    <BaseEditor
      className="msla-html-editor"
      readonly={readonly}
      placeholder={placeholder}
      BasePlugins={{ tokens: true, clearEditor: true, toolBar: true }}
      initialValue={initialValue}
      GetTokenPicker={GetTokenPicker}
    >
      {/* <Toolbar /> */}
    </BaseEditor>
  );
};
