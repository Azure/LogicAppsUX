import { getClientBuiltInConnectors, getClientBuiltInOperations, BaseSearchService } from '../base';
import type { DiscoveryOpArray } from '../base/search';
import * as ClientOperationsData from '../standard/operations';
import * as AzureResourceOperationsData from './operations';
import type { Connector } from '@microsoft/utils-logic-apps';

export class ConsumptionSearchService extends BaseSearchService {
  // Operations

  public async getAllOperations(): Promise<DiscoveryOpArray> {
    if (this._isDev) {
      return Promise.resolve(this.getConsumptionBuiltInOperations());
    }
    return Promise.all([this.getAllAzureOperations(), this.getAllCustomApiOperations(), this.getConsumptionBuiltInOperations()]).then(
      (values) => values.flat()
    );
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
      AzureResourceOperationsData.apiManagementActionOperation,
      AzureResourceOperationsData.apiManagementTriggerOperation,
      AzureResourceOperationsData.appServiceActionOperation,
      AzureResourceOperationsData.appServiceTriggerOperation,
      AzureResourceOperationsData.functionOperation,
      AzureResourceOperationsData.invokeWorkflowOperation,
      AzureResourceOperationsData.selectBatchWorkflowOperation,
    ];
    return [...clientBuiltInOperations, ...consumptionBuiltIn];
  }

  // Connectors

  public override async getAllConnectors(): Promise<Connector[]> {
    if (this._isDev) {
      return Promise.resolve(this.getConsumptionBuiltInConnectors());
    }

    return Promise.all([this.getAllAzureConnectors(), this.getAllCustomApiConnectors(), this.getConsumptionBuiltInConnectors()]).then(
      (values) => values.flat()
    );
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
      AzureResourceOperationsData.apiManagementGroup,
      AzureResourceOperationsData.appServiceGroup,
      AzureResourceOperationsData.functionGroup,
      AzureResourceOperationsData.invokeWorkflowGroup,
      AzureResourceOperationsData.selectBatchWorkflowGroup,
    ];
    return [...clientBuiltInConnectors, ...consumptionBuiltIn];
  }
}
