import { emptyCanvasRect, type SchemaExtended, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useHandleStyles, useStyles, useTreeStyles } from './styles';
import { useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import useSchema from '../useSchema';
// import { Tree, type TreeApi, type NodeRendererProps } from 'react-arborist';
import SchemaTreeNode from './SchemaTreeNode';
import { toggleNodeExpandCollapse, updateTreeData } from '../../../core/state/DataMapSlice';
import { mergeClasses } from '@fluentui/react-components';
import { useDragDropManager } from 'react-dnd';

export type SchemaTreeProps = {
  id: string;
  schema: SchemaExtended;
  flattenedSchemaMap: Record<string, SchemaNodeExtended>;
  searchTerm?: string;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const dndManager = useDragDropManager();
  const treeRef = useRef<any>(null);
  const styles = useStyles();
  const treeStyles = useTreeStyles();
  const dispatch = useDispatch<AppDispatch>();
  const handleStyles = useHandleStyles();
  const {
    id,
    flattenedSchemaMap,
    schema: { schemaTreeRoot },
    searchTerm,
  } = props;

  const { panelNodeId, openKeys, isSourceSchema } = useSchema({ id });
  const { height: currentHeight } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
  const { nodesForScroll, schemaTreeData } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const updateNodeInternals = useUpdateNodeInternals();

  const onScroll = useCallback(() => {
    updateNodeInternals(panelNodeId);
  }, [panelNodeId, updateNodeInternals]);

  const onToggle = useCallback(
    (id: string) => {
      dispatch(
        toggleNodeExpandCollapse({
          isSourceSchema: isSourceSchema,
          keys: [id],
          isExpanded: !openKeys[id],
        })
      );
    },
    [openKeys, dispatch, isSourceSchema]
  );

  useEffect(() => {
    const visibleNodes = treeRef?.current?.visibleNodes.map((node) => node.data) ?? [];
    const startIndex = treeRef?.current?.visibleStartIndex ?? -1;
    const endIndex = treeRef?.current?.visibleStopIndex ?? -1;

    const isVisibleNodesUpdated = (newNodes: SchemaNodeExtended[], currentNodes: SchemaNodeExtended[]) => {
      const nodeSet = new Set<string>();
      newNodes.forEach((node) => {
        nodeSet.add(node.key);
      });

      for (const node of currentNodes) {
        if (!nodeSet.has(node.key)) {
          return true;
        }
      }
      return false;
    };

    if (
      isVisibleNodesUpdated(visibleNodes, schemaTreeData[id]?.visibleNodes ?? []) ||
      isVisibleNodesUpdated(schemaTreeData[id]?.visibleNodes ?? [], visibleNodes) ||
      schemaTreeData[id]?.startIndex !== startIndex ||
      schemaTreeData[id]?.endIndex !== endIndex
    ) {
      dispatch(
        updateTreeData({
          key: id,
          data: {
            visibleNodes,
            startIndex,
            endIndex,
          },
        })
      );
    }
  }, [
    dispatch,
    id,
    schemaTreeData,
    treeRef?.current?.visibleNodes,
    treeRef?.current?.visibleStartIndex,
    treeRef?.current?.visibleStopIndex,
  ]);

  useEffect(() => {
    updateNodeInternals(panelNodeId);
  }, [panelNodeId, schemaTreeRoot, flattenedSchemaMap, currentHeight, updateNodeInternals, openKeys]);

  return (
    <div ref={ref} className={mergeClasses(styles.root, isSourceSchema ? styles.sourceSchemaRoot : styles.targetScehmaRoot)}>
      {ref?.current ? (
        <>
          {isSourceSchema ? (
            <>
              {nodesForScroll['top-left'] && (
                <Handle
                  id={nodesForScroll['top-left']}
                  position={Position.Right}
                  type="source"
                  className={handleStyles.hidden}
                  style={{ top: '87px', right: '4px' }}
                />
              )}
              {currentHeight !== undefined && nodesForScroll['bottom-left'] && (
                <Handle
                  id={nodesForScroll['bottom-left']}
                  position={Position.Right}
                  type="source"
                  className={handleStyles.hidden}
                  style={{ top: `${currentHeight}px`, right: '4px' }}
                />
              )}
            </>
          ) : (
            <>
              {nodesForScroll['top-right'] && (
                <Handle
                  id={nodesForScroll['top-right']}
                  position={Position.Left}
                  type="target"
                  className={handleStyles.hidden}
                  style={{ top: '0px', left: '8px' }}
                />
              )}
              {currentHeight !== undefined && nodesForScroll['bottom-right'] && (
                <Handle
                  id={nodesForScroll['bottom-right']}
                  position={Position.Left}
                  type="target"
                  className={handleStyles.hidden}
                  style={{ top: `${currentHeight}px`, left: '8px' }}
                />
              )}
            </>
          )}
          {/* <Tree
            ref={treeRef}
            data={schemaTreeRoot ? [schemaTreeRoot] : []}
            idAccessor={'key'}
            onScroll={onScroll}
            openByDefault={true}
            disableEdit={true}
            disableDrag={true}
            disableDrop={true}
            rowHeight={35}
            indent={10}
            width={ref.current.getBoundingClientRect().width}
            height={ref.current.getBoundingClientRect().height}
            dndRootElement={ref.current}
            className={treeStyles.root}
            onToggle={onToggle}
            dndManager={dndManager}
            searchTerm={searchTerm}
          >
            {(treeProps: NodeRendererProps<SchemaNodeExtended>) => (
              <SchemaTreeNode
                id={id}
                flattenedSchemaMap={flattenedSchemaMap}
                schema={props.schema}
                containerTop={ref?.current?.getBoundingClientRect().top}
                containerBottom={ref?.current?.getBoundingClientRect().bottom}
                {...treeProps}
              />
            )}
          </Tree> */}
        </>
      ) : null}
    </div>
  );
};
