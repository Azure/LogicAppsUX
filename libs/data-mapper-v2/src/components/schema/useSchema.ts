import { useCallback, useMemo } from 'react';
import { isSourceNode } from '../../utils/ReactFlow.Util';
import { SchemaType } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSourceEditState, toggleTargetEditState } from '../../core/state/DataMapSlice';
import { NodeIds } from '../../constants/ReactFlowConstants';
import { getReactFlowNodeId } from '../../utils';
import { type HandleType, Position } from '@xyflow/react';
import { useHandleStyles } from './tree/styles';

export type HandleResponseProps = {
  id: string;
  position: Position;
  type: HandleType;
  className: string;
};

type useSchemaProps = {
  id: string;
  currentNodeKey?: string;
};

const useSchema = (props: useSchemaProps) => {
  const { id, currentNodeKey } = props;
  const handleStyles = useHandleStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { sourceOpenKeys, targetOpenKeys, sourceSchema, targetSchema } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );
  const { sourceSchemaTreeData, targetSchemaTreeData } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
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
    } as HandleResponseProps,
    schemaFile: isSourceSchema ? sourceSchema?.name : targetSchema?.name,
    schemaTreeData: isSourceSchema ? sourceSchemaTreeData : targetSchemaTreeData,
  };
};

export default useSchema;
