import type { RootState } from '../../core/state/Store';
import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import { makeStyles, mergeClasses, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { AddCircle16Regular, CheckmarkCircle16Filled, Circle16Regular, Document20Regular } from '@fluentui/react-icons';
import type { SchemaNodeExtended } from '@microsoft/vscode-extension';
import { useSelector } from 'react-redux';

export const useSchemaTreeItemStyles = makeStyles({
  nodeContainer: {
    minWidth: 0,
    width: '100%',
    height: '28px',
    ...shorthands.padding('4px', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: '2px',
    marginBottom: '2px',
    '&:hover .fui-Text': {
      ...typographyStyles.caption1Strong,
    },
  },
  sourceSchemaNode: {
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  targetSchemaNode: {
    backgroundColor: tokens.colorNeutralBackground4,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground4Hover,
    },
  },
  dataTypeIcon: {
    color: tokens.colorNeutralForeground1,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
  },
  nodeName: {
    color: tokens.colorNeutralForeground1,
    ...typographyStyles.caption1,
    width: '100%',
    ...shorthands.overflow('hidden'),
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
});

interface SourceSchemaTreeItemProps {
  node: SchemaNodeExtended;
  isNodeAdded: boolean;
  isNodeHovered: boolean;
}

const SourceSchemaTreeItem = ({ node, isNodeAdded, isNodeHovered }: SourceSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();

  const BundledTypeIcon = iconForNormalizedDataType(node.type, 16, true, node.nodeProperties);

  return (
    <Stack horizontal verticalAlign="center" style={{ width: '100%', minWidth: 0 }}>
      <BundledTypeIcon
        className={styles.dataTypeIcon}
        style={{ color: isNodeAdded ? tokens.colorBrandForeground1 : undefined }}
        filled={isNodeAdded ? true : undefined}
      />

      <Text className={styles.nodeName}>{node.name}</Text>

      <span style={{ display: 'flex', position: 'sticky', right: 10 }}>
        {isNodeAdded ? (
          <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />
        ) : isNodeHovered ? (
          <AddCircle16Regular primaryFill={tokens.colorNeutralForeground3} />
        ) : (
          <Circle16Regular primaryFill={tokens.colorNeutralForeground3} />
        )}
      </span>
    </Stack>
  );
};

export const SourceSchemaTreeHeader = () => {
  const styles = useSchemaTreeItemStyles();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);

  return (
    <Stack
      horizontal
      verticalAlign="center"
      className={mergeClasses(styles.nodeContainer, styles.sourceSchemaNode)}
      style={{ width: '100%', minWidth: 0, paddingLeft: '8px', marginBottom: 0 }}
    >
      <Document20Regular />

      <Text className={styles.nodeName}>{sourceSchema?.name}</Text>
    </Stack>
  );
};

export default SourceSchemaTreeItem;
