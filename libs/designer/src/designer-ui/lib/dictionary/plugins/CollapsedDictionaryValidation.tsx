import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes, showCollapsedValidation } from '../../editor/base/utils/helper';
import { serializeDictionary } from '../util/serializecollapeseddictionary';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft/logic-apps-designer';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import { useEffect } from 'react';

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

  useEffect(() => {
    serializeDictionary(editor, setItems, setIsValid, keyType, valueType);
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
