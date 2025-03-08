import type { FunctionGroupBranding } from '../../../constants/FunctionConstants';
import { simpleFunctionCardDiameter } from '../../../constants/NodeConstants';
import type { ConnectionDictionary } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { hasOnlyCustomInputType } from '../../../utils/Function.Utils';
import { areInputTypesValidForFunction } from '../../../utils/MapChecker.Utils';
import type { CardProps } from '../NodeCard';
import { createFocusOutlineStyle, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const simpleFunctionCardRadius = simpleFunctionCardDiameter / 2;

export const useFunctionCardStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralBackground1,
    fontSize: '20px',
    height: `${simpleFunctionCardRadius}px`,
    width: `${simpleFunctionCardRadius}px`,
    minWidth: `${simpleFunctionCardRadius}px`,
    textAlign: 'center',
    position: 'relative',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    ...shorthands.margin(tokens.strokeWidthThick),
    '&:hover': {
      color: tokens.colorNeutralBackground1,
    },
    '&:active': {
      // Not sure what was overwriting the base color, but the important overwrites the overwrite
      color: `${tokens.colorNeutralBackground1} !important`,
    },
  },
  container: {
    position: 'relative',
  },
  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineRadius: '100px',
    },
  }),
});

export interface FunctionCardProps extends CardProps {
  functionData: FunctionData;
  functionBranding: FunctionGroupBranding;
  dataTestId: string;
}

export const shouldDisplayHandles = (
  sourceNodeConnectionBeingDrawnFromId: string | undefined,
  isCardHovered: boolean,
  isCurrentNodeSelected: boolean
) => !sourceNodeConnectionBeingDrawnFromId && (isCardHovered || isCurrentNodeSelected);

export const shouldDisplayTargetHandle = (
  displayHandle: boolean,
  sourceNodeConnectionBeingDrawnFromId: string | undefined,
  reactFlowId: string,
  functionData: FunctionData
) =>
  displayHandle &&
  functionData.maxNumberOfInputs !== 0 &&
  !hasOnlyCustomInputType(functionData) &&
  !!sourceNodeConnectionBeingDrawnFromId &&
  sourceNodeConnectionBeingDrawnFromId !== reactFlowId;

export const shouldDisplaySourceHandle = (
  displayHandle: boolean,
  sourceNodeConnectionBeingDrawnFromId: string | undefined,
  isCardHovered: boolean,
  isCurrentNodeSelected: boolean
) => displayHandle && shouldDisplayHandles(sourceNodeConnectionBeingDrawnFromId, isCardHovered, isCurrentNodeSelected);

export const inputsValid = (reactFlowId: string, functionData: FunctionData, connections: ConnectionDictionary) => {
  const connection = connections[reactFlowId];

  if (connection) {
    return areInputTypesValidForFunction(functionData, connection);
  }
  return true;
};
