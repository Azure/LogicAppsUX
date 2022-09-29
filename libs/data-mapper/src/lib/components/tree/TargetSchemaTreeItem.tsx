import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { SchemaTreeItem, SharedTreeItemContent } from './SchemaTreeItem';
import { tokens } from '@fluentui/react-components';
import { CheckmarkCircle12Filled, CircleHalfFill12Regular, Circle12Regular } from '@fluentui/react-icons';
import React, { useMemo } from 'react';

export enum ItemToggledState {
  Completed = 'Completed',
  InProgress = 'InProgress',
  NotStarted = 'NotStarted',
}

export type LeafItemToggledState = ItemToggledState.NotStarted | ItemToggledState.Completed;
export type ParentItemToggledState = LeafItemToggledState | ItemToggledState.InProgress;

export const targetFastTreeItemStyles = `
  .positioning-region {
      border-radius: ${tokens.borderRadiusMedium};
      background-color: ${tokens.colorNeutralBackground4};
      height: 28px;
      padding: 4px 6px 4px 6px;
  }
  .content-region {
      height: 16px;
      color: ${tokens.colorNeutralForeground1};
  }
  :host(.nested) .expand-collapse-button:hover {
      background: inherit;
  }
  :host(:not([disabled])).positioning-region:hover {
      background: ${tokens.colorNeutralBackground4Hover};
  }
`;

export type TargetSchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  toggledNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
};

export const TargetSchemaFastTreeItem = ({ childNode, toggledNodes, onLeafNodeClick }: TargetSchemaFastTreeItemProps) => {
  return <SchemaTreeItem childNode={childNode} toggledNodes={toggledNodes} onLeafNodeClick={onLeafNodeClick} isTargetSchemaItem />;
};

export interface TargetTreeItemContentProps {
  nodeType: SchemaNodeDataType;
  isSelected: boolean;
  children?: React.ReactNode;
  status: ParentItemToggledState;
}

export const TargetTreeItemContent = ({ nodeType, isSelected, children, status }: TargetTreeItemContentProps) => {
  const statusIcon = useMemo(() => {
    switch (status) {
      case ItemToggledState.Completed:
        return (
          <CheckmarkCircle12Filled
            style={{ display: 'flex', marginRight: '4px' }}
            primaryFill={tokens.colorPaletteGreenForeground1}
          ></CheckmarkCircle12Filled>
        );
      case ItemToggledState.InProgress:
        return <CircleHalfFill12Regular primaryFill={tokens.colorPaletteYellowForeground1}></CircleHalfFill12Regular>;
      case ItemToggledState.NotStarted:
        return <Circle12Regular primaryFill={tokens.colorNeutralForegroundDisabled}></Circle12Regular>;
      default:
        return <div />;
    }
  }, [status]);

  return (
    <>
      <span style={{ display: 'flex', marginRight: '4px', marginTop: '2px' }} slot="start">
        {statusIcon}
      </span>
      {SharedTreeItemContent(nodeType, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
    </>
  );
};
