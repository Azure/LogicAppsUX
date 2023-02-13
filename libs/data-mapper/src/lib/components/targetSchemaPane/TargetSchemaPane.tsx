import { setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { NormalizedDataType } from '../../models';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { searchSchemaTreeFromRoot } from '../../utils/Schema.Utils';
import { useSchemaTreeItemStyles } from '../tree/SourceSchemaTreeItem';
import type { NodeToggledStateDictionary } from '../tree/TargetSchemaTreeItem';
import TargetSchemaTreeItem, { ItemToggledState, TargetSchemaTreeHeader } from '../tree/TargetSchemaTreeItem';
import type { ITreeNode } from '../tree/Tree';
import Tree from '../tree/Tree';
import { TreeHeader } from '../tree/TreeHeader';
import { Stack } from '@fluentui/react';
import { Button, makeStyles, mergeClasses, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDoubleLeft20Regular, ChevronDoubleRight20Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const schemaRootKey = 'schemaRoot';

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

export type TargetNodesWithConnectionsDictionary = { [key: string]: true };

export type TargetSchemaPaneProps = {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
};

export const TargetSchemaPane = ({ isExpanded, setIsExpanded }: TargetSchemaPaneProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const schemaNodeItemStyles = useSchemaTreeItemStyles();
  const dispatch = useDispatch<AppDispatch>();

  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetSchemaNode);

  const [toggledStatesDictionary, setToggledStatesDictionary] = useState<NodeToggledStateDictionary | undefined>({});
  const [targetSchemaSearchTerm, setTargetSchemaSearchTerm] = useState<string>('');
  const [targetSchemaDataTypeFilters, setTargetSchemaDataTypeFilters] = useState<NormalizedDataType[]>([]);

  const targetSchemaLoc = intl.formatMessage({
    defaultMessage: 'Target schema',
    description: 'Target schema',
  });

  const targetSchemaExpandCollapseLoc = intl.formatMessage({
    defaultMessage: 'Expand/collapse target schema',
    description: 'Expand/collapse target schema',
  });

  const setTargetSchemaPaneToExpanded = (toExpanded: boolean) => {
    setIsExpanded(toExpanded);

    LogService.log(LogCategory.TargetSchemaPane, 'expandOrCollapseTargetSchemaPane', {
      message: `${toExpanded ? 'Opened' : 'Closed'} target schema pane`,
    });
  };

  const onTargetSchemaItemClick = (schemaNode: SchemaNodeExtended) => {
    // If click schema name, return to Overview
    if (schemaNode.key === schemaRootKey) {
      dispatch(setCurrentTargetSchemaNode(undefined));
    } else {
      dispatch(setCurrentTargetSchemaNode(schemaNode));
    }
  };

  const targetNodesWithConnections = useMemo<TargetNodesWithConnectionsDictionary>(() => {
    const nodesWithConnections: { [key: string]: true } = {};

    Object.values(connectionDictionary).forEach((connection) => {
      if (connection.self.reactFlowKey in targetSchemaDictionary && connection.inputs[0] && connection.inputs[0].length > 0) {
        nodesWithConnections[connection.self.node.key] = true;
      }
    });

    return nodesWithConnections;
  }, [connectionDictionary, targetSchemaDictionary]);

  const searchedTargetSchemaTreeRoot = useMemo<ITreeNode<SchemaNodeExtended> | undefined>(() => {
    if (!targetSchema) {
      return undefined;
    }

    // Search tree (maintain parent tree structure for matched nodes - returns whole tree if no/too-short search term)
    let newTargetSchemaTreeRoot: ITreeNode<SchemaNodeExtended> = searchSchemaTreeFromRoot(
      targetSchema.schemaTreeRoot,
      targetSchemaDictionary,
      targetSchemaSearchTerm
    );

    // Search searched-tree for currentNode, and expand path to that node if present
    const findAndExpandPathToCurrentNode = (
      currentNode: ITreeNode<SchemaNodeExtended>,
      desiredNodeKey: string
    ): ITreeNode<SchemaNodeExtended> => {
      const currentNodeCopy = { ...currentNode } as ITreeNode<SchemaNodeExtended>;

      if (currentNodeCopy.key === desiredNodeKey) {
        currentNodeCopy.isExpanded = true;
      } else if (currentNodeCopy.children && currentNodeCopy.children.length > 0) {
        currentNodeCopy.children = currentNodeCopy.children.map((childNode) => {
          const newChildNode = findAndExpandPathToCurrentNode(childNode, desiredNodeKey);

          if (newChildNode.key === desiredNodeKey || newChildNode.isExpanded) {
            currentNodeCopy.isExpanded = true;
          }

          return newChildNode;
        });
      }

      return currentNodeCopy;
    };

    if (currentTargetSchemaNode) {
      newTargetSchemaTreeRoot = findAndExpandPathToCurrentNode(newTargetSchemaTreeRoot, currentTargetSchemaNode.key);
    }

    // Format extra top layer to show schemaTreeRoot
    // Can safely typecast with the root node(s) as we only use the properties defined here
    const schemaNameRoot = {} as ITreeNode<SchemaNodeExtended>;
    schemaNameRoot.children = [newTargetSchemaTreeRoot];

    return schemaNameRoot;
  }, [targetSchema, targetSchemaDictionary, targetSchemaSearchTerm, currentTargetSchemaNode]);

  useEffect(() => {
    if (!targetSchema || !connectionDictionary) {
      setToggledStatesDictionary(undefined);
    } else {
      const newToggledStatesDictionary: NodeToggledStateDictionary = {};
      checkNodeStatuses(targetSchema.schemaTreeRoot, newToggledStatesDictionary, targetNodesWithConnections);
      setToggledStatesDictionary(newToggledStatesDictionary);
    }
  }, [connectionDictionary, targetSchema, targetNodesWithConnections]);

  const shouldDisplayTree = !!(isExpanded && targetSchema && toggledStatesDictionary && searchedTargetSchemaTreeRoot);

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
          style={{ color: !targetSchema ? tokens.colorNeutralForegroundDisabled : tokens.colorNeutralForeground2 }}
          onClick={() => setTargetSchemaPaneToExpanded(!isExpanded)}
          disabled={!targetSchema}
          aria-label={targetSchemaExpandCollapseLoc}
        />

        <Text
          className={styles.title}
          style={
            !isExpanded
              ? {
                  writingMode: 'vertical-lr',
                  marginTop: tokens.spacingVerticalS,
                  color: !targetSchema ? tokens.colorNeutralForegroundDisabled : undefined,
                }
              : undefined
          }
        >
          {targetSchemaLoc}
        </Text>
      </Stack>

      <div
        style={{
          display: !shouldDisplayTree ? 'none' : undefined,
          margin: 8,
          marginLeft: 40,
          width: 290,
          flex: '1 1 1px',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <TreeHeader onSearch={setTargetSchemaSearchTerm} onClear={() => setTargetSchemaSearchTerm('')} />

        <TargetSchemaTreeHeader
          status={toggledStatesDictionary && targetSchema ? toggledStatesDictionary[targetSchema.schemaTreeRoot.key] : undefined}
        />

        <Tree<SchemaNodeExtended>
          // Add one extra root layer so schemaTreeRoot is shown as well
          // Can safely typecast as only the children[] are used from root
          treeRoot={searchedTargetSchemaTreeRoot}
          nodeContent={(node) =>
            toggledStatesDictionary && <TargetSchemaTreeItem node={node as SchemaNodeExtended} status={toggledStatesDictionary[node.key]} />
          }
          onClickItem={(node) => onTargetSchemaItemClick(node as SchemaNodeExtended)}
          nodeContainerClassName={mergeClasses(schemaNodeItemStyles.nodeContainer, schemaNodeItemStyles.targetSchemaNode)}
          nodeContainerStyle={(node) =>
            node.key === currentTargetSchemaNode?.key
              ? {
                  backgroundColor: tokens.colorNeutralBackground4Selected,
                }
              : {}
          }
          shouldShowIndicator={(node) => node.key === currentTargetSchemaNode?.key}
        />
      </div>
    </div>
  );
};

/*eslint no-param-reassign: ["error", { "props": false }]*/
const handleObjectParentToggledState = (
  stateDict: NodeToggledStateDictionary,
  nodeKey: string,
  nodeChildrenToggledAmt: number,
  nodeChildrenAmt: number
) => {
  if (nodeChildrenToggledAmt === 0) {
    stateDict[nodeKey] = ItemToggledState.NotStarted;
    return 0;
  } else if (nodeChildrenToggledAmt === nodeChildrenAmt) {
    stateDict[nodeKey] = ItemToggledState.Completed;
    return 1;
  } else {
    stateDict[nodeKey] = ItemToggledState.InProgress;
    return 0.5;
  }
};

const handleNodeWithValue = (
  stateDict: NodeToggledStateDictionary,
  nodeKey: string,
  targetNodesWithConnections: TargetNodesWithConnectionsDictionary
) => {
  if (nodeKey in targetNodesWithConnections) {
    stateDict[nodeKey] = ItemToggledState.Completed;
    return 1;
  } else {
    stateDict[nodeKey] = ItemToggledState.NotStarted;
    return 0;
  }
};

export const checkNodeStatuses = (
  schemaNode: SchemaNodeExtended,
  stateDict: NodeToggledStateDictionary,
  targetNodesWithConnections: TargetNodesWithConnectionsDictionary
) => {
  let numChildrenToggled = 0;

  schemaNode.children.forEach((child) => {
    numChildrenToggled += checkNodeStatuses(child, stateDict, targetNodesWithConnections);
  });

  if (schemaNode.normalizedDataType === NormalizedDataType.ComplexType && schemaNode.children.length > 0) {
    // Object/parent/array-elements (if they don't have children, treat them as leaf nodes (below))
    return handleObjectParentToggledState(stateDict, schemaNode.key, numChildrenToggled, schemaNode.children.length);
  } else {
    // Node that can have value/connection (*could still have children, but its toggled state will be based off itself instead of them)
    return handleNodeWithValue(stateDict, schemaNode.key, targetNodesWithConnections);
  }
};
