import { Stack } from '@fluentui/react';
import { Button, Divider, Input, makeStyles, Text, Textarea, tokens, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  testTabDivStyle: {
    height: '100%',
  },
  inputOutputContentStyle: {
    height: '100%',
    marginTop: '16px',
  },
  inputOutputStackStyle: {
    width: '100%',
  },
  dividerStyle: {
    height: '100%',
    maxWidth: '12px',
    color: tokens.colorNeutralStroke2,
  },
  titleStyle: {
    ...typographyStyles.body1Strong,
  },
  inputStyle: {},
  buttonContainerStyle: {},
});

interface TestTabProps {
  currentTargetSchemaNodeKey: string;
}

export const TestTab = ({ currentTargetSchemaNodeKey }: TestTabProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const provideParamsLoc = intl.formatMessage({
    defaultMessage: 'Provide parameters to test the output.',
    id: 'sVQe34',
    description: 'The description for the test tab parameters.',
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    id: 'P6I90y',
    description: 'Input',
  });

  const outputLoc = intl.formatMessage({
    defaultMessage: 'Output',
    id: 'Ciol6I',
    description: 'Output',
  });

  const runTestLoc = intl.formatMessage({
    defaultMessage: 'Run test',
    id: 'g7my78',
    description: 'Run test',
  });

  const resetLoc = intl.formatMessage({
    defaultMessage: 'Reset',
    id: 'nSan4V',
    description: 'Reset',
  });

  console.log(currentTargetSchemaNodeKey);

  return (
    <div className={styles.testTabDivStyle}>
      <Text>{provideParamsLoc}</Text>

      <Stack horizontal className={styles.inputOutputContentStyle}>
        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{inputLoc}</Text>

          <Input placeholder="Temporary placeholder" className={styles.inputStyle} style={{ marginTop: 16 }} />

          <Stack horizontal verticalAlign="center" className={styles.buttonContainerStyle} style={{ marginTop: 16 }}>
            <Button appearance="primary">{runTestLoc}</Button>
            <Button appearance="subtle">{resetLoc}</Button>
          </Stack>
        </Stack>

        <Divider vertical className={styles.dividerStyle} style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12 }} />

        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{outputLoc}</Text>

          <Textarea placeholder="Temporary placeholder" resize="both" className={styles.inputStyle} style={{ marginTop: 16 }} />
        </Stack>
      </Stack>
    </div>
  );
};
