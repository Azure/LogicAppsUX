import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { Caption1, tokens } from '@fluentui/react-components';
import { bundleIcon, CheckmarkCircle16Filled, Circle16Regular, ChevronRight16Regular, ChevronRight16Filled } from '@fluentui/react-icons';
import { fluentTreeItem, fluentTreeView, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { FoundationElementDefinition, OverrideFoundationElementDefinition, TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';

// const css2 = `
// :host {
//   border-radius: ${tokens.borderRadiusMedium};
// }
// :host([selected])::after {
//   visibility: hidden;
// }
// :host(:not([disabled])).positioning-region:hover {
//   background: purple; ${tokens.colorNeutralBackground1Hover};
// }
// `;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChevronIcon = bundleIcon(ChevronRight16Regular, ChevronRight16Filled);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const options2: TreeItemOptions = {
  expandCollapseGlyph: `<ChevronIcon></ChevronIcon>`,
  baseName: 'tree-item',
};

const overrides: OverrideFoundationElementDefinition<FoundationElementDefinition> = {
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
    return mergedStyles; //css`${baseStyles.behaviors}`
  },
};

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
export const FastTreeView = wrap(fluentTreeView());
export const FastTreeItem = wrap(fluentTreeItem(overrides));

export interface SchemaTreeProps {
  schema: SchemaExtended;
  currentlySelectedNodes: SchemaNodeExtended[];
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, currentlySelectedNodes, onLeafNodeClick }: SchemaTreeProps) => {
  const treeItems = useMemo<JSX.Element[]>(() => {
    return convertToFastTreeItem(schema.schemaTreeRoot, currentlySelectedNodes, onLeafNodeClick);
  }, [schema, currentlySelectedNodes, onLeafNodeClick]);

  return <FastTreeView>{treeItems}</FastTreeView>;
};

const convertToFastTreeItem = (
  node: SchemaNodeExtended,
  currentlySelectedNodes: SchemaNodeExtended[],
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void
) => {
  return node.children.map((childNode) => {
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
