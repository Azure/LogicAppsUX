import { ResourceType } from '../types';
import type {
  IApiService,
  WorkflowsList,
  ISummaryData,
  IRegion,
  GraphApiOptions,
  AdvancedOptionsTypes,
  ISubscription,
  IIse,
} from '../types';
import { getValidationPayload, getExportUri } from './helper';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { ExtensionCommand, getBaseGraphApi } from '@microsoft/vscode-extension-logic-apps';
import { type WebviewApi } from 'vscode-webview';

export interface ApiServiceOptions {
  baseUrl?: string;
  accessToken?: string;
  cloudHost?: string;
  vscodeContext: WebviewApi<unknown>;
}

export class ApiService implements IApiService {
  private options: ApiServiceOptions;
  private graphApiUri: string;
  private baseGraphApi: string;
  private vscodeContext: WebviewApi<unknown>;

  constructor(options: ApiServiceOptions) {
    this.options = options;
    this.baseGraphApi = getBaseGraphApi(options.cloudHost);
    this.graphApiUri = `${this.baseGraphApi}/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01`;
    this.vscodeContext = options.vscodeContext;
  }

  private getAccessTokenHeaders = () => {
    const { accessToken } = this.options;
    if (!accessToken) {
      return undefined;
    }

    return new Headers({
      Authorization: accessToken,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  };

  private getPayload = (resourceType: string, properties?: GraphApiOptions) => {
    switch (resourceType) {
      case ResourceType.subscriptions: {
        return {
          query:
            'resourcecontainers\n | where type == "microsoft.resources/subscriptions"\n| join kind=leftouter (securityresources \n | where properties.environment == "Azure" and properties.displayName == "ASC score"\n ) on subscriptionId\n | extend subscriptionName=name\n | project id, subscriptionId, subscriptionName|sort by (tolower(tostring(subscriptionName))) asc',
        };
      }
      case ResourceType.ise: {
        const selectedSubscription = properties?.selectedSubscription;
        return {
          query:
            "resources|where type =~ 'Microsoft.Logic/integrationServiceEnvironments'\r\n | extend iseName=name | project id, iseName, location, subscriptionId, resourceGroup\r\n|sort by (tolower(tostring(iseName))) asc",
          subscriptions: [selectedSubscription],
        };
      }
      case ResourceType.resourcegroups: {
        const selectedSubscription = properties?.selectedSubscription;
        return {
          query:
            "(resourcecontainers|where type in~ ('microsoft.resources/subscriptions/resourcegroups'))|where type =~ 'microsoft.resources/subscriptions/resourcegroups'\r\n| project id,name,location,subscriptionId,resourceGroup\r\n|project name,id,location,subscriptionId,resourceGroup|sort by (tolower(tostring(name))) asc",
          subscriptions: [selectedSubscription],
        };
      }
      case ResourceType.workflows: {
        const subscriptionId = properties?.selectedSubscription;
        const selectedIse = properties?.selectedIse;
        const skipToken = properties?.skipToken ?? '';
        const location = properties?.location;

        return {
          query:
            `resources | where type =~ 'Microsoft.Logic/workflows' and isnotnull(properties) and ` +
            (selectedIse
              ? `properties.integrationServiceEnvironment.id =~ '${selectedIse}'`
              : `isnull(properties.integrationServiceEnvironment) and location =~ '${location}'`) +
            ' | project id, name, resourceGroup | sort by (tolower(tostring(name))) asc',
          subscriptions: [subscriptionId],
          options: {
            $top: 1000,
            $skipToken: skipToken,
          },
        };
      }
      default: {
        return {};
      }
    }
  };

  async getWorkflows(subscriptionId: string, iseId?: string, location?: string): Promise<WorkflowsList[]> {
    const headers = this.getAccessTokenHeaders();
    const workflows: WorkflowsList[] = [];
    let skipToken = '';
    let hasMoreData = true;

    while (hasMoreData) {
      const payload = this.getPayload(ResourceType.workflows, {
        selectedSubscription: subscriptionId,
        selectedIse: iseId,
        location,
        skipToken,
      });
      const response = await fetch(this.graphApiUri, { headers, method: HTTP_METHODS.POST, body: JSON.stringify(payload) });

      if (!response.ok) {
        const errorText = `${response.status} ${response.statusText}`;
        this.logTelemetryError(errorText);
        throw new Error(errorText);
      }

      const responseBody = await response.json();
      workflows.push(
        ...responseBody.data.map((workflow: any) => {
          const { name, id } = workflow;

          return {
            key: id,
            name,
            resourceGroup: this.getResourceGroup(id),
          };
        })
      );

      if (responseBody['$skipToken']) {
        skipToken = responseBody['$skipToken'];
      } else {
        hasMoreData = false;
      }
    }

    return workflows;
  }

  getResourceGroup(workflowID: string): string {
    const separators = workflowID.split('/');
    const resourceGroupLocation = 4;
    return separators[resourceGroupLocation];
  }

  /**
   * Retrieves the list of subscriptions.
   * @returns {Promise<Array<ISubscription>>}  A promise that resolves to an array of subscriptions.
   */
  async getSubscriptions(): Promise<Array<ISubscription>> {
    const headers = this.getAccessTokenHeaders();
    const payload = this.getPayload(ResourceType.subscriptions);
    const response = await fetch(this.graphApiUri, { headers, method: HTTP_METHODS.POST, body: JSON.stringify(payload) });

    if (!response.ok) {
      const errorText = `${response.status} ${response.statusText}`;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    const subscriptionsResponse: any = await response.json();
    const { data: subscriptions } = subscriptionsResponse;

    return subscriptions;
  }

  /**
   * Retrieves the list of Ise objects for the selected subscription.
   * @param {string} selectedSubscription - The ID of the selected subscription.
   * @returns {Promise<Array<IIse>>}A promise that resolves to an array of IIse objects.
   */
  async getIse(selectedSubscription: string): Promise<Array<IIse>> {
    const headers = this.getAccessTokenHeaders();
    const payload = this.getPayload(ResourceType.ise, { selectedSubscription: selectedSubscription });
    const response = await fetch(this.graphApiUri, { headers, method: HTTP_METHODS.POST, body: JSON.stringify(payload) });

    if (!response.ok) {
      const errorText = `${response.status} ${response.statusText}`;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    const iseResponse: any = await response.json();
    const { data: ise } = iseResponse;
    return ise;
  }

  async getAllRegionWithDisplayName(subscriptionId: string): Promise<any[]> {
    const headers = this.getAccessTokenHeaders();
    const url = `${this.baseGraphApi}/subscriptions/${subscriptionId}/locations?api-version=2022-05-01`;
    const response = await fetch(url, { headers, method: HTTP_METHODS.GET });

    if (!response.ok) {
      const errorText = `${response.status} ${response.statusText}`;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    return (await response.json()).value;
  }

  async getUsedRegion(subscriptionId: string): Promise<any[]> {
    const headers = this.getAccessTokenHeaders();
    const payload = {
      query: `resources | where type =~ 'Microsoft.Logic/workflows' and isnotnull(properties) and isnull(properties.integrationServiceEnvironment) | summarize count() by location`,
      subscriptions: [subscriptionId],
      options: {
        $top: 1000,
      },
    };
    const response = await fetch(this.graphApiUri, { headers, method: 'POST', body: JSON.stringify(payload) });

    if (!response.ok) {
      const errorText = `${response.status} ${response.statusText}`;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    return (await response.json()).data;
  }

  async getRegions(subscriptionId: string): Promise<IRegion[]> {
    const allRegionTask = this.getAllRegionWithDisplayName(subscriptionId);
    const usedRegions = await this.getUsedRegion(subscriptionId);
    const allRegions = await allRegionTask;

    return usedRegions.map((region) => {
      return {
        name: region.location,
        displayName: this.findRegionDisplayName(allRegions, region.location),
        count: region.count_,
      };
    });
  }

  findRegionDisplayName(regions: any, region: string): string {
    for (const item of regions) {
      if (item.name === region) {
        return item.displayName;
      }
    }

    return region;
  }

  async validateWorkflows(
    selectedWorkflows: Array<WorkflowsList>,
    selectedSubscription: string,
    selectedLocation: string,
    selectedAdvanceOptions: AdvancedOptionsTypes[]
  ) {
    const headers = this.getAccessTokenHeaders();
    const validationUri = getExportUri(selectedSubscription, selectedLocation, true, this.baseGraphApi);
    const workflowExportOptions = selectedAdvanceOptions.join(',');
    const validationPayload = getValidationPayload(selectedWorkflows, workflowExportOptions);
    const response = await fetch(validationUri, { headers, method: HTTP_METHODS.POST, body: JSON.stringify(validationPayload) });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch (_ex) {
        const parseErrorText = `${response.status} ${response.statusText}`;
        this.logTelemetryError(parseErrorText);
        throw new Error(parseErrorText);
      }

      const errorText = errorBody.error.message;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    const validationResponse: any = await response.json();
    return validationResponse;
  }

  async exportWorkflows(
    selectedWorkflows: Array<WorkflowsList>,
    selectedSubscription: string,
    selectedLocation: string,
    selectedAdvanceOptions: AdvancedOptionsTypes[]
  ) {
    const headers = this.getAccessTokenHeaders();
    const exportUri = getExportUri(selectedSubscription, selectedLocation, false, this.baseGraphApi);
    const workflowExportOptions = selectedAdvanceOptions.join(',');
    const exportPayload = getValidationPayload(selectedWorkflows, workflowExportOptions);
    const response = await fetch(exportUri, { headers, method: 'POST', body: JSON.stringify(exportPayload) });

    if (!response.ok) {
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch (_ex) {
        const parseErrorText = `${response.status} ${response.statusText}`;
        this.logTelemetryError(parseErrorText);
        throw new Error(parseErrorText);
      }
      const errorText = errorBody.error.message;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const exportResponse: ISummaryData = await response.json();
    return exportResponse;
  }

  async getResourceGroups(selectedSubscription: string): Promise<any> {
    const headers = this.getAccessTokenHeaders();
    const payload = this.getPayload(ResourceType.resourcegroups, { selectedSubscription: selectedSubscription });
    const response = await fetch(this.graphApiUri, { headers, method: 'POST', body: JSON.stringify(payload) });

    if (!response.ok) {
      const errorText = `${response.status} ${response.statusText}`;
      this.logTelemetryError(errorText);
      throw new Error(errorText);
    }

    const resourceGroupsResponse: any = await response.json();
    const { data: resourceGroups } = resourceGroupsResponse;

    return { resourceGroups };
  }

  private logTelemetryError = (error: any) => {
    this.vscodeContext.postMessage({
      command: ExtensionCommand.log_telemtry,
      key: 'error',
      value: error,
    });
  };
}
