import { serializeEditorState } from '../../base/utils/editorToSegement';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import type { ValueSegment } from '../../models/parameter';

interface ValueProps {
  setValue: (newVal: ValueSegment[]) => void;
}

export const Value = ({ setValue }: ValueProps) => {
  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    setValue(newValue as any);
  };
  return <OnChangePlugin onChange={onChange} />;
};
