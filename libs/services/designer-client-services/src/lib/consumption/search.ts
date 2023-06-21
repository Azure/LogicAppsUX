import { getClientBuiltInConnectors, getClientBuiltInOperations, BaseSearchService } from '../base';
import * as ClientOperationsData from '../base/operations';
import type { ContinuationTokenResponse, DiscoveryOpArray } from '../base/search';
import type { QueryParameters } from '../httpClient';
import * as OperationsData from './operations';
import type { Connector, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

export class ConsumptionSearchService extends BaseSearchService {
  // Operations

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    if (this._isDev) return Promise.resolve(this.getBuiltInOperations());

    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  public async getCustomOperationsByPage(page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> {
    if (this._isDev) return Promise.resolve([]);

    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      if (this._isDev) return Promise.resolve([]);

      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `properties/trigger eq null and type eq 'Microsoft.Web/customApis/apiOperations' and ${ISE_RESOURCE_ID} eq null`,
      };
      // const response = await this.pagedBatchAzureResourceRequests(page, uri, queryParameters, 1);
      const { value } = await this.getAzureResourceByPage(uri, queryParameters, page, 100);
      return value;
    } catch (error) {
      return [];
    }
  }

  public getBuiltInOperations(): Promise<DiscoveryOpArray> {
    const clientBuiltInOperations = getClientBuiltInOperations(true);
    const consumptionBuiltIn: any[] = [
      ClientOperationsData.slidingWindowOperation,
      ClientOperationsData.composeOperation,
      OperationsData.inlineCodeOperation,
      OperationsData.flatFileDecodingOperations,
      OperationsData.flatFileEncodingOperations,
      OperationsData.integrationAccountArtifactLookupOperation,
      OperationsData.liquidJsonToJsonOperation,
      OperationsData.liquidJsonToTextOperation,
      OperationsData.liquidXmlToJsonOperation,
      OperationsData.liquidXmlToTextOperation,
      OperationsData.xmlTransformOperation,
      OperationsData.xmlValidationOperation,
      OperationsData.apiManagementActionOperation,
      OperationsData.apiManagementTriggerOperation,
      OperationsData.appServiceActionOperation,
      OperationsData.appServiceTriggerOperation,
      OperationsData.functionOperation,
      OperationsData.invokeWorkflowOperation,
      OperationsData.sendToBatchOperation,
      OperationsData.batchTriggerOperation,
    ];
    return Promise.resolve([...clientBuiltInOperations, ...consumptionBuiltIn]);
  }

  // Connectors

  public override async getAllConnectors(): Promise<Connector[]> {
    if (this._isDev) return Promise.resolve(this.getBuiltInConnectors());

    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getBuiltInConnectors()]).then((values) =>
      values.flat()
    );
  }

  public getBuiltInConnectors(): Promise<Connector[]> {
    const clientBuiltInConnectors = getClientBuiltInConnectors(true);
    const consumptionBuiltIn: any[] = [
      ClientOperationsData.dataOperationsGroup,
      OperationsData.inlineCodeGroup,
      OperationsData.flatFileGroup,
      OperationsData.integrationAccountGroup,
      OperationsData.liquidGroup,
      OperationsData.xmlGroup,
      OperationsData.apiManagementGroup,
      OperationsData.appServiceGroup,
      OperationsData.functionGroup,
      OperationsData.invokeWorkflowGroup,
      OperationsData.selectBatchWorkflowGroup,
    ];
    return Promise.resolve([...clientBuiltInConnectors, ...consumptionBuiltIn]);
  }

  public async getCustomConnectorsByNextlink(prevNextlink?: string): Promise<any> {
    if (this._isDev) return Promise.resolve({ value: [] });

    try {
      const {
        httpClient,
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const filter = `$filter=${ISE_RESOURCE_ID} eq null`;
      const startUri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis?api-version=${apiVersion}`;
      const uri = `${prevNextlink ?? startUri}&${filter}`;

      const { nextLink, value } = await httpClient.get<ContinuationTokenResponse<any[]>>({ uri });
      const filteredValue = value
        .filter((connector) => connector.properties?.supportedConnectionKinds?.includes('V1'))
        .filter((connector) => connector?.location === location);
      return { nextlink: nextLink, value: filteredValue };
    } catch (error) {
      return { value: [] };
    }
  }
}
