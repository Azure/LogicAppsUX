import type { SchemaNodeExtended } from '../../models';
import { iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import { useSchemaTreeItemStyles } from './SourceSchemaTreeItem';
import { Stack } from '@fluentui/react';
import { mergeClasses, Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircle12Filled, CircleHalfFill12Regular, Circle12Regular } from '@fluentui/react-icons';
import { useMemo } from 'react';

export type NodeToggledStateDictionary = { [key: string]: ItemToggledState };
export enum ItemToggledState {
  Completed = 'Completed',
  InProgress = 'InProgress',
  NotStarted = 'NotStarted',
}

interface TargetSchemaTreeItemProps {
  node: SchemaNodeExtended;
  status: ItemToggledState;
  onClick: () => void;
}

const TargetSchemaTreeItem = ({ node, status, onClick }: TargetSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();

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

  const BundledTypeIcon = iconForSchemaNodeDataType(node.schemaNodeDataType, 16, false, node.nodeProperties);

  return (
    <Stack className={mergeClasses(styles.nodeContainer, styles.targetSchemaNode)} onClick={onClick} horizontal verticalAlign="center">
      <div style={{ marginRight: '4px', marginTop: '2px' }}>{statusIcon}</div>

      <div>
        <BundledTypeIcon style={{ display: 'flex', paddingLeft: tokens.spacingHorizontalXS, paddingRight: tokens.spacingHorizontalXS }} />
      </div>

      <Text className={styles.nodeName}>{node.name}</Text>
    </Stack>
  );
};

export default TargetSchemaTreeItem;
