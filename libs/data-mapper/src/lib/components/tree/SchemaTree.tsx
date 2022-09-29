import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { SourceSchemaFastTreeItem } from './SourceSchemaTreeItem';
import { TargetSchemaFastTreeItem } from './TargetSchemaTreeItem';
import { fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeView = wrap(fluentTreeView());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  toggledNodes: SchemaNodeExtended[];
  onNodeClick: (schemaNode: SchemaNodeExtended) => void;
  isTargetSchema?: boolean;
}

export const SchemaTree = (props: SchemaTreeProps) => {
  const { schema, toggledNodes, onNodeClick, isTargetSchema } = props;

  return (
    <FastTreeView>
      {!isTargetSchema
        ? schema.schemaTreeRoot.children.map((childNode) => (
            <SourceSchemaFastTreeItem key={childNode.key} childNode={childNode} toggledNodes={toggledNodes} onLeafNodeClick={onNodeClick} />
          ))
        : schema.schemaTreeRoot.children.map((childNode) => (
            <TargetSchemaFastTreeItem key={childNode.key} childNode={childNode} toggledNodes={toggledNodes} onLeafNodeClick={onNodeClick} />
          ))}
    </FastTreeView>
  );
};
