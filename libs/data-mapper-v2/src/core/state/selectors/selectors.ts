import { useSelector } from 'react-redux';
import type { RootState } from '../Store';

export const useActiveNode = (nodeId: string) =>
  useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[nodeId]);

export const useActiveEdge = (edgeId: string) =>
  useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[edgeId]);

export const useLooping = (edgeId?: string) => {
  const { edgeLoopMapping } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  return { loopPresent: edgeId && edgeLoopMapping[edgeId], isLoopable: !!edgeId };
};
