import type { ArrayEditorItemProps } from '..';
import type { Segment } from '../../editor/base';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { serializeEditorState } from '../../editor/base/utils/serialize';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect } from 'react';

interface updateStateProps {
  item: Segment[];
  items: ArrayEditorItemProps[];
  index: number;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
}

export const EditorChange = ({ item, items, index, setItems }: updateStateProps) => {
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
  }, [editor, item, itemLength, items.length]);

  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    if (notEqual(item, newValue)) {
      const newItems = [...items];
      newItems[index] = { content: newValue };
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
