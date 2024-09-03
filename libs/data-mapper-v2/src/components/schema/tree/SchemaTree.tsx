import { emptyCanvasRect, type SchemaExtended, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useHandleStyles, useStyles } from './styles';
import { useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/Store';
import useSchema from '../useSchema';

export type SchemaTreeProps = {
  id: string;
  schema: SchemaExtended;
  flattenedSchemaMap: Record<string, SchemaNodeExtended>;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const styles = useStyles();
  const {
    id,
    flattenedSchemaMap,
    schema: { schemaTreeRoot },
  } = props;

  const { panelNodeId, isSourceSchema } = useSchema({ id });
  const { height: currentHeight } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
  const { nodesForScroll } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const intl = useIntl();
  const handleStyles = useHandleStyles();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  const onScroll = useCallback(() => {
    updateNodeInternals(panelNodeId);
  }, [panelNodeId, updateNodeInternals]);

  useEffect(() => {
    updateNodeInternals(panelNodeId);
  }, [panelNodeId, schemaTreeRoot, flattenedSchemaMap, currentHeight, updateNodeInternals]);

  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isSourceSchema ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
      onScroll={onScroll}
    >
      {isSourceSchema ? (
        <>
          {nodesForScroll['top-left'] && (
            <Handle
              id={nodesForScroll['top-left']}
              position={Position.Right}
              type="source"
              className={handleStyles.hidden}
              style={{ top: '87px' }}
            />
          )}
          {currentHeight !== undefined && nodesForScroll['bottom-left'] && (
            <Handle
              id={nodesForScroll['bottom-left']}
              position={Position.Right}
              type="source"
              className={handleStyles.hidden}
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
              className={handleStyles.hidden}
              style={{ top: '87px' }}
            />
          )}
          {currentHeight !== undefined && nodesForScroll['bottom-right'] && (
            <Handle
              id={nodesForScroll['bottom-right']}
              position={Position.Left}
              type="target"
              className={handleStyles.hidden}
              style={{ top: `${currentHeight}px` }}
            />
          )}
        </>
      )}
      <RecursiveTree
        root={schemaTreeRoot}
        id={id}
        flattenedScehmaMap={flattenedSchemaMap}
        treePositionX={treeRef?.current?.getBoundingClientRect().x}
        treePositionY={treeRef?.current?.getBoundingClientRect().y}
      />
    </Tree>
  ) : null;
};
