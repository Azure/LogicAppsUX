import type { AuthenticationType, AuthProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes, isTokenValueSegment } from '../../editor/base/utils/helper';
import { serializeAuthentication, validateAuthentication } from '../util';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft/utils-logic-apps';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

export interface CollapsedAuthenticationValidationProps {
  className?: string;
  collapsedValue: ValueSegment[];
  isValid: boolean;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setIsValid: (b: boolean) => void;
  setOption: (s: AuthenticationType) => void;
  serializeValue: (value: ValueSegment[]) => void;
}

export const CollapsedAuthenticationValidation = ({
  collapsedValue,
  className,
  isValid,
  setCollapsedValue,
  setCurrentProps,
  setIsValid,
  setOption,
  serializeValue,
}: CollapsedAuthenticationValidationProps): JSX.Element => {
  const [errorMessage, setErrorMessage] = useState('');
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    try {
      editor.getEditorState().read(() => {
        const editorString = getChildrenNodes($getRoot());
        const validationErrorMessage = validateAuthentication(editorString, setErrorMessage);
        if (!validationErrorMessage) {
          setIsValid(true);
        }
      });
    } catch (e) {
      console.log(e);
      setIsValid(false);
    }
  }, [editor, setIsValid]);

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      if (!editorString.trim().length || editorString === '{}') {
        setIsValid(true);
        setCurrentProps({});
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        const validationErrorMessage = validateAuthentication(editorString, setErrorMessage);
        setIsValid(false);
        if (!validationErrorMessage) {
          setIsValid(true);
          serializeAuthentication(editor, setCurrentProps, setOption);
        } else {
          const newCollapsedValue = serializeEditorState(editorState);
          setCollapsedValue(newCollapsedValue);
          serializeValue(newCollapsedValue);
        }
      }
    });
  };

  return (
    <div className={css(className ?? 'msla-base-editor-validation', isValid || isTokenValueSegment(collapsedValue) ? 'hidden' : undefined)}>
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      {errorMessage}
    </div>
  );
};
