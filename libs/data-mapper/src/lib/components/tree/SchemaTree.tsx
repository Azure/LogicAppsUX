import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from '../../utils/Icon.Utils';
import { Caption1, makeStyles, tokens } from '@fluentui/react-components';
import { bundleIcon, CheckmarkCircle16Filled, Circle16Regular, ChevronRight16Regular, ChevronRight16Filled } from '@fluentui/react-icons';
import { fluentTreeItem, fluentTreeView, provideFluentDesignSystem, treeItemStyles } from '@fluentui/web-components';
import { css } from '@microsoft/fast-element';
import type { OverrideFoundationElementDefinition, TreeItemOptions } from '@microsoft/fast-foundation';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';
import { renderToString } from 'react-dom/server';

// const styles = makeStyles(
//   {
//     icon: {
//       '&:hover': {
//         backgroundColor: 'inherit'
//       }
//     }
//   }
// )

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
const FastTreeView = wrap(fluentTreeView());

const tryingStyles = makeStyles({
  '.positioning-region': {
    //bor: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandShadowAmbient, //tokens.colorNeutralBackground1
    //height: 28px;
    //padding: 4px 6px 4px 6px;
  },
  // .content-region {
  //   height: 16px;
  //   color: ${tokens.colorNeutralForeground1};
  // }
  // :host(:not([disabled])).positioning-region:hover {
  //   background: ${tokens.colorNeutralBackground1Hover};
  // }
  // :host([selected])::after {
  //   visibility: hidden;
  // }
  // :host(:not([disabled])[selected]) .positioning-region {
  //   background: ${tokens.colorBrandBackground2};
  // }
});
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

// ${tryingStyles()['.positioning-region']}
console.log(tryingStyles);

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

const ChevronIcon = bundleIcon(ChevronRight16Filled, ChevronRight16Regular);

const convertToFastTreeItem = (
  node: SchemaNodeExtended,
  currentlySelectedNodes: SchemaNodeExtended[],
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void
) => {
  //const treeItemStyles = useStyles();
  const overrides: OverrideFoundationElementDefinition<TreeItemOptions> = {
    expandCollapseGlyph: renderToString(<ChevronIcon filled={false} />),
    baseName: 'tree-item',
    styles: (ctx, def) => {
      const baseStyles = treeItemStyles(ctx, def as TreeItemOptions);
      console.log(baseStyles);
      const mergedStyles = css`
        ${baseStyles}
      `;
      return mergedStyles; //css`${baseStyles.behaviors}`
    },
  };
  const FastTreeItem = wrap(fluentTreeItem(overrides));

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
