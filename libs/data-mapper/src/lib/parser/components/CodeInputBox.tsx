import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';
import { useEffect, useState } from 'react';

export interface CodeInputBoxProps {
  input: string;
  onOKClick?(): void;
}

export const CodeInputBox = ({ input, onOKClick }: CodeInputBoxProps) => {
  const options = {
    fontSize: 13,
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  const [editorStyle, setEditorStyle] = useState(getEditorStyle(input));

  useEffect(() => {
    setEditorStyle(getEditorStyle(input));
  }, [input]);

  return (
    <div>
      INPUT:
      <MonacoEditor
        defaultValue={input}
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
  // return Math.min(Math.max(input.split('\n').length * 19, 57), 380);

  return Math.min(Math.max(input.split('\n').length * 19, 57), 665);
}
