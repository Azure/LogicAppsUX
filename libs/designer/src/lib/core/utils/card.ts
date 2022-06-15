import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue } from '@microsoft-logic-apps/utils';

export function getBrandColorFromManifest(manifest: OperationManifest): string {
  return getObjectPropertyValue(manifest.properties, ['brandColor']);
}

export function getIconUriFromManifest(manifest: OperationManifest): string {
  return getObjectPropertyValue(manifest.properties, ['iconUri']);
}
