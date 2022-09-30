import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import type { NodeToggledStateDictionary } from './SchemaTreeItem';
import { SourceSchemaFastTreeItem } from './SourceSchemaTreeItem';
import { TargetSchemaFastTreeItem } from './TargetSchemaTreeItem';
import { fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeView = wrap(fluentTreeView());

// TODO: Props should get a little less nasty/ambiguous if source
// schema trees switch to using toggledStates instead of nodes
export interface SchemaTreeProps {
  schema: SchemaExtended;
  toggledNodes?: SchemaNodeExtended[];
  toggledStatesDictionary?: NodeToggledStateDictionary;
  onNodeClick: (schemaNode: SchemaNodeExtended) => void;
  isTargetSchema?: boolean;
}

export const SchemaTree = (props: SchemaTreeProps) => {
  const { schema, toggledNodes, onNodeClick, isTargetSchema, toggledStatesDictionary } = props;

  return (
    <FastTreeView>
      {!isTargetSchema &&
        schema.schemaTreeRoot.children.map((childNode) => (
          <SourceSchemaFastTreeItem key={childNode.key} childNode={childNode} toggledNodes={toggledNodes} onLeafNodeClick={onNodeClick} />
        ))}

      {isTargetSchema &&
        schema.schemaTreeRoot.children.map((childNode) => (
          <TargetSchemaFastTreeItem
            key={childNode.key}
            childNode={childNode}
            toggledStatesDictionary={toggledStatesDictionary}
            onLeafNodeClick={onNodeClick}
          />
        ))}
    </FastTreeView>
  );
};
