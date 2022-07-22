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

  const doneLabel = intl.formatMessage({ defaultMessage: 'Done', description: 'Done Label for button' });

  return (
    <div className="msla-card-inner-body msla-peek">
      <div className="msla-peek-json">
        <MonacoEditor value={input} fontSize={options.fontSize} readOnly={options.readOnly} language={EditorLanguage.json} />
      </div>
      <div className="msla-card-config-button-container msla-code-view-done-button">
        <PrimaryButton className="msla-card-button-primary" onClick={onOKClick}>
          {doneLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}
