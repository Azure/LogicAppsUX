import type { SchemaNodeExtended } from '../../models';
import { iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import { makeStyles, mergeClasses, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import { useState } from 'react';

export const useSchemaTreeItemStyles = makeStyles({
  nodeContainer: {
    minWidth: 0,
    width: '100%',
    height: '28px',
    ...shorthands.padding('4px', '6px'),
    ...shorthands.borderRadius(`${tokens.borderRadiusMedium}`),
    ':hover': {
      cursor: 'pointer',
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
  indicator: {
    height: '16px',
    width: '2px',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    backgroundColor: tokens.colorBrandForeground1,
    marginRight: '4px',
  },
});

interface SourceSchemaTreeItemProps {
  node: SchemaNodeExtended;
  isNodeAdded: boolean;
  onClick: () => void;
}

const SourceSchemaTreeItem = ({ node, isNodeAdded, onClick }: SourceSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();
  const [isContainerHovered, setIsContainerHovered] = useState(false);

  const BundledTypeIcon = iconForSchemaNodeDataType(node.schemaNodeDataType, 16, true, node.nodeProperties);

  return (
    <Stack
      className={mergeClasses(styles.nodeContainer, styles.sourceSchemaNode)}
      style={{ backgroundColor: isNodeAdded ? tokens.colorBrandBackground2 : undefined }}
      onClick={onClick}
      onMouseEnter={() => setIsContainerHovered(true)}
      onMouseLeave={() => setIsContainerHovered(false)}
      horizontal
      verticalAlign="center"
    >
      <BundledTypeIcon
        className={styles.dataTypeIcon}
        style={{ color: isNodeAdded ? tokens.colorBrandForeground1 : undefined }}
        filled={isNodeAdded ? true : undefined}
      />

      <Text className={styles.nodeName} style={isContainerHovered ? { ...typographyStyles.caption1Strong } : undefined}>
        {node.name}
      </Text>

      <span style={{ display: 'flex', position: 'sticky', right: 10 }}>
        {isNodeAdded ? (
          <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />
        ) : (
          <Circle16Regular primaryFill={tokens.colorNeutralForeground3} />
        )}
      </span>
    </Stack>
  );
};

export default SourceSchemaTreeItem;
