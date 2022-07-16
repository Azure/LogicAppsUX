import type { Segment } from '../../editor/base';
import { serializeEditorState } from '../../editor/base/utils/serialize';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

interface CustomValueProps {
  setCustomVal: (newVal: Segment[] | null) => void;
}

export const CustomValue = ({ setCustomVal }: CustomValueProps) => {
  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    setCustomVal(newValue);
  };
  return <OnChangePlugin onChange={onChange} />;
};
