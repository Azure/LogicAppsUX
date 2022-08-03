import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { fluentTreeItem, fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
export const FastTreeView = wrap(fluentTreeView());
export const FastTreeItem = wrap(fluentTreeItem());

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
