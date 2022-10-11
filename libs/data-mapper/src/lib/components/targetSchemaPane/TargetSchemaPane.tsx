import { setCurrentTargetNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { NormalizedDataType, SchemaNodeDataType } from '../../models';
import type { SchemaNodeExtended } from '../../models';
import { SchemaTree } from '../tree/SchemaTree';
import type { NodeToggledStateDictionary } from '../tree/SchemaTreeItem';
import { ItemToggledState } from '../tree/SchemaTreeItem';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleLeft20Regular, ChevronDoubleRight20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const [toggledStatesDictionary, setToggledStatesDictionary] = useState<NodeToggledStateDictionary | undefined>({});

  const targetSchemaLoc = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Target schema',
  });

  const handleItemClick = (schemaNode: SchemaNodeExtended) => {
    dispatch(setCurrentTargetNode({ schemaNode: schemaNode, resetSelectedSourceNodes: true }));
  };

  // For MVP - only checks for a connection, not its validity
  const targetNodesWithConnections = useMemo(() => {
    const nodesWithConnections: { [key: string]: true } = {};

    Object.values(connectionDictionary).forEach((connection) => {
      if (connection.destination.reactFlowKey in targetSchemaDictionary) {
        nodesWithConnections[connection.destination.node.key] = true; // targetSchemaDictionary[value.reactFlowDestination]
      }
    });

    return nodesWithConnections;
  }, [connectionDictionary, targetSchemaDictionary]);

  /*eslint no-param-reassign: ["error", { "props": false }]*/
  const handleObjectParentToggledState = useCallback(
    (stateDict: NodeToggledStateDictionary, nodeKey: string, nodeChildrenToggledAmt: number, nodeChildrenAmt: number) => {
      if (nodeChildrenToggledAmt === nodeChildrenAmt) {
        stateDict[nodeKey] = ItemToggledState.Completed;
        return 1;
      } else if (nodeChildrenToggledAmt === 0) {
        stateDict[nodeKey] = ItemToggledState.NotStarted;
        return 0;
      } else {
        stateDict[nodeKey] = ItemToggledState.InProgress;
        return 0.5;
      }
    },
    []
  );

  const handleNodeWithValue = useCallback(
    (stateDict: NodeToggledStateDictionary, nodeKey: string) => {
      if (nodeKey in targetNodesWithConnections) {
        stateDict[nodeKey] = ItemToggledState.Completed;
        return 1;
      } else {
        stateDict[nodeKey] = ItemToggledState.NotStarted;
        return 0;
      }
    },
    [targetNodesWithConnections]
  );

  const checkNodeStatuses = useCallback(
    (schemaNode: any, stateDict: NodeToggledStateDictionary) => {
      let numChildrenToggled = 0;

      schemaNode.children.forEach((child: any) => {
        numChildrenToggled += checkNodeStatuses(child, stateDict);
      });

      // TODO: Sync w/ any type/expected-functionality updates
      if (schemaNode.schemaNodeDataType === SchemaNodeDataType.None || schemaNode.normalizedDataType === NormalizedDataType.ComplexType) {
        // Is object parent
        return handleObjectParentToggledState(stateDict, schemaNode.key, numChildrenToggled, schemaNode.children.length);
      } else {
        // Is node that can have value/connection (*could still have children, but its toggled state will be based off itself instead of them)
        return handleNodeWithValue(stateDict, schemaNode.key);
      }
    },
    [handleObjectParentToggledState, handleNodeWithValue]
  );

  useEffect(() => {
    if (!targetSchema || !connectionDictionary) {
      setToggledStatesDictionary(undefined);
    } else {
      const newToggledStatesDictionary: NodeToggledStateDictionary = {};
      checkNodeStatuses(targetSchema.schemaTreeRoot, newToggledStatesDictionary);
      setToggledStatesDictionary(newToggledStatesDictionary);
    }
  }, [checkNodeStatuses, connectionDictionary, targetSchema, targetNodesWithConnections]);

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
