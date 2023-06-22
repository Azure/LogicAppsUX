import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes, isValidDictionary, showCollapsedValidation } from '../../editor/base/utils/helper';
import { serializeDictionary } from '../util/serializecollapeseddictionary';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft/utils-logic-apps';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';

export interface CollapsedDictionaryValidationProps {
  className?: string;
  isValid?: boolean;
  collapsedValue?: ValueSegment[];
  keyType?: string;
  valueType?: string;
  setIsValid: (b: boolean) => void;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedDictionaryValidation = ({
  className,
  isValid,
  keyType,
  valueType,
  setIsValid,
  setItems,
  collapsedValue,
  setCollapsedValue,
}: CollapsedDictionaryValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      let newValiditity = true;
      if (!editorString.trim().length || editorString === '{}') {
        setIsValid(newValiditity);
        setItems([{ key: [], value: [], id: guid() }]);
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        newValiditity = isValidDictionary(editorString);
        setIsValid(newValiditity);
        if (newValiditity) {
          serializeDictionary(editor, setItems, keyType, valueType);
          setCollapsedValue(serializeEditorState(editorState));
        } else {
          setCollapsedValue(serializeEditorState(editorState));
        }
      }
    });
  };

  return (
    <div
      className={css(
        className ?? 'msla-base-editor-validation',
        isValid || (collapsedValue && showCollapsedValidation(collapsedValue)) ? 'hidden' : undefined
      )}
    >
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
    </div>
  );
};
