import type { BoundParameters, IntegrationAccountArtifactLookupInputs } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class IntegrationAccountArtifactLookupInputsBinder extends Binder {
  bind(inputs: IntegrationAccountArtifactLookupInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP.ARTIFACT_TYPE]: intl.formatMessage({
        defaultMessage: 'Artifact Type',
        id: 'ByKyyf',
        description: 'Artifact Type',
      }),
      [constants.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP.ARTIFACT_NAME]: intl.formatMessage({
        defaultMessage: 'Artifact Name',
        id: '2km2kT',
        description: 'Artifact Name',
      }),
    };

    const { artifactName, artifactType } = inputs;
    return {
      ...this.makeBoundParameter(
        constants.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP.ARTIFACT_TYPE,
        intlMessages[constants.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP.ARTIFACT_TYPE],
        artifactType
      ),
      ...this.makeBoundParameter(
        constants.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP.ARTIFACT_NAME,
        intlMessages[constants.INTEGRATION_ACCOUNT_ARTIFACT_LOOKUP.ARTIFACT_NAME],
        artifactName
      ),
    };
  }
}
