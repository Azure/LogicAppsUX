import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useCallback, useContext, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';
import { DataMapperWrappedContext } from '../../../core';

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
  const {
    scroll: { source, target, setScroll },
  } = useContext(DataMapperWrappedContext);

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

  const onScroll = useCallback(
    (e?: any) => {
      if (e?.target && source && target) {
        const scrollLocation = isLeftDirection ? 'source' : 'target';
        const scrollObjectForCurrentScehma = isLeftDirection ? source : target;
        const scrollObjectForOtherScehma = isLeftDirection ? target : source;

        if (scrollObjectForCurrentScehma.preventScroll) {
          setScroll({ ...scrollObjectForCurrentScehma, preventScroll: false }, scrollLocation);
          return;
        }
        scrollObjectForOtherScehma.onScroll(e.target.scrollTop);
        setScroll(
          {
            scrollTop: e.target.scrollTop,
            scrollHeight: e.target.scrollHeight,
            onScroll: onScrollFromSibling,
            preventScroll: true,
          },
          scrollLocation
        );
      }
    },
    [source, target, isLeftDirection, setScroll, onScrollFromSibling]
  );

  useEffect(() => {
    if (treeRef?.current) {
      if ((isLeftDirection && !source) || (!isLeftDirection && !target)) {
        setScroll(
          {
            scrollTop: treeRef.current.scrollTop,
            scrollHeight: treeRef.current.scrollHeight,
            onScroll: onScrollFromSibling,
          },
          isLeftDirection ? 'source' : 'target'
        );
      }
    }
  }, [treeRef, isLeftDirection, source, target, onScrollFromSibling, setScroll]);
  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
      onScroll={onScroll}
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
