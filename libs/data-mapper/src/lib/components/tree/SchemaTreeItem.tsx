import type { SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { Caption1, makeStyles, tokens } from '@fluentui/react-components';
import { bundleIcon, ChevronRight16Regular, ChevronRight16Filled, CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { OverrideFoundationElementDefinition, TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';
import { renderToString } from 'react-dom/server';

const ChevronIcon = bundleIcon(ChevronRight16Filled, ChevronRight16Regular);
const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());

export type SchemaFastTreeItemProps = {
  childNode: SchemaNodeExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
};

const useStyles = makeStyles({
  icon: {
    '&:hover': {
      backgroundColor: 'inherit',
    },
    color: tokens.colorPaletteCranberryBorderActive,
    backgroundColor: tokens.colorPaletteRedBackground2,
  },
});

const SchemaFastTreeItem: React.FunctionComponent<SchemaFastTreeItemProps> = ({ childNode, currentlySelectedNodes, onLeafNodeClick }) => {
  const iconStyles = useStyles();
  const iconString = renderToString(<ChevronIcon filled={true} className={iconStyles.icon} />);
  const overrides: OverrideFoundationElementDefinition<TreeItemOptions> = {
    expandCollapseGlyph: iconString,
    baseName: 'tree-item',
    styles: (ctx, def) => {
      const baseStyles = treeItemStyles(ctx, def as TreeItemOptions);
      console.log(baseStyles);
      const mergedStyles = css`
        ${baseStyles}
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
        :host(:not([disabled])[selected]) .positioning-region {
          background: ${tokens.colorBrandBackground2};
        }
      `;
      return mergedStyles;
    },
  };
  const FastTreeItem = wrap(fluentTreeItem(overrides)); // danielle pass as props?
  const isNodeSelected = !!currentlySelectedNodes.find((currentlySelectedNode) => currentlySelectedNode.key === childNode.key);
  const nameText = <Caption1>{childNode.name}</Caption1>;
  if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
    return (
      // TODO onclick for object level adding
      <FastTreeItem key={childNode.key}>
        <TreeItemContent nodeType={childNode.schemaNodeDataType} filled={isNodeSelected}>
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
      >
        <TreeItemContent nodeType={childNode.schemaNodeDataType} filled={isNodeSelected}>
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
  filled: boolean;
  children?: React.ReactNode;
}

const TreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ nodeType, filled, children }) => {
  const BundledTypeIcon = icon16ForSchemaNodeType(nodeType);
  const BundledAddIcon = bundleIcon(CheckmarkCircle16Filled, Circle16Regular);

  return (
    <>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="start">
        <BundledTypeIcon style={{ verticalAlign: 'middle' }} filled={filled} />
      </span>
      <span style={{ marginRight: '8px', width: '100%' }}>{children}</span>
      <span style={{ display: 'flex', marginRight: '4px' }} slot="end">
        <BundledAddIcon style={{ verticalAlign: 'middle' }} filled={filled} />
      </span>
    </>
  );
};
