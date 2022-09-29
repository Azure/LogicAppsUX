import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { SchemaTreeItem, SharedTreeItemContent } from './SchemaTreeItem';
import { tokens } from '@fluentui/react-components';
import { CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import React from 'react';

export const sourceFastTreeItemStyles = `
  .positioning-region {
      border-radius: ${tokens.borderRadiusMedium};
      background-color: ${tokens.colorNeutralBackground1};
      height: 28px;
      padding: 4px 6px 4px 6px;
  }
  .content-region {
      height: 16px;
      color: ${tokens.colorNeutralForeground1};
  }
  :host(:not([disabled])).positioning-region:hover {
      background: ${tokens.colorNeutralBackground1Hover};
  }
  :host([selected])::after {
      visibility: hidden;
  }
  :host(.nested) .expand-collapse-button:hover {
      background: inherit;
  }
`;

export type SourceSchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  toggledNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
};

export const SourceSchemaFastTreeItem = ({ childNode, toggledNodes, onLeafNodeClick }: SourceSchemaFastTreeItemProps) => {
  return <SchemaTreeItem childNode={childNode} toggledNodes={toggledNodes} onLeafNodeClick={onLeafNodeClick} />;
};

export interface SourceTreeItemContentProps {
  nodeType: SchemaNodeDataType;
  isSelected: boolean;
  children?: React.ReactNode;
}

export const SourceTreeItemContent = ({ nodeType, isSelected, children }: SourceTreeItemContentProps) => {
  const filledIcon = <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />;
  const restIcon = <Circle16Regular primaryFill={tokens.colorNeutralForeground3} />;

  return (
    <>
      {SharedTreeItemContent(nodeType, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="end">
        {isSelected ? filledIcon : restIcon}
      </span>
    </>
  );
};
