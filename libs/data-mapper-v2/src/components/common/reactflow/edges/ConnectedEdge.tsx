import { getStraightPath, type EdgeProps } from '@xyflow/react';
import { useSelectedEdge, useHoverEdge } from '../../../../core/state/selectors/selectors';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setSelectedItem } from '../../../../core/state/DataMapSlice';
import useEdgePath from './useEdgePath';
import { customTokens } from '../../../../core/ThemeConect';

const ConnectedEdge = (props: EdgeProps) => {
  const { id, source, data } = props;
  const isSelected = useSelectedEdge(id);
  const dispatch = useDispatch();
  const isHovered = useHoverEdge(id);
  const { sourceX, sourceY, targetX, targetY, sourceScenario, targetScenario } = useEdgePath(props);

  const strokeColor = useMemo(
    () => (isHovered || isSelected ? customTokens['edgeActive'] : customTokens['edgeConnected']),
    [isSelected, isHovered]
  );

  const onClick = useCallback(() => {
    if (source) {
      dispatch(setSelectedItem((data?.sourceHandleId as string) ?? source));
    }
  }, [dispatch, source, data]);

  if (sourceX === undefined || sourceY === undefined || targetX === undefined || targetY === undefined) {
    return null;
  }

  const [path] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return sourceScenario === 'scroll' && targetScenario === 'scroll' ? null : (
    <g id={`${id}_customEdge`} onClick={onClick} data-selectableid={id}>
      <path fill="none" stroke={strokeColor} strokeWidth={5} className="animated" d={path} data-selectableid={id} />
    </g>
  );
};

export default ConnectedEdge;
