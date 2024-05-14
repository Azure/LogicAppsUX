import { Stack } from '@fluentui/react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Circle20Filled } from '@fluentui/react-icons';
import { useStyles } from './styles';
import type { SchemaNodeReactFlowDataProps } from 'components/addSchema/tree/TreeNode';

const SchemaNode = (props: NodeProps<SchemaNodeReactFlowDataProps>) => {
  const { data } = props;
  const { isLeftDirection, key } = data;
  const styles = useStyles();

  return (
    <Stack className="nodrag customNode" id={`wrapper-${key}`} horizontal verticalAlign="center">
      <Circle20Filled className={styles.circleNonHoveredAndNonConnected} />
      <Handle
        type={isLeftDirection ? 'source' : 'target'}
        position={isLeftDirection ? Position.Right : Position.Left}
        isConnectable={true}
      />
    </Stack>
  );
};

export default SchemaNode;
