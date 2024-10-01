import { useCallback, useMemo } from 'react';
import { isSourceNode } from '../../utils/ReactFlow.Util';
import { SchemaType } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../core/state/Store';
import { useDispatch } from 'react-redux';
import { toggleSourceEditState, toggleTargetEditState } from '../../core/state/DataMapSlice';
import { NodeIds } from '../../constants/ReactFlowConstants';
import { getReactFlowNodeId } from '../../utils';
import { type HandleType, Position } from '@xyflow/react';
import { useHandleStyles } from './tree/styles';
import useReduxStore from '../useReduxStore';

type useSchemaProps = {
  id: string;
  currentNodeKey?: string;
};

const useSchema = (props: useSchemaProps) => {
  const { id, currentNodeKey } = props;
  const handleStyles = useHandleStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { sourceOpenKeys, targetOpenKeys } = useReduxStore();

  const isSourceSchema = useMemo(() => isSourceNode(id), [id]);
  const schemaType = useMemo(() => (isSourceNode(id) ? SchemaType.Source : SchemaType.Target), [id]);
  const panelNodeId = useMemo(() => (isSourceSchema ? NodeIds.source : NodeIds.target), [isSourceSchema]);

  const toggleEditState = useCallback(
    (state: boolean) => {
      if (isSourceSchema) {
        dispatch(toggleSourceEditState(state));
      } else {
        dispatch(toggleTargetEditState(state));
      }
    },
    [dispatch, isSourceSchema]
  );

  const nodeId = useMemo(
    () => (currentNodeKey ? getReactFlowNodeId(currentNodeKey, isSourceSchema) : ''),
    [currentNodeKey, isSourceSchema]
  );

  return {
    isSourceSchema,
    schemaType,
    toggleEditState,
    panelNodeId,
    openKeys: isSourceSchema ? sourceOpenKeys : targetOpenKeys,
    nodeId,
    handle: {
      id: nodeId,
      position: isSourceSchema ? Position.Right : Position.Left,
      type: (isSourceSchema ? 'source' : 'target') as HandleType,
      className: isSourceSchema ? handleStyles.left : handleStyles.right,
    },
  };
};

export default useSchema;
