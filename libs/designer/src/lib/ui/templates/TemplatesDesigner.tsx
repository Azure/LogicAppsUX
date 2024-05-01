import type { RootState } from 'lib/core/state/templates/store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from './connections/displayConnections';

// export interface TemplatesDesignerProps {}

export const TemplatesDesigner = (
  // {}: TemplatesDesignerProps
) => {
  const availableManifestsNames = useSelector((state: RootState) => state.manifest.availableManifestNames);
  const templateConnections = useSelector((state: RootState) => state.template.connections);

  return (
    <div>
      <div>AVAILABLE MANIFEST NAMES</div>
      {availableManifestsNames?.map((manifestName) => (
        <div key={manifestName}>{manifestName}</div>
      ))}
      <div>CURRENTLY SELECTED TEMPLATE</div>
      {templateConnections ? <DisplayConnections connections={templateConnections} /> : <>no connections to be made</>}
    </div>
  );
};
