import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';

interface CodeTabProps {
  code?: string;
}

// For Source/Target/Function nodes
export const CodeTab = ({ code }: CodeTabProps) => {
  return (
    <MonacoEditor
      language={EditorLanguage.yaml}
      value={code}
      lineNumbers="on"
      scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
      wordWrap="on"
      minimapEnabled
      readOnly
    />
  );
};
