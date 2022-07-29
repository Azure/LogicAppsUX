import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { provideFASTDesignSystem, fastTreeView, fastTreeItem } from '@microsoft/fast-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';

const { wrap } = provideReactWrapper(React, provideFASTDesignSystem());
export const FastTreeView = wrap(fastTreeView());
export const FastTreeItem = wrap(fastTreeItem());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, onLeafNodeClick }: SchemaTreeProps) => {
  return <FastTreeView>{convertToFastTreeItem(schema.schemaTreeRoot, onLeafNodeClick)}</FastTreeView>;
};

const convertToFastTreeItem = (node: SchemaNodeExtended, onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void) => {
  return node.children.map((childNode) => {
    if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
      return (
        <FastTreeItem key={childNode.key}>
          {childNode.name}
          {convertToFastTreeItem(childNode, onLeafNodeClick)}
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
          {childNode.name}
        </FastTreeItem>
      );
    }
  });
};
