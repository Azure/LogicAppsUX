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

interface CanvasToolboxProps {
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

  const toolboxLoc = intl.formatMessage({
    defaultMessage: 'Toolbox',
    description: 'Label to open the input toolbox card',
  });

  const functionLoc = intl.formatMessage({
    defaultMessage: 'Function',
    description: 'Label to open the Function card',
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
          tooltip: toolboxLoc,
          regularIcon: CubeTree20Regular,
          filledIcon: CubeTree20Filled,
          value: ToolboxPanelTabs.sourceSchemaTree,
        },
        {
          tooltip: functionLoc,
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
    [toolboxTabToDisplay, onTabSelect, toolboxLoc, functionLoc]
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
