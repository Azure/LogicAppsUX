import type { SimpleArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { notEqual } from '../../editor/base/utils/helper';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useState, useEffect } from 'react';

interface updateStateProps {
  item: ValueSegment[];
  items: SimpleArrayItem[];
  index: number;
  setItems: (newItems: SimpleArrayItem[]) => void;
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
      newItems[index].value = newValue;
      setItems(newItems);
      editor.focus();
    }
  };
  return <OnChangePlugin onChange={onChange} />;
};
