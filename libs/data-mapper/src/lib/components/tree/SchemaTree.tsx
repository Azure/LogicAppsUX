import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { convertToFastTreeItem } from './SchemaTreeItem';
import { TreeHeader } from './treeHeader';
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

export const SchemaTree: React.FC<SchemaTreeProps> = ({
  schema,
  currentlySelectedNodes,
  visibleConnectedNodes,
  onNodeClick,
}: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    const completeSelectedNodeList = [...currentlySelectedNodes, ...visibleConnectedNodes];
    return convertToFastTreeItem(schema.schemaTreeRoot, completeSelectedNodeList, onNodeClick);
  }, [schema, currentlySelectedNodes, visibleConnectedNodes, onNodeClick]);

  return (
    <>
      <TreeHeader onSearch={(term) => console.log(term)} onClear={() => 'return'} title="Input Schema"></TreeHeader>
      <FastTreeView>{treeItems}</FastTreeView>
    </>
  );
};
