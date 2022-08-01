import type { DictionaryEditorItemProps } from '..';
import type { Segment } from '../../editor/base';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

interface SerializeExpandedDictionaryProps {
  items: DictionaryEditorItemProps[];
  initialItem: Segment[];
  index: number;
  type: 'key' | 'value';
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const SerializeExpandedDictionary = ({ items, initialItem, index, type, setItems }: SerializeExpandedDictionaryProps) => {
  const [editor] = useLexicalComposerContext();

  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    if (notEqual(initialItem, newValue)) {
      const newItems = [...items];
      if (type === 'key') {
        newItems[index].key = newValue;
      } else {
        newItems[index].value = newValue;
      }
      setItems(newItems);
      editor.focus();
    }
  };
  return <OnChangePlugin onChange={onChange} />;
};

const notEqual = (a: Segment[], b: Segment[]): boolean => {
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].type !== b[i].type) {
      return true;
    }
    if (JSON.stringify(a[i], Object.keys(a[i]).sort()) !== JSON.stringify(b[i], Object.keys(b[i]).sort())) {
      return true;
    }
  }
  return false;
};
