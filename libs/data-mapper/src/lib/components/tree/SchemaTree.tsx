import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { provideFASTDesignSystem, fastTreeView, fastTreeItem } from '@microsoft/fast-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';

const { wrap } = provideReactWrapper(React, provideFASTDesignSystem());
export const FastTreeView = wrap(fastTreeView());
export const FastTreeItem = wrap(fastTreeItem());

export interface SchemaTreeProps {
  schema: SchemaExtended;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ schema }: SchemaTreeProps) => {
  return <FastTreeView>{convertToFastTreeItem(schema.schemaTreeRoot)}</FastTreeView>;
};

const convertToFastTreeItem = (node: SchemaNodeExtended) => {
  return node.children.map((childNode) => {
    if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
      return (
        <FastTreeItem>
          {childNode.name}
          {convertToFastTreeItem(childNode)}
        </FastTreeItem>
      );
    } else {
      return <FastTreeItem>{childNode.name}</FastTreeItem>;
    }
  });
};
