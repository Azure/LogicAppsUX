import { MonacoEditor } from '../editor/monaco';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface PeekProps {
  input: string;
}

export function Peek({ input }: PeekProps): JSX.Element {
  const options = {
    contextmenu: false,
    fontSize: 13,
    lineNumbers: 'off',
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    defaultValue: '',
  };

  return (
    <div className="msla-card-inner-body msla-peek">
      <MonacoEditor
        className={'msla-monaco-peek'}
        value={input}
        fontSize={options.fontSize}
        readOnly={options.readOnly}
        language={EditorLanguage.json}
        monacoContainerStyle={{ height: '100%' }}
      />
    </div>
  );
}
