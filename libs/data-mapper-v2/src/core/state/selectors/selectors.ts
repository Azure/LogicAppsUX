import { useSelector } from 'react-redux';
import type { RootState } from '../Store';
import { getReactFlowNodeId } from '../../../utils';

export const useSelectedNode = (nodeId: string) =>
  useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[nodeId]);

export const useSelectedEdge = (edgeId: string) =>
  useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[edgeId]);

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
