import { Handle, Position } from '@xyflow/react';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { containedHandleStyle, useHandleStyles } from './handles.styles';
import { mergeClasses } from '@fluentui/react-components';
import { NodeHandle } from '@microsoft/designer-ui-v2';
import { useHandlePresentation } from './useHandlePresentation';

export const EdgeDrawSourceHandle = ({
  highlighted,
  contained = false,
  axis = 'vertical',
}: {
  highlighted?: boolean;
  contained?: boolean;
  axis?: 'vertical' | 'horizontal';
}) => {
  const styles = useHandleStyles();
  const readOnly = useReadOnly();
  const shared = useHandlePresentation();
  const horizontal = axis === 'horizontal';

  return (
    <Handle
      className={
        shared
          ? mergeClasses(
              styles.nodeHandle,
              styles.sharedPort,
              !contained && (horizontal ? styles.sharedSourceHorizontal : styles.sharedSource)
            )
          : mergeClasses(
              styles.nodeHandle,
              horizontal ? styles.right : styles.bottom,
              styles.edgeDrawStart,
              highlighted && styles.edgeDrawStartHighlighted
            )
      }
      type="source"
      position={horizontal ? Position.Right : Position.Bottom}
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
                transform: horizontal ? 'translate(0, -50%)' : 'translate(-50%, 0)',
              }
            : {}
      }
    >
      {shared && !contained ? <NodeHandle className={styles.dot} /> : null}
    </Handle>
  );
};
