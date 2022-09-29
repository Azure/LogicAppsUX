import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { SchemaFastTreeItem } from './TargetTreeItem';
import { fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeView = wrap(fluentTreeView());

const recursivelyBuildSchemaTree = (
  schemaTreeRoot: SchemaNodeExtended,
  currentlySelectedNodes: SchemaNodeExtended[],
  onNodeClick: (schemaNode: SchemaNodeExtended) => void
) =>
  schemaTreeRoot.children.map((childNodeChild) => (
    <SchemaFastTreeItem
      key={childNodeChild.key}
      childNode={childNodeChild}
      currentlySelectedNodes={currentlySelectedNodes}
      onLeafNodeClick={onNodeClick}
    />
  ));

export interface SchemaTreeProps {
  schema: SchemaExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const TargetSchemaTree: React.FC<SchemaTreeProps> = ({ schema, currentlySelectedNodes, onNodeClick }: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(
    () => recursivelyBuildSchemaTree(schema.schemaTreeRoot, currentlySelectedNodes, onNodeClick),
    [schema, currentlySelectedNodes, onNodeClick]
  );

  return <FastTreeView>{treeItems}</FastTreeView>;
};
