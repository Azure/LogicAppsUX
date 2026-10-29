import type { ElkExtendedEdge } from 'elkjs/lib/elk-api';
import type React from 'react';
import { BezierEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { nodeLineStrokes, useNodeLineStyles } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useConnectionStyles } from './connections.styles';
import { mergeClasses } from '@fluentui/react-components';

export interface LogicAppsEdgeProps {
  id: string;
  source: string;
  target: string;
  elkEdge?: ElkExtendedEdge;
  style?: React.CSSProperties;
}

export const OnlyEdge: React.FC<EdgeProps> = (props) => {
  const enabled = useSharedNodeUi();
  const presentation = props.data?.presentation as { shared?: boolean } | undefined;
  const shared = presentation?.shared ?? enabled;
  const line = useNodeLineStyles();
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
