import type { AuthProps } from '.';
import { AuthenticationType } from '.';
import type { ValueSegment } from '../editor';
import type { GetTokenPickerHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import type { TokenPickerButtonEditorProps } from '../editor/base/plugins/tokenpickerbutton';
import { serializeEditorState } from '../editor/base/utils/editorToSegment';
import { getChildrenNodes, isTokenValueSegment } from '../editor/base/utils/helper';
import { serializeAuthentication, validateAuthenticationString } from './util';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $getRoot, type EditorState } from 'lexical';
import { type Dispatch, type SetStateAction } from 'react';
import { useIntl } from 'react-intl';

interface CollapsedAuthenticationProps {
  collapsedValue: ValueSegment[];
  setErrorMessage: (s: string) => void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setOption: (s: AuthenticationType) => void;
  serializeValue: (value: ValueSegment[]) => void;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
}

export const CollapsedAuthentication = ({
  collapsedValue,
  setCurrentProps,
  setOption,
  serializeValue,
  setErrorMessage,
  ...props
}: CollapsedAuthenticationProps): JSX.Element => {
  const intl = useIntl();

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const nodeMap = new Map<string, ValueSegment>();
      const editorString = getChildrenNodes($getRoot(), nodeMap).trim();
      const newCollapsedValue = serializeEditorState(editorState);
      try {
        // no collapsed value, update current Props to be empty
        if (editorString.trim().length === 0 || editorString.trim() === '{}') {
          setErrorMessage('');
          setCurrentProps({});
          setOption(AuthenticationType.NONE);
        } else {
          const validationErrorMessage = validateAuthenticationString(editorString);
          if (validationErrorMessage) {
            setErrorMessage(validationErrorMessage);
          } else if (serializeAuthentication(editorString, setCurrentProps, setOption, nodeMap)) {
            setErrorMessage('');
          } else {
            setErrorMessage(
              intl.formatMessage({
                defaultMessage: 'Invalid Authentication Value',
                id: 'OBO/HE',
                description: 'Error message for invalid Auth in authentication editor',
              })
            );
          }
        }
      } catch (e) {
        // if it is a template expression, we'll assume that it is valid
        if (isTokenValueSegment(newCollapsedValue)) {
          setErrorMessage('');
          serializeValue(newCollapsedValue);
        } else {
          setErrorMessage(
            intl.formatMessage({
              defaultMessage: 'Enter a valid JSON.',
              id: 'mNaBPE',
              description: 'Error message for invalid JSON in authentication editor',
            })
          );
        }
      }
    });
  };
  return (
    <div className="msla-authentication-editor-collapsed-container">
      <EditorWrapper {...props} initialValue={collapsedValue} basePlugins={{ tabbable: true }}>
        <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      </EditorWrapper>
    </div>
  );
};
