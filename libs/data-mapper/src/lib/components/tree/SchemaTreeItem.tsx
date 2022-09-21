import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { Caption1, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronRight16Regular, CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { OverrideFoundationElementDefinition, TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useState } from 'react';
import { renderToString } from 'react-dom/server';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());

export type SchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
};

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
  }`;

export const SchemaFastTreeItem: React.FunctionComponent<SchemaFastTreeItemProps> = ({
  childNode,
  currentlySelectedNodes,
  onLeafNodeClick,
}) => {
  const styles = useStyles();
  const [isHover, setIsHover] = useState(false);
  const iconString = renderToString(<ChevronRight16Regular className={styles.icon} />);
  const fastTreeItemStyles = `
  .positioning-region {
    border-radius: ${tokens.borderRadiusMedium};
    background-color: ${tokens.colorNeutralBackground1};
    height: 28px;
    padding: 4px 6px 4px 6px;
  }
  .content-region {
    height: 16px;
    color: ${tokens.colorNeutralForeground1};
  }
  :host(:not([disabled])).positioning-region:hover {
    background: ${tokens.colorNeutralBackground1Hover};
  }
  :host([selected])::after {
    visibility: hidden;
  }
  :host(.nested) .expand-collapse-button:hover {
    background: inherit;
  }
`;
  const overrides: OverrideFoundationElementDefinition<TreeItemOptions> = {
    expandCollapseGlyph: iconString,
    baseName: 'tree-item',
    styles: (ctx, def) => {
      const baseStyles = treeItemStyles(ctx, def as TreeItemOptions);
      const fastStyles = css`
        ${baseStyles} ${fastTreeItemStyles}
        ${expandButtonStyle}
      `;
      return fastStyles;
    },
  };
  const FastTreeItem = wrap(fluentTreeItem(overrides));
  const isNodeSelected = !!currentlySelectedNodes.find(
    (currentlySelectedNode) => currentlySelectedNode && currentlySelectedNode.key === childNode.key
  );
  const onMouseEnter = () => {
    setIsHover(true);
  };
  const onMouseLeave = () => {
    setIsHover(false);
  };
  const nameText = isHover ? <Text className={styles.hoverText}>{childNode.name}</Text> : <Caption1>{childNode.name}</Caption1>;
  if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
    return (
      <FastTreeItem
        key={childNode.key}
        onMouseLeave={() => onMouseLeave()}
        onMouseEnter={() => onMouseEnter()}
        className={isNodeSelected ? 'selected' : ''}
      >
        <TreeItemContent nodeType={childNode.schemaNodeDataType} isSelected={isNodeSelected}>
          {nameText}
        </TreeItemContent>
        {convertToFastTreeItem(childNode, currentlySelectedNodes, onLeafNodeClick)}
      </FastTreeItem>
    );
  } else {
    return (
      <FastTreeItem
        key={childNode.key}
        onClick={() => {
          onLeafNodeClick(childNode);
        }}
        onMouseLeave={() => onMouseLeave()}
        onMouseEnter={() => onMouseEnter()}
      >
        <TreeItemContent nodeType={childNode.schemaNodeDataType} isSelected={isNodeSelected}>
          {nameText}
        </TreeItemContent>
      </FastTreeItem>
    );
  }
};

export const convertToFastTreeItem = (
  node: SchemaNodeExtended,
  currentlySelectedNodes: SchemaNodeExtended[],
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void
) => {
  return node.children.map((childNode) => {
    return (
      <SchemaFastTreeItem
        key={childNode.key}
        childNode={childNode}
        currentlySelectedNodes={currentlySelectedNodes}
        onLeafNodeClick={onLeafNodeClick}
      ></SchemaFastTreeItem>
    );
  });
};

export interface SchemaNodeTreeItemContentProps {
  nodeType: SchemaNodeDataType;
  isSelected: boolean;
  children?: React.ReactNode;
}

const TreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ nodeType, isSelected, children }) => {
  const filledIcon = <CheckmarkCircle16Filled primaryFill={tokens.colorBrandForeground1} />;
  const restIcon = <Circle16Regular primaryFill={tokens.colorNeutralForeground3} />;

  return (
    <>
      {SharedTreeItemContent(nodeType, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="end">
        {isSelected ? filledIcon : restIcon}
      </span>
    </>
  );
};

export const SharedTreeItemContent = (nodeType: SchemaNodeDataType, isSelected: boolean): JSX.Element => {
  const BundledTypeIcon = icon16ForSchemaNodeType(nodeType);
  return (
    <span style={{ display: 'flex', paddingLeft: tokens.spacingHorizontalXS, paddingRight: tokens.spacingHorizontalXS }} slot="start">
      <BundledTypeIcon style={{ verticalAlign: 'middle' }} filled={isSelected} />
    </span>
  );
};
