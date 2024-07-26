import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useState, useLayoutEffect, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { applyNodeChanges, useNodes, type Node, type NodeChange } from '@xyflow/react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/Store';
import { updateReactFlowNodes } from '../../../core/state/DataMapSlice';

export type SchemaTreeProps = {
  isLeftDirection?: boolean;
  schema: SchemaExtended;
  flattenedSchemaMap: Record<string, SchemaNodeExtended>;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const styles = useStyles();
  const {
    isLeftDirection = true,
    flattenedSchemaMap,
    schema: { schemaTreeRoot },
  } = props;

  const updatedNodesRef = useRef<Record<string, Node>>({});
  const [totalUpdatedNodes, setTotalUpdatedNodes] = useState(0);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const nodes = useNodes();

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  const setUpdatedNode = useCallback(
    (node: Node) => {
      const existingNodes = updatedNodesRef.current;
      setTotalUpdatedNodes((prev) => (existingNodes[node.id] ? prev : prev + 1));
      updatedNodesRef.current = {
        ...existingNodes,
        [node.id]: node,
      };
    },
    [updatedNodesRef]
  );

  useLayoutEffect(() => {
    const totalVisibleNodes = visibleKeys.size;
    console.log('TN: ', totalVisibleNodes, ' ; TUN: ', totalUpdatedNodes, ' ;UpdatedNodes: ', Object.keys(updatedNodesRef.current));
    if (totalUpdatedNodes >= totalVisibleNodes) {
      const updatedNodes = updatedNodesRef.current;
      const keys = Object.keys(updatedNodes);
      const currentNodesMap: Record<string, Node> = {};
      for (const node of nodes) {
        currentNodesMap[node.id] = node;
      }

      const nodeChanges: NodeChange[] = [];
      for (const key of keys) {
        const updatedNode = updatedNodes[key];
        const currentNode = currentNodesMap[key];

        if (updatedNode.position.x < 0 || updatedNode.position.y < 0) {
          if (currentNode) {
            nodeChanges.push({ id: key, type: 'remove' });
          }
        } else if (!currentNode) {
          nodeChanges.push({ type: 'add', item: updatedNode });
        } else if (currentNode.position.x !== updatedNode.position.x || currentNode.position.y !== updatedNode.position.y) {
          nodeChanges.push({
            id: key,
            type: 'position',
            position: updatedNode.position,
          });
        }
      }

      if (nodeChanges.length > 0) {
        applyNodeChanges(nodeChanges, nodes);
        dispatch(
          updateReactFlowNodes({
            nodes: updatedNodes,
            isSource: isLeftDirection,
          })
        );
      }

      updatedNodesRef.current = {};
      setTotalUpdatedNodes(0);
    }
  }, [nodes, updatedNodesRef, visibleKeys, totalUpdatedNodes, dispatch, setTotalUpdatedNodes, isLeftDirection]);

  useLayoutEffect(() => {
    // OpenKeys only includes the nodes with children
    setOpenKeys(
      (openKeys) =>
        new Set<string>([...openKeys, ...Object.keys(flattenedSchemaMap).filter((key) => flattenedSchemaMap[key].children.length > 0)])
    );

    // Visible keys includes all the nodes which can be visible on the canvas
    setVisibleKeys((visibleKeys) => new Set<string>([...visibleKeys, ...Object.keys(flattenedSchemaMap)]));
  }, [flattenedSchemaMap, setOpenKeys]);
  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
    >
      <RecursiveTree
        root={schemaTreeRoot}
        isLeftDirection={isLeftDirection}
        setOpenKeys={setOpenKeys}
        openKeys={openKeys}
        visibleKeys={visibleKeys}
        flattenedScehmaMap={flattenedSchemaMap}
        treePositionX={treeRef?.current?.getBoundingClientRect().x}
        treePositionY={treeRef?.current?.getBoundingClientRect().y}
        setUpdatedNode={setUpdatedNode}
        setVisibleKeys={setVisibleKeys}
      />
    </Tree>
  ) : null;
};
