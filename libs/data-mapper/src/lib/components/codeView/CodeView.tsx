import { Stack } from '@fluentui/react';
import { Button, makeStyles, Text, typographyStyles } from '@fluentui/react-components';
import { Code20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  titleTextStyle: {
    ...typographyStyles.body1Strong,
  },
});

export interface CodeViewProps {
  dataMapDefinition: string;
  isCodeViewOpen: boolean;
  setIsCodeViewOpen: (isOpen: boolean) => void;
}

export const CodeView = ({ dataMapDefinition, isCodeViewOpen, setIsCodeViewOpen }: CodeViewProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const codeViewLoc = intl.formatMessage({
    defaultMessage: 'Code view',
    description: 'Code view title',
  });

  return (
    <div style={{ display: isCodeViewOpen ? 'block' : 'none', height: '100%', overflow: 'hidden', width: '25%', padding: '12px' }}>
      <Stack horizontal verticalAlign="center" style={{ justifyContent: 'space-between', marginBottom: '24px', marginTop: '12px' }}>
        <Stack horizontal verticalAlign="center">
          <Code20Regular />
          <Text className={styles.titleTextStyle} style={{ marginLeft: '8px' }}>
            {codeViewLoc}
          </Text>
        </Stack>

        <Button icon={<Dismiss20Regular />} appearance="subtle" onClick={() => setIsCodeViewOpen(false)} />
      </Stack>

      <div style={{ border: '1px solid black', borderRadius: '3px', padding: '1px' }}>
        <MonacoEditor
          language={EditorLanguage.templateExpressionLanguage}
          value={dataMapDefinition}
          lineNumbers="on"
          scrollbar={{ horizontal: 'auto', vertical: 'auto' }}
          readOnly
        />
      </div>
    </div>
  );
};
