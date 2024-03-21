import constants from '../constants';
import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import TokenPickerButtonLegacy from '../editor/base/plugins/TokenPickerButtonLegacy';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor as Editor } from '../editor/monaco';
import { useId } from '../useId';
import { buildInlineCodeTextFromToken, getEditorHeight, getInitialValue } from './util';
import { Icon, MessageBar, MessageBarType } from '@fluentui/react';
import { getFileExtensionName, type EditorLanguage } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import type { editor, IRange } from 'monaco-editor';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const iconStyle = {
  root: {
    fontSize: 20,
    padding: '8px',
    color: constants.PANEL_HIGHLIGHT_COLOR,
  },
};
interface CustomCodeEditorProps extends BaseEditorProps {
  language: EditorLanguage;
  nodeTitle?: string;
}

export function CustomCodeEditor({
  readonly = false,
  initialValue,
  language,
  onChange,
  onFocus,
  getTokenPicker,
  label,
  nodeTitle,
}: CustomCodeEditorProps): JSX.Element {
  const intl = useIntl();
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const editorId = useId('msla-tokenpicker-callout-location');
  const callOutLabelId = useId('msla-tokenpicker-callout-label');
  const [getCurrentValue, setCurrentValue] = useFunctionalState(getInitialValue(initialValue));
  const [editorHeight, setEditorHeight] = useState(getEditorHeight(getInitialValue(initialValue)));
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);
  const [showMessageBar, setShowMessageBar] = useState(true);
  const [getFileName, setFileName] = useFunctionalState('');

  const fileExtensionName = useMemo(() => {
    return getFileExtensionName(language);
  }, [language]);

  useEffect(() => {
    setFileName(nodeTitle + fileExtensionName);
  }, [nodeTitle, fileExtensionName, setFileName]);

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (e.value !== undefined) {
      setCurrentValue(e.value);
      setEditorHeight(getEditorHeight(e.value));
    }
  };

  const handleBlur = (): void => {
    if (!getInTokenPicker()) {
      setShowTokenPickerButton(false);
    }
    onChange?.({
      value: [createLiteralValueSegment(getFileName())],
      viewModel: {
        customCodeData: { fileData: getCurrentValue(), fileExtension: getFileExtensionName(language), fileName: getFileName() },
      },
    });
  };

  const handleFocus = (): void => {
    setShowTokenPickerButton(true);
    setInTokenPicker(false);
    onFocus?.();
  };

  const handleShowTokenPicker = () => {
    setInTokenPicker(!getInTokenPicker());
  };

  const setIsInTokenpicker = (b: boolean) => {
    setInTokenPicker(b);
    if (!b) {
      codeEditorRef.current?.focus();
    }
  };

  const tokenClicked = (valueSegment: ValueSegment) => {
    if (codeEditorRef.current && valueSegment.token) {
      const newText = buildInlineCodeTextFromToken(valueSegment.token, language);
      codeEditorRef.current.executeEdits(null, [{ range: codeEditorRef.current.getSelection() as IRange, text: newText }]);
      const currSelection = codeEditorRef.current.getSelection();
      if (currSelection) {
        setTimeout(() => {
          const { lineNumber, column } = currSelection.getEndPosition();
          codeEditorRef.current?.setSelection(currSelection.setStartPosition(lineNumber, column));
          codeEditorRef.current?.focus();
        }, 50);
      }
    }
  };

  const getLabel = (label?: string): string => {
    return intl.formatMessage(
      {
        defaultMessage: "{label} To add dynamic data, press the Alt + '/' keys.",
        id: 'IdOhPY',
        description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
      },
      { label }
    );
  };

  const messageBarText = intl.formatMessage({
    defaultMessage: 'To use modules or dependecies, please add at Custom Code Dependenncies in Portal TOC',
    id: 'Mcvr0B',
    description: 'This is a message to inform the user to add dependencies to use this action',
  });

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'TjkOzp',
    description: 'This is the aria label for the close button in the message bar',
  });

  return (
    <div className="msla-custom-code-editor-body" id={editorId}>
      <div className="msla-custom-code-editor-file">
        <Icon iconName="FileCode" styles={iconStyle} />
        <div className="msla-custom-code-editor-fileName">{getFileName()}</div>
      </div>
      <Editor
        label={getLabel(label)}
        ref={codeEditorRef}
        height={editorHeight}
        value={getCurrentValue()}
        fontSize={13}
        readOnly={readonly}
        lineNumbers="on"
        language={language}
        overviewRulerBorder={true}
        scrollBeyondLastLine={false}
        onContentChanged={handleContentChanged}
        onFocus={handleFocus}
        onBlur={handleBlur}
        openTokenPicker={handleShowTokenPicker}
      />
      {showTokenPickerButton || getInTokenPicker() ? (
        <TokenPickerButtonLegacy
          labelId={callOutLabelId}
          showTokenPicker={getInTokenPicker()}
          setShowTokenPicker={handleShowTokenPicker}
          codeEditor={codeEditorRef.current}
        />
      ) : null}
      {getInTokenPicker()
        ? getTokenPicker?.(
            editorId,
            callOutLabelId,
            undefined /* TokenPickerMode: undefined uses legacy tokenpicker */,
            undefined /* Editortype: undefined defaults to parameter type */,
            setIsInTokenpicker,
            tokenClicked
          )
        : null}
      {showMessageBar ? (
        <MessageBar
          messageBarType={MessageBarType.info}
          className="msla-custom-code-editor-message-bar"
          dismissButtonAriaLabel={closeButtonAriaLabel}
          onDismiss={() => setShowMessageBar(false)}
        >
          <div>{messageBarText}</div>
        </MessageBar>
      ) : null}
    </div>
  );
}
