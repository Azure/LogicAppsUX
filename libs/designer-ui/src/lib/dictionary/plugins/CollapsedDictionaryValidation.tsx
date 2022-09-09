import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes, isValidDictionary, showCollapsedValidation } from '../../editor/base/utils/helper';
import { serializeDictionary } from '../util/serializecollapeseddictionary';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';

export interface CollapsedDictionaryValidationProps {
  className?: string;
  tokensEnabled?: boolean;
  errorMessage: string;
  isValid?: boolean;
  collapsedValue?: ValueSegment[];
  setIsValid: (b: boolean) => void;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedDictionaryValidation = ({
  className,
  isValid,
  errorMessage,
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
        setItems([{ key: [], value: [] }]);
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        newValiditity = isValidDictionary(editorString);
        setIsValid(newValiditity);
        if (newValiditity) {
          serializeDictionary(editor, setItems);
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
      <OnChangePlugin onChange={onChange} />
      {errorMessage}
    </div>
  );
};
