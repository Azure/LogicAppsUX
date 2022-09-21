import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { convertToFastTreeItem } from './OutputTreeItem';
import { fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeView = wrap(fluentTreeView());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  visibleConnectedNodes: SchemaNodeExtended[];
  onNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const TargetSchemaTree: React.FC<SchemaTreeProps> = ({
  schema,
  currentlySelectedNodes,
  visibleConnectedNodes,
  onNodeClick,
}: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    const completeSelectedNodeList = [...currentlySelectedNodes, ...visibleConnectedNodes];
    return convertToFastTreeItem(schema.schemaTreeRoot, completeSelectedNodeList, onNodeClick);
  }, [schema, currentlySelectedNodes, visibleConnectedNodes, onNodeClick]);

  return <FastTreeView>{treeItems}</FastTreeView>;
};
