import type { AuthenticationType, AuthProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegment';
import { getChildrenNodes, isTokenValueSegment } from '../../editor/base/utils/helper';
import { containsToken, serializeAuthentication, validateAuthentication } from '../util';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { isTemplateExpression } from '@microsoft/parsers-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface CollapsedAuthenticationValidationProps {
  className?: string;
  collapsedValue: ValueSegment[];
  toggleEnabled: boolean;
  setToggleEnabled: (b: boolean) => void;
  setCollapsedValue: (value: ValueSegment[]) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setOption: (s: AuthenticationType) => void;
  serializeValue: (value: ValueSegment[]) => void;
}

export const CollapsedAuthenticationSerialization = ({
  collapsedValue,
  className,
  toggleEnabled,
  setToggleEnabled,
  setCollapsedValue,
  setCurrentProps,
  setOption,
  serializeValue,
}: CollapsedAuthenticationValidationProps): JSX.Element => {
  const intl = useIntl();
  const [errorMessage, setErrorMessage] = useState('');
  const [editor] = useLexicalComposerContext();

  // useEffect(() => {
  //   try {
  //     editor.getEditorState().read(() => {
  //       const editorString = getChildrenNodes($getRoot());
  //       // const validationErrorMessage = validateAuthentication(editorString, setErrorMessage);
  //       // if (!validationErrorMessage) {
  //       //   setIsValid(true);
  //       // }
  //       const parsedObj = JSON.parse(editorString);
  //       setToggleEnabled(true);
  //     });
  //   } catch {
  //     setToggleEnabled(false);
  //   }
  // }, [editor, setToggleEnabled]);

  const showError = (errorMessage: string) => {
    setToggleEnabled(false);
    setErrorMessage(errorMessage);
  };

  const hideError = () => {
    setErrorMessage('');
  };

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot()).trim();
      try {
        if (editorString.trim().length === 0 || editorString.trim() === '{}') {
          setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
        } else {
          JSON.parse(editorString);
        }
        setToggleEnabled(true);
        hideError();
      } catch {
        console.log(editorString);
        if (isTemplateExpression(editorString)) {
          hideError();
        } else {
          showError(
            intl.formatMessage({
              defaultMessage: 'Invalid JSON',
              description: 'Error message for invalid JSON in authentication editor',
            })
          );
        }

        setToggleEnabled(false);
      }

      // JSON.parse(eidtorString);
      // if (!editorString.trim().length || editorString === '{}') {
      //   setIsValid(true);
      //   setCurrentProps({});
      //   setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      // } else {
      //   const validationErrorMessage = validateAuthentication(editorString, setErrorMessage);
      //   setIsValid(false);
      //   if (!validationErrorMessage) {
      //     setIsValid(true);
      //     serializeAuthentication(editor, setCurrentProps, setOption);
      //   } else {
      //     const newCollapsedValue = serializeEditorState(editorState);
      //     setCollapsedValue(newCollapsedValue);
      //     serializeValue(newCollapsedValue);
      //   }
      // }
    });
  };

  return (
    <div className={css(className ?? 'msla-base-editor-validation')}>
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      {errorMessage}
    </div>
  );
};
