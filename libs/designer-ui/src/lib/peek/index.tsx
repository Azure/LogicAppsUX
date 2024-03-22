import { MonacoEditor, EditorLanguage } from '../editor/monaco';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { useIntl } from 'react-intl';

export interface PeekProps {
  input: string;
  onOKClick?(): void;
}

export function Peek({ input, onOKClick }: PeekProps): JSX.Element {
  const intl = useIntl();

  const options = {
    contextmenu: false,
    fontSize: 13,
    lineNumbers: 'off',
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    defaultValue: '',
  };

  const doneLabel = intl.formatMessage({ defaultMessage: 'Done', id: 'AO6T9u', description: 'Done Label for button' });

  return (
    <div className="msla-card-inner-body msla-peek">
      <div className="msla-peek-json">
        <MonacoEditor
          className={'msla-monaco-peek'}
          value={input}
          fontSize={options.fontSize}
          readOnly={options.readOnly}
          language={EditorLanguage.json}
          height={getEditorStyle(input)}
        />
      </div>
      {onOKClick ? (
        <div className="msla-card-config-button-container msla-code-view-done-button">
          <PrimaryButton className="msla-card-button-primary" onClick={onOKClick}>
            {doneLabel}
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}

// Monaco should be at least 3 rows high (19*3 px) but no more than 40 rows high (19*40 px).
function getEditorStyle(input = ''): string {
  return Math.min(Math.max(input?.split('\n').length * 20, 57), 760) + 'px';
}
