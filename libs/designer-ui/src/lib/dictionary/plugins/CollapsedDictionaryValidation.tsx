import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { serializeDictionary } from '../util/serializecollapseddictionary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft/utils-logic-apps';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import { useEffect } from 'react';

export interface CollapsedDictionaryValidationProps {
  keyType?: string;
  valueType?: string;
  setIsValid: (b: boolean) => void;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedDictionaryValidation = ({
  keyType,
  valueType,
  setIsValid,
  setItems,
  setCollapsedValue,
}: CollapsedDictionaryValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.getEditorState().read(() => {
      const editorString = getChildrenNodes($getRoot());
      if (!editorString.trim().length || editorString === '{}') {
        setIsValid(true);
      } else {
        serializeDictionary(editor, setItems, setIsValid, keyType, valueType);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      if (!editorString.trim().length || editorString === '{}') {
        setIsValid(true);
        setItems([{ key: [], value: [], id: guid() }]);
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        serializeDictionary(editor, setItems, setIsValid, keyType, valueType);
        setCollapsedValue(serializeEditorState(editorState));
      }
    });
  };

  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};
