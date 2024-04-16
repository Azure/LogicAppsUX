import { setCurrentTargetSchemaNode } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { useSchemaTreeItemStyles } from './SourceSchemaTreeItem';
import { TreeIndicator } from './TreeBranch';
import { Stack } from '@fluentui/react';
import { mergeClasses, Text, tokens } from '@fluentui/react-components';
import { CheckmarkCircle12Filled, Circle12Regular, CircleHalfFill12Regular, Document20Regular } from '@fluentui/react-icons';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export type NodeToggledStateDictionary = { [key: string]: ItemToggledState };
export const ItemToggledState = {
  Completed: 'Completed',
  InProgress: 'InProgress',
  NotStarted: 'NotStarted',
} as const;
export type ItemToggledState = (typeof ItemToggledState)[keyof typeof ItemToggledState];

interface TargetSchemaTreeItemProps {
  node: SchemaNodeExtended;
  status: ItemToggledState;
}

const TargetSchemaTreeItem = ({ node, status }: TargetSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();

  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);

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

  const BundledTypeIcon = iconForNormalizedDataType(node.type, 16, true, node.nodeProperties);

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

interface TargetSchemaTreeHeaderProps {
  status?: ItemToggledState;
}

export const TargetSchemaTreeHeader = ({ status }: TargetSchemaTreeHeaderProps) => {
  const styles = useSchemaTreeItemStyles();
  const dispatch = useDispatch<AppDispatch>();

  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);

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

  return (
    <Stack
      horizontal
      verticalAlign="center"
      className={mergeClasses(styles.nodeContainer, styles.targetSchemaNode)}
      style={{
        position: 'relative',
        paddingLeft: '8px',
        marginBottom: 0,
        cursor: 'pointer',
        backgroundColor: currentTargetSchemaNode ? undefined : tokens.colorNeutralBackground4Selected,
      }}
      onClick={() => dispatch(setCurrentTargetSchemaNode(undefined))}
    >
      <TreeIndicator shouldShowIndicator={!currentTargetSchemaNode} />

      <span style={{ marginRight: '4px', marginTop: '2px' }}>{statusIcon}</span>

      <Document20Regular />

      <Text className={styles.nodeName}>{targetSchema?.name}</Text>
    </Stack>
  );
};

export default TargetSchemaTreeItem;
