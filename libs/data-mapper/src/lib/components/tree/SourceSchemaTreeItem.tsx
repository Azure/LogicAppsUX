import type { SchemaNodeExtended } from '../../models';
import { iconForSchemaNodeDataType } from '../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import { makeStyles, mergeClasses, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';

export const useSchemaTreeItemStyles = makeStyles({
  nodeContainer: {
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
  nodeName: {
    ...typographyStyles.caption1,
    marginRight: '8px',
    width: '100%',
    ':hover': {
      ...typographyStyles.caption1Strong,
    },
  },
});

interface SourceSchemaTreeItemProps {
  node: SchemaNodeExtended;
  isNodeAdded: boolean;
  onClick: () => void;
}

const SourceSchemaTreeItem = ({ node, isNodeAdded, onClick }: SourceSchemaTreeItemProps) => {
  const styles = useSchemaTreeItemStyles();

  const BundledTypeIcon = iconForSchemaNodeDataType(node.schemaNodeDataType, 16, false, node.nodeProperties);

  return (
    <Stack className={mergeClasses(styles.nodeContainer, styles.sourceSchemaNode)} onClick={onClick} horizontal verticalAlign="center">
      <BundledTypeIcon style={{ paddingLeft: tokens.spacingHorizontalXS, paddingRight: tokens.spacingHorizontalXS }} />

      <Text className={styles.nodeName}>{node.name}</Text>

      <span style={{ display: 'flex', marginLeft: 'auto', marginRight: '4px' }}>
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
