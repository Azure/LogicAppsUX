import { setCurrentTargetNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { TargetSchemaTree } from '../tree/TargetTree';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleRight20Regular, ChevronDoubleLeft20Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const useStyles = makeStyles({
  outputPane: {
    backgroundColor: tokens.colorNeutralBackground4,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    height: '100%',
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

export type TargetSchemaPaneProps = {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
};

export const TargetSchemaPane = ({ isExpanded, setIsExpanded }: TargetSchemaPaneProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const dispatch = useDispatch<AppDispatch>();
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);

  const targetSchemaLoc = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Target schema',
  });

  const handleItemClick = (schemaNode: SchemaNodeExtended) => {
    dispatch(setCurrentTargetNode({ schemaNode: schemaNode, resetSelectedSourceNodes: true }));
  };

  return (
    <div className={styles.outputPane} style={{ display: 'flex', flexDirection: 'column', flex: '0 1 1px' }}>
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

        {isExpanded && targetSchema && (
          <Text className={styles.subtitle} style={{ marginLeft: 4 }}>
            {targetSchema.name}
          </Text>
        )}
      </Stack>

      {isExpanded && targetSchema && (
        <div style={{ margin: 8, marginLeft: 40, width: 290, flex: '1 1 1px', overflowY: 'auto' }}>
          <TargetSchemaTree schema={targetSchema} currentlySelectedNodes={[]} onNodeClick={handleItemClick} />
        </div>
      )}
    </div>
  );
};
