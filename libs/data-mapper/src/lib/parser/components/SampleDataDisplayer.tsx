import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';
import { useEffect, useState } from 'react';

export interface SampleDataDisplayerProps {
  data: string;
  onOKClick?(): void;
}

export const SampleDataDisplayer = ({ data, onOKClick }: SampleDataDisplayerProps) => {
  const options = {
    fontSize: 13,
    readOnly: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
  };

  const [editorStyle, setEditorStyle] = useState(getEditorStyle(data));

  useEffect(() => {
    setEditorStyle(getEditorStyle(data));
  }, [data]);

  return (
    <div>
      Displaying the Data
      <MonacoEditor
        defaultValue={data}
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
  return Math.min(Math.max(input.split('\n').length * 19, 57), 700);
}
