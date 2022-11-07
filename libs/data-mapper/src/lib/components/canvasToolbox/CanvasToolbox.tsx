import { addSourceSchemaNodes, removeSourceSchemaNodes, setCanvasToolboxTabToDisplay } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import type { ButtonPivotProps } from '../buttonPivot/ButtonPivot';
import { ButtonPivot } from '../buttonPivot/ButtonPivot';
import { FloatingPanel } from '../floatingPanel/FloatingPanel';
import type { FloatingPanelProps } from '../floatingPanel/FloatingPanel';
import { FunctionList } from '../functionList/FunctionList';
import SourceSchemaTreeItem from '../tree/SourceSchemaTreeItem';
import Tree from '../tree/Tree';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { CubeTree20Filled, CubeTree20Regular, MathFormula20Filled, MathFormula20Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export enum ToolboxPanelTabs {
  sourceSchemaTree = 'sourceSchemaTree',
  functionsList = 'functionsList',
}

const generalToolboxPanelProps = {
  xPos: '16px',
  yPos: '60px',
  width: '250px',
  minHeight: '200px',
} as FloatingPanelProps;

interface CanvasToolboxProps {
  canvasBlockHeight: number;
}

export const CanvasToolbox = ({ canvasBlockHeight }: CanvasToolboxProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const toolboxTabToDisplay = useSelector((state: RootState) => state.dataMap.canvasToolboxTabToDisplay);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceSchemaNodes);

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
    if (currentSourceSchemaNodes.some((node) => node.key === selectedNode.key)) {
      dispatch(removeSourceSchemaNodes([selectedNode]));
    } else {
      dispatch(addSourceSchemaNodes([selectedNode]));
    }
  };

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

  return (
    <>
      <ButtonPivot {...toolboxButtonPivotProps} />

      {toolboxTabToDisplay === ToolboxPanelTabs.sourceSchemaTree && sourceSchema && (
        <FloatingPanel
          {...generalToolboxPanelProps}
          height={floatingPanelHeight}
          title={sourceSchemaLoc}
          subtitle={sourceSchema.name}
          onClose={closeToolbox}
        >
          <Tree<SchemaNodeExtended>
            treeRoot={sourceSchema.schemaTreeRoot}
            nodeContent={(node: SchemaNodeExtended) => (
              <SourceSchemaTreeItem
                node={node}
                isNodeAdded={currentSourceSchemaNodes.some((srcSchemaNode) => srcSchemaNode.key === node.key)}
                onClick={() => onSourceSchemaItemClick(node)}
              />
            )}
          />
        </FloatingPanel>
      )}

      {toolboxTabToDisplay === ToolboxPanelTabs.functionsList && (
        <FloatingPanel {...generalToolboxPanelProps} height={floatingPanelHeight} title={functionLoc} onClose={closeToolbox}>
          <FunctionList />
        </FloatingPanel>
      )}
    </>
  );
};
