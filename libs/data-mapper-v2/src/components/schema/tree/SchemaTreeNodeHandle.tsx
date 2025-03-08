import { useMemo, useRef } from 'react';
import { useHandleStyles } from './styles';
import { Handle } from '@xyflow/react';
import type { HandleResponseProps } from '../useSchema';
import { mergeClasses } from '@fluentui/react-components';
import { ArrowRepeatAllFilled } from '@fluentui/react-icons';

type SchemaTreeNodeHandleProps = {
  rowRect?: DOMRect;
  treeContainerTop?: number;
  treeContainerBottom?: number;
  handleProps: HandleResponseProps;
  isRepeatingNode: boolean;
  isConnected: boolean;
  isSelected: boolean;
  isHover: boolean;
  visible: boolean;
};
const SchemaTreeNodeHandle = (props: SchemaTreeNodeHandleProps) => {
  const { isRepeatingNode, isConnected, isSelected, isHover, handleProps, visible, treeContainerTop, treeContainerBottom, rowRect } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const styles = useHandleStyles();

  const isHandleScrolledOutOfView = useMemo(() => {
    if (rowRect && treeContainerTop !== undefined && treeContainerBottom !== undefined) {
      const mid = rowRect.height / 2;
      return rowRect.top + mid < treeContainerTop || rowRect.bottom - mid > treeContainerBottom;
    }

    return true;
  }, [rowRect, treeContainerBottom, treeContainerTop]);

  if (!visible || !rowRect || treeContainerTop === undefined || treeContainerBottom === undefined || isHandleScrolledOutOfView) {
    return null;
  }

  return (
    <Handle
      ref={ref}
      data-selectableid={handleProps.id}
      id={handleProps.id}
      key={handleProps.id}
      className={mergeClasses(
        styles.wrapper,
        handleProps.className,
        isRepeatingNode ? styles.repeating : '',
        isConnected ? styles.connected : '',
        isSelected || isHover ? styles.selected : '',
        (isSelected || isHover) && isConnected ? styles.connectedAndSelected : ''
      )}
      position={handleProps.position}
      type={handleProps.type}
      isConnectable={true}
    >
      {isRepeatingNode && (
        <ArrowRepeatAllFilled
          className={mergeClasses(
            styles.repeatingIcon,
            isConnected ? styles.repeatingConnectionIcon : isSelected || isHover ? styles.repeatingAndActiveNodeIcon : ''
          )}
        />
      )}
    </Handle>
  );
};

export default SchemaTreeNodeHandle;
