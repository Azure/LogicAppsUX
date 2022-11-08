import type { RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import { iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import { useSchemaTreeItemStyles } from './SourceSchemaTreeItem';
import { Stack } from '@fluentui/react';
import { mergeClasses, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { CheckmarkCircle12Filled, CircleHalfFill12Regular, Circle12Regular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
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
  onClick: () => void;
}

const TargetSchemaTreeItem = ({ node, status, onClick }: TargetSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();

  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetSchemaNode);

  const [isContainerHovered, setIsContainerHovered] = useState(false);

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
    <Stack
      className={mergeClasses(styles.nodeContainer, styles.targetSchemaNode)}
      style={{ backgroundColor: isItemCurrentNode ? tokens.colorNeutralBackground4Selected : undefined }}
      onClick={onClick}
      onMouseEnter={() => setIsContainerHovered(true)}
      onMouseLeave={() => setIsContainerHovered(false)}
      horizontal
      verticalAlign="center"
    >
      <div className={styles.indicator} style={{ visibility: isItemCurrentNode ? 'visible' : 'hidden' }} />

      <span style={{ marginRight: '4px', marginTop: '2px' }}>{statusIcon}</span>

      <div style={{ display: 'flex' }}>
        <BundledTypeIcon
          className={styles.dataTypeIcon}
          style={{ color: isItemCurrentNode ? tokens.colorBrandForeground1 : undefined }}
          filled={isItemCurrentNode ? true : undefined}
        />
      </div>

      <Text className={styles.nodeName} style={isContainerHovered ? { ...typographyStyles.caption1Strong } : undefined}>
        {node.name}
      </Text>
    </Stack>
  );
};

export default TargetSchemaTreeItem;
