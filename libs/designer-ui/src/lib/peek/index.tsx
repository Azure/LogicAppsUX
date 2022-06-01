import { MonacoEditor, EditorLanguage } from '../editor/monaco';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface PeekProps {
  input: string;
  onOKClick?(): void;
}

export function Peek({ input, onOKClick }: PeekProps): JSX.Element {
  const intl = useIntl();
  const [editorStyle, setEditorStyle] = useState(getEditorStyle(input));

  useEffect(() => {
    setEditorStyle(getEditorStyle(input));
  }, [input]);

  const options = {
    fontSize: 13,
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  const doneLabel = intl.formatMessage({ defaultMessage: 'Done', description: 'Done Label for button' });

  return (
    <div className="msla-card-inner-body msla-peek">
      <div className="msla-peek-json">
        <MonacoEditor
          defaultValue={input}
          fontSize={options.fontSize}
          readOnly={options.readOnly}
          language={EditorLanguage.json}
          height={editorStyle}
        />
      </div>
      <div className="msla-card-config-button-container msla-code-view-done-button">
        <PrimaryButton className="msla-card-button-primary" onClick={onOKClick}>
          {doneLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

// Monaco should be at least 3 rows high (19*3 px) but no more than 20 rows high (19*20 px).
function getEditorStyle(input = ''): number {
  return Math.min(Math.max(input.split('\n').length * 19, 57), 560);
}
