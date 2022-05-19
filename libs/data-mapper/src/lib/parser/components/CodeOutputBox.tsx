import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';
import { useEffect, useState } from 'react';

export interface CodeOutputBoxProps {
  output: string;
  onOKClick?(): void;
}

export const CodeOutputBox = ({ output, onOKClick }: CodeOutputBoxProps) => {
  const options = {
    fontSize: 13,
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  const [editorStyle, setEditorStyle] = useState(getEditorStyle(output));

  useEffect(() => {
    setEditorStyle(getEditorStyle(output));
  }, [output]);

  return (
    <div>
      OUTPUT
      <MonacoEditor
        defaultValue={output}
        fontSize={options.fontSize}
        readOnly={options.readOnly}
        language={EditorLanguage.json}
        height={editorStyle}
      />
    </div>
  );
};

// Monaco should be at least 3 rows high (19*3 px) but no more than 20 rows high (19*20 px).
function getEditorStyle(input = ''): number {
  return Math.min(Math.max(input.split('\n').length * 19, 57), 380);
}
