import { getClientBuiltInConnectors, getClientBuiltInOperations, BaseSearchService } from '../base';
import * as ClientOperationsData from '../base/operations';
import type { BaseSearchServiceOptions } from '../base/search';
import type { ContinuationTokenResponse } from '../common/azure';
import type { QueryParameters } from '../httpClient';
import * as OperationsData from './operations';
import type { Connector, DiscoveryOpArray, SomeKindOfAzureOperationDiscovery } from '@microsoft/logic-apps-shared';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

interface ConsumptionSearchServiceOptions extends BaseSearchServiceOptions {
  openApiConnectionMode?: boolean;
}

export class ConsumptionSearchService extends BaseSearchService {
  constructor(public override readonly options: ConsumptionSearchServiceOptions) {
    super(options);
  }

  //#region Operations
  public async getAllOperations(): Promise<DiscoveryOpArray> {
    if (this._isDev) return Promise.resolve(this.getBuiltInOperations());

    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  public override async getAllAzureOperations(): Promise<DiscoveryOpArray> {
    const azureOperations = await super.getAllAzureOperations();
    return this._updateOperationsIfNeeded(azureOperations);
  }

  public override async getAzureOperationsByPage(page: number): Promise<DiscoveryOpArray> {
    const azureOperations = await super.getAzureOperationsByPage(page);
    return this._updateOperationsIfNeeded(azureOperations);
  }

  public override async getActiveSearchOperations?(searchTerm: string): Promise<DiscoveryOpArray> {
    const activeSearchOperations = (await super.getActiveSearchOperations?.(searchTerm)) ?? [];
    return this._updateOperationsIfNeeded(activeSearchOperations);
  }

  public async getCustomOperationsByPage(page: number): Promise<DiscoveryOpArray> {
    if (this._isDev) return Promise.resolve([]);

    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      if (this._isDev) return Promise.resolve([]);

      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `type eq 'Microsoft.Web/customApis/apiOperations' and ${ISE_RESOURCE_ID} eq null`,
      };
      // const response = await this.pagedBatchAzureResourceRequests(page, uri, queryParameters, 1);
      const { value } = await this.getAzureResourceByPage(uri, queryParameters, page, 100);
      return value;
    } catch (error) {
      return [];
    }
  }

  public getBuiltInOperations(): Promise<DiscoveryOpArray> {
    const clientBuiltInOperations = getClientBuiltInOperations();
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
      OperationsData.as2EncodeOperation,
      OperationsData.as2DecodeOperation,
      OperationsData.rosettaNetEncodeOperation,
      OperationsData.rosettaNetDecodeOperation,
      OperationsData.rosettaNetWairForResponseOperation,
    ];
    return Promise.resolve([...clientBuiltInOperations, ...consumptionBuiltIn]);
  }

  private _updateOperationsIfNeeded(operations: DiscoveryOpArray): DiscoveryOpArray {
    if (this.options.openApiConnectionMode) {
      return operations.map((operation) => {
        if (!operation.properties.operationType) {
          const { isNotification, isWebhook } = operation.properties as SomeKindOfAzureOperationDiscovery;
          // eslint-disable-next-line no-param-reassign
          operation.properties.operationType = isWebhook
            ? 'OpenApiConnectionWebhook'
            : isNotification
            ? 'OpenApiConnectionNotification'
            : 'OpenApiConnection';
        }

        return operation;
      });
    } else {
      return operations;
    }
  }

  //#endregion

  //#region Connectors
  public override async getAllConnectors(): Promise<Connector[]> {
    if (this._isDev) return Promise.resolve(this.getBuiltInConnectors());

    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getBuiltInConnectors()]).then((values) =>
      values.flat()
    );
  }

  public getBuiltInConnectors(): Promise<Connector[]> {
    const clientBuiltInConnectors = getClientBuiltInConnectors();
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
      OperationsData.as2Group,
      OperationsData.rosettaNetGroup,
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
  //#endregion
}
