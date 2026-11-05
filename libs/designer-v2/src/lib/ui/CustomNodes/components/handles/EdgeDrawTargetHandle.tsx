import { mergeClasses } from '@fluentui/react-components';
import { Handle, Position } from '@xyflow/react';
import { containedHandleStyle, useHandleStyles } from './handles.styles';
import { NodeHandle } from '@microsoft/designer-ui-v2';
import { useHandlePresentation } from './useHandlePresentation';

export const EdgeDrawTargetHandle = ({
  contained = false,
  axis = 'vertical',
}: {
  contained?: boolean;
  axis?: 'vertical' | 'horizontal';
}) => {
  const styles = useHandleStyles();
  const shared = useHandlePresentation();
  const horizontal = axis === 'horizontal';

  return (
    <Handle
      className={mergeClasses(styles.nodeHandle, shared && contained ? styles.sharedPort : horizontal ? styles.left : styles.top)}
      type="target"
      position={horizontal ? Position.Left : Position.Top}
      isConnectable={true}
      isConnectableStart={false}
      isConnectableEnd={true}
      data-port-contained={(shared && contained) || undefined}
      data-port-hit-surface={shared && !contained ? 'card' : undefined}
      style={shared && contained ? containedHandleStyle : undefined}
    >
      {shared && !contained ? <NodeHandle className={horizontal ? styles.inputDotHorizontal : styles.inputDot} /> : null}
    </Handle>
  );
};
