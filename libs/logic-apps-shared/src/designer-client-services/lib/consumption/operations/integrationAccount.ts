import { integrationAccountGroup } from './operationgroups';

const iconUri = integrationAccountGroup.properties.iconUri;
const brandColor = integrationAccountGroup.properties.brandColor;

export const integrationAccountArtifactLookupOperation = {
  name: 'integrationAccountArtifactLookup',
  id: 'integrationAccountArtifactLookup',
  type: 'integrationAccountArtifactLookup',
  properties: {
    api: {
      id: integrationAccountGroup.id,
      name: integrationAccountGroup.name,
      displayName: integrationAccountGroup.properties.displayName,
      iconUri,
      brandColor,
      description: integrationAccountGroup.properties.description,
    },
    summary: 'Integration Account Artifact Lookup',
    description: 'Integration Account Artifact Lookup',
    visibility: 'Important',
    operationType: 'integrationAccountArtifactLookup',
    brandColor,
    iconUri,
  },
};
