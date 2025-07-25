import { formatValue, getEditorHeight, getInitialValue } from '../code/util';
import type { ValueSegment } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment, notEqual } from '../editor/base/utils/helper';
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor } from '../editor/monaco';
import { ModalDialog } from '../modaldialog';
import { generateSchemaFromJsonString } from '../workflow/schema/generator';
import type { IDialogStyles, IStyle } from '@fluentui/react';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import { ActionButton } from '@fluentui/react/lib/Button';
import { FontSizes } from '@fluentui/theme';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { useFunctionalState } from '@react-hookz/web';
import type { editor } from 'monaco-editor';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSchemaEditorStyles } from './schemaeditor.styles';
import { mergeClasses } from '@fluentui/react-components';

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

export interface SchemaEditorProps {
  className?: string;
  initialValue: ValueSegment[];
  label?: string;
  readonly?: boolean;
  onChange?: ChangeHandler;
  onFocus?: () => void;
}

export function SchemaEditor({ className, readonly, label, initialValue, onChange, onFocus }: SchemaEditorProps): JSX.Element {
  const intl = useIntl();
  const styles = useSchemaEditorStyles();
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [getCurrentValue, setCurrentValue] = useFunctionalState(getInitialValue(initialValue));
  const [editorHeight, setEditorHeight] = useState(getEditorHeight(getInitialValue(initialValue)));
  const [samplePayload, setSamplePayload] = useState<string | undefined>('');
  const modalEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const getStyles = (): Partial<IDialogStyles> => {
    return {
      main: {
        display: 'inline-block',
        width: '800px',
        maxWidth: '90vw',
      },
    };
  };

  const schemaEditorLabel = intl.formatMessage({
    defaultMessage: 'Use sample payload to generate schema',
    id: 'DGMwU4',
    description: 'Button Label for allowing users to generate from schema',
  });

  const DONE_TEXT = intl.formatMessage({
    defaultMessage: 'Done',
    id: 'SvQyvs',
    description: 'confirmation text',
  });

  const SCHEMA_EDITOR_SAMPLE_PAYLOAD_DESCRIPTION = intl.formatMessage({
    defaultMessage: 'Enter or paste a sample JSON payload.',
    id: 'h1lQDa',
    description: 'Modal Title text',
  });
  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    setErrorMessage('');
    if (e.value !== undefined) {
      setCurrentValue(e.value);
      setEditorHeight(getEditorHeight(e.value));
    }
  };

  const handleBlur = (): void => {
    const newValue = [createLiteralValueSegment(getCurrentValue())];
    if (notEqual(newValue, initialValue)) {
      onChange?.({ value: [createLiteralValueSegment(getCurrentValue())] });
    }
  };

  const handleFocus = (): void => {
    onFocus?.();
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
        const stringifiedJsonSchema = formatValue(JSON.stringify(jsonSchema, null, 4));
        setCurrentValue(stringifiedJsonSchema);
        setEditorHeight(getEditorHeight(stringifiedJsonSchema));
        onChange?.({ value: [createLiteralValueSegment(stringifiedJsonSchema)] });
      } catch (_ex) {
        const error = intl.formatMessage({
          defaultMessage: 'Unable to generate schema',
          id: 'jgOaTX',
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
    <div className={mergeClasses(styles.schemaEditorBody, className)}>
      <MonacoEditor
        label={label}
        height={editorHeight}
        value={getCurrentValue()}
        fontSize={13}
        readOnly={readonly}
        lineNumbers="off"
        language={EditorLanguage.json}
        onContentChanged={handleContentChanged}
        onFocus={handleFocus}
        onBlur={handleBlur}
        contextMenu={true}
      />
      <div className={styles.schemaEditorOperations}>
        <ActionButton className={styles.schemaCardButton} disabled={readonly} styles={buttonStyles} onClick={openModal}>
          {schemaEditorLabel}
        </ActionButton>
        <div className={styles.schemaEditorErrorMessage}>{errorMessage}</div>
      </div>
      <ModalDialog
        confirmText={DONE_TEXT}
        getStyles={getStyles}
        isOpen={modalOpen}
        title={SCHEMA_EDITOR_SAMPLE_PAYLOAD_DESCRIPTION}
        onConfirm={handleConfirm}
        onDismiss={closeModal}
      >
        <div className={styles.schemaEditorModalBody}>
          <MonacoEditor
            ref={modalEditorRef}
            fontSize={13}
            language={EditorLanguage.json}
            onContentChanged={handleSamplePayloadChanged}
            defaultValue={''}
            height="60vh"
          />
        </div>
      </ModalDialog>
    </div>
  );
}
