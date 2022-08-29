import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
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
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, currentlySelectedNodes, onLeafNodeClick }: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    return convertToFastTreeItem(schema.schemaTreeRoot, currentlySelectedNodes, onLeafNodeClick);
  }, [schema, currentlySelectedNodes, onLeafNodeClick]);

  return <FastTreeView>{treeItems}</FastTreeView>;
};

const convertToFastTreeItem = (
  node: SchemaNodeExtended,
  currentlySelectedNodes: SchemaNodeExtended[],
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void
) => {
  return node.children.map((childNode) => {
    const isNodeSelected = !!currentlySelectedNodes.find((currentlySelectedNode) => currentlySelectedNode.key === childNode.key);
    if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
      return (
        // TODO onclick for object level adding
        <FastTreeItem key={childNode.key}>
          <TreeItemContent nodeType={childNode.schemaNodeDataType} filled={isNodeSelected}>
            {childNode.name}
          </TreeItemContent>
          {convertToFastTreeItem(childNode, currentlySelectedNodes, onLeafNodeClick)}
        </FastTreeItem>
      );
    } else {
      return (
        <FastTreeItem
          key={childNode.key}
          onClick={() => {
            onLeafNodeClick(childNode);
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
