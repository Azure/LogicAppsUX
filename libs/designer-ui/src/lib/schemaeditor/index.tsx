import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor as Editor, EditorLanguage } from '../editor/monaco';
import { ModalDialog } from '../modaldialog';
import { generateSchemaFromJsonString } from '../workflow/schema/generator';
import type { IDialogStyles, IStyle } from '@fluentui/react';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import { ActionButton } from '@fluentui/react/lib/Button';
import { FontSizes } from '@fluentui/theme';
import type { editor } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export interface SchemaEditorProps {
  disabled?: boolean;
  initialValue: ValueSegment[];
  label?: string;
  placeholder?: string; // TODO - Need to implement this.
  onChange?: ChangeHandler;
  onFocus?(): void;
}

const removeStyle: IStyle = {
  border: '0',
  color: 'rgb(0, 120, 212)',
  backgroundColor: 'transparent',
};
const buttonStyles: IButtonStyles = {
  label: {
    fontSize: FontSizes.medium,
  },
  root: removeStyle,
  rootHovered: removeStyle,
  rootPressed: removeStyle,
};

export function SchemaEditor({ disabled = false, label, initialValue, onChange, onFocus }: SchemaEditorProps): JSX.Element {
  const intl = useIntl();
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(formatValue(initialValue[0].value));
  const [samplePayload, setSamplePayload] = useState<string | undefined>('');
  const modalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [editorHeight, setEditorHeight] = useState('');

  useEffect(() => {
    setEditorHeight(getEditorHeight(currentValue));
  }, [currentValue]);

  const getStyles = (): Partial<IDialogStyles> => {
    return {
      main: {
        display: 'inline-block',
        width: '800px',
      },
    };
  };

  const schemaEditorLabel = intl.formatMessage({
    defaultMessage: 'Use sample payload to generate schema',
    description: 'Button Label for allowing users to generate from schema',
  });

  const DONE_TEXT = intl.formatMessage({
    defaultMessage: 'Done',
    description: 'confirmation text',
  });

  const SCHEMA_EDITOR_SAMPLE_PAYLOAD_DESCRIPTION = intl.formatMessage({
    defaultMessage: 'Enter or paste a sample JSON payload.',
    description: 'Modal Title text',
  });
  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    setErrorMessage('');
    if (onChange && e.value) {
      // TODO - Debounce
      onChange([{ id: 'key', type: ValueSegmentType.LITERAL, value: e.value }]);
    }
  };

  const handleFocus = (): void => {
    if (onFocus) {
      onFocus();
    }
  };

  const openModal = () => {
    setModalOpen(true);
    setSamplePayload('');
    setErrorMessage('');
  };

  const handleConfirm = () => {
    if (samplePayload) {
      try {
        const jsonSchema = generateSchemaFromJsonString(samplePayload);
        const stringifiedJsonSchema = JSON.stringify(jsonSchema, null, 4);
        setCurrentValue(formatValue(stringifiedJsonSchema));
      } catch (ex) {
        const error = intl.formatMessage({
          defaultMessage: 'Unable to generate schema',
          description: 'Error Message on generating schema based on payload',
        });
        setErrorMessage(error);
      }
    }
    setModalOpen(false);
  };

  const closeModal = () => {
    setErrorMessage('');
    setModalOpen(false);
  };
  const handleSamplePayloadChanged = (e: EditorContentChangedEventArgs): void => {
    setSamplePayload(e.value);
  };

  return (
    <div className="msla-schema-editor-body">
      {label ? <div className="msla-schema-editor-title">{label}</div> : null}
      <Editor
        height={editorHeight}
        value={currentValue}
        fontSize={13}
        readOnly={disabled}
        lineNumbers="off"
        language={EditorLanguage.json}
        onContentChanged={handleContentChanged}
        onFocus={handleFocus}
      />
      <div className="msla-schema-editor-operations">
        <ActionButton className="msla-schema-card-button" disabled={disabled} styles={buttonStyles} onClick={openModal}>
          {schemaEditorLabel}
        </ActionButton>
        <div className="msla-schema-editor-error-message">{errorMessage}</div>
      </div>
      <ModalDialog
        confirmText={DONE_TEXT}
        getStyles={getStyles}
        isOpen={modalOpen}
        title={SCHEMA_EDITOR_SAMPLE_PAYLOAD_DESCRIPTION}
        onConfirm={handleConfirm}
        onDismiss={closeModal}
      >
        <div className="msla-schema-editor-modal-body">
          <Editor
            ref={modalEditorRef}
            fontSize={13}
            language={EditorLanguage.json}
            onContentChanged={handleSamplePayloadChanged}
            defaultValue={''}
          />
        </div>
      </ModalDialog>
    </div>
  );
}

const formatValue = (input: string): string => {
  try {
    return JSON.stringify(JSON.parse(input), null, 4);
  } catch {
    return input;
  }
};

// Monaco should be at least 3 rows high (19*3 px) but no more than 20 rows high (19*20 px).
function getEditorHeight(input = ''): string {
  return Math.min(Math.max(input?.split('\n').length * 20, 57), 380) + 'px';
}
