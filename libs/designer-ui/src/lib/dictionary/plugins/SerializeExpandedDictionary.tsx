import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { ExpandedDictionaryEditorType } from '../expandeddictionary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $setSelection, CLEAR_EDITOR_COMMAND, type EditorState } from 'lexical';
import { useEffect, useState } from 'react';

interface SerializeExpandedDictionaryProps {
  items: DictionaryEditorItemProps[];
  initialItem: ValueSegment[];
  index: number;
  type: ExpandedDictionaryEditorType;
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const SerializeExpandedDictionary = ({ items, initialItem, index, type, setItems }: SerializeExpandedDictionaryProps) => {
  const [editor] = useLexicalComposerContext();
  const [isDelete, setIsDelete] = useState(false);
  const [itemLength, setItemLength] = useState(0);

  useEffect(() => {
    if (itemLength > items.length) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      editor.update(() => {
        if (type === ExpandedDictionaryEditorType.KEY) {
          parseSegments(items[index].key, true);
        } else {
          parseSegments(items[index].value, true);
        }
        $setSelection(null);
      });
    }
    setItemLength(items.length);
    setIsDelete(true);
  }, [editor, index, itemLength, items, type]);

  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    if (notEqual(initialItem, newValue)) {
      const newItems = JSON.parse(JSON.stringify(items));

      if (type === ExpandedDictionaryEditorType.KEY) {
        newItems[index].key = newValue;
      } else {
        newItems[index].value = newValue;
      }
      if (!isDelete) {
        setItems(newItems);
      } else {
        setIsDelete(false);
      }
      editor.focus();
    }
  };
  return <OnChangePlugin onChange={onChange} />;
};

export const notEqual = (a: ValueSegment[], b: ValueSegment[]): boolean => {
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    const newA = { token: a[i].token, value: a[i].value };
    const newB = { token: b[i].token, value: b[i].value };
    if (a[i].type !== b[i].type) {
      return true;
    }
    if (JSON.stringify(newA, Object.keys(newA)) !== JSON.stringify(newB, Object.keys(newB))) {
      return true;
    }
  }
  return false;
};
