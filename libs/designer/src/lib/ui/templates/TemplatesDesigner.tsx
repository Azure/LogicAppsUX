import type { RootState } from 'lib/core/state/templates/store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from './connections/displayConnections';

// export interface TemplatesDesignerProps {}

export const TemplatesDesigner = (
  // {}: TemplatesDesignerProps
) => {
  const templateConnections = useSelector((state: RootState) => state.template.connections);

  return <div>{templateConnections ? <DisplayConnections connections={templateConnections} /> : <>no connections to be made</>}</div>;
};
