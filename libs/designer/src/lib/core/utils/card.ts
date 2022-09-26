import type { Connector, OperationManifest } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue } from '@microsoft-logic-apps/utils';

export function getBrandColorFromManifest(manifest: OperationManifest): string {
  return getObjectPropertyValue(manifest, ['properties', 'brandColor']);
}

export function getIconUriFromManifest(manifest: OperationManifest): string {
  return getObjectPropertyValue(manifest, ['properties', 'iconUri']);
}

export function getBrandColorFromConnector(connector: Connector): string {
  const {
    properties: { brandColor, metadata },
  } = connector;
  return brandColor ?? metadata?.brandColor ?? '';
}

export function getIconUriFromConnector(connector: Connector): string {
  const {
    properties: { iconUrl, generalInformation },
  } = connector;
  return iconUrl ?? generalInformation?.iconUrl ?? '';
}
