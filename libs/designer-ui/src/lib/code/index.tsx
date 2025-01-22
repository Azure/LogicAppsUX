import constants from '../constants';
import type { ValueSegment } from '../editor';
import type { BaseEditorProps, FileNameChangeHandler } from '../editor/base';
import TokenPickerButtonLegacy from '../editor/base/plugins/TokenPickerButtonLegacy';
import { createLiteralValueSegment, notEqual } from '../editor/base/utils/helper';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor } from '../editor/monaco';
import { useId } from '../useId';
import { buildInlineCodeTextFromToken, getCodeEditorHeight, getInitialValue } from './util';
import { Icon } from '@fluentui/react';
import type { EditorLanguage } from '@microsoft/logic-apps-shared';
import { getFileExtensionName } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import type { editor, IRange } from 'monaco-editor';
import { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, MessageBar, MessageBarActions, MessageBarBody } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import EditableFileName from './EditableFileName';

const customCodeIconStyle = {
  root: {
    fontSize: 20,
    padding: '8px',
    color: constants.PANEL_HIGHLIGHT_COLOR,
  },
};

export interface CodeEditorProps extends BaseEditorProps {
  language: EditorLanguage;
  customCodeEditor?: boolean;
  originalFileName: string;
  onFileNameChange?: FileNameChangeHandler;
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
}: CodeEditorProps): JSX.Element {
  console.log(initialValue);
  const intl = useIntl();
  const codeEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const editorId = useId('msla-tokenpicker-callout-location');
  const callOutLabelId = useId('msla-tokenpicker-callout-label');
  const [getCurrentValue, setCurrentValue] = useFunctionalState(getInitialValue(initialValue));
  const [editorHeight, setEditorHeight] = useState(getCodeEditorHeight(getInitialValue(initialValue)));
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);
  const [showMessageBar, setShowMessageBar] = useState(true);
  const [getFileName, setFileName] = useFunctionalState(originalFileName);

  const handleFileNameChange = (fileName: string) => {
    setFileName(fileName);
    if (originalFileName !== fileName) {
      onFileNameChange?.(originalFileName, fileName);
      onChange?.({
        value: [createLiteralValueSegment(fileName)],
        viewModel: {
          customCodeData: {
            fileData: getCurrentValue(),
            fileExtension: getFileExtensionName(language),
            fileName,
          },
        },
      });
    }
  };

  const fileExtensionName = useMemo(() => {
    return getFileExtensionName(language);
  }, [language]);

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
    if (customCodeEditor) {
      const newValue = [createLiteralValueSegment(getFileName())];
      if (notEqual(newValue, initialValue)) {
        onChange?.({
          value: newValue,
          viewModel: {
            customCodeData: {
              fileData: getCurrentValue(),
              fileExtension: getFileExtensionName(language),
              fileName: getFileName(),
            },
          },
        });
      }
    } else {
      const newValue = [createLiteralValueSegment(getCurrentValue())];
      if (notEqual(newValue, initialValue)) {
        onChange?.({ value: newValue });
      }
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
        defaultMessage: `{label} To add dynamic data, press the Alt + '/' keys.`,
        id: 'IdOhPY',
        description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
      },
      { label }
    );
  };

  const messageBarText = intl.formatMessage({
    defaultMessage: 'Add custom modules, uncover new scenarios, and find troubleshooting tips',
    id: 'QBK72a',
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

  return (
    <div className={customCodeEditor ? 'msla-custom-code-editor-body' : 'msla-code-editor-body'} id={editorId}>
      {customCodeEditor ? (
        <div className="msla-custom-code-editor-file">
          <Icon iconName="FileCode" styles={customCodeIconStyle} />
          <EditableFileName fileExtension={fileExtensionName} initialFileName={getFileName()} handleFileNameChange={handleFileNameChange} />
        </div>
      ) : null}
      <MonacoEditor
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
            tokenClicked
          )
        : null}
      {customCodeEditor && showMessageBar ? (
        <MessageBar intent={'info'} className="msla-custom-code-editor-message-bar" layout="multiline">
          <MessageBarBody>
            {messageBarText}{' '}
            <a href={'https://aka.ms/logicapp-scripting'} target="_blank" rel="noreferrer" style={{ display: 'inline' }}>
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
