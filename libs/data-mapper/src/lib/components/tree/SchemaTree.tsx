import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { allChildNodesSelected, isLeafNode } from '../../utils/Schema.Utils';
import { bundleIcon, CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
export const FastTreeView = wrap(fluentTreeView());
export const FastTreeItem = wrap(fluentTreeItem());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, currentlySelectedNodes, onNodeClick }: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    return convertToFastTreeItem(schema.schemaTreeRoot, currentlySelectedNodes, onNodeClick);
  }, [schema, currentlySelectedNodes, onNodeClick]);

  return <FastTreeView>{treeItems}</FastTreeView>;
};

const convertToFastTreeItem = (
  node: SchemaNodeExtended,
  currentlySelectedNodes: SchemaNodeExtended[],
  onNodeClick: (schemaNode: SchemaNodeExtended) => void
) => {
  return node.children.map((childNode) => {
    if (!isLeafNode(childNode)) {
      const isNodeSelected = allChildNodesSelected(childNode, currentlySelectedNodes);

      return (
        <FastTreeItem
          key={childNode.key}
          /* TODO resolve issue where clicking a nested onClick will call the parent onClick as well
          onClick={() => {
            onNodeClick(childNode);
          }}*/
        >
          <TreeItemContent nodeType={childNode.schemaNodeDataType} filled={isNodeSelected}>
            {childNode.name}
          </TreeItemContent>
          {convertToFastTreeItem(childNode, currentlySelectedNodes, onNodeClick)}
        </FastTreeItem>
      );
    } else {
      const isNodeSelected = currentlySelectedNodes.some((currentlySelectedNode) => currentlySelectedNode.key === childNode.key);
      return (
        <FastTreeItem
          key={childNode.key}
          onClick={() => {
            onNodeClick(childNode);
          }}
        >
          <TreeItemContent nodeType={childNode.schemaNodeDataType} filled={isNodeSelected}>
            {childNode.name}
          </TreeItemContent>
        </FastTreeItem>
      );
    }
  });
};

export interface SchemaNodeTreeItemContentProps {
  nodeType: SchemaNodeDataType;
  filled: boolean;
  children?: React.ReactNode;
}

const TreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ nodeType, filled, children }) => {
  const BundledTypeIcon = icon16ForSchemaNodeType(nodeType);
  const BundledAddIcon = bundleIcon(CheckmarkCircle16Filled, Circle16Regular);

  return (
    <>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="start">
        <BundledTypeIcon style={{ verticalAlign: 'middle' }} filled={filled} />
      </span>
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="end">
        <BundledAddIcon style={{ verticalAlign: 'middle' }} filled={filled} />
      </span>
    </>
  );
};
