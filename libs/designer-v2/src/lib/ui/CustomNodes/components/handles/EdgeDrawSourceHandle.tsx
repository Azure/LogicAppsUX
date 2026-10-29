import { Handle, Position } from '@xyflow/react';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { containedHandleStyle, useHandleStyles } from './handles.styles';
import { mergeClasses } from '@fluentui/react-components';
import { NodeHandle } from '@microsoft/designer-ui-v2';
import { useHandlePresentation } from './useHandlePresentation';

export const EdgeDrawSourceHandle = ({ highlighted, contained = false }: { highlighted?: boolean; contained?: boolean }) => {
  const styles = useHandleStyles();
  const readOnly = useReadOnly();
  const shared = useHandlePresentation();

  return (
    <Handle
      className={
        shared
          ? mergeClasses(styles.nodeHandle, styles.sharedPort, !contained && styles.sharedSource)
          : mergeClasses(styles.nodeHandle, styles.bottom, styles.edgeDrawStart, highlighted && styles.edgeDrawStartHighlighted)
      }
      type="source"
      position={Position.Bottom}
      isConnectable={true}
      isConnectableStart={true}
      isConnectableEnd={false}
      data-port-contained={(shared && contained) || undefined}
      style={
        shared
          ? { ...(contained ? containedHandleStyle : {}), ...(readOnly ? { visibility: 'hidden' } : {}) }
          : readOnly
            ? {
                visibility: 'hidden',
                transform: 'translate(-50%, 0)',
              }
            : {}
      }
    >
      {shared && !contained ? <NodeHandle className={styles.dot} /> : null}
    </Handle>
  );
};
