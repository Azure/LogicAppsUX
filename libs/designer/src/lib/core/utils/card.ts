import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { getBrandColorFromConnector, getIconUriFromConnector } from '@microsoft/logic-apps-shared';

export function getBrandColorFromManifest(manifest: OperationManifest): string {
  return manifest.properties?.brandColor ?? getBrandColorFromConnector(manifest.properties?.connector);
}

export function getIconUriFromManifest(manifest: OperationManifest): string {
  return manifest.properties?.iconUri ?? getIconUriFromConnector(manifest.properties?.connector);
}
