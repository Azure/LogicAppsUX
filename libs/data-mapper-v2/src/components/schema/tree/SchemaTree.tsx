import { emptyCanvasRect, type SchemaExtended, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useCallback, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { DataMapperWrappedContext } from '../../../core';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { getNodeIdForScroll, type NodeScrollDirection } from '../../../utils';
import { updateCanvasNodePosition } from 'core/state/DataMapSlice';

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

  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { scroll } = useContext(DataMapperWrappedContext);
  const {
    width: canvasWidth,
    height: canvasHeight,
    y: canvasTop,
  } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect);
  const { nodesForScroll } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  const onScrollFromSibling = useCallback(
    (newScrollTop: number) => {
      if (treeRef?.current) {
        if (newScrollTop > treeRef.current.scrollHeight) {
          treeRef.current.scrollTop = treeRef.current.scrollHeight;
        } else if (newScrollTop < 0) {
          treeRef.current.scrollTop = 0;
        } else {
          treeRef.current.scrollTop = newScrollTop;
        }
      }
    },
    [treeRef]
  );

  useLayoutEffect(() => {
    if (treeRef?.current && canvasWidth > 0 && canvasHeight > 0 && canvasTop !== -1) {
      const left = 0;
      const right = canvasWidth;
      const top = treeRef.current.getBoundingClientRect().y;
      const bottom = canvasHeight;
      const allIds = Object.keys(nodesForScroll);
      const directions: NodeScrollDirection[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      const positions = [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
      ];

      for (let i = 0; i < directions.length; ++i) {
        const direction = directions[i];
        const position = positions[i];
        const id = getNodeIdForScroll(allIds, direction);
        if (id) {
          dispatch(updateCanvasNodePosition({ id, position }));
        }
      }
    }
  }, [canvasWidth, canvasHeight, canvasTop, treeRef, nodesForScroll, dispatch]);

  useEffect(() => {
    if (treeRef?.current && scroll) {
      if ((isLeftDirection && !scroll.source) || (!isLeftDirection && !scroll.target)) {
        scroll.setScroll(
          {
            scrollTop: treeRef.current.scrollTop,
            scrollHeight: treeRef.current.scrollHeight,
            onScroll: onScrollFromSibling,
          },
          isLeftDirection ? 'source' : 'target'
        );
      }
    }
  }, [treeRef, isLeftDirection, onScrollFromSibling, scroll]);
  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
    >
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
