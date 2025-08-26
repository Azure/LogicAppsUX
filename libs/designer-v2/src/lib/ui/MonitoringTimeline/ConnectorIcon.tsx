import { useOperationVisuals } from '../../core/state/operation/operationSelector';

interface ConnectorIconProps {
  nodeId: string;
  size?: string;
  borderRadius?: string;
}

export const ConnectorIcon = ({ nodeId, size = '32px', borderRadius = '4px' }: ConnectorIconProps) => {
  const { iconUri } = useOperationVisuals(nodeId);

  if (!iconUri) {
    return null;
  }

  return (
    <img
      title={nodeId}
      src={iconUri}
      style={{
        width: size,
        height: size,
        borderRadius,
      }}
    />
  );
};
