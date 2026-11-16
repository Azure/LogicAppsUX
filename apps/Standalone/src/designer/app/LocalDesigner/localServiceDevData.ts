import { connectorsSearchResultsMock } from '@microsoft/logic-apps-shared';
import type { RunServiceDevData, SearchServiceDevData } from '@microsoft/logic-apps-shared';
import { azureOperationsResponse } from '../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/__test__/__mocks__/azureOperationResponse';
import { AzureConnectorMock } from '../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/__test__/__mocks__/azureConnectorResponse';
import { almostAllBuiltInOperations } from '../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/__test__/__mocks__/builtInOperationResponse';
import {
  inputsResponse,
  outputsResponse,
} from '../../../../../../libs/logic-apps-shared/src/designer-client-services/lib/__test__/__mocks__/monitoringInputsOutputsResponse';

export const localSearchDevData: SearchServiceDevData = {
  azureOperations: azureOperationsResponse,
  azureConnectors: AzureConnectorMock.value,
  builtInOperations: almostAllBuiltInOperations,
  builtInConnectors: connectorsSearchResultsMock,
};

export const localRunDevData: RunServiceDevData = {
  inputs: inputsResponse,
  outputs: outputsResponse,
};
