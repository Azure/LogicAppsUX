import { setCurrentTargetNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { NormalizedDataType, SchemaNodeDataType, type SchemaNodeExtended } from '../../models';
import { SchemaTree } from '../tree/SchemaTree';
import { ItemToggledState, type NodeToggledStateDictionary } from '../tree/SchemaTreeItem';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleRight20Regular, ChevronDoubleLeft20Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
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
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const targetSchemaLoc = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Target schema',
  });

  // For MVP - only checks for a connection, not its validity
  const targetNodesWithConnections = useMemo(() => {
    const nodesWithConnections: { [key: string]: true } = {};

    Object.entries(connectionDictionary).forEach(([_key, value]) => {
      if (value.reactFlowDestination in targetSchemaDictionary) {
        nodesWithConnections[value.destination] = true; // targetSchemaDictionary[value.reactFlowDestination]
      }
    });

    return nodesWithConnections;
  }, [connectionDictionary, targetSchemaDictionary]);

  const toggledStatesDictionary = useMemo(() => {
    if (!targetSchema || !connectionDictionary) return;

    const newToggledStatesDictionary: NodeToggledStateDictionary = {};

    const checkNodeStatuses = (schemaNode: any) => {
      let numChildrenToggled = 0;

      schemaNode.children.forEach((child: any) => {
        numChildrenToggled += checkNodeStatuses(child);
      });

      // TODO: Sync w/ any type/expected-functionality updates
      if (schemaNode.schemaNodeDataType === SchemaNodeDataType.None || schemaNode.normalizedDataType === NormalizedDataType.ComplexType) {
        // Is object parent
        if (numChildrenToggled === schemaNode.children.length) {
          newToggledStatesDictionary[schemaNode.key] = ItemToggledState.Completed;
          numChildrenToggled += 1;
        } else if (numChildrenToggled === 0) {
          newToggledStatesDictionary[schemaNode.key] = ItemToggledState.NotStarted;
        } else {
          newToggledStatesDictionary[schemaNode.key] = ItemToggledState.InProgress;
        }
      } else {
        // Is node that can have value/connection (*could still have children, but its toggled state will be based off itself instead of them)
        if (schemaNode.key in targetNodesWithConnections) {
          newToggledStatesDictionary[schemaNode.key] = ItemToggledState.Completed;
          numChildrenToggled += 1;
        } else {
          newToggledStatesDictionary[schemaNode.key] = ItemToggledState.NotStarted;
        }
      }

      return numChildrenToggled;
    };

    checkNodeStatuses(targetSchema.schemaTreeRoot);

    return newToggledStatesDictionary;
  }, [connectionDictionary, targetSchema, targetNodesWithConnections]);

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
          <SchemaTree
            schema={targetSchema}
            toggledStatesDictionary={toggledStatesDictionary}
            onNodeClick={handleItemClick}
            isTargetSchema
          />
        </div>
      )}
    </div>
  );
};
