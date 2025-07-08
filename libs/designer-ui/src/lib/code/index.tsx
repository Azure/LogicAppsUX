import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Icon } from '@fluentui/react';
import { Button, MessageBar, MessageBarActions, MessageBarBody } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { useFunctionalState } from '@react-hookz/web';
import { useCodeEditorStyles } from './codeeditor.styles';

import constants from '../constants';
import type { ValueSegment } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import TokenPickerButtonLegacy from '../editor/base/plugins/TokenPickerButtonLegacy';
import { createLiteralValueSegment, notEqual } from '../editor/base/utils/helper';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor } from '../editor/monaco';
import { useId } from '../useId';
import { buildInlineCodeTextFromToken, getCodeEditorHeight, getInitialValue } from './util';
import EditableFileName from './EditableFileName';
import { TokenPickerMode } from '../tokenpicker';
import { EditorLanguage, getFileExtensionName } from '@microsoft/logic-apps-shared';
import type { editor, IRange } from 'monaco-editor';

const customCodeIconStyle = {
  root: {
    fontSize: 20,
    padding: '8px',
    color: constants.PANEL_HIGHLIGHT_COLOR,
  },
};

export type FileNameChangeHandler = (originalFileName: string, newFileName: string) => void;

export interface CodeEditorProps extends BaseEditorProps {
  language: EditorLanguage;
  customCodeEditor?: boolean;
  originalFileName: string;
  onFileNameChange?: FileNameChangeHandler;
  hideTokenPicker?: boolean;
}

export function CodeEditor({
  readonly = false,
  initialValue,
  language,
  onChange,
  onFocus,
  getTokenPicker,
  label,
  originalFileName = '',
  customCodeEditor,
  onFileNameChange,
  hideTokenPicker,
}: CodeEditorProps): JSX.Element {
  const intl = useIntl();
  const styles = useCodeEditorStyles();
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const editorId = useId('msla-tokenpicker-callout-location');
  const callOutLabelId = useId('msla-tokenpicker-callout-label');

  const [getCurrentValue, setCurrentValue] = useFunctionalState(getInitialValue(initialValue));
  const [editorHeight, setEditorHeight] = useState(getCodeEditorHeight(getInitialValue(initialValue)));
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);
  const [showMessageBar, setShowMessageBar] = useState(true);
  const [getFileName, setFileName] = useFunctionalState(originalFileName);

  const isPythonEditor = useMemo(() => language === EditorLanguage.python, [language]);
  const fileExtensionName = getFileExtensionName(language);

  const handleFileNameChange = (fileName: string) => {
    setFileName(fileName);
    if (originalFileName !== fileName) {
      onFileNameChange?.(originalFileName, fileName);
      onChange?.({
        value: [createLiteralValueSegment(fileName)],
        viewModel: {
          customCodeData: {
            fileData: getCurrentValue(),
            fileExtension: fileExtensionName,
            fileName,
          },
        },
      });
    }
  };

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (e.value !== undefined) {
      setCurrentValue(e.value);
      setEditorHeight(getCodeEditorHeight(e.value));
    }
  };

  const handleBlur = (): void => {
    if (!getInTokenPicker()) {
      setShowTokenPickerButton(false);
    }

    const fileData = customCodeEditor ? getFileName() : getCurrentValue();
    const newValue = [createLiteralValueSegment(fileData)];

    if (notEqual(newValue, initialValue)) {
      const viewModel = customCodeEditor
        ? {
            customCodeData: {
              fileData: getCurrentValue(),
              fileExtension: fileExtensionName,
              fileName: getFileName(),
            },
          }
        : undefined;

      onChange?.({ value: newValue, ...(viewModel && { viewModel }) });
    }
  };

  const handleFocus = (): void => {
    setShowTokenPickerButton(true);
    setInTokenPicker(false);
    onFocus?.();
  };

  const handleShowTokenPicker = () => {
    setInTokenPicker(!getInTokenPicker());
  };

  const tokenClicked = (valueSegment: ValueSegment) => {
    if (codeEditorRef.current && valueSegment.token) {
      const newText = buildInlineCodeTextFromToken(valueSegment.token, language);

      codeEditorRef.current.executeEdits(null, [
        {
          range: codeEditorRef.current.getSelection() as IRange,
          text: newText,
        },
      ]);

      const selection = codeEditorRef.current.getSelection();
      if (selection) {
        setTimeout(() => {
          const { lineNumber, column } = selection.getEndPosition();
          codeEditorRef.current?.setSelection(selection.setStartPosition(lineNumber, column));
          codeEditorRef.current?.focus();
        }, 50);
      }
    }
  };

  const getLabel = (label?: string): string =>
    intl.formatMessage(
      {
        defaultMessage: `{label} To add dynamic data, press the Alt + '/' keys.`,
        id: 'IdOhPY',
        description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
      },
      { label }
    );

  const messageBarText = intl.formatMessage({
    defaultMessage: 'Add custom modules, uncover new scenarios, and find troubleshooting tips ',
    id: '8G9bj4',
    description: 'This is a message give link to user to find out more about this action',
  });

  const messageBarTextLink = intl.formatMessage({
    defaultMessage: 'here',
    id: 'yENrOg',
    description: 'This is the link text in the message bar',
  });

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'TjkOzp',
    description: 'This is the aria label for the close button in the message bar',
  });

  const showTokenPicker = (showTokenPickerButton || getInTokenPicker()) && !(isPythonEditor && hideTokenPicker);

  return (
    <div className={customCodeEditor ? styles.customCodeEditorBody : styles.codeEditorBody} id={editorId}>
      {customCodeEditor && (
        <div className={styles.customCodeEditorFile}>
          <Icon iconName="FileCode" styles={customCodeIconStyle} />
          <EditableFileName fileExtension={fileExtensionName} initialFileName={getFileName()} handleFileNameChange={handleFileNameChange} />
        </div>
      )}

      <MonacoEditor
        label={getLabel(label)}
        ref={codeEditorRef}
        height={editorHeight}
        value={getCurrentValue()}
        fontSize={13}
        readOnly={readonly}
        lineNumbers="on"
        language={language}
        overviewRulerBorder
        scrollBeyondLastLine={false}
        onContentChanged={handleContentChanged}
        onFocus={handleFocus}
        onBlur={handleBlur}
        openTokenPicker={handleShowTokenPicker}
      />

      {showTokenPicker && (
        <TokenPickerButtonLegacy
          labelId={callOutLabelId}
          showTokenPicker={getInTokenPicker()}
          setShowTokenPicker={handleShowTokenPicker}
          codeEditor={codeEditorRef.current}
          isAgentParameter={isPythonEditor}
        />
      )}

      {getInTokenPicker() &&
        getTokenPicker?.(editorId, callOutLabelId, isPythonEditor ? TokenPickerMode.AGENT_PARAMETER : undefined, undefined, tokenClicked)}

      {customCodeEditor && showMessageBar ? (
        <MessageBar intent="info" className={styles.customCodeEditorMessageBar} layout="multiline">
          <MessageBarBody>
            {messageBarText}
            <a href="https://aka.ms/logicapp-scripting" target="_blank" rel="noreferrer" style={{ display: 'inline' }}>
              {messageBarTextLink}
            </a>
          </MessageBarBody>
          <MessageBarActions
            containerAction={
              <Button
                aria-label={closeButtonAriaLabel}
                appearance="transparent"
                icon={<DismissRegular />}
                onClick={() => setShowMessageBar(false)}
              />
            }
          />
        </MessageBar>
      ) : null}
    </div>
  );
}
