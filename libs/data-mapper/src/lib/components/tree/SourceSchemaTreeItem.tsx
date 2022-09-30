import type { SchemaNodeExtended } from '../../models';
import { SchemaTreeItem, SharedTreeItemContent } from './SchemaTreeItem';
import { tokens } from '@fluentui/react-components';
import { CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import React from 'react';

export type SourceSchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  toggledNodes?: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
};

export const SourceSchemaFastTreeItem = (props: SourceSchemaFastTreeItemProps) => {
  return <SchemaTreeItem {...props} />;
};

export interface SourceTreeItemContentProps {
  node: SchemaNodeExtended;
  isSelected: boolean;
  children?: React.ReactNode;
}

export const SourceTreeItemContent = ({ node, isSelected, children }: SourceTreeItemContentProps) => {
  const filledIcon = <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />;
  const restIcon = <Circle16Regular primaryFill={tokens.colorNeutralForeground3} />;

  return (
    <>
      {SharedTreeItemContent(node, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="end">
        {isSelected ? filledIcon : restIcon}
      </span>
    </>
  );
};
