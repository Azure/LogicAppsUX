import type { ValueSegment } from '../../editor';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useUpdateEffect } from '@react-hookz/web';
import { CLEAR_EDITOR_COMMAND } from 'lexical';

interface ChangeProps {
  pickerDisplayValue: ValueSegment[];
}

export const UpdateEditorFromFilePicker = ({ pickerDisplayValue }: ChangeProps) => {
  const [editor] = useLexicalComposerContext();

  useUpdateEffect(() => {
    if (pickerDisplayValue.length > 0) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      editor.update(() => {
        parseSegments(pickerDisplayValue, { tokensEnabled: true, readonly: false });
      });
    }
  }, [editor, pickerDisplayValue]);
  return null;
};
