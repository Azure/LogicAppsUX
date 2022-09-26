import type { ComplexArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useState, useEffect } from 'react';

interface updateStateProps {
  item: ValueSegment[];
  items: ComplexArrayItem[];
  index: number;
  innerIndex: number;
  setItems: (newItems: ComplexArrayItem[]) => void;
}

export const EditorChangeComplex = ({ item, items, index, innerIndex, setItems }: updateStateProps) => {
  const [editor] = useLexicalComposerContext();
  const [itemLength, setItemLength] = useState(items.length);
  useEffect(() => {
    if (itemLength !== items.length) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      editor.focus();
      editor.update(() => {
        parseSegments(item, true);
      });
      setItemLength(items.length);
    }
  }, [editor, innerIndex, item, itemLength, items.length]);

  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    if (notEqual(item, newValue)) {
      const newItems = [...items];
      newItems[index].value[innerIndex] = newValue;
      setItems(newItems);
      editor.focus();
    }
  };
  return <OnChangePlugin onChange={onChange} />;
};

const notEqual = (a: ValueSegment[], b: ValueSegment[]): boolean => {
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    const newA = { token: a[i].token, value: a[i].value };
    const newB = { token: b[i].token, value: b[i].value };
    if (a[i].type !== b[i].type) {
      return true;
    }
    if (JSON.stringify(newA, Object.keys(newA).sort()) !== JSON.stringify(b[i], Object.keys(newB).sort())) {
      return true;
    }
  }
  return false;
};
