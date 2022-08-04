import type { DictionaryEditorItemProps } from '../../../dictionary';
import { serializeDictionary } from '../../../dictionary/util/serializecollapeseddictionary';
import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { CollapsedEditorType } from '../../shared/collapsedEditor';
import { serializeEditorState } from '../utils/editorToSegement';
import { getChildrenNodes, isValidDictionary, showCollapsedValidation } from '../utils/helper';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';

export interface ValidationProps {
  type: CollapsedEditorType;
  className?: string;
  tokensEnabled?: boolean;
  errorMessage: string;
  isValid?: boolean;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems?: (items: DictionaryEditorItemProps[]) => void;
  collapsedValue?: ValueSegment[];
  setCollapsedValue?: (val: ValueSegment[]) => void;
}

export const Validation = ({
  className,
  isValid,
  type,
  errorMessage,
  setIsValid,
  setItems,
  collapsedValue,
  setCollapsedValue,
}: ValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      let newValiditity = true;
      switch (type) {
        case CollapsedEditorType.COLLAPSED_ARRAY:
          if (!editorString.trim().length || editorString === '[]') {
            setIsValid?.(newValiditity);
          } else {
            setIsValid?.(isValidArray(editorString));
          }
          break;
        case CollapsedEditorType.DICTIONARY:
          if (!editorString.trim().length || editorString === '{}') {
            setIsValid?.(newValiditity);
            setCollapsedValue?.([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
          } else {
            newValiditity = isValidDictionary(editorString);
            setIsValid?.(newValiditity);
            if (setItems && newValiditity) {
              serializeDictionary(editor, setItems);
            } else {
              setCollapsedValue?.(serializeEditorState(editor.getEditorState()));
            }
          }
      }
    });
  };

  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin onChange={onChange} />
      {isValid || (collapsedValue && showCollapsedValidation(collapsedValue)) ? null : errorMessage}
    </div>
  );
};

const isValidArray = (s: string): boolean => {
  return s.startsWith('[') && s.endsWith(']') && validateArrayStrings(s.slice(1, s.length - 1));
};

const validateArrayStrings = (s: string): boolean => {
  const splitStrings = s.split(',');
  for (let i = 0; i < splitStrings.length; i++) {
    const currentString = splitStrings[i].trim();
    if (currentString === 'null') {
      continue;
    }
    if (
      !currentString.startsWith('"') ||
      !currentString.endsWith('"') ||
      currentString.length < 2 ||
      currentString.substring(1, currentString.length - 1).includes('"')
    ) {
      return false;
    }
  }
  return true;
};
