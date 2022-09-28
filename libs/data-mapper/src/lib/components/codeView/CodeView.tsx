import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { Code20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  containerStyle: {
    height: '100%',
    ...shorthands.overflow('hidden'),
    minWidth: '320px',
    width: '25%',
    ...shorthands.padding('12px'),
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    flexDirection: 'column',
  },
  titleTextStyle: {
    ...typographyStyles.body1Strong,
  },
  editorStyle: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('10px'),
  },
});

export interface CodeViewProps {
  dataMapDefinition: string;
  isCodeViewOpen: boolean;
  setIsCodeViewOpen: (isOpen: boolean) => void;
  canvasAreaHeight: number;
}

export const CodeView = ({ dataMapDefinition, isCodeViewOpen, setIsCodeViewOpen, canvasAreaHeight }: CodeViewProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const codeViewLoc = intl.formatMessage({
    defaultMessage: 'Code view',
    description: 'Code view title',
  });

  return (
    <div className={styles.containerStyle} style={{ display: isCodeViewOpen ? 'flex' : 'none' }}>
      <Stack horizontal verticalAlign="center" style={{ justifyContent: 'space-between', marginBottom: '12px', marginTop: '4px' }}>
        <Stack horizontal verticalAlign="center">
          <Code20Regular />
          <Text className={styles.titleTextStyle} style={{ marginLeft: '8px' }}>
            {codeViewLoc}
          </Text>
        </Stack>

        <Button icon={<Dismiss20Regular />} appearance="subtle" onClick={() => setIsCodeViewOpen(false)} />
      </Stack>

      <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto' }}>
        <MonacoEditor
          language={EditorLanguage.yaml}
          value={dataMapDefinition}
          lineNumbers="on"
          scrollbar={{ horizontal: 'hidden', vertical: 'auto' }}
          className={styles.editorStyle}
          height={`${Math.max(200, canvasAreaHeight - 75)}px`}
          wordWrap="on"
          readOnly
        />
      </div>
    </div>
  );
};
