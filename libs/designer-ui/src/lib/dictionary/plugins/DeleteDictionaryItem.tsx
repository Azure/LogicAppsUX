import type { DictionaryEditorItemProps } from '..';
import { parseSegments } from '../../editor/base/utils/parsesegments';
import { ExpandedDictionaryEditorType } from '../expandeddictionary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $setSelection, CLEAR_EDITOR_COMMAND } from 'lexical';
import { useEffect, useState } from 'react';

interface DeleteDictionaryItemProps {
  items: DictionaryEditorItemProps[];
  index: number;
  type: ExpandedDictionaryEditorType;
}

export const DeleteDictionaryItem = ({ items, index, type }: DeleteDictionaryItemProps) => {
  const [itemLength, setItemLength] = useState(0);
  const [editor] = useLexicalComposerContext();
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
  }, [editor, index, itemLength, items, type]);
  return null;
};
