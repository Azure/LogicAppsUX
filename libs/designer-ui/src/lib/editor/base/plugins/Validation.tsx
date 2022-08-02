import type { DictionaryEditorItemProps } from '../../../dictionary';
import { serializeDictionary } from '../../../dictionary/util/serializecollapeseddictionary';
import { CollapsedEditorType } from '../../shared/collapsedEditor';
import { $isTokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, ElementNode } from 'lexical';
import { $isTextNode, $isElementNode, $getNodeByKey, $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';

export interface ValidationProps {
  type: CollapsedEditorType;
  className?: string;
  tokensEnabled?: boolean;
  errorMessage: string;
  isValid?: boolean;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
  setItems?: (items: DictionaryEditorItemProps[]) => void;
}

export const Validation = ({
  className,
  isValid,
  type,
  tokensEnabled = true,
  errorMessage,
  setIsValid,
  setItems,
}: ValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();
  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot(), tokensEnabled);
      if (setIsValid) {
        let newValiditity = true;
        switch (type) {
          case CollapsedEditorType.COLLAPSED_ARRAY:
            if (!editorString.trim().length || editorString === '[]') {
              setIsValid(newValiditity);
            } else {
              setIsValid(isValidArray(editorString));
            }
            break;
          case CollapsedEditorType.DICTIONARY:
            if (!editorString.trim().length || editorString === '{}') {
              setIsValid(newValiditity);
            } else {
              newValiditity = isValidDictionary(editorString);
              setIsValid(newValiditity);
              if (newValiditity && setItems) {
                serializeDictionary(editor, setItems);
              }
            }
        }
      }
    });
  };
  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin onChange={onChange} />
      {isValid ? null : errorMessage}
    </div>
  );
};

const getChildrenNodes = (node: ElementNode, tokensEnabled: boolean): string => {
  let text = '';
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      return (text += getChildrenNodes(childNode, tokensEnabled));
    }
    if ($isTextNode(childNode)) {
      text += childNode.__text.trim();
    } else if (tokensEnabled && $isTokenNode(childNode)) {
      text += childNode.__title;
    }
    return text;
  });
  return text;
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

const isValidDictionary = (s: string): boolean => {
  return s.startsWith('{') && s.endsWith('}') && validateDictionaryStrings(s);
};
const validateDictionaryStrings = (s: string): boolean => {
  try {
    JSON.parse(s);
  } catch (e) {
    return false;
  }
  return true;
};
