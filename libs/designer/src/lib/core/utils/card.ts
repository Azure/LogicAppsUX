import type { Connector, OperationManifest } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue } from '@microsoft-logic-apps/utils';

export function getBrandColorFromManifest(manifest: OperationManifest): string {
  return getObjectPropertyValue(manifest, ['properties', 'brandColor']);
}

export function getIconUriFromManifest(manifest: OperationManifest): string {
  return getObjectPropertyValue(manifest, ['properties', 'iconUri']);
}

export function getBrandColorFromConnector(connector: Connector): string {
  return connector.properties.brandColor as string;
}

export function getIconUriFromConnector(connector: Connector): string {
  return connector.properties.iconUri;
}
