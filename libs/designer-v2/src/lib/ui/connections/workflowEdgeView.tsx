import { css } from '@fluentui/utilities';
import { getEdgeCenter, getRecordEntry, RUN_AFTER_STATUS, useGuid } from '@microsoft/logic-apps-shared';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import { ArrowCap } from './dynamicsvgs/arrowCap';
import { CollapsedRunAfterIndicator, RunAfterIndicator } from './runAfterIndicator';

export const filterRunAfters = (runAfter: Record<string, string[]> = {}) =>
  Object.fromEntries(
    Object.entries(runAfter).filter(([, statuses]) =>
      (statuses ?? []).some((status) => status.toUpperCase() !== RUN_AFTER_STATUS.SUCCEEDED)
    )
  );

export interface WorkflowEdgeViewProps
  extends Pick<EdgeProps, 'id' | 'source' | 'sourceX' | 'sourceY' | 'targetX' | 'targetY' | 'sourcePosition' | 'targetPosition' | 'style'> {
  filteredRunAfters: Record<string, string[]>;
  runAfterIndex: number;
  highlighted?: boolean;
}

/** The native Designer path, arrow cap and status presentation, independent of editor state and drop zones. */
export const WorkflowEdgeView = ({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  filteredRunAfters,
  runAfterIndex,
  highlighted = false,
  children,
}: PropsWithChildren<WorkflowEdgeViewProps>) => {
  const numRunAfters = Object.keys(filteredRunAfters).length;
  const statuses = getRecordEntry(filteredRunAfters, source) ?? [];
  const showRunAfter = statuses.length > 0 && numRunAfters < 6;
  const showCollapsedRunAfter = statuses.length > 0 && numRunAfters > 5 && Object.keys(filteredRunAfters)[0] === source;
  const [, centerY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY });
  const [path] = useMemo(
    () =>
      getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY: (numRunAfters !== 0 ? targetY - 12 : targetY) - 2,
        targetPosition,
        borderRadius: 8,
        centerY,
      }),
    [numRunAfters, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY, centerY]
  );
  const capGuid = useGuid();
  return (
    <>
      <defs>
        <marker
          id={capGuid}
          className={css(highlighted ? 'highlighted' : '')}
          viewBox="0 0 20 20"
          refX="6"
          refY="8"
          markerWidth="12"
          markerHeight="10"
        >
          <ArrowCap />
        </marker>
      </defs>
      <path
        id={id}
        style={style}
        className={css('react-flow__edge-path', highlighted ? 'highlighted' : '')}
        d={path}
        strokeDasharray={showRunAfter ? '4 6' : '0'}
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd={`url(#${capGuid})`}
      />
      {children}
      {showRunAfter ? (
        <foreignObject
          id="msla-run-after-traffic-light"
          width={36}
          height={12}
          x={targetX - 18 + (numRunAfters - 1 - runAfterIndex * 2) * 22}
          y={targetY - 12}
        >
          <RunAfterIndicator statuses={statuses} sourceNodeId={source} />
        </foreignObject>
      ) : null}
      {showCollapsedRunAfter ? (
        <foreignObject id="msla-run-after-traffic-light" width={36} height={12} x={targetX - 18} y={targetY - 12}>
          <CollapsedRunAfterIndicator filteredRunAfters={filteredRunAfters} runAfterCount={numRunAfters} />
        </foreignObject>
      ) : null}
    </>
  );
};
