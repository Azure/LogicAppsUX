import { useOperationVisuals } from '../../core/state/operation/operationSelector';

export const ConnectorIcon = ({ nodeId, size = '32px', borderRadius = '4px' }: any) => {
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
