import type { DictionaryEditorItemProps } from '..';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setSelection, CLEAR_EDITOR_COMMAND } from 'lexical';
import { useEffect, useState } from 'react';

interface DeleteDictionaryItemProps {
  items: DictionaryEditorItemProps[];
  index: number;
  type: 'key' | 'value';
}

export const DeleteDictionaryItem = ({ items, index, type }: DeleteDictionaryItemProps) => {
  const [itemLength, setItemLength] = useState(0);
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (itemLength > items.length) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      editor.update(() => {
        if (type === 'key') {
          parseSegments(items[index].key, true);
        } else {
          parseSegments(items[index].value, true);
        }
        $setSelection(null);
      });
    }
    setItemLength(items.length);
  }, [editor, index, itemLength, items, type]);
  return null;
};
