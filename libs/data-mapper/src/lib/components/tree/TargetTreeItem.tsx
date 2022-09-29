import type { SchemaNodeExtended } from '../../models';
import { expandButtonStyle, SharedTreeItemContent } from './SchemaTreeItem';
import { Caption1, makeStyles, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronRight16Regular, CheckmarkCircle12Filled, CircleHalfFill12Regular, Circle12Regular } from '@fluentui/react-icons';
import { fluentTreeItem, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { OverrideFoundationElementDefinition, TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useState } from 'react';
import { renderToString } from 'react-dom/server';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());

export type TargetSchemaFastTreeItemProps = {
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

export const SchemaFastTreeItem: React.FunctionComponent<TargetSchemaFastTreeItemProps> = ({
  childNode,
  currentlySelectedNodes,
  onLeafNodeClick,
}) => {
  const styles = useStyles();
  const [isHover, setIsHover] = useState(false);
  const iconString = renderToString(<ChevronRight16Regular className={styles.icon} />);
  const positionRegionStyling = `  
  .positioning-region {
    border-radius: ${tokens.borderRadiusMedium};
    background-color: ${tokens.colorNeutralBackground4};
    height: 28px;
    padding: 4px 6px 4px 6px;
  }
  :host(:not([disabled])).positioning-region:hover {
    background: ${tokens.colorNeutralBackground4Hover};
  }`;
  const fastTreeItemStyles = `
  .content-region {
    height: 16px;
    color: ${tokens.colorNeutralForeground1};
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
        ${baseStyles} ${fastTreeItemStyles} ${positionRegionStyling} ${expandButtonStyle}
      `;
      return fastStyles;
    },
  };
  const FastTreeItem = wrap(fluentTreeItem(overrides));
  const isNodeSelected = !!currentlySelectedNodes.find(
    (currentlySelectedNode) => currentlySelectedNode && currentlySelectedNode.key === childNode.key
  );

  const onMouseEnterOrLeave = () => {
    setIsHover(!isHover);
  };

  const nameText = isHover ? <Text className={styles.hoverText}>{childNode.name}</Text> : <Caption1>{childNode.name}</Caption1>;
  // TODO Handle object with values and attributes
  if (childNode.schemaNodeDataType === 'None') {
    return (
      <FastTreeItem
        key={childNode.key}
        onMouseLeave={() => onMouseEnterOrLeave()}
        onMouseEnter={() => onMouseEnterOrLeave()}
        className={isNodeSelected ? 'selected' : ''}
      >
        <TargetTreeItemContent node={childNode} isSelected={isNodeSelected} status="Completed">
          {nameText}
        </TargetTreeItemContent>
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
        onMouseLeave={() => onMouseEnterOrLeave()}
        onMouseEnter={() => onMouseEnterOrLeave()}
      >
        <TargetTreeItemContent node={childNode} isSelected={isNodeSelected} status="InProgress">
          {nameText}
        </TargetTreeItemContent>
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
  node: SchemaNodeExtended;
  isSelected: boolean;
  children?: React.ReactNode;
  status: 'Completed' | 'InProgress' | 'NotStarted';
}

const TargetTreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ node, isSelected, children, status }) => {
  let statusIcon: JSX.Element;
  switch (status) {
    case 'Completed':
      statusIcon = (
        <CheckmarkCircle12Filled
          style={{ display: 'flex', marginRight: '4px' }}
          primaryFill={tokens.colorPaletteGreenForeground1}
        ></CheckmarkCircle12Filled>
      );
      break;
    case 'InProgress':
      statusIcon = <CircleHalfFill12Regular primaryFill={tokens.colorPaletteYellowForeground1}></CircleHalfFill12Regular>;
      break;
    case 'NotStarted':
      statusIcon = <Circle12Regular primaryFill={tokens.colorNeutralForegroundDisabled}></Circle12Regular>;
      break;
    default:
      statusIcon = <div></div>;
  }

  return (
    <>
      <span style={{ display: 'flex', marginRight: '4px', marginTop: '2px' }} slot="start">
        {statusIcon}
      </span>
      {SharedTreeItemContent(node, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
    </>
  );
};
