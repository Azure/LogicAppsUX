import type { SchemaExtended, SchemaNodeExtended } from '../../models';
import { convertToFastTreeItem } from './SchemaTreeItem';
import { makeStyles, tokens } from '@fluentui/react-components';
import { fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';

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
