import type { ValueSegment } from '../editor';
import { serializeEditorState } from '../editor/base/utils/editorToSegement';
import { parseSegments } from '../editor/base/utils/parsesegments';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useEffect } from 'react';

interface ChangeProps {
  pickerDisplayValue: ValueSegment[];
  setEditorDisplayValue: (newVal: ValueSegment[]) => void;
}

export const PickerValueChange = ({ pickerDisplayValue, setEditorDisplayValue }: ChangeProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    editor.update(() => {
      parseSegments(pickerDisplayValue, true);
    });
    editor.focus();
  }, [editor, pickerDisplayValue]);

  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    setEditorDisplayValue(newValue);
  };
  return <OnChangePlugin onChange={onChange} />;
};
