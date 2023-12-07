import { addSourceSchemaNodes, removeSourceSchemaNodes, setCanvasToolboxTabToDisplay } from '../../core/state/DataMapSlice';
import { openAddSourceSchemaPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { flattenSchemaNode, searchSchemaTreeFromRoot } from '../../utils/Schema.Utils';
import type { ButtonPivotProps } from '../buttonPivot/ButtonPivot';
import { ButtonPivot } from '../buttonPivot/ButtonPivot';
import type { FloatingPanelProps } from '../floatingPanel/FloatingPanel';
import { FloatingPanel } from '../floatingPanel/FloatingPanel';
import { FunctionList } from '../functionList/FunctionList';
import { schemaRootKey } from '../sidePane/tabs/targetSchemaTab/TargetSchemaTab';
import type { FilteredDataTypesDict } from '../tree/SchemaTreeSearchbar';
import { SchemaTreeSearchbar, getDefaultFilteredDataTypesDict } from '../tree/SchemaTreeSearchbar';
import SourceSchemaTreeItem, { SourceSchemaTreeHeader, useSchemaTreeItemStyles } from '../tree/SourceSchemaTreeItem';
import type { ITreeNode } from '../tree/Tree';
import Tree from '../tree/Tree';
import { Stack } from '@fluentui/react';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { Button, Text, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { CubeTree20Filled, CubeTree20Regular, MathFormula20Filled, MathFormula20Regular } from '@fluentui/react-icons';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { MenuItemType } from '@microsoft/designer-ui';
import type { SchemaNodeExtended } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const ToolboxPanelTabs = {
  sourceSchemaTree: 'sourceSchemaTree',
  functionsList: 'functionsList',
} as const;
export type ToolboxPanelTabs = (typeof ToolboxPanelTabs)[keyof typeof ToolboxPanelTabs];

const generalToolboxPanelProps = {
  xPos: '16px',
  yPos: '60px',
  width: '250px',
  minHeight: '240px',
} as FloatingPanelProps;

export interface CanvasToolboxProps {
  canvasBlockHeight: number;
}

export const CanvasToolbox = ({ canvasBlockHeight }: CanvasToolboxProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const schemaNodeItemStyles = useSchemaTreeItemStyles();

  const toolboxTabToDisplay = useSelector((state: RootState) => state.dataMap.present.canvasToolboxTabToDisplay);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentSourceSchemaNodes);

  const [sourceSchemaSearchTerm, setSourceSchemaSearchTerm] = useState<string>('');
  const [sourceSchemaDataTypeFilters, setSourceSchemaDataTypeFilters] = useState<FilteredDataTypesDict>(getDefaultFilteredDataTypesDict());

  const showSourceSchemaLoc = intl.formatMessage({
    defaultMessage: 'Show source schema',
    description: 'Label to open source schema toolbox',
  });

  const hideSourceSchemaLoc = intl.formatMessage({
    defaultMessage: 'Hide source schema',
    description: 'Label to close source schema toolbox',
  });

  const showFunctionsLoc = intl.formatMessage({
    defaultMessage: 'Show functions',
    description: 'Label to open Functions list',
  });

  const hideFunctionsLoc = intl.formatMessage({
    defaultMessage: 'Hide functions',
    description: 'Label to close Functions list',
  });

  const functionLoc = intl.formatMessage({
    defaultMessage: 'Function',
    description: 'Function',
  });

  const sourceSchemaLoc = intl.formatMessage({
    defaultMessage: 'Source schema',
    description: 'Source schema',
  });

  const addSrcSchemaLoc = intl.formatMessage({
    defaultMessage: 'Add a source schema first, then select elements to build your map',
    description: 'Message to add a source schema',
  });

  const addLoc = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'Add',
  });

  const closeToolbox = useCallback(() => {
    dispatch(setCanvasToolboxTabToDisplay(''));
  }, [dispatch]);

  const onTabSelect = useCallback(
    (_event: SelectTabEvent, data: SelectTabData) => {
      if (data.value === toolboxTabToDisplay) {
        closeToolbox();
      } else {
        dispatch(setCanvasToolboxTabToDisplay(data.value as ToolboxPanelTabs));
      }
    },
    [toolboxTabToDisplay, closeToolbox, dispatch]
  );

  const onSourceSchemaItemClick = (selectedNode: SchemaNodeExtended) => {
    // If click schema name, just return (don't do anything)
    if (selectedNode.key === schemaRootKey) {
      return;
    }

    if (currentSourceSchemaNodes.some((node) => node.key === selectedNode.key)) {
      dispatch(removeSourceSchemaNodes([selectedNode]));
    } else {
      dispatch(addSourceSchemaNodes([selectedNode]));
    }
  };

  const getAllContextMenuItems = (node: SchemaNodeExtended): MenuItemOption[] => {
    return [getAddAllNodesMenuItem(node), getAddAllNodesRecursiveMenuItem(node)];
  };

  const getAddAllNodesMenuItem = (node: SchemaNodeExtended): MenuItemOption => {
    const nodeList = [node, ...node.children];
    return {
      key: 'addAll',
      title: intl.formatMessage({
        defaultMessage: 'Add children',
        description: 'Add the current node and its children to the map',
      }),
      type: MenuItemType.Advanced,
      onClick: () => dispatch(addSourceSchemaNodes(nodeList)),
      disabled: nodeList.every((node) => currentSourceSchemaNodes.find((curNode) => node.key === curNode.key)),
    };
  };

  const getAddAllNodesRecursiveMenuItem = (node: SchemaNodeExtended): MenuItemOption => {
    const nodeList = flattenSchemaNode(node);
    return {
      key: 'addAllRecursive',
      title: intl.formatMessage({
        defaultMessage: 'Add children (recursive)',
        description: 'Add the current node and its children to the map',
      }),
      type: MenuItemType.Advanced,
      onClick: () => dispatch(addSourceSchemaNodes(nodeList)),
      disabled: nodeList.every((node) => currentSourceSchemaNodes.find((curNode) => node.key === curNode.key)),
    };
  };

  const searchedSourceSchemaTreeRoot = useMemo<ITreeNode<SchemaNodeExtended> | undefined>(() => {
    if (!sourceSchema) {
      return undefined;
    }

    // Search tree (maintain parent tree structure for matched nodes - returns whole tree if no/too-small search term)
    const newSourceSchemaTreeRoot: ITreeNode<SchemaNodeExtended> = searchSchemaTreeFromRoot(
      sourceSchema.schemaTreeRoot,
      flattenedSourceSchema,
      sourceSchemaSearchTerm,
      sourceSchemaDataTypeFilters
    );
    newSourceSchemaTreeRoot.isExpanded = true;

    // Format extra top layer to show schemaTreeRoot
    // Can safely typecast with the root node(s) as we only use the properties defined here
    const schemaNameRoot = {} as ITreeNode<SchemaNodeExtended>;
    schemaNameRoot.isExpanded = true;
    schemaNameRoot.children = [newSourceSchemaTreeRoot];

    return schemaNameRoot;
  }, [sourceSchema, flattenedSourceSchema, sourceSchemaSearchTerm, sourceSchemaDataTypeFilters]);

  const toolboxButtonPivotProps: ButtonPivotProps = useMemo(
    () => ({
      buttons: [
        {
          tooltip: toolboxTabToDisplay === ToolboxPanelTabs.sourceSchemaTree ? hideSourceSchemaLoc : showSourceSchemaLoc,
          regularIcon: CubeTree20Regular,
          filledIcon: CubeTree20Filled,
          value: ToolboxPanelTabs.sourceSchemaTree,
        },
        {
          tooltip: toolboxTabToDisplay === ToolboxPanelTabs.functionsList ? hideFunctionsLoc : showFunctionsLoc,
          regularIcon: MathFormula20Regular,
          filledIcon: MathFormula20Filled,
          value: ToolboxPanelTabs.functionsList,
        },
      ],
      horizontal: true,
      xPos: '16px',
      yPos: '16px',
      selectedValue: toolboxTabToDisplay,
      onTabSelect: onTabSelect,
    }),
    [toolboxTabToDisplay, onTabSelect, hideSourceSchemaLoc, showSourceSchemaLoc, hideFunctionsLoc, showFunctionsLoc]
  );

  const floatingPanelHeight = useMemo(() => `${canvasBlockHeight - 150}px`, [canvasBlockHeight]);
  const floatingPanelContentHeight = useMemo(() => `${canvasBlockHeight - 185}px`, [canvasBlockHeight]);

  return (
    <>
      <ButtonPivot {...toolboxButtonPivotProps} />

      <FloatingPanel
        {...generalToolboxPanelProps}
        height={floatingPanelHeight}
        contentHeight={floatingPanelContentHeight}
        title={sourceSchemaLoc}
        isOpen={toolboxTabToDisplay === ToolboxPanelTabs.sourceSchemaTree}
        onClose={closeToolbox}
      >
        {sourceSchema && searchedSourceSchemaTreeRoot ? (
          <>
            <SchemaTreeSearchbar
              onSearch={setSourceSchemaSearchTerm}
              onClear={() => setSourceSchemaSearchTerm('')}
              filteredDataTypes={sourceSchemaDataTypeFilters}
              setFilteredDataTypes={setSourceSchemaDataTypeFilters}
            />

            <SourceSchemaTreeHeader />

            <Tree<SchemaNodeExtended>
              // Add one extra root layer so schemaTreeRoot is shown as well
              // Can safely typecast as only the children[] are used from root
              treeRoot={searchedSourceSchemaTreeRoot}
              nodeContent={(node, isHovered) => (
                <SourceSchemaTreeItem
                  node={node as SchemaNodeExtended}
                  isNodeAdded={currentSourceSchemaNodes.some((srcSchemaNode) => srcSchemaNode.key === node.key)}
                  isNodeHovered={isHovered}
                />
              )}
              onClickItem={(node) => onSourceSchemaItemClick(node as SchemaNodeExtended)}
              nodeContainerClassName={mergeClasses(schemaNodeItemStyles.nodeContainer, schemaNodeItemStyles.sourceSchemaNode)}
              nodeContainerStyle={(node) => ({
                backgroundColor: currentSourceSchemaNodes.some((srcSchemaNode) => srcSchemaNode.key === node.key)
                  ? tokens.colorBrandBackground2
                  : undefined,
              })}
              contextMenuItems={(node) => getAllContextMenuItems(node as SchemaNodeExtended)}
            />
          </>
        ) : (
          <Stack style={{ height: '90%' }} verticalAlign="center" horizontalAlign="center">
            <Text style={{ ...typographyStyles.body1Strong, width: '190px', textAlign: 'center', marginBottom: '28px' }}>
              {addSrcSchemaLoc}
            </Text>
            <Button onClick={() => dispatch(openAddSourceSchemaPanelView())} size="small">
              {addLoc}
            </Button>
          </Stack>
        )}
      </FloatingPanel>

      <FloatingPanel
        {...generalToolboxPanelProps}
        height={floatingPanelHeight}
        contentHeight={floatingPanelContentHeight}
        title={functionLoc}
        isOpen={toolboxTabToDisplay === ToolboxPanelTabs.functionsList}
        onClose={closeToolbox}
      >
        <FunctionList />
      </FloatingPanel>
    </>
  );
};
