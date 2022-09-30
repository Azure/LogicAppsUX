import type { SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { SourceTreeItemContent } from './SourceSchemaTreeItem';
import { TargetTreeItemContent } from './TargetSchemaTreeItem';
import { Caption1, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronRight16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo, useState } from 'react';
import { renderToString } from 'react-dom/server';

export enum ItemToggledState {
  Completed = 'Completed',
  InProgress = 'InProgress',
  NotStarted = 'NotStarted',
}

export type NodeToggledStateDictionary = { [key: string]: ItemToggledState };

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

const baseTreeItemStyles = `
  .positioning-region {
    height: 28px;
    padding: 4px 6px 4px 6px;
    border-radius: ${tokens.borderRadiusMedium};
    background: none;
  }
  .content-region {
    height: 16px;
  }
  :host(.nested) .expand-collapse-button:hover {
    background: inherit;
  }
  :host(.nested) .expand-collapse-button:hover {
    background: inherit;
  }
`;

const sourceFastTreeItemStyles = `
  positioning-region .source {
    background-color: ${tokens.colorNeutralBackground1};
  }
  :host(:not([disabled])) .positioning-region:hover {
    background: ${tokens.colorNeutralBackground1Hover};
  }
  :host([selected])::after {
    visibility: hidden;
  }
`;

const targetFastTreeItemStyles = `
  .positioning-region .target {
    background-color: ${tokens.colorNeutralBackground4};
  }
  :host(:not([disabled])) .positioning-region .target:hover {
    background: ${tokens.colorNeutralBackground4Hover};
  }
`;

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeItem = wrap(
  fluentTreeItem({
    expandCollapseGlyph: renderToString(<ChevronRight16Regular />),
    baseName: 'tree-item',
    styles: (ctx, def) => {
      const baseStyles = treeItemStyles(ctx, def as TreeItemOptions);
      const fastStyles = css`
        ${baseStyles} ${baseTreeItemStyles} ${sourceFastTreeItemStyles} ${targetFastTreeItemStyles}
      `;
      return fastStyles;
    },
  })
);

export const SharedTreeItemContent = (node: SchemaNodeExtended, isSelected: boolean): JSX.Element => {
  const BundledTypeIcon = icon16ForSchemaNodeType(node.schemaNodeDataType, node.properties);
  return (
    <span style={{ display: 'flex', paddingLeft: tokens.spacingHorizontalXS, paddingRight: tokens.spacingHorizontalXS }} slot="start">
      <BundledTypeIcon style={{ verticalAlign: 'middle' }} filled={isSelected} />
    </span>
  );
};

interface SchemaTreeItemProps {
  childNode: SchemaNodeExtended;
  toggledNodes?: SchemaNodeExtended[];
  toggledStatesDictionary?: NodeToggledStateDictionary;
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
  isTargetSchemaItem?: boolean;
}

export const SchemaTreeItem = (props: SchemaTreeItemProps) => {
  const { childNode, toggledNodes, toggledStatesDictionary, onLeafNodeClick, isTargetSchemaItem } = props;
  const styles = useStyles();

  const [isHovered, setIsHovered] = useState(false);

  const isNodeSelected = useMemo(() => {
    if (!isTargetSchemaItem) {
      return !!toggledNodes?.find((toggledNode) => toggledNode.key === childNode.key);
    } else if (toggledStatesDictionary) {
      return toggledStatesDictionary[childNode.key] === ItemToggledState.Completed;
    } else {
      console.error(`isNodeSelected state wasn't set properly`);
      return false;
    }
  }, [toggledNodes, childNode, isTargetSchemaItem, toggledStatesDictionary]);

  return (
    <FastTreeItem
      key={childNode.key}
      onMouseLeave={() => setIsHovered(false)}
      onMouseEnter={() => setIsHovered(true)}
      className={`${isTargetSchemaItem ? 'target' : 'source'}`}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!(e.target as any).expandCollapseButton) {
          onLeafNodeClick(childNode);
        }
      }}
    >
      {!isTargetSchemaItem && (
        <SourceTreeItemContent node={childNode} isSelected={isNodeSelected}>
          {isHovered ? <Text className={styles.hoverText}>{childNode.name}</Text> : <Caption1>{childNode.name}</Caption1>}
        </SourceTreeItemContent>
      )}

      {isTargetSchemaItem && toggledStatesDictionary && (
        <TargetTreeItemContent node={childNode} isSelected={isNodeSelected} status={toggledStatesDictionary[childNode.key]}>
          {isHovered ? <Text className={styles.hoverText}>{childNode.name}</Text> : <Caption1>{childNode.name}</Caption1>}
        </TargetTreeItemContent>
      )}

      {childNode.children.map((childNodeChild) => (
        <SchemaTreeItem
          key={childNodeChild.key}
          childNode={childNodeChild}
          onLeafNodeClick={onLeafNodeClick}
          toggledNodes={toggledNodes}
          toggledStatesDictionary={toggledStatesDictionary}
          isTargetSchemaItem={isTargetSchemaItem}
        />
      ))}
    </FastTreeItem>
  );
};
