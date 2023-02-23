import constants from '../../common/constants';
import type { Connector, OperationManifest } from '@microsoft/utils-logic-apps';
import { getObjectPropertyValue } from '@microsoft/utils-logic-apps';

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
  return brandColor ?? metadata?.brandColor ?? constants.CONNECTOR_DEFAULT_METADATA.COLOR;
}

export function getIconUriFromConnector(connector: Connector): string {
  const {
    properties: { iconUrl, iconUri, generalInformation },
  } = connector;
  const uri = iconUrl ?? iconUri ?? generalInformation?.iconUrl ?? constants.CONNECTOR_DEFAULT_METADATA.ICON;
  if (uri.includes('/Content/retail/assets/default-connection-icon')) return constants.CONNECTOR_DEFAULT_METADATA.ICON;
  return uri;
}
