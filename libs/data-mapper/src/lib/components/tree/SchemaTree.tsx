import type { SchemaExtended, SchemaNodeDataType, SchemaNodeExtended } from '../../models';
import { icon16ForSchemaNodeType } from './SchemaTree.Utils';
import { Button, Tooltip } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { bundleIcon, CheckmarkCircle16Filled, Circle16Regular } from '@fluentui/react-icons';
import { fluentTreeItem, fluentTreeView, provideFluentDesignSystem } from '@fluentui/web-components';
import { provideReactWrapper } from '@microsoft/fast-react-wrapper';
import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';

const { wrap } = provideReactWrapper(React, provideFluentDesignSystem());
export const FastTreeView = wrap(fluentTreeView());
export const FastTreeItem = wrap(fluentTreeItem());

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
    if (childNode.schemaNodeDataType === 'ComplexType' || childNode.schemaNodeDataType === 'None') {
      return (
        <FastTreeItem key={childNode.key}>
          <TreeItemContent
            nodeType={childNode.schemaNodeDataType}
            onClick={() => {
              onLeafNodeClick(childNode);
            }}
            includeAddButton={false}
            initialFilled={isNodeSelected}
          >
            {childNode.name}
          </TreeItemContent>
          {convertToFastTreeItem(childNode, currentlySelectedNodes, onLeafNodeClick)}
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
            initialFilled={isNodeSelected}
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
  initialFilled: boolean;
  includeAddButton: boolean;
  onClick: () => void;
}

const TreeItemContent: React.FC<SchemaNodeTreeItemContentProps> = ({ nodeType, initialFilled, includeAddButton, children, onClick }) => {
  const intl = useIntl();
  const BundledTypeIcon = icon16ForSchemaNodeType(nodeType);
  const BundledAddIcon = bundleIcon(CheckmarkCircle16Filled, Circle16Regular);
  const [filled, { setFalse: setFilledFalse, setTrue: setFilledTrue }] = useBoolean(initialFilled);

  const addNodeLoc = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'Label to add a new node to the canvas',
  });

  const removeNodeLoc = intl.formatMessage({
    defaultMessage: 'Remove',
    description: 'Label to remove an existing node from the canvas',
  });

  return (
    <>
      <Button appearance="transparent" size="small" tabIndex={-1} icon={<BundledTypeIcon />} />
      <span style={{ width: '100%' }}>{children}</span>
      {includeAddButton ? (
        <Tooltip content={filled ? removeNodeLoc : addNodeLoc} relationship={'label'}>
          <Button
            appearance="transparent"
            size="small"
            icon={
              <BundledAddIcon
                filled={filled}
                onClick={() => {
                  if (filled) {
                    setFilledFalse();
                  } else {
                    setFilledTrue();
                  }
                  onClick();
                }}
              />
            }
          />
        </Tooltip>
      ) : null}
    </>
  );
};
