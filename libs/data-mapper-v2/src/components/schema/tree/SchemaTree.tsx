import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useState, useMemo, useLayoutEffect, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { type Node, applyNodeChanges, type NodeChange } from '@xyflow/react';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
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

  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const updatedNodesRef = useRef<Record<string, Node>>({});
  const [totalUpdatedNodes, setTotalUpdatedNodes] = useState(0);

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const treeRef = useRef<HTMLDivElement | null>(null);

  const totalNodes = useMemo(() => Object.keys(flattenedSchemaMap).length, [flattenedSchemaMap]);

  const { nodes } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

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

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  useLayoutEffect(() => {
    console.log('SchemaTree: useLayoutEffect :: ', 'totalNodes: ', totalNodes, '; totalUpdatedNodes: ', totalUpdatedNodes);
    // NOTE: Update the nodes when all the updated position has been fetched for the keys
    if (totalUpdatedNodes >= totalNodes) {
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
        const newNodes = applyNodeChanges(nodeChanges, nodes);
        dispatch(updateReactFlowNodes(newNodes));
      }
      updatedNodesRef.current = {};
      setTotalUpdatedNodes(0);
    }
  }, [nodes, updatedNodesRef, totalNodes, dispatch, setTotalUpdatedNodes, totalUpdatedNodes]);

  useLayoutEffect(() => {
    setOpenKeys(
      (openKeys) =>
        new Set<string>([...openKeys, ...Object.keys(flattenedSchemaMap).filter((key) => flattenedSchemaMap[key].children.length > 0)])
    );
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
        flattenedScehmaMap={flattenedSchemaMap}
        setUpdatedNode={setUpdatedNode}
        treePosition={
          treeRef?.current?.getBoundingClientRect()
            ? {
                x: treeRef.current.getBoundingClientRect().x,
                y: treeRef.current.getBoundingClientRect().y,
              }
            : undefined
        }
      />
    </Tree>
  ) : null;
};
