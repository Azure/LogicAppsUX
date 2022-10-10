import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';

const useStyles = makeStyles({
  editorStyles: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('5px'),
  },
});

interface CodeTabProps {
  code?: string;
}

// For Source/Target/Function nodes
export const CodeTab = ({ code }: CodeTabProps) => {
  const styles = useStyles();

  return (
    <MonacoEditor
      language={EditorLanguage.yaml}
      value={code}
      className={styles.editorStyles}
      lineNumbers="on"
      scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
      wordWrap="on"
      minimapEnabled
      readOnly
    />
  );
};
