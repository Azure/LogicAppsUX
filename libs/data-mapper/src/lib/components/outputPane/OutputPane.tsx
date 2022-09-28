import type { RootState } from '../../core/state/Store';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleRight20Regular, ChevronDoubleLeft20Regular } from '@fluentui/react-icons';
import React from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const useStyles = makeStyles({
  outputPane: {
    backgroundColor: tokens.colorNeutralBackground4,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  title: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground2,
  },
});

export type OutputPaneProps = {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
};

export const OutputPane = ({ isExpanded, setIsExpanded }: OutputPaneProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);

  const targetSchemaLoc = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Target schema',
  });

  return (
    <div className={styles.outputPane} style={{ flex: '0 1 1px' }}>
      <Stack
        horizontal={isExpanded}
        verticalAlign={isExpanded ? 'center' : undefined}
        horizontalAlign={!isExpanded ? 'center' : undefined}
        style={!isExpanded ? { width: 40, margin: '4px 4px 4px 4px' } : { padding: '4px 4px 0 4px' }}
      >
        <Button
          icon={isExpanded ? <ChevronDoubleRight20Regular /> : <ChevronDoubleLeft20Regular />}
          size="medium"
          appearance="transparent"
          style={{ color: tokens.colorNeutralForeground2 }}
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!targetSchema}
        />

        <Text className={styles.title} style={!isExpanded ? { writingMode: 'vertical-lr', marginTop: tokens.spacingVerticalS } : undefined}>
          {targetSchemaLoc}
        </Text>

        {isExpanded && (
          <Text className={styles.subtitle} style={{ marginLeft: 4 }}>
            {targetSchema?.name}
          </Text>
        )}
      </Stack>

      {isExpanded && <div style={{ margin: 8, marginLeft: 40, width: 290 }}>Expanded content</div>}
    </div>
  );
};
