import type { ValueSegment } from '../../models/parameter';
import { serializeEditorState } from '../utils/editorToSegment';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

interface EditorChangePluginProps {
  setValue: (newVal: ValueSegment[]) => void;
}

export const EditorChangePlugin = ({ setValue }: EditorChangePluginProps) => {
  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    setValue(newValue);
  };
  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};
