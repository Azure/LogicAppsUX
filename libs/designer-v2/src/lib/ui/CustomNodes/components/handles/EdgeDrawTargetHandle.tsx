import { mergeClasses } from '@fluentui/react-components';
import { Handle, Position } from '@xyflow/react';
import { containedHandleStyle, useHandleStyles } from './handles.styles';
import { NodeHandle } from '@microsoft/designer-ui-v2';
import { useHandlePresentation } from './useHandlePresentation';

export const EdgeDrawTargetHandle = ({ contained = false }: { contained?: boolean }) => {
  const styles = useHandleStyles();
  const shared = useHandlePresentation();

  return (
    <Handle
      className={mergeClasses(styles.nodeHandle, shared && contained ? styles.sharedPort : styles.top)}
      type="target"
      position={Position.Top}
      isConnectable={true}
      isConnectableStart={false}
      isConnectableEnd={true}
      data-port-contained={(shared && contained) || undefined}
      data-port-hit-surface={shared && !contained ? 'card' : undefined}
      style={shared && contained ? containedHandleStyle : undefined}
    >
      {shared && !contained ? <NodeHandle className={styles.inputDot} /> : null}
    </Handle>
  );
};
