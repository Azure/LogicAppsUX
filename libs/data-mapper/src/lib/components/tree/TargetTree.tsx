import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { convertToFastTreeItem } from './TargetTreeItem';
import { fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeView = wrap(fluentTreeView());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const TargetSchemaTree: React.FC<SchemaTreeProps> = ({ schema, currentlySelectedNodes, onNodeClick }: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    return convertToFastTreeItem(schema.schemaTreeRoot, currentlySelectedNodes, onNodeClick);
  }, [schema, currentlySelectedNodes, onNodeClick]);

  return <FastTreeView>{treeItems}</FastTreeView>;
};
