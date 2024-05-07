import { SchemaType, equals, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import mockTree from '../mock-test-file';
import { Tree, TreeItem, TreeItemLayout, mergeClasses, type TreeItemOpenChangeData } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useEffect, useState, useMemo } from 'react';
import { ConnectorBox } from './ConnectorBox';

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
    const openKeysByDefault = (root: SchemaNodeExtended) => {
      if (root.children.length > 0) {
        openKeys[root.key] = true;
      }
      for (const child of root.children) {
        openKeysByDefault(child);
      }
    };

    openKeysByDefault(mockData.schemaTreeRoot);
    setOpenKeys(openKeys);
  }, []);

  const displaySchemaTree = (root: SchemaNodeExtended) => {
    if (root.children.length === 0) {
      return (
        <TreeItem itemType="leaf" key={root.key}>
          <TreeItemLayout className={isLeftDirection ? '' : styles.rightTreeItemLayout}>
            <ConnectorBox
              isLeftDirection={isLeftDirection}
              id={`box-${root.key}`}
              text={root.name}
              addConnection={(start: string, end: string) => {
                console.log(start, end);
              }}
              isHovered={false}
              isAdded={false}
            />
          </TreeItemLayout>
        </TreeItem>
      );
    }

    return (
      <TreeItem itemType="branch" open={openKeys[root.key]} value={root.key} onOpenChange={onOpenTreeItem}>
        <TreeItemLayout className={mergeClasses(styles.rootNode, isLeftDirection ? '' : styles.rightTreeItemLayout)}>
          {root.name}
        </TreeItemLayout>
        <Tree>
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
