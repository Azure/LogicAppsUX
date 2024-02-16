import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegment';
import { notEqual } from '../../editor/base/utils/helper';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

interface ChangeProps {
  pickerDisplayValue: ValueSegment[];
  setEditorDisplayValue: (newVal: ValueSegment[]) => void;
  clearPickerInfo: () => void;
}

export const EditorValueChange = ({ pickerDisplayValue, setEditorDisplayValue, clearPickerInfo }: ChangeProps) => {
  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    if (notEqual(pickerDisplayValue, newValue)) {
      clearPickerInfo();
    }
    setEditorDisplayValue(newValue);
  };
  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};
