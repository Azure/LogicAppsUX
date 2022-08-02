import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

interface CustomValueProps {
  setCustomVal: (newVal: ValueSegment[] | null) => void;
}

export const CustomValue = ({ setCustomVal }: CustomValueProps) => {
  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    setCustomVal(newValue);
  };
  return <OnChangePlugin onChange={onChange} />;
};
