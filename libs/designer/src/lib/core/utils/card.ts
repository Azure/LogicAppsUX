import { getBrandColorFromConnector, getIconUriFromConnector } from '@microsoft/designer-ui';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

export function getBrandColorFromManifest(manifest: OperationManifest): string {
  return manifest.properties?.brandColor ?? getBrandColorFromConnector(manifest.properties?.connector);
}

export function getIconUriFromManifest(manifest: OperationManifest): string {
  return manifest.properties?.iconUri ?? getIconUriFromConnector(manifest.properties?.connector);
}
