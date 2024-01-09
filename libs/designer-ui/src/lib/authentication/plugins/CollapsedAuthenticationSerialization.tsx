import type { AuthProps } from '..';
import { AuthenticationType } from '..';
import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { serializeAuthentication, validateAuthenticationString } from '../util';
import { css } from '@fluentui/react';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { isTemplateExpression } from '@microsoft/parsers-logic-apps';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface CollapsedAuthenticationValidationProps {
  className?: string;
  setToggleEnabled: (b: boolean) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  setOption: (s: AuthenticationType) => void;
  serializeValue: (value: ValueSegment[]) => void;
}

export const CollapsedAuthenticationSerialization = ({
  className,
  setToggleEnabled,
  setCurrentProps,
  setOption,
  serializeValue,
}: CollapsedAuthenticationValidationProps): JSX.Element => {
  const intl = useIntl();
  const [errorMessage, setErrorMessage] = useState('');

  const showError = (errorMessage: string) => {
    setToggleEnabled(false);
    setErrorMessage(errorMessage);
  };

  const resetAuthentication = () => {
    setErrorMessage('');
    setCurrentProps({});
  };

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot()).trim();
      const newCollapsedValue = serializeEditorState(editorState);
      serializeValue(newCollapsedValue);
      try {
        // no collapsed value, update current Props to be empty
        if (editorString.trim().length === 0 || editorString.trim() === '{}') {
          resetAuthentication();
          setOption(AuthenticationType.NONE);
          setToggleEnabled(true);
        } else {
          const validationErrorMessage = validateAuthenticationString(editorString);
          if (validationErrorMessage) {
            setToggleEnabled(false);
            showError(validationErrorMessage);
          } else {
            serializeAuthentication(editorString, setCurrentProps, setOption);
            setToggleEnabled(true);
            setErrorMessage('');
          }
        }
      } catch {
        // if it is a template expression, we'll assume that it is valid
        if (isTemplateExpression(editorString)) {
          resetAuthentication();
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
    });
  };

  return (
    <div className={css(className ?? 'msla-base-editor-validation')}>
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      {errorMessage}
    </div>
  );
};
