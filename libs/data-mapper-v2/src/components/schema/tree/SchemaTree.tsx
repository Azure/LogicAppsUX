import { emptyCanvasRect, type SchemaExtended, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useStyles, useTreeStyles } from './styles';
import { useCallback, useEffect, useRef } from 'react';
import { useUpdateNodeInternals } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import useSchema from '../useSchema';
import { Tree, type TreeApi, type NodeRendererProps } from 'react-arborist';
import SchemaTreeNode from './SchemaTreeNode';
import { toggleNodeExpandCollapse } from '../../../core/state/DataMapSlice';

export type SchemaTreeProps = {
  id: string;
  schema: SchemaExtended;
  flattenedSchemaMap: Record<string, SchemaNodeExtended>;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<TreeApi<SchemaNodeExtended> | null>(null);
  const styles = useStyles();
  const treeStyles = useTreeStyles();
  const dispatch = useDispatch<AppDispatch>();
  const {
    id,
    flattenedSchemaMap,
    schema: { schemaTreeRoot },
  } = props;

  const { panelNodeId, openKeys, isSourceSchema } = useSchema({ id });
  const { height: currentHeight } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
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
    updateNodeInternals(panelNodeId);
  }, [panelNodeId, schemaTreeRoot, flattenedSchemaMap, currentHeight, updateNodeInternals, openKeys]);

  return (
    <div ref={ref} className={styles.root}>
      {ref?.current && (
        <Tree
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
        >
          {(treeProps: NodeRendererProps<SchemaNodeExtended>) => (
            <SchemaTreeNode id={id} flattenedSchemaMap={flattenedSchemaMap} schema={props.schema} {...treeProps} />
          )}
        </Tree>
      )}
    </div>
  );

  // return schemaTreeRoot ? (
  //   <Tree
  //     ref={treeRef}
  //     className={
  //       isSourceSchema
  //         ? mergeClasses(styles.leftWrapper, styles.wrapper)
  //         : mergeClasses(styles.rightWrapper, styles.wrapper)
  //     }
  //     aria-label={treeAriaLabel}
  //     onScroll={onScroll}
  //   >
  //     {isSourceSchema ? (
  //       <>
  //         {nodesForScroll["top-left"] && (
  //           <Handle
  //             id={nodesForScroll["top-left"]}
  //             position={Position.Right}
  //             type="source"
  //             className={handleStyles.hidden}
  //             style={{ top: "87px" }}
  //           />
  //         )}
  //         {currentHeight !== undefined && nodesForScroll["bottom-left"] && (
  //           <Handle
  //             id={nodesForScroll["bottom-left"]}
  //             position={Position.Right}
  //             type="source"
  //             className={handleStyles.hidden}
  //             style={{ top: `${currentHeight}px` }}
  //           />
  //         )}
  //       </>
  //     ) : (
  //       <>
  //         {nodesForScroll["top-right"] && (
  //           <Handle
  //             id={nodesForScroll["top-right"]}
  //             position={Position.Left}
  //             type="target"
  //             className={handleStyles.hidden}
  //             style={{ top: "87px" }}
  //           />
  //         )}
  //         {currentHeight !== undefined && nodesForScroll["bottom-right"] && (
  //           <Handle
  //             id={nodesForScroll["bottom-right"]}
  //             position={Position.Left}
  //             type="target"
  //             className={handleStyles.hidden}
  //             style={{ top: `${currentHeight}px` }}
  //           />
  //         )}
  //       </>
  //     )}
  //     <RecursiveTree
  //       root={schemaTreeRoot}
  //       id={id}
  //       flattenedScehmaMap={flattenedSchemaMap}
  //       treePositionX={treeRef?.current?.getBoundingClientRect().x}
  //       treePositionY={treeRef?.current?.getBoundingClientRect().y}
  //     />
  //   </Tree>
  // ) : null;
};
