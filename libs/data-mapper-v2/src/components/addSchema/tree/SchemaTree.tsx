import { SchemaType, equals, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import mockTree from '../mock-test-file';
import { Tree, TreeItem, mergeClasses, type TreeItemOpenChangeData } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useEffect, useState, useMemo } from 'react';
import { TreeNode } from './TreeNode';

export type SchemaTreeProps = {
  schemaType?: SchemaType;
};

export const SchemaTree = (props: SchemaTreeProps) => {
  const mockData = mockTree;
  const styles = useStyles();
  const { schemaType } = props;
  const isLeftDirection = useMemo(() => equals(schemaType, SchemaType.Source), [schemaType]);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const onOpenTreeItem = (_event: any, data: TreeItemOpenChangeData) => {
    setOpenKeys((prev) => ({
      ...prev,
      [data.value]: !prev[data.value],
    }));
  };

  useEffect(() => {
    const openKeys: Record<string, boolean> = {};

    const setDefaultState = (root: SchemaNodeExtended) => {
      if (root.children.length > 0) {
        openKeys[root.key] = true;
      }

      for (const child of root.children) {
        setDefaultState(child);
      }
    };

    setDefaultState(mockData.schemaTreeRoot);
    setOpenKeys(openKeys);
  }, [mockData]);

  const displaySchemaTree = (root: SchemaNodeExtended) => {
    if (root.children.length === 0) {
      return (
        <TreeItem itemType="leaf" id={root.key}>
          <TreeNode
            data={root}
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
      <TreeItem itemType="branch" open={openKeys[root.key]} id={root.key} value={root.key} onOpenChange={onOpenTreeItem}>
        <TreeNode data={root} isLeftDirection={isLeftDirection} id={root.key} text={root.name} isHovered={false} isAdded={false} />
        <Tree aria-label="sub-tree">
          {root.children.map((child: SchemaNodeExtended, index: number) => (
            <span key={`tree-${child.key}-${index}`}>{displaySchemaTree(child)}</span>
          ))}
        </Tree>
      </TreeItem>
    );
  };

  return mockData.schemaTreeRoot ? (
    <Tree
      className={isLeftDirection ? mergeClasses(styles.leftWrapper, styles.wrapper) : mergeClasses(styles.rightWrapper, styles.wrapper)}
      aria-label="tree"
    >
      {displaySchemaTree(mockData.schemaTreeRoot)}
    </Tree>
  ) : (
    <></>
  );
};
