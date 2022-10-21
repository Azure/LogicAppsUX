import type { SchemaNodeExtended } from '../../models';
import { ItemToggledState, SchemaTreeItem, SharedTreeItemContent } from './SchemaTreeItem';
import type { NodeToggledStateDictionary } from './SchemaTreeItem';
import { tokens } from '@fluentui/react-components';
import { CheckmarkCircle12Filled, CircleHalfFill12Regular, Circle12Regular } from '@fluentui/react-icons';
import React, { useMemo } from 'react';

export type TargetSchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  toggledStatesDictionary?: NodeToggledStateDictionary;
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
};

export const TargetSchemaFastTreeItem = (props: TargetSchemaFastTreeItemProps) => {
  return <SchemaTreeItem {...props} isTargetSchemaItem />;
};

export interface TargetTreeItemContentProps {
  node: SchemaNodeExtended;
  isSelected: boolean;
  children?: React.ReactNode;
  status: ItemToggledState;
}

export const TargetTreeItemContent = ({ node, isSelected, children, status }: TargetTreeItemContentProps) => {
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
      {SharedTreeItemContent(node, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
    </>
  );
};
