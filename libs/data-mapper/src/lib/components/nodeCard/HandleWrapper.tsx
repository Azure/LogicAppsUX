import { ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import type { RootState } from '../../core/state/Store';
import { store } from '../../core/state/Store';
import { isFunctionInputSlotAvailable, newConnectionWillHaveCircularLogic } from '../../utils/Connection.Utils';
import { makeStaticStyles, tokens } from '@fluentui/react-components';
import { SchemaType } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position as HandlePosition, HandleType, Connection as ReactFlowConnection } from 'reactflow';
import { Handle } from 'reactflow';

// Override ReactFlow's handle classes
const useStaticStyles = makeStaticStyles({
  '.react-flow__handle': {
    // Default handle
    zIndex: 5,
    width: '15px',
    height: '15px',
    border: `${tokens.strokeWidthThick} solid ${tokens.colorCompoundBrandForeground1}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  '.react-flow__handle-left': {
    left: 0,
    transform: 'translate(-50%, -50%)',
  },
  '.react-flow__handle-right': {
    right: 0,
    transform: 'translate(50%, -50%)',
  },
  '.react-flow__handle-connecting': {
    // Handle invalid state
    borderColor: tokens.colorPaletteRedBackground3,
    cursor: 'not-allowed',
  },
  '.react-flow__handle-valid': {
    // Handle valid state
    borderColor: tokens.colorCompoundBrandForeground1,
    backgroundColor: tokens.colorCompoundBrandForeground1,
  },
});

const AddConnectionSvg = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: 'translate(-18%, -18%)', pointerEvents: 'none' }}
  >
    <path d="M5 8H8M8 8H11M8 8V5M8 8L8 11" stroke="#115EA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface HandleWrapperProps {
  type: HandleType;
  position: HandlePosition;
  shouldDisplay: boolean;
  nodeReactFlowType: ReactFlowNodeType;
  nodeReactFlowId: string;
}

const HandleWrapper = ({ type, position, shouldDisplay, nodeReactFlowType, nodeReactFlowId }: HandleWrapperProps) => {
  useStaticStyles();

  const sourceNodeConnectionBeingDrawnFromId = useSelector(
    (state: RootState) => state.dataMap.present.sourceNodeConnectionBeingDrawnFromId
  );

  const [isHandleHovered, setIsHandleHovered] = useState<boolean>(false);

  const connectionIsActivelyBeingDrawn = useMemo<boolean>(
    () => !!sourceNodeConnectionBeingDrawnFromId,
    [sourceNodeConnectionBeingDrawnFromId]
  );
  const thisNodeIsTheSourceOfTheActivelyDrawnConnection = useMemo<boolean>(
    () => connectionIsActivelyBeingDrawn && sourceNodeConnectionBeingDrawnFromId === nodeReactFlowId,
    [connectionIsActivelyBeingDrawn, sourceNodeConnectionBeingDrawnFromId, nodeReactFlowId]
  );

  const checkIfConnectionPossible = useCallback(
    (connection: ReactFlowConnection): boolean => {
      if (type === SchemaType.Source) {
        return nodeReactFlowType === ReactFlowNodeType.SchemaNode
          ? isValidConnectionFromSchemaNode(connection)
          : isValidConnectionFromFunctionNode(connection);
      }

      return false;
    },
    [type, nodeReactFlowType]
  );

  return (
    <Handle
      type={type}
      position={position}
      style={{
        visibility: shouldDisplay ? 'visible' : 'hidden',
        transform:
          nodeReactFlowType === ReactFlowNodeType.FunctionNode ? `translate(${type === SchemaType.Target ? '-' : ''}30%, -55%)` : undefined,
      }}
      isValidConnection={checkIfConnectionPossible}
      onMouseEnter={() => setIsHandleHovered(true)}
      onMouseLeave={() => setIsHandleHovered(false)}
    >
      {type === SchemaType.Source && (isHandleHovered || thisNodeIsTheSourceOfTheActivelyDrawnConnection) && <AddConnectionSvg />}
    </Handle>
  );
};

export default HandleWrapper;

const isValidConnectionFromSchemaNode = (connection: ReactFlowConnection): boolean => {
  const flattenedSourceSchema = store.getState().dataMap.present.curDataMapOperation.flattenedSourceSchema;
  const functionDictionary = store.getState().dataMap.present.curDataMapOperation.functionNodes;
  const flattenedTargetSchema = store.getState().dataMap.present.curDataMapOperation.flattenedTargetSchema;
  const connectionDictionary = store.getState().dataMap.present.curDataMapOperation.dataMapConnections;

  if (
    connection.source &&
    connection.target &&
    flattenedSourceSchema &&
    flattenedTargetSchema &&
    functionDictionary &&
    connectionDictionary
  ) {
    // Target must be either a function or target schema node
    const targetFunctionNode = functionDictionary[connection.target]?.functionData;
    const currentTargetConnection = connectionDictionary[connection.target];

    return targetFunctionNode ? isFunctionInputSlotAvailable(currentTargetConnection, targetFunctionNode.maxNumberOfInputs) : true;
  }

  return false;
};

const isValidConnectionFromFunctionNode = (connection: ReactFlowConnection) => {
  const functionDictionary = store.getState().dataMap.present.curDataMapOperation.functionNodes;
  const flattenedTargetSchema = store.getState().dataMap.present.curDataMapOperation.flattenedTargetSchema;
  const connectionDictionary = store.getState().dataMap.present.curDataMapOperation.dataMapConnections;

  if (connection.source && connection.target && flattenedTargetSchema && functionDictionary && connectionDictionary) {
    const targetFunctionNode = functionDictionary[connection.target]?.functionData;
    const targetNodeConnection = connectionDictionary[connection.target];

    if (targetFunctionNode) {
      // Verify that the Function<->Function connection won't create circular logic
      if (newConnectionWillHaveCircularLogic(connection.target, connection.source, connectionDictionary)) {
        return false;
      } else {
        return isFunctionInputSlotAvailable(targetNodeConnection, targetFunctionNode.maxNumberOfInputs);
      }
    }

    return true;
  }

  return false;
};
