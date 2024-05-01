import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from './connections/displayConnections';

export const TemplatesDesigner = () => {
  const availableManifestsNames = useSelector((state: RootState) => state.manifest.availableManifestNames);
  const templateConnections = useSelector((state: RootState) => state.template.connections);

  return (
    <>
      <div>AVAILABLE MANIFEST NAMES</div>
      {availableManifestsNames?.map((manifestName: string) => (
        <div key={manifestName}>{manifestName}</div>
      ))}
      <div>CURRENTLY SELECTED TEMPLATE</div>
      {templateConnections ? <DisplayConnections connections={templateConnections} /> : <>no connections to be made</>}
    </>
  );
};
