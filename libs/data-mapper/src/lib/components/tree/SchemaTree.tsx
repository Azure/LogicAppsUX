import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from './SchemaTree.Utils';
import { Button, tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { bundleIcon, CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React from 'react';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
export const FastTreeView = wrap(fluentTreeView());
export const FastTreeItem = wrap(fluentTreeItem());

export interface SchemaTreeProps {
  schema: SchemaExtended;
  onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, onLeafNodeClick }: SchemaTreeProps) => {
  // TODO color tree background to tokens.colorNeutralBackground1
  return <FastTreeView>{convertToFastTreeItem(schema.schemaTreeRoot, onLeafNodeClick)}</FastTreeView>;
};

const convertToFastTreeItem = (node: SchemaNodeExtended, onLeafNodeClick: (schemaNode: SchemaNodeExtended) => void) => {
  return node.children.map((childNode) => {
    if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
      return (
        <FastTreeItem key={childNode.key}>
          <TreeItemContent
            nodeType={childNode.schemaNodeDataType}
            onClick={() => {
              onLeafNodeClick(childNode);
            }}
            includeAddButton={false}
          >
            {childNode.name}
          </TreeItemContent>
          {convertToFastTreeItem(childNode, onLeafNodeClick)}
        </FastTreeItem>
      );
    } else {
      return (
        <FastTreeItem key={childNode.key}>
          <TreeItemContent
            nodeType={childNode.schemaNodeDataType}
            onClick={() => {
              onLeafNodeClick(childNode);
            }}
            includeAddButton={true}
          >
            {childNode.name}
          </TreeItemContent>
        </FastTreeItem>
      );
    }
  });
};

export interface SchemaNodeTreeItemContentProps {
  nodeType: SchemaNodeDataType;
  initialFilled?: boolean;
  includeAddButton: boolean;
  onClick: () => void;
}

const TreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ nodeType, initialFilled, includeAddButton, children, onClick }) => {
  const BundledTypeIcon = icon16ForSchemaNodeType(nodeType);
  const BundledAddIcon = bundleIcon(CheckmarkCircle16Filled, Circle16Regular);
  const [filled, { toggle: toggleFilled }] = useBoolean(initialFilled || false);

  return (
    <>
      <Button
        style={{ border: '0px', borderRadius: '0px', minWidth: '16px', backgroundColor: tokens.colorNeutralBackground2 }}
        icon={<BundledTypeIcon />}
      />
      <span style={{ width: '100%' }}>{children}</span>
      {includeAddButton ? (
        <Button
          style={{ border: '0px', borderRadius: '0px', float: 'right', minWidth: '16px', backgroundColor: tokens.colorNeutralBackground2 }}
          icon={
            <BundledAddIcon
              filled={filled}
              onClick={() => {
                toggleFilled();
                onClick();
              }}
            />
          }
        />
      ) : null}
    </>
  );
};
