import { MonacoEditor } from '../editor/monaco';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { usePeekStyles } from './styles';

export interface PeekProps {
  input: string;
}

export function Peek({ input }: PeekProps): JSX.Element {
  const styles = usePeekStyles();
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
    <div data-automation-id="msla-peek" className={`msla-card-inner-body ${styles.root}`}>
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
