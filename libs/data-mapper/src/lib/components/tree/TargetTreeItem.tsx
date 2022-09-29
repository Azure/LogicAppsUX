import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
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

export type TargetSchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
  isSelected?: boolean; // Leaf nodes only
  status?: 'Completed' | 'NotStarted'; // Leaf nodes only
};

export const SchemaFastTreeItem: React.FunctionComponent<TargetSchemaFastTreeItemProps> = ({
  childNode,
  currentlySelectedNodes,
  onLeafNodeClick,
  isSelected,
  status,
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

  const isNodeSelected = (node: SchemaNodeExtended) =>
    !!currentlySelectedNodes.find((currentlySelectedNode) => currentlySelectedNode && currentlySelectedNode.key === node.key);

  const getParentStatus = (numChildrenToggled: number) => {
    const numChildren = childNode.children.length;

    if (numChildrenToggled === 0) {
      return 'NotStarted';
    } else if (numChildrenToggled === numChildren) {
      return 'Completed';
    } else {
      return 'InProgress';
    }
  };

  const nameText = isHover ? <Text className={styles.hoverText}>{childNode.name}</Text> : <Caption1>{childNode.name}</Caption1>;
  // TODO Handle object with values and attributes
  if (childNode.schemaNodeDataType === 'None' && !isSelected && !status) {
    const childrenToggledStatus: boolean[] = [];
    let numChildrenToggled = 0;

    childNode.children.forEach((child) => {
      const toggledStatus = isNodeSelected(child);
      childrenToggledStatus.push(toggledStatus);
      if (toggledStatus) {
        numChildrenToggled += 1;
      }
    });

    return (
      <FastTreeItem
        key={childNode.key}
        onMouseOut={() => setIsHover(false)}
        onMouseEnter={() => setIsHover(true)}
        className={isNodeSelected(childNode) ? 'selected' : ''}
      >
        <TargetTreeItemContent
          nodeType={childNode.schemaNodeDataType}
          isSelected={isNodeSelected(childNode)}
          status={getParentStatus(numChildrenToggled)}
        >
          {nameText}
        </TargetTreeItemContent>

        {childNode.children.map((childNodeChild, idx) => (
          <SchemaFastTreeItem
            key={childNodeChild.key}
            childNode={childNodeChild}
            currentlySelectedNodes={currentlySelectedNodes}
            onLeafNodeClick={onLeafNodeClick}
            isSelected={childrenToggledStatus[idx]}
            status={childrenToggledStatus[idx] ? 'Completed' : 'NotStarted'}
          />
        ))}
      </FastTreeItem>
    );
  } else {
    return (
      <FastTreeItem
        key={childNode.key}
        onClick={() => {
          onLeafNodeClick(childNode);
        }}
        onMouseOut={() => setIsHover(false)}
        onMouseEnter={() => setIsHover(true)}
      >
        <TargetTreeItemContent nodeType={childNode.schemaNodeDataType} isSelected={!!isSelected} status={status ?? 'NotStarted'}>
          {nameText}
        </TargetTreeItemContent>
      </FastTreeItem>
    );
  }
};

export interface SchemaNodeTreeItemContentProps {
  nodeType: SchemaNodeDataType;
  isSelected: boolean;
  children?: React.ReactNode;
  status: 'Completed' | 'InProgress' | 'NotStarted';
}

const TargetTreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ nodeType, isSelected, children, status }) => {
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
      {SharedTreeItemContent(nodeType, isSelected)}
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
    </>
  );
};
