import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';

interface CodeTabProps {
  code?: string;
}

// For Input/Output/Expression nodes
export const CodeTab = ({ code }: CodeTabProps) => {

  return (
    <MonacoEditor
      language={EditorLanguage.templateExpressionLanguage}
      value={code}
      lineNumbers="on"
      scrollbar={{ horizontal: 'hidden', vertical: 'hidden' }}
      minimapEnabled
      readOnly
    />
  );
};
