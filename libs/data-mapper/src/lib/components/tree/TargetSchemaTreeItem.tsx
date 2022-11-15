import type { RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import { useSchemaTreeItemStyles } from './SourceSchemaTreeItem';
import { Stack } from '@fluentui/react';
import { Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircle12Filled, CircleHalfFill12Regular, Circle12Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export type NodeToggledStateDictionary = { [key: string]: ItemToggledState };
export enum ItemToggledState {
  Completed = 'Completed',
  InProgress = 'InProgress',
  NotStarted = 'NotStarted',
}

interface TargetSchemaTreeItemProps {
  node: SchemaNodeExtended;
  status: ItemToggledState;
}

const TargetSchemaTreeItem = ({ node, status }: TargetSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();

  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetSchemaNode);

  const isItemCurrentNode = useMemo(() => currentTargetSchemaNode?.key === node.key, [currentTargetSchemaNode, node]);

  const statusIcon = useMemo(() => {
    switch (status) {
      case ItemToggledState.Completed:
        return <CheckmarkCircle12Filled primaryFill={tokens.colorPaletteGreenForeground1} />;
      case ItemToggledState.InProgress:
        return <CircleHalfFill12Regular primaryFill={tokens.colorPaletteYellowForeground1} />;
      case ItemToggledState.NotStarted:
        return <Circle12Regular primaryFill={tokens.colorNeutralForegroundDisabled} />;
      default:
        return null;
    }
  }, [status]);

  const BundledTypeIcon = iconForSchemaNodeDataType(node.schemaNodeDataType, 16, true, node.nodeProperties);

  return (
    <Stack horizontal verticalAlign="center">
      <span style={{ marginRight: '4px', marginTop: '2px' }}>{statusIcon}</span>

      <div style={{ display: 'flex' }}>
        <BundledTypeIcon
          className={styles.dataTypeIcon}
          style={{ color: isItemCurrentNode ? tokens.colorBrandForeground1 : undefined }}
          filled={isItemCurrentNode ? true : undefined}
        />
      </div>

      <Text className={styles.nodeName}>{node.name}</Text>
    </Stack>
  );
};

export default TargetSchemaTreeItem;
