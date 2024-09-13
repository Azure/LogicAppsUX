import type { RootState } from '../../../../core/state/Store';
import { useSelector } from 'react-redux';
import { getTreeNodeId, isSourceNode, isTargetNode } from '../../../../utils/ReactFlow.Util';

type IntermediateConnectedEdgeForCollapsingProps = {
  edgeId: string;
  id1: string;
  id2: string;
  id3: string;
  jsx: React.ReactElement;
};

const IntermediateConnectedEdgeForCollapsing = (props: IntermediateConnectedEdgeForCollapsingProps) => {
  const { id1, id2, id3, jsx } = props;
  const { sourceOpenKeys, targetOpenKeys } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  return (isSourceNode(id2) && isSourceNode(id1) && sourceOpenKeys[getTreeNodeId(id2)] === false) ||
    (isTargetNode(id3) && isTargetNode(id1) && targetOpenKeys[getTreeNodeId(id3)] === false)
    ? jsx
    : null;
};

export default IntermediateConnectedEdgeForCollapsing;
