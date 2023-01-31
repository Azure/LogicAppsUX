import type { FunctionGroupBranding } from '../../../constants/FunctionConstants';
import { functionNodeCardSize } from '../../../constants/NodeConstants';
import type { ConnectionDictionary } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { isCustomValue, isValidConnectionByType, isValidCustomValueByType } from '../../../utils/Connection.Utils';
import { isSchemaNodeExtended } from '../../../utils/Schema.Utils';
import type { CardProps } from '../NodeCard';
import { createFocusOutlineStyle, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const sharedHalfCardSize = functionNodeCardSize / 2;

export const useFunctionCardStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    color: tokens.colorNeutralBackground1,
    fontSize: '20px',
    height: `${sharedHalfCardSize}px`,
    width: `${sharedHalfCardSize}px`,
    minWidth: `${sharedHalfCardSize}px`,
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
  !!sourceNodeConnectionBeingDrawnFromId &&
  sourceNodeConnectionBeingDrawnFromId !== reactFlowId;

export const shouldDisplaySourceHandle = (
  displayHandle: boolean,
  sourceNodeConnectionBeingDrawnFromId: string | undefined,
  isCardHovered: boolean,
  isCurrentNodeSelected: boolean
) => displayHandle && shouldDisplayHandles(sourceNodeConnectionBeingDrawnFromId, isCardHovered, isCurrentNodeSelected);

export const inputsValid = (reactFlowId: string, functionData: FunctionData, connections: ConnectionDictionary) => {
  let isEveryInputValid = true;
  const curConn = connections[reactFlowId];

  if (curConn) {
    Object.values(curConn.inputs).forEach((inputArr, inputIdx) => {
      inputArr.forEach((inputVal) => {
        let inputValMatchedOneOfAllowedTypes = false;

        functionData.inputs[inputIdx].allowedTypes.forEach((allowedInputType) => {
          if (inputVal !== undefined) {
            if (isCustomValue(inputVal)) {
              if (isValidCustomValueByType(inputVal, allowedInputType)) {
                inputValMatchedOneOfAllowedTypes = true;
              }
            } else {
              if (isSchemaNodeExtended(inputVal.node)) {
                if (isValidConnectionByType(allowedInputType, inputVal.node.normalizedDataType)) {
                  inputValMatchedOneOfAllowedTypes = true;
                }
              } else if (isValidConnectionByType(allowedInputType, inputVal.node.outputValueType)) {
                inputValMatchedOneOfAllowedTypes = true;
              }
            }
          }
        });

        if (!inputValMatchedOneOfAllowedTypes) {
          isEveryInputValid = false;
        }
      });
    });
  }

  return isEveryInputValid;
};
