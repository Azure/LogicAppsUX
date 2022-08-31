import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { bundleIcon, CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import {  provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';
import { fastTreeItem, fastTreeView } from "@microsoft/fast-components";
import type { TreeItemOptions} from '@microsoft/fast-foundation';
import { TreeItem, treeItemTemplate} from '@microsoft/fast-foundation';

// const stylesEx = css`
//   :host {
//     color: red;
//     background-color: red;
//   }
// `;
// const overrides: OverrideFoundationElementDefinition<FoundationElementDefinition> = {
//   styles: stylesEx
  //(ctx, def) => {
  //   const baseStyles = treeItemStyles(ctx, def as TreeItemOptions);
  //   console.log(baseStyles);
  //   debugger;
  //   return stylesEx;//css`${baseStyles.behaviors}`
  //}
//}

export const fluentTreeItem2 = TreeItem.compose<TreeItemOptions>({
  baseName: 'tree-item',
  template: treeItemTemplate,
  expandCollapseGlyph: `
    <svg width="12" height="12" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.65 2.15a.5.5 0 000 .7L7.79 6 4.65 9.15a.5.5 0 10.7.7l3.5-3.5a.5.5 0 000-.7l-3.5-3.5a.5.5 0 00-.7 0z"/>
    </svg>
  `,
});

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
export const FastTreeView = wrap(fastTreeView());
export const FastTreeItem = wrap(fastTreeItem());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const SchemaTreeDanielle: React.FC<SchemaTreeProps> = ({ schema, currentlySelectedNodes, onLeafNodeClick }: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    return convertToFastTreeItem(schema.schemaTreeRoot, currentlySelectedNodes, onLeafNodeClick);
  }, [schema, currentlySelectedNodes, onLeafNodeClick]);
  console.log(treeItems)

  return <FastTreeView><FastTreeItem>Item</FastTreeItem></FastTreeView>;
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
          // onClick={() => {
          //   onLeafNodeClick(childNode);
          // }}
        >
          {/* <TreeItemContent nodeType={childNode.schemaNodeDataType} filled={isNodeSelected}>
            {childNode.name}
          </TreeItemContent> */}
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
