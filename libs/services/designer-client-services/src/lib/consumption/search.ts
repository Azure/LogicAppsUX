import type { QueryParameters } from '../httpClient';
import * as ClientOperationsData from '../standard/operations';
import type { DiscoveryOpArray } from '../standard/search';
import { getClientBuiltInConnectors, getClientBuiltInOperations, StandardSearchService } from '../standard/search';
import type { Connector } from '@microsoft/utils-logic-apps';

export class ConsumptionSearchService extends StandardSearchService {
  // Operations

  public override async getAllOperations(): Promise<DiscoveryOpArray> {
    const azureOperations = await this.getAllAzureOperations();
    const customApiOperations = await this.getAllCustomApiOperations();
    const clientBuiltInOperations = this.getConsumptionBuiltInOperations();
    return [...azureOperations, ...customApiOperations, ...clientBuiltInOperations];
  }

  public async getAllCustomApiOperations(): Promise<DiscoveryOpArray> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId, location },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/apiOperations`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `type eq 'Microsoft.Web/customApis/apiOperations' and properties/integrationServiceEnvironmentResourceId eq null`,
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
    const azureConnectors = await this.getAllAzureConnectors();
    const customApiConnectors = await this.getAllCustomApiConnectors();
    const clientBuiltInConnectors = this.getConsumptionBuiltInConnectors();
    return [...azureConnectors, ...customApiConnectors, ...clientBuiltInConnectors];
  }

  public async getAllCustomApiConnectors(): Promise<Connector[]> {
    try {
      const {
        apiHubServiceDetails: { apiVersion, subscriptionId },
      } = this.options;
      const uri = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/customApis`;
      const queryParameters: QueryParameters = {
        'api-version': apiVersion,
        $filter: `properties/integrationServiceEnvironmentResourceId eq null`,
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
}
