import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { sourceFastTreeItemStyles, SourceTreeItemContent } from './SourceSchemaTreeItem';
import { ItemToggledState, targetFastTreeItemStyles, TargetTreeItemContent, type LeafItemToggledState } from './TargetSchemaTreeItem';
import { Caption1, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronRight16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { OverrideFoundationElementDefinition, TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useCallback, useMemo, useState } from 'react';
import { renderToString } from 'react-dom/server';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());

const useStyles = makeStyles({
  icon: {
    color: tokens.colorPaletteCranberryBorderActive,
    backgroundColor: tokens.colorPaletteRedBackground2,
    '&:hover': {
      backgroundColor: 'inherit',
    },
  },
  hoverText: {
    ...typographyStyles.caption1Strong,
  },
});

export const expandButtonStyle = `
  :host(.nested) .expand-collapse-button:hover {
    background: inherit;
  }
`;

export const SharedTreeItemContent = (nodeType: SchemaNodeDataType, isSelected: boolean): JSX.Element => {
  const BundledTypeIcon = icon16ForSchemaNodeType(nodeType);
  return (
    <span style={{ display: 'flex', paddingLeft: tokens.spacingHorizontalXS, paddingRight: tokens.spacingHorizontalXS }} slot="start">
      <BundledTypeIcon style={{ verticalAlign: 'middle' }} filled={isSelected} />
    </span>
  );
};

interface SchemaTreeItemProps {
  childNode: SchemaNodeExtended;
  toggledNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
  isTargetSchemaItem?: boolean;
  isTargetLeafItemSelected?: boolean;
  targetLeafItemStatus?: LeafItemToggledState;
}

export const SchemaTreeItem = (props: SchemaTreeItemProps) => {
  const { childNode, toggledNodes, onLeafNodeClick, isTargetSchemaItem, isTargetLeafItemSelected, targetLeafItemStatus } = props;
  const styles = useStyles();

  const [isHovered, setIsHovered] = useState(false);

  const iconString = renderToString(<ChevronRight16Regular className={styles.icon} />);
  const treeItemStyleOverrides = useMemo<OverrideFoundationElementDefinition<TreeItemOptions>>(
    () => ({
      expandCollapseGlyph: iconString,
      baseName: 'tree-item',
      styles: (ctx, def) => {
        const baseStyles = treeItemStyles(ctx, def as TreeItemOptions);
        const fastStyles = css`
          ${baseStyles} ${isTargetSchemaItem ? targetFastTreeItemStyles : sourceFastTreeItemStyles}
            ${expandButtonStyle}
        `;
        return fastStyles;
      },
    }),
    [iconString, isTargetSchemaItem]
  );
  const FastTreeItem = wrap(fluentTreeItem(treeItemStyleOverrides));

  const isNodeSelected = useCallback(
    (node: SchemaNodeExtended) => !!toggledNodes.find((toggledNode) => toggledNode && toggledNode.key === node.key),
    [toggledNodes]
  );

  const getTargetParentStatus = (numChildrenToggled: number) => {
    const numChildren = childNode.children.length;

    if (numChildrenToggled === 0) {
      return ItemToggledState.NotStarted;
    } else if (numChildrenToggled === numChildren) {
      return ItemToggledState.Completed;
    } else {
      return ItemToggledState.InProgress;
    }
  };

  // TODO: may be a better way to write this - not urgent
  const nameText = isHovered ? <Text className={styles.hoverText}>{childNode.name}</Text> : <Caption1>{childNode.name}</Caption1>;

  // TODO: Handle value objects with attribute children
  const nodeIsObject = childNode.schemaNodeDataType === 'None';

  const itemIsTargetParent = isTargetSchemaItem && nodeIsObject && !isTargetLeafItemSelected && !targetLeafItemStatus;

  const leafItemInfo = useMemo(() => {
    if (itemIsTargetParent) {
      let numChildrenToggled = 0;
      const childrenToggledStatus: boolean[] = [];

      childNode.children.forEach((child) => {
        const toggledStatus = isNodeSelected(child);
        childrenToggledStatus.push(toggledStatus);
        if (toggledStatus) {
          numChildrenToggled += 1;
        }
      });

      return { numChildrenToggled, childrenToggledStatus };
    } else {
      return undefined;
    }
  }, [itemIsTargetParent, childNode, isNodeSelected]);

  return (
    <FastTreeItem
      key={childNode.key}
      onMouseOut={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      className={nodeIsObject && isNodeSelected(childNode) ? 'selected' : ''}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!nodeIsObject || !(e.target as any).expandCollapseButton) {
          onLeafNodeClick(childNode);
        }
      }}
    >
      {!isTargetSchemaItem ? (
        <SourceTreeItemContent nodeType={childNode.schemaNodeDataType} isSelected={isNodeSelected(childNode)}>
          {nameText}
        </SourceTreeItemContent>
      ) : (
        <TargetTreeItemContent
          nodeType={childNode.schemaNodeDataType}
          isSelected={isNodeSelected(childNode)}
          status={
            leafItemInfo
              ? getTargetParentStatus(leafItemInfo.numChildrenToggled)
              : targetLeafItemStatus
              ? targetLeafItemStatus
              : ItemToggledState.InProgress
          }
        >
          {nameText}
        </TargetTreeItemContent>
      )}

      {nodeIsObject &&
        childNode.children.map((childNodeChild, idx) => (
          <SchemaTreeItem
            key={childNodeChild.key}
            childNode={childNodeChild}
            toggledNodes={toggledNodes}
            onLeafNodeClick={onLeafNodeClick}
            isTargetSchemaItem={isTargetSchemaItem}
            isTargetLeafItemSelected={isTargetSchemaItem && leafItemInfo ? leafItemInfo.childrenToggledStatus[idx] : undefined}
            targetLeafItemStatus={
              isTargetSchemaItem && leafItemInfo
                ? leafItemInfo.childrenToggledStatus[idx]
                  ? ItemToggledState.Completed
                  : ItemToggledState.NotStarted
                : undefined
            }
          />
        ))}
    </FastTreeItem>
  );
};
