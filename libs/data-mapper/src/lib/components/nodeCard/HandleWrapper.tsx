import { tokens } from "@fluentui/react-components";
import { useMemo, useState } from "react";
import { Handle } from "reactflow";
import type { HandleType, Position as HandlePosition, Connection as ReactFlowConnection } from "reactflow";
import { ReactFlowNodeType } from "../../constants/ReactFlowConstants";
import { useSelector } from "react-redux";
import { store } from "../../core/state/Store";
import type { RootState } from "../../core/state/Store";
import { isValidFunctionNodeToSchemaNodeConnection, isValidInputToFunctionNode, isValidSchemaNodeToSchemaNodeConnection, newConnectionWillHaveCircularLogic } from "../../utils/Connection.Utils";

const defaultHandleStyles: React.CSSProperties = {
  zIndex: 5,
  width: '10px',
  height: '10px',
  borderWidth: tokens.strokeWidthThick,
  borderStyle: 'solid',
  borderColor: tokens.colorCompoundBrandForeground1,
  backgroundColor: tokens.colorNeutralBackground1,
};

const invalidHandleStyles: React.CSSProperties = {
  borderColor: tokens.colorPaletteRedBackground3,
  cursor: 'not-allowed',
};

const validHandleStyles: React.CSSProperties = {
  backgroundColor: tokens.colorCompoundBrandForeground1,
};

const AddConnectionSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translate(-18%, -18%)', pointerEvents: 'none' }}>
    <path d="M5 8H8M8 8H11M8 8V5M8 8L8 11" stroke="#115EA3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
    const [isHandleHovered, setIsHandleHovered] = useState<boolean>(false);
    const [isPotentialConnectionValid, setIsPotentialConnectionValid] = useState<boolean>(false);

    const sourceNodeConnectionBeingDrawnFromId = useSelector((state: RootState) => state.dataMap.sourceNodeConnectionBeingDrawnFromId);

    const connectionIsActivelyBeingDrawn = useMemo<boolean>(() => !!sourceNodeConnectionBeingDrawnFromId, [sourceNodeConnectionBeingDrawnFromId]);
    const thisNodeIsTheSourceOfTheActivelyDrawnConnection = useMemo<boolean>(() => connectionIsActivelyBeingDrawn && sourceNodeConnectionBeingDrawnFromId === nodeReactFlowId, [connectionIsActivelyBeingDrawn, sourceNodeConnectionBeingDrawnFromId, nodeReactFlowId]);

    const handleStyles = useMemo<React.CSSProperties>(() => {
        let newHandleStyles: React.CSSProperties = {
            ...defaultHandleStyles,
            visibility: shouldDisplay ? 'visible' : 'hidden',
        };

        // TODO: May actually need to monitor the connecting/valid ReactFlow CSS classes after all...
        console.log(`${connectionIsActivelyBeingDrawn} ${nodeReactFlowType === ReactFlowNodeType.SchemaNode} ${type === 'target'}`)

        if (connectionIsActivelyBeingDrawn && nodeReactFlowType === ReactFlowNodeType.SchemaNode && type === 'target') {
            if (isPotentialConnectionValid) {
                newHandleStyles = {...newHandleStyles, ...validHandleStyles};
            } else {
                newHandleStyles = {...newHandleStyles, ...invalidHandleStyles};
            }
        }

        return newHandleStyles;
    }, [type, nodeReactFlowType, connectionIsActivelyBeingDrawn, shouldDisplay, isPotentialConnectionValid]);

    const checkConnectionValidity = (connection: ReactFlowConnection): boolean => {
        let isValid = false;

        if (type === 'source') {
            if (nodeReactFlowType === ReactFlowNodeType.SchemaNode) {
                isValid = isValidConnectionFromSchemaNode(connection);
            } else {
                isValid = isValidConnectionFromFunctionNode(connection);
            }
        }

        setIsPotentialConnectionValid(isValid);
        return isValid;
    };

    return (
        <Handle
          type={type}
          position={position}
          style={handleStyles}
          isValidConnection={checkConnectionValidity}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
        >
          {type === 'source' && (isHandleHovered || thisNodeIsTheSourceOfTheActivelyDrawnConnection) && <AddConnectionSvg />}
        </Handle>
    );
};

export default HandleWrapper;

const isValidConnectionFromSchemaNode = (connection: ReactFlowConnection): boolean => {
    const flattenedSourceSchema = store.getState().dataMap.curDataMapOperation.flattenedSourceSchema;
    const functionDictionary = store.getState().dataMap.curDataMapOperation.currentFunctionNodes;
    const flattenedTargetSchema = store.getState().dataMap.curDataMapOperation.flattenedTargetSchema;
    const connectionDictionary = store.getState().dataMap.curDataMapOperation.dataMapConnections;
  
    if (connection.source && connection.target && flattenedSourceSchema && flattenedTargetSchema && functionDictionary && connectionDictionary) {
      const sourceSchemaNode = flattenedSourceSchema[connection.source];
      // Target is either a function, or target schema, node
      const targetFunctionNode = functionDictionary[connection.target];
      const targetSchemaNode = flattenedTargetSchema[connection.target];
      const currentTargetConnection = connectionDictionary[connection.target];
  
      if (targetFunctionNode) {
        return isValidInputToFunctionNode(
          sourceSchemaNode.normalizedDataType,
          currentTargetConnection,
          targetFunctionNode.maxNumberOfInputs,
          targetFunctionNode.inputs
        );
      }
  
      if (targetSchemaNode) {
        return isValidSchemaNodeToSchemaNodeConnection(sourceSchemaNode.schemaNodeDataType, targetSchemaNode.schemaNodeDataType);
      }
  
      return false;
    }
  
    return false;
};

const isValidConnectionFromFunctionNode = (connection: ReactFlowConnection) => {
    const functionDictionary = store.getState().dataMap.curDataMapOperation.currentFunctionNodes;
    const flattenedTargetSchema = store.getState().dataMap.curDataMapOperation.flattenedTargetSchema;
    const connectionDictionary = store.getState().dataMap.curDataMapOperation.dataMapConnections;
    
    if (connection.source && connection.target && flattenedTargetSchema && functionDictionary && connectionDictionary) {
        const sourceFunctionNode = functionDictionary[connection.source];
        // Target is either a function, or target schema, node
        const targetFunctionNode = functionDictionary[connection.target];
        const targetSchemaNode = flattenedTargetSchema[connection.target];
        const targetNodeConnection = connectionDictionary[connection.target];

        if (targetSchemaNode) {
            return isValidFunctionNodeToSchemaNodeConnection(sourceFunctionNode.outputValueType, targetSchemaNode.normalizedDataType);
        }

        if (targetFunctionNode) {
            // Verify the connection (Function<->Function) won't create circular logic
            if (newConnectionWillHaveCircularLogic(connection.target, connection.source, connectionDictionary)) {
                return false;
            } else {
                return isValidInputToFunctionNode(
                    sourceFunctionNode.outputValueType,
                    targetNodeConnection,
                    targetFunctionNode.maxNumberOfInputs,
                    targetFunctionNode.inputs
                );
            }
        }

        return false;
    }

    return false;
};