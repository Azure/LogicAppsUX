import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import { getTreeNodeId, isFunctionNode, isSourceNode, isTargetNode } from '../../../../utils/ReactFlow.Util';
import { NodeIds } from '../../../../constants/ReactFlowConstants';
import { equals } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../core/state/Store';
import { flattenSchemaIntoSortArray } from '../../../../utils';

type IntermediateConnectedEdgeForScrollingProps = {
  edgeId: string;
  id1: string;
  id2: string;
  id3: string;
  jsx: React.ReactElement;
};

const IntermediateConnectedEdgeForScrolling = (props: IntermediateConnectedEdgeForScrollingProps) => {
  const { id1, id2, id3, jsx } = props;
  const { getInternalNode } = useReactFlow();
  const { sourceSchema, targetSchema } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const flattenendSourceSchema = useMemo(
    () => (sourceSchema?.schemaTreeRoot ? flattenSchemaIntoSortArray(sourceSchema?.schemaTreeRoot) : []),
    [sourceSchema]
  );
  const flattenendTargetSchema = useMemo(
    () => (targetSchema?.schemaTreeRoot ? flattenSchemaIntoSortArray(targetSchema?.schemaTreeRoot) : []),
    [targetSchema]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sourceHandles = (getInternalNode(NodeIds.source)?.internals?.handleBounds?.source ?? []).filter(
    (handle) => handle.id && isSourceNode(handle.id)
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const targetHandles = (getInternalNode(NodeIds.target)?.internals?.handleBounds?.target ?? []).filter(
    (handle) => handle.id && isTargetNode(handle.id)
  );

  const isOneHandleOnCanvas = useMemo(() => {
    if (isFunctionNode(id1) && isFunctionNode(id2)) {
      return false;
    }

    // Number of handles that should be visible on the canvas
    const handlesToBeVisible = isFunctionNode(id1) || isFunctionNode(id2) ? 0 : 1;

    return (
      [...sourceHandles, ...targetHandles].filter((handle) => equals(handle.id, id1) || equals(handle.id, id2)).length ===
      handlesToBeVisible
    );
  }, [id1, id2, sourceHandles, targetHandles]);

  const direction = useMemo(() => {
    let direction = '';
    let sortArray = [];
    let firstElement = '';
    if (isSourceNode(id1)) {
      sortArray = flattenendSourceSchema;
      firstElement = sourceHandles.length > 0 ? sourceHandles[0]?.id ?? '' : '';
      direction = '-left';
    } else {
      sortArray = flattenendTargetSchema;
      firstElement = targetHandles.length > 0 ? targetHandles[0]?.id ?? '' : '';
      direction = '-right';
    }

    const index = sortArray.findIndex((node) => node === getTreeNodeId(id1));
    const firstElementIndex = sortArray.findIndex((node) => node === getTreeNodeId(firstElement));

    if (index >= 0 && firstElementIndex >= 0) {
      return index > firstElementIndex ? `bottom${direction}` : `top${direction}`;
    }
    return '';
  }, [id1, flattenendSourceSchema, sourceHandles, flattenendTargetSchema, targetHandles]);

  return flattenendSourceSchema.length === 0 ||
    flattenendTargetSchema.length === 0 ||
    !direction ||
    !isOneHandleOnCanvas ||
    !id3.startsWith(direction)
    ? null
    : jsx;
};

export default IntermediateConnectedEdgeForScrolling;
