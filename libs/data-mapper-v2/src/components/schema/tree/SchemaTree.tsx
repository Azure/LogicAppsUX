import type { SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { Tree, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useState, useLayoutEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import RecursiveTree from './RecursiveTree';

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
  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

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
        treePositionX={treeRef?.current?.getBoundingClientRect().x}
        treePositionY={treeRef?.current?.getBoundingClientRect().y}
      />
    </Tree>
  ) : null;
};
