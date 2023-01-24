import { getClientBuiltInConnectors, getClientBuiltInOperations, BaseSearchService } from '../base';
import type { DiscoveryOpArray } from '../base/search';
import type { QueryParameters } from '../httpClient';
import * as ClientOperationsData from '../standard/operations';
import type { Connector } from '@microsoft/utils-logic-apps';

const ISE_RESOURCE_ID = 'properties/integrationServiceEnvironmentResourceId';

export class ConsumptionSearchService extends BaseSearchService {
  // Operations

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getConsumptionBuiltInOperations()]).then(
      (values) => values.flat()
    );
  }

  public async getAllCustomApiOperations(): Promise<DiscoveryOpArray> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `type eq 'Microsoft.Web/customApis/apiOperations' and ${ISE_RESOURCE_ID} eq null`,
      };
      return await this.batchAzureResourceRequests(uri, queryParameters);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public getConsumptionBuiltInOperations(): DiscoveryOpArray {
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
    return [...clientBuiltInOperations, ...consumptionBuiltIn];
  }

  // Connectors

  public override async getAllConnectors(): Promise<Connector[]> {
    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getConsumptionBuiltInConnectors()]).then(
      (values) => values.flat()
    );
  }

  public async getAllCustomApiConnectors(): Promise<Connector[]> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `${ISE_RESOURCE_ID} eq null`,
      };
      return await this.getAzureResourceRecursive(uri, queryParameters);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  public getConsumptionBuiltInConnectors(): Connector[] {
    const clientBuiltInConnectors = getClientBuiltInConnectors(true);
    const consumptionBuiltIn: any[] = [
      ClientOperationsData.inlineCodeGroup,
      ClientOperationsData.dataOperationsGroup,
      ClientOperationsData.flatFileGroup,
      ClientOperationsData.integrationAccountGroup,
      ClientOperationsData.liquidGroup,
      ClientOperationsData.xmlGroup,
    ];
    return [...clientBuiltInConnectors, ...consumptionBuiltIn];
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
