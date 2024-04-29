import type { RootState } from 'lib/core/state/Store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from './connections/displayConnections';

// export interface TemplatesDesignerProps {}

export const TemplatesDesigner = (
  // {}: TemplatesDesignerProps
) => {
  const templateData = useSelector((state: RootState) => state.template.template?.data);

  return (
    <div>{templateData?.connections ? <DisplayConnections connections={templateData?.connections} /> : <>no connections to be made</>}</div>
  );
};
