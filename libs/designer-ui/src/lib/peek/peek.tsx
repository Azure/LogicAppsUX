import { CustomEditor as Editor } from '../editor';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import type * as monaco from 'monaco-editor';
import React, { useRef, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface PeekCardProps {
  input: string;
  onOKClick(): void;
}

export function PeekCard({ input, onOKClick, ...cardProps }: PeekCardProps): JSX.Element {
  const [editorStyle, setEditorStyle] = useState(getEditorStyle(input));
  const intl = useIntl();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const options = {
    fontSize: 13,
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  const doneLabel = intl.formatMessage({ defaultMessage: 'Done', description: 'Done Label for button' });

  useEffect(() => {
    if (editorRef.current) {
      setEditorStyle(getEditorStyle(input));
      editorRef.current.setValue(input);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
    }
  }, [input]);

  return (
    <div className="msla-card-inner-body msla-peek">
      <div className="msla-peek-json" style={editorStyle}>
        <Editor editorRef={editorRef} defaultValue={input} fontSize={options.fontSize} readOnly={options.readOnly} />
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
function getEditorStyle(input = ''): React.CSSProperties {
  const height = Math.min(Math.max(input.split('\n').length * 19, 57), 380);
  return {
    height,
  };
}
