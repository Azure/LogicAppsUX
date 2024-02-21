import { setCurrentTargetSchemaNode } from '../../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../../core/state/Store';
import { isObjectType, searchSchemaTreeFromRoot } from '../../../../utils/Schema.Utils';
import type { FilteredDataTypesDict } from '../../../tree/SchemaTreeSearchbar';
import { getDefaultFilteredDataTypesDict, SchemaTreeSearchbar } from '../../../tree/SchemaTreeSearchbar';
import { useSchemaTreeItemStyles } from '../../../tree/SourceSchemaTreeItem';
import type { NodeToggledStateDictionary } from '../../../tree/TargetSchemaTreeItem';
import TargetSchemaTreeItem, { ItemToggledState, TargetSchemaTreeHeader } from '../../../tree/TargetSchemaTreeItem';
import type { ITreeNode } from '../../../tree/Tree';
import Tree from '../../../tree/Tree';
import { mergeClasses, tokens } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const schemaRootKey = 'schemaRoot';

export type TargetNodesWithConnectionsDictionary = { [key: string]: true };

export const TargetSchemaTab = () => {
  const schemaNodeItemStyles = useSchemaTreeItemStyles();
  const dispatch = useDispatch<AppDispatch>();

  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);

  const [toggledStatesDictionary, setToggledStatesDictionary] = useState<NodeToggledStateDictionary | undefined>({});
  const [targetSchemaSearchTerm, setTargetSchemaSearchTerm] = useState<string>('');
  const [targetSchemaDataTypeFilters, setTargetSchemaDataTypeFilters] = useState<FilteredDataTypesDict>(getDefaultFilteredDataTypesDict());

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
      targetSchemaSearchTerm,
      targetSchemaDataTypeFilters
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
  }, [targetSchema, targetSchemaDictionary, targetSchemaSearchTerm, currentTargetSchemaNode, targetSchemaDataTypeFilters]);

  useEffect(() => {
    if (!targetSchema || !connectionDictionary) {
      setToggledStatesDictionary(undefined);
    } else {
      const newToggledStatesDictionary: NodeToggledStateDictionary = {};
      checkNodeStatuses(targetSchema.schemaTreeRoot, newToggledStatesDictionary, targetNodesWithConnections);
      setToggledStatesDictionary(newToggledStatesDictionary);
    }
  }, [connectionDictionary, targetSchema, targetNodesWithConnections]);

  const shouldDisplayTree = !!(targetSchema && toggledStatesDictionary && searchedTargetSchemaTreeRoot);

  return (
    <div
      style={{
        display: 'contents',
        marginTop: 8,
      }}
    >
      <SchemaTreeSearchbar
        onSearch={setTargetSchemaSearchTerm}
        onClear={() => setTargetSchemaSearchTerm('')}
        filteredDataTypes={targetSchemaDataTypeFilters}
        setFilteredDataTypes={setTargetSchemaDataTypeFilters}
      />

      <div
        style={{
          display: !shouldDisplayTree ? 'none' : undefined,
          overflowY: 'scroll',
          width: '100%',
          flex: '1 1 1px',
        }}
      >
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

/* eslint-disable no-param-reassign */
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

  if (isObjectType(schemaNode.type) && schemaNode.children.length > 0) {
    // Object/parent/array-elements (if they don't have children, treat them as leaf nodes (below))
    return handleObjectParentToggledState(stateDict, schemaNode.key, numChildrenToggled, schemaNode.children.length);
  } else {
    // Node that can have value/connection (*could still have children, but its toggled state will be based off itself instead of them)
    return handleNodeWithValue(stateDict, schemaNode.key, targetNodesWithConnections);
  }
};
