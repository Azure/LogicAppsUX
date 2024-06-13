import { type SchemaExtended, SchemaType, type SchemaNodeExtended, equals } from '@microsoft/logic-apps-shared';
import { Tree, TreeItem, mergeClasses, type TreeItemOpenChangeData } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { TreeNode } from './TreeNode';
import { useIntl } from 'react-intl';
import { flattenSchemaIntoSortArray } from '../../../utils/Schema.Utils';

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
  const [refreshTree, setRefreshTree] = useState(false);
  const [scehmaTree, setSchemaTree] = useState<React.ReactElement>();
  const intl = useIntl();
  const treeRef = useRef<HTMLDivElement | null>(null);

  const treeAriaLabel = intl.formatMessage({
    defaultMessage: 'Schema tree',
    id: 't2Xi1/',
    description: 'tree showing schema nodes',
  });

  const onOpenTreeItem = useCallback(
    (_event: any, _data: TreeItemOpenChangeData) => {
      setRefreshTree(true);
    },
    [setRefreshTree]
  );

  const displaySchemaTree = useCallback(
    (root: SchemaNodeExtended) => {
      if (root.children.length === 0) {
        return (
          <TreeItem itemType="leaf" id={root.key}>
            <TreeNode
              node={root}
              isLeftDirection={isLeftDirection}
              id={root.key}
              text={root.name}
              isHovered={false}
              isAdded={false}
              isLeaf={true}
            />
          </TreeItem>
        );
      }

      return (
        <TreeItem itemType="branch" id={root.key} value={root.key}>
          <TreeNode node={root} isLeftDirection={isLeftDirection} id={root.key} text={root.name} isHovered={false} isAdded={false} />
          <Tree aria-label="sub-tree">
            {root.children.map((child: SchemaNodeExtended, index: number) => (
              <span key={`tree-${child.key}-${index}`}>{displaySchemaTree(child)}</span>
            ))}
          </Tree>
        </TreeItem>
      );
    },
    [isLeftDirection]
  );

  const updateSchemaTree = useCallback(() => {
    const tree = displaySchemaTree(schemaTreeRoot);
    setSchemaTree(tree);
  }, [schemaTreeRoot, setSchemaTree, displaySchemaTree]);

  const treeObserver = useMemo(() => new MutationObserver(updateSchemaTree), [updateSchemaTree]);

  useEffect(() => {
    updateSchemaTree();
  }, [schemaTreeRoot, updateSchemaTree]);

  useEffect(() => {
    if (treeRef.current) {
      treeObserver.observe(treeRef?.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      treeObserver.disconnect();
    };
  }, [treeObserver, treeRef]);

  useEffect(() => {
    if (refreshTree) {
      console.log('We are here');
      updateSchemaTree();
      setRefreshTree(false);
    }
  }, [refreshTree, updateSchemaTree, setRefreshTree]);

  return schemaTreeRoot ? (
    <Tree
      ref={treeRef}
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label={treeAriaLabel}
      defaultOpenItems={flattenSchemaIntoSortArray(schemaTreeRoot)}
      onOpenChange={onOpenTreeItem}
    >
      {scehmaTree}
    </Tree>
  ) : (
    <></>
  );
};
