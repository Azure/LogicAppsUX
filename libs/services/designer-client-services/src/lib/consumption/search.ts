import { getClientBuiltInConnectors, getClientBuiltInOperations, BaseSearchService } from '../base';
import type { DiscoveryOpArray } from '../base/search';
import type { QueryParameters } from '../httpClient';
import * as ClientOperationsData from '../standard/operations';
import type { Connector, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

export class ConsumptionSearchService extends BaseSearchService {
  // Operations

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getBuiltInOperations()]).then((values) =>
      values.flat()
    );
  }

  public getCustomOperationsByPage(_page: number): Promise<DiscoveryOperation<DiscoveryResultTypes>[]> {
    return Promise.resolve([]);
  }

  public getBuiltInOperations(): Promise<DiscoveryOpArray> {
    const clientBuiltInOperations = getClientBuiltInOperations(true);
    const consumptionBuiltIn: any[] = [
      ClientOperationsData.inlineCodeOperation,
      ClientOperationsData.composeOperation,
      ClientOperationsData.flatFileDecodingOperations,
      ClientOperationsData.flatFileEncodingOperations,
      ClientOperationsData.integrationAccountArtifactLookupOperation,
      ClientOperationsData.liquidJsonToJsonOperation,
      ClientOperationsData.liquidJsonToTextOperation,
      ClientOperationsData.liquidXmlToJsonOperation,
      ClientOperationsData.liquidXmlToTextOperation,
      ClientOperationsData.xmlTransformOperation,
      ClientOperationsData.xmlValidationOperation,
    ];
    return Promise.resolve([...clientBuiltInOperations, ...consumptionBuiltIn]);
  }

  // Connectors

  public override async getAllConnectors(): Promise<Connector[]> {
    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getBuiltInConnectors()]).then((values) =>
      values.flat()
    );
  }

  public getBuiltInConnectors(): Promise<Connector[]> {
    const clientBuiltInConnectors = getClientBuiltInConnectors(true);
    const consumptionBuiltIn: any[] = [
      ClientOperationsData.inlineCodeGroup,
      ClientOperationsData.dataOperationsGroup,
      ClientOperationsData.flatFileGroup,
      ClientOperationsData.integrationAccountGroup,
      ClientOperationsData.liquidGroup,
      ClientOperationsData.xmlGroup,
    ];
    return Promise.resolve([...clientBuiltInConnectors, ...consumptionBuiltIn]);
  }

  public getCustomConnectorsByNextlink(_nextlink?: string): Promise<any> {
    return Promise.resolve([]);
  }

  // Get 'Batch' Connector Data - Not implemented yet

  public async getBatchWorkflows(): Promise<any[]> {
    const {
      apiHubServiceDetails: { apiVersion, subscriptionId },
    } = this.options;
    const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Logic/workflows`;
    const queryParameters: QueryParameters = {
      'api-version': apiVersion,
      $filter: `contains(Trigger, 'Batch') and (${ISE_RESOURCE_ID} eq null)`,
    };
    const response = await this.getAzureResourceRecursive(uri, queryParameters);
    return response;
  }
}
