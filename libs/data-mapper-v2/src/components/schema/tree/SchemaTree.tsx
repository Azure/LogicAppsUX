import { emptyCanvasRect, type SchemaExtended, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { NodeIds } from '../../../constants/ReactFlowConstants';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/Store';

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

  const { height: currentHeight } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
  const { nodesForScroll } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  const onScroll = useCallback(() => {
    updateNodeInternals(isLeftDirection ? NodeIds.source : NodeIds.target);
  }, [isLeftDirection, updateNodeInternals]);

  useEffect(() => {
    updateNodeInternals(isLeftDirection ? NodeIds.source : NodeIds.target);
  }, [updateNodeInternals, schemaTreeRoot, flattenedSchemaMap, isLeftDirection, currentHeight]);

  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
      onScroll={onScroll}
    >
      {isLeftDirection ? (
        <>
          {nodesForScroll['top-left'] && (
            <Handle
              id={nodesForScroll['top-left']}
              position={Position.Right}
              type="source"
              className={styles.temporaryHandle}
              style={{ top: '87px' }}
            />
          )}
          {currentHeight !== undefined && nodesForScroll['bottom-left'] && (
            <Handle
              id={nodesForScroll['bottom-left']}
              position={Position.Right}
              type="source"
              className={styles.temporaryHandle}
              style={{ top: `${currentHeight}px` }}
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
              className={styles.temporaryHandle}
              style={{ top: '87px' }}
            />
          )}
          {currentHeight !== undefined && nodesForScroll['bottom-right'] && (
            <Handle
              id={nodesForScroll['bottom-right']}
              position={Position.Left}
              type="target"
              className={styles.temporaryHandle}
              style={{ top: `${currentHeight}px` }}
            />
          )}
        </>
      )}
      <RecursiveTree
        root={schemaTreeRoot}
        isLeftDirection={isLeftDirection}
        flattenedScehmaMap={flattenedSchemaMap}
        treePositionX={treeRef?.current?.getBoundingClientRect().x}
        treePositionY={treeRef?.current?.getBoundingClientRect().y}
      />
    </Tree>
  ) : null;
};
