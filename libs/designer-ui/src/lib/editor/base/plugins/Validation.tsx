import { $isTokenNode } from '../nodes/tokenNode';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, ElementNode } from 'lexical';
import { $isTextNode, $isElementNode, $getNodeByKey, $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';

export interface ValidationProps {
  type: 'ARRAY' | 'JSON';
  className?: string;
  tokensEnabled?: boolean;
  errorMessage: string;
  isValid?: boolean;
  setIsValid?: Dispatch<SetStateAction<boolean>>;
}

export const Validation = ({ className, isValid, type, tokensEnabled = true, errorMessage, setIsValid }: ValidationProps) => {
  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot(), tokensEnabled);
      if (type === 'ARRAY' && setIsValid) {
        setIsValid(validArray(editorString));
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

const validArray = (s: string): boolean => {
  return s.startsWith('[') && s.endsWith(']') && validateStrings(s.slice(1, s.length - 1));
};
const validateStrings = (s: string): boolean => {
  const splitStrings = s.split(',');
  for (let i = 0; i < splitStrings.length; i++) {
    const currentString = splitStrings[i].trim();
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
