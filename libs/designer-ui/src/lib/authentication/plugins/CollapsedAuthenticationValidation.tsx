import type { AuthProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes, isValidAuthentication, showCollapsedValidation } from '../../editor/base/utils/helper';
import { serializeAuthentication } from '../util';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

export interface CollapsedAuthenticationValidationProps {
  className?: string;
  collapsedValue: ValueSegment[];
  isValid: boolean;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setIsValid: (b: boolean) => void;
  setOption: (s: string) => void;
}

export const CollapsedAuthenticationValidation = ({
  collapsedValue,
  className,
  isValid,
  setCollapsedValue,
  setCurrentProps,
  setIsValid,
  setOption,
}: CollapsedAuthenticationValidationProps): JSX.Element => {
  const [errorMessage, setErrorMessage] = useState('');
  const [editor] = useLexicalComposerContext();
  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      let newErrorMessage = '';
      if (!editorString.trim().length || editorString === '{}') {
        setIsValid(newErrorMessage === '');
        setCurrentProps({});
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        newErrorMessage = isValidAuthentication(editorString);
        setErrorMessage(newErrorMessage);
        setIsValid(newErrorMessage === '');
        if (!newErrorMessage) {
          serializeAuthentication(editor, setCurrentProps, setOption);
        } else {
          setCollapsedValue(serializeEditorState(editorState));
        }
      }
    });
  };

  return (
    <div
      className={css(className ?? 'msla-base-editor-validation', isValid || showCollapsedValidation(collapsedValue) ? 'hidden' : undefined)}
    >
      <OnChangePlugin onChange={onChange} />
      {errorMessage}
    </div>
  );
};
