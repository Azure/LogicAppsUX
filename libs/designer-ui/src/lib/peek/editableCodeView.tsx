import { MonacoEditor } from '../editor/monaco';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { Button, Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { usePeekStyles } from './styles';

const useEditableCodeViewStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: '8px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  spacer: {
    flexGrow: 1,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
  },
  editorWrapper: {
    flexGrow: 1,
    minHeight: 0,
  },
});

export interface EditableCodeViewProps {
  /** The current text shown in the editor (controlled). */
  value: string;
  /** Called on every edit with the new editor contents. */
  onChange: (value: string) => void;
  /** Called when the user clicks Save. */
  onSave: () => void;
  /** Called when the user clicks Discard. */
  onDiscard: () => void;
  /** Whether the editor contents differ from the last applied value. */
  isDirty?: boolean;
  /** Whether a save is currently in progress. */
  isSaving?: boolean;
  /** Validation/error message to surface above the editor. */
  errorMessage?: string;
  /** Whether editing is disabled (renders a read-only editor). */
  readOnly?: boolean;
  labels: {
    save: string;
    saving: string;
    discard: string;
  };
}

export function EditableCodeView({
  value,
  onChange,
  onSave,
  onDiscard,
  isDirty = false,
  isSaving = false,
  errorMessage,
  readOnly = false,
  labels,
}: EditableCodeViewProps): JSX.Element {
  const peekStyles = usePeekStyles();
  const styles = useEditableCodeViewStyles();

  const hasError = !!errorMessage;
  const saveDisabled = readOnly || !isDirty || isSaving || hasError;
  const discardDisabled = readOnly || !isDirty || isSaving;

  return (
    <div className={styles.container} data-automation-id="msla-editable-code-view">
      <div className={styles.toolbar}>
        {errorMessage ? (
          <Text size={200} className={styles.error} role="alert" data-automation-id="msla-editable-code-view-error">
            {errorMessage}
          </Text>
        ) : null}
        <div className={styles.spacer} />
        {isSaving ? <Spinner size="tiny" label={labels.saving} labelPosition="after" /> : null}
        <Button size="small" appearance="secondary" onClick={onDiscard} disabled={discardDisabled}>
          {labels.discard}
        </Button>
        <Button
          size="small"
          appearance="primary"
          onClick={onSave}
          disabled={saveDisabled}
          data-automation-id="msla-editable-code-view-save"
        >
          {labels.save}
        </Button>
      </div>
      <div className={`msla-card-inner-body ${peekStyles.root} ${styles.editorWrapper}`}>
        <MonacoEditor
          className={'msla-monaco-peek'}
          value={value}
          onContentChanged={(e) => onChange(e.value ?? '')}
          fontSize={13}
          readOnly={readOnly}
          folding={false}
          lineNumbers={'on'}
          language={EditorLanguage.json}
          label="editable-code-view"
          wordWrap={'on'}
          monacoContainerStyle={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
