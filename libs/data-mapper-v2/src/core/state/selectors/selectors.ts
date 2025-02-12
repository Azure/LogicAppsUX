import { useSelector } from 'react-redux';
import type { RootState } from '../Store';
import { getReactFlowNodeId } from '../../../utils';
import { createEdgeId } from '../../../utils/Edge.Utils';

export const useSelectedNode = (nodeId: string) =>
  useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[nodeId]);

export const useSchemasButNoConnections = () => {
  return useSelector(
    (state: RootState) =>
      Object.keys(state.dataMap.present.curDataMapOperation.flattenedSourceSchema).length !== 0 &&
      Object.keys(state.dataMap.present.curDataMapOperation.flattenedTargetSchema).length !== 0 &&
      Object.keys(state.dataMap.present.curDataMapOperation.dataMapConnections).length === 0
  );
};

export const useSelectedEdge = (edgeId: string) =>
  useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[edgeId]);

export const useSelectedIntermediateEdge = (id1: string, id2: string) =>
  useSelector(
    (state: RootState) =>
      state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[createEdgeId(id1, id2)] ??
      state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[createEdgeId(id2, id1)]
  );

export const useLooping = (edgeId?: string) => {
  const { edgeLoopMapping } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  return {
    loopPresent: edgeId && edgeLoopMapping[edgeId],
    isLoopable: !!edgeId,
  };
};

export const useHoverNode = (nodeId: string) => {
  const hoverState = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state?.hover);
  return hoverState && hoverState.type === 'node' && getReactFlowNodeId(hoverState.id, hoverState.isSourceSchema ?? false) === nodeId;
};

export const useHoverFunctionNode = (nodeId: string) => {
  const hoverState = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state?.hover);
  return hoverState && hoverState.type === 'function' && hoverState.id === nodeId;
};

export const useHoverEdge = (edgeId: string) => {
  const hoverState = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state?.hover);
  return hoverState && hoverState.type === 'edge' && hoverState.id === edgeId;
};
