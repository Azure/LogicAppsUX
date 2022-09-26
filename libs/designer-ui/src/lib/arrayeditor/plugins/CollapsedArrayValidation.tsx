import type { SimpleArrayItem, ComplexArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { showCollapsedValidation, getChildrenNodes, isValidArray } from '../../editor/base/utils/helper';
import { serializeSimpleArray, serializeComplexArray } from '../util/serializecollapsedarray';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import { useState } from 'react';

export interface CollapsedArrayValidationProps {
  className?: string;
  defaultErrorMessage: string;
  isValid: boolean;
  collapsedValue?: ValueSegment[];
  itemSchema?: string | string[];
  setIsValid: (b: boolean) => void;
  setItems: ((simpleItems: SimpleArrayItem[]) => void) | ((complexItems: ComplexArrayItem[]) => void);
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedArrayValidation = ({
  className,
  isValid,
  defaultErrorMessage,
  collapsedValue,
  itemSchema,
  setIsValid,
  setItems,
  setCollapsedValue,
}: CollapsedArrayValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();
  const [errorMessage, setErrorMessage] = useState('');

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      setErrorMessage('');
      let newValiditity = true;
      if (!editorString.trim().length || editorString === '[]') {
        setIsValid(newValiditity);
        setItems([]);
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        newValiditity = isValidArray(editorString, itemSchema, setErrorMessage);
        setIsValid(newValiditity);
        if (newValiditity) {
          if (Array.isArray(itemSchema)) {
            serializeComplexArray(editor, setItems as (simpleItems: ComplexArrayItem[]) => void);
          } else {
            serializeSimpleArray(editor, setItems as (simpleItems: SimpleArrayItem[]) => void);
          }
        } else {
          setCollapsedValue(serializeEditorState(editor.getEditorState()));
        }
      }
    });
  };

  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin onChange={onChange} />
      {isValid || (collapsedValue && showCollapsedValidation(collapsedValue)) ? null : errorMessage ? errorMessage : defaultErrorMessage}
    </div>
  );
};
