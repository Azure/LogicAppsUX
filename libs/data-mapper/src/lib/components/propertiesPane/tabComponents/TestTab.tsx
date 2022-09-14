import { Stack } from '@fluentui/react';
import { Button, Divider, Input, makeStyles, Text, Textarea, tokens, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { SelectedOutputNode } from '../../../models/SelectedNode';

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
  currentNode: SelectedOutputNode;
}

export const TestTab = ({ currentNode }: TestTabProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const provideParamsLoc = intl.formatMessage({
    defaultMessage: 'Provide parameters to test the output.',
    description: 'Test tab parameters description',
  });

  const inputLoc = intl.formatMessage({
    defaultMessage: 'Input',
    description: 'Input',
  });

  const outputLoc = intl.formatMessage({
    defaultMessage: 'Output',
    description: 'Output',
  });

  const runTestLoc = intl.formatMessage({
    defaultMessage: 'Run test',
    description: 'Run test',
  });

  const resetLoc = intl.formatMessage({
    defaultMessage: 'Reset',
    description: 'Reset',
  });

  return (
    <div className={styles.testTabDivStyle}>
      <Text>{provideParamsLoc}</Text>

      <Stack horizontal className={styles.inputOutputContentStyle}>
        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{inputLoc}</Text>

          {currentNode.inputIds.length > 0 ?
            currentNode.inputIds.map((inputId) =>
              <Input placeholder='Temporary placeholder' className={styles.inputStyle} style={{ marginTop: 16 }} key={inputId} />
            )
          :
            <>
              {/* TODO: Inputs are visual placeholders for now, will swap w/ 'No inputs' type msg */}
              <Input placeholder='Temporary placeholder' className={styles.inputStyle} style={{ marginTop: 16 }} />
              <Input placeholder='Temporary placeholder' className={styles.inputStyle} style={{ marginTop: 16 }} />
            </>
          }

          <Stack horizontal verticalAlign='center' className={styles.buttonContainerStyle} style={{ marginTop: 16 }}>
            <Button appearance='primary'>{runTestLoc}</Button>
            <Button appearance='subtle'>{resetLoc}</Button>
          </Stack>
        </Stack>

        <Divider vertical className={styles.dividerStyle} style={{ margin: '0 16px 0 16px', paddingTop: 12, paddingBottom: 12 }} />

        <Stack className={styles.inputOutputStackStyle}>
          <Text className={styles.titleStyle}>{outputLoc}</Text>

          <Textarea placeholder='Temporary placeholder' resize='both' className={styles.inputStyle} style={{ marginTop: 16 }} />
        </Stack>
      </Stack>
    </div>
  );
};
