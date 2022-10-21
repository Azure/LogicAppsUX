import { addFunctionNode, addSourceNodes, removeSourceNodes } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { SchemaNodeExtended } from '../../models';
import type { FunctionData } from '../../models/Function';
import type { ButtonPivotProps } from '../buttonPivot/ButtonPivot';
import { ButtonPivot } from '../buttonPivot/ButtonPivot';
import { FloatingPanel } from '../floatingPanel/FloatingPanel';
import type { FloatingPanelProps } from '../floatingPanel/FloatingPanel';
import { FunctionList } from '../functionList/FunctionList';
import { SchemaTree } from '../tree/SchemaTree';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { CubeTree20Filled, CubeTree20Regular, MathFormula20Filled, MathFormula20Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export enum ToolboxPanelTabs {
  sourceSchemaTree = 'sourceSchemaTree',
  functionsList = 'functionsList',
}

const toolboxPanelProps: FloatingPanelProps = {
  xPos: '16px',
  yPos: '76px',
  width: '250px',
  minHeight: '450px',
  maxHeight: '450px',
};

export interface CanvasToolboxProps {
  toolboxTabToDisplay: ToolboxPanelTabs | '';
  setToolboxTabToDisplay: (newTab: ToolboxPanelTabs | '') => void;
  connectedSourceNodes: SchemaNodeExtended[];
}

export const CanvasToolbox = ({ toolboxTabToDisplay, setToolboxTabToDisplay, connectedSourceNodes }: CanvasToolboxProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const currentlyAddedSourceNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceNodes);

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

  const onTabSelect = useCallback(
    (_event: SelectTabEvent, data: SelectTabData) => {
      if (data.value === toolboxTabToDisplay) {
        setToolboxTabToDisplay('');
      } else {
        setToolboxTabToDisplay(data.value as ToolboxPanelTabs);
      }
    },
    [toolboxTabToDisplay, setToolboxTabToDisplay]
  );

  const onFunctionItemClick = (selectedFunction: FunctionData) => {
    dispatch(addFunctionNode(selectedFunction));
  };

  const onToolboxItemClick = (selectedNode: SchemaNodeExtended) => {
    if (
      currentlyAddedSourceNodes.some((node) => {
        return node.key === selectedNode.key;
      })
    ) {
      dispatch(removeSourceNodes([selectedNode]));
    } else {
      dispatch(addSourceNodes([selectedNode]));
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

  return (
    <>
      <ButtonPivot {...toolboxButtonPivotProps} />

      {toolboxTabToDisplay === ToolboxPanelTabs.sourceSchemaTree && sourceSchema && (
        <FloatingPanel {...toolboxPanelProps}>
          <SchemaTree
            schema={sourceSchema}
            toggledNodes={[...currentlyAddedSourceNodes, ...connectedSourceNodes]}
            onNodeClick={onToolboxItemClick}
          />
        </FloatingPanel>
      )}

      {toolboxTabToDisplay === ToolboxPanelTabs.functionsList && (
        <FloatingPanel {...toolboxPanelProps}>
          <FunctionList functionData={functionData} onFunctionClick={onFunctionItemClick}></FunctionList>
        </FloatingPanel>
      )}
    </>
  );
};
