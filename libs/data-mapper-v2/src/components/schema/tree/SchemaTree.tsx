import { type SchemaExtended, SchemaType, equals } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useState, useMemo, useLayoutEffect, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { flattenSchemaNodeMap } from '../../../utils';
import { type Node, applyNodeChanges, type NodeChange } from '@xyflow/react';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import { updateReactFlowNodes } from '../../../core/state/DataMapSlice';

export type SchemaTreeProps = {
  schemaType?: SchemaType;
  schema: SchemaExtended;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const styles = useStyles();
  const {
    schemaType,
    schema: { schemaTreeRoot },
  } = props;

  const isLeftDirection = useMemo(() => equals(schemaType, SchemaType.Source), [schemaType]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const updatedNodesRef = useRef<Record<string, Node>>({});
  const [totalUpdatedNodes, setTotalUpdatedNodes] = useState(0);

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const flattenedScehmaMap = useMemo(() => flattenSchemaNodeMap(schemaTreeRoot), [schemaTreeRoot]);

  const totalNodes = useMemo(() => Object.keys(flattenedScehmaMap).length, [flattenedScehmaMap]);

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
    // NOTE: Update the nodes when all the updated position has been fetched for the keys
    if (totalUpdatedNodes === totalNodes) {
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

        if (updatedNode.position.x < 0 && updatedNode.position.y < 0) {
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
    setOpenKeys(new Set<string>(Object.keys(flattenedScehmaMap).filter((key) => flattenedScehmaMap[key].children.length > 0)));
  }, [flattenedScehmaMap, setOpenKeys]);
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
        flattenedScehmaMap={flattenedScehmaMap}
        setUpdatedNode={setUpdatedNode}
      />
    </Tree>
  ) : null;
};
