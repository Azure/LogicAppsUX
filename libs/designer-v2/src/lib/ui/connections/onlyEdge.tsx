import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type React from 'react';
import { BezierEdge, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react';
import { nodeLineStrokes, useNodeLineStyles } from '@microsoft/designer-ui-v2';
import { useGuid } from '@microsoft/logic-apps-shared';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useConnectionStyles } from './connections.styles';
import { mergeClasses } from '@fluentui/react-components';
import { getSharedEdgeArrowDirection } from './sharedEdgeRunState';
import { SharedEdgeArrowCap } from './sharedEdgeArrowCap';

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

export const OnlyEdge: React.FC<EdgeProps> = (props) => {
  const enabled = useSharedNodeUi();
  const reactFlow = useReactFlow();
  const presentation = props.data?.presentation as { shared?: boolean } | undefined;
  const edgeMode = presentation?.shared ?? enabled;
  const sourceAccepted = Boolean(
    (reactFlow.getNode(props.source)?.data as { presentation?: { shared?: boolean } } | undefined)?.presentation?.shared
  );
  const targetAccepted = Boolean(
    (reactFlow.getNode(props.target)?.data as { presentation?: { shared?: boolean } } | undefined)?.presentation?.shared
  );
  // Match accepted edge/node presentation so plain edges never switch ahead of cards/handles.
  const shared = edgeMode && sourceAccepted && targetAccepted;
  const line = useNodeLineStyles();
  const capGuid = useGuid();
  const styles = useConnectionStyles();
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} } = props;
  const [d] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (!shared) {
    return <BezierEdge {...props} />;
  }
  return (
    <>
      <path
        id={id}
        style={{ ...style, ...nodeLineStrokes.solid }}
        className={mergeClasses('msla-shared-edge-path', line.base, line.solid)}
        d={d}
        data-line="solid"
        markerEnd={`url(#${capGuid})`}
      />
      {/* Distinct cap class keeps `.msla-shared-edge-path` unique to the edge stroke; the marker is painted by that stroke. */}
      <SharedEdgeArrowCap
        id={capGuid}
        x={targetX}
        y={targetY}
        direction={getSharedEdgeArrowDirection(targetPosition)}
        variant="solid"
        style={{ ...style, stroke: nodeLineStrokes.solid.stroke, strokeWidth: nodeLineStrokes.solid.strokeWidth }}
        className={mergeClasses('msla-shared-edge-cap', line.base, line.solid)}
      />
      <path
        d={d}
        className={styles.hitPath}
        strokeWidth={props.interactionWidth ?? nodeMetrics.edgeControl.interactionWidth}
        data-edge-hit-target
      />
    </>
  );
};
