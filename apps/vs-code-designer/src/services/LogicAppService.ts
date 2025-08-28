/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Site } from '@azure/arm-appservice';
import type { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';

// Import our improved types
import type {
  ILogicAppService,
  IDeploymentConfig,
  IDeploymentResult,
  IWorkflowDefinition,
  IValidationResult,
} from '../types';

import {
  DeploymentError,
  ValidationError,
  AuthenticationError,
} from '../types';

/**
 * Service for managing Logic App operations including deployment, validation, and management.
 * 
 * This service provides a clean interface for all Logic App related operations,
 * following the single responsibility principle and proper error handling patterns.
 * 
 * @example
 * ```typescript
 * const service = new LogicAppService(azureClient, logger);
 * const result = await service.deploy({
 *   name: 'my-logic-app',
 *   resourceGroup: 'my-rg',
 *   subscriptionId: 'sub-id',
 *   location: 'eastus',
 *   workflowType: WorkflowType.STATEFUL,
 *   projectPath: '/path/to/project',
 *   workflows: []
 * });
 * 
 * if (result.success) {
 *   console.log('Deployment successful!');
 * }
 * ```
 * 
 * @public
 */
export class LogicAppService implements ILogicAppService {
  private readonly outputChannel: IAzExtOutputChannel;
  
  /**
   * Creates a new LogicAppService instance
   * 
   * @param azureClient - The Azure client for API operations
   * @param logger - Output channel for logging
   */
  constructor(
    private readonly azureClient: IAzureClient,
    logger: IAzExtOutputChannel
  ) {
    this.outputChannel = logger;
  }

  /**
   * Deploys a Logic App to Azure
   * 
   * @param config - The deployment configuration containing all necessary information
   * @returns Promise that resolves to deployment result with success status and details
   * 
   * @throws {@link ValidationError} When configuration validation fails
   * @throws {@link AuthenticationError} When Azure authentication fails
   * @throws {@link DeploymentError} When deployment operation fails
   * 
   * @remarks
   * This method performs the following steps:
   * 1. Validates the deployment configuration
   * 2. Authenticates with Azure
   * 3. Creates or updates the Logic App resource
   * 4. Deploys all workflows
   * 5. Validates the deployment
   */
  async deploy(config: IDeploymentConfig): Promise<IDeploymentResult> {
    try {
      this.outputChannel.appendLog(`Starting deployment for ${config.name}...`);
      
      // Step 1: Validate configuration
      this.validateDeploymentConfig(config);
      
      // Step 2: Authenticate and prepare Azure client
      await this.ensureAuthenticated();
      
      // Step 3: Create or update Logic App
      const site = await this.createOrUpdateLogicApp(config);
      
      // Step 4: Deploy workflows
      const warnings = await this.deployWorkflows(config, site);
      
      // Step 5: Validate deployment
      await this.validateDeployment(site);
      
      this.outputChannel.appendLog(`✅ Deployment completed successfully for ${config.name}`);
      
      return {
        success: true,
        site,
        warnings,
      };
      
    } catch (error) {
      const parsedError = parseError(error);
      this.outputChannel.appendLog(`❌ Deployment failed for ${config.name}: ${parsedError.message}`);
      
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new DeploymentError(
        `Failed to deploy Logic App '${config.name}': ${parsedError.message}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validates a workflow definition
   * 
   * @param workflow - The workflow definition to validate
   * @returns Promise that resolves to validation result with errors and warnings
   * 
   * @throws {@link ValidationError} When workflow structure is invalid
   */
  async validate(workflow: IWorkflowDefinition): Promise<IValidationResult> {
    try {
      this.outputChannel.appendLog('Validating workflow definition...');
      
      const errors: Array<{ message: string; code: string; path?: string }> = [];
      const warnings: Array<{ message: string; code: string; path?: string; suggestion?: string }> = [];
      
      // Basic structure validation
      if (!workflow.definition) {
        errors.push({
          message: 'Workflow definition is required',
          code: 'MISSING_DEFINITION',
        });
      }
      
      // Validate definition schema
      if (workflow.definition && typeof workflow.definition !== 'object') {
        errors.push({
          message: 'Workflow definition must be an object',
          code: 'INVALID_DEFINITION_TYPE',
          path: 'definition',
        });
      }
      
      // Check for required properties in definition
      if (workflow.definition && !workflow.definition['$schema']) {
        warnings.push({
          message: 'Workflow definition should include a $schema property',
          code: 'MISSING_SCHEMA',
          path: 'definition.$schema',
          suggestion: 'Add "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#"',
        });
      }
      
      // Additional validation logic would go here...
      
      const isValid = errors.length === 0;
      
      this.outputChannel.appendLog(
        `Validation completed: ${isValid ? '✅ Valid' : '❌ Invalid'} (${errors.length} errors, ${warnings.length} warnings)`
      );
      
      return {
        isValid,
        errors,
        warnings,
      };
      
    } catch (error) {
      const parsedError = parseError(error);
      throw new ValidationError(`Workflow validation failed: ${parsedError.message}`, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Retrieves Logic Apps from Azure
   * 
   * @param subscriptionId - The Azure subscription ID
   * @param resourceGroup - Optional resource group filter
   * @returns Promise that resolves to array of Logic App sites
   * 
   * @throws {@link AuthenticationError} When Azure authentication fails
   */
  async getLogicApps(subscriptionId: string, resourceGroup?: string): Promise<Site[]> {
    try {
      this.outputChannel.appendLog(`Fetching Logic Apps from subscription ${subscriptionId}${resourceGroup ? ` in resource group ${resourceGroup}` : ''}...`);
      
      await this.ensureAuthenticated();
      
      const sites = await this.azureClient.getLogicApps(subscriptionId, resourceGroup);
      
      this.outputChannel.appendLog(`Found ${sites.length} Logic Apps`);
      
      return sites;
      
    } catch (error) {
      const parsedError = parseError(error);
      
      if (parsedError.message.includes('authentication') || parsedError.message.includes('unauthorized')) {
        throw new AuthenticationError(`Failed to authenticate with Azure: ${parsedError.message}`, error instanceof Error ? error : undefined);
      }
      
      throw new Error(`Failed to fetch Logic Apps: ${parsedError.message}`);
    }
  }

  /**
   * Deletes a Logic App from Azure
   * 
   * @param subscriptionId - The Azure subscription ID
   * @param resourceGroup - The resource group name
   * @param name - The Logic App name to delete
   * @returns Promise that resolves when deletion is complete
   * 
   * @throws {@link AuthenticationError} When Azure authentication fails
   */
  async deleteLogicApp(subscriptionId: string, resourceGroup: string, name: string): Promise<void> {
    try {
      this.outputChannel.appendLog(`Deleting Logic App ${name} from ${resourceGroup}...`);
      
      await this.ensureAuthenticated();
      
      await this.azureClient.deleteLogicApp(subscriptionId, resourceGroup, name);
      
      this.outputChannel.appendLog(`✅ Successfully deleted Logic App ${name}`);
      
    } catch (error) {
      const parsedError = parseError(error);
      
      if (parsedError.message.includes('authentication') || parsedError.message.includes('unauthorized')) {
        throw new AuthenticationError(`Failed to authenticate with Azure: ${parsedError.message}`, error instanceof Error ? error : undefined);
      }
      
      throw new Error(`Failed to delete Logic App ${name}: ${parsedError.message}`);
    }
  }

  /**
   * Validates the deployment configuration
   * 
   * @private
   * @param config - The deployment configuration to validate
   * @throws {@link ValidationError} When configuration is invalid
   */
  private validateDeploymentConfig(config: IDeploymentConfig): void {
    const errors: string[] = [];
    
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Logic App name is required');
    }
    
    if (config.name && config.name.length > 60) {
      errors.push('Logic App name cannot exceed 60 characters');
    }
    
    if (config.name && !/^[a-zA-Z0-9-]+$/.test(config.name)) {
      errors.push('Logic App name can only contain letters, numbers, and hyphens');
    }
    
    if (!config.resourceGroup || config.resourceGroup.trim().length === 0) {
      errors.push('Resource group is required');
    }
    
    if (!config.subscriptionId || config.subscriptionId.trim().length === 0) {
      errors.push('Subscription ID is required');
    }
    
    if (!config.location || config.location.trim().length === 0) {
      errors.push('Location is required');
    }
    
    if (!config.projectPath || config.projectPath.trim().length === 0) {
      errors.push('Project path is required');
    }
    
    if (errors.length > 0) {
      throw new ValidationError(`Invalid deployment configuration: ${errors.join(', ')}`);
    }
  }

  /**
   * Ensures the Azure client is authenticated
   * 
   * @private
   * @throws {@link AuthenticationError} When authentication fails
   */
  private async ensureAuthenticated(): Promise<void> {
    try {
      const isAuthenticated = await this.azureClient.isAuthenticated();
      
      if (!isAuthenticated) {
        throw new AuthenticationError('Not authenticated with Azure. Please sign in to continue.');
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      const parsedError = parseError(error);
      throw new AuthenticationError(`Authentication check failed: ${parsedError.message}`, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Creates or updates a Logic App in Azure
   * 
   * @private
   * @param config - The deployment configuration
   * @returns Promise that resolves to the created/updated site
   */
  private async createOrUpdateLogicApp(config: IDeploymentConfig): Promise<Site> {
    this.outputChannel.appendLog(`Creating/updating Logic App ${config.name}...`);
    
    const site = await this.azureClient.createOrUpdateLogicApp({
      name: config.name,
      resourceGroup: config.resourceGroup,
      subscriptionId: config.subscriptionId,
      location: config.location,
      kind: 'functionapp,workflowapp',
      properties: {
        // Logic App specific properties
      },
    });
    
    this.outputChannel.appendLog(`✅ Logic App ${config.name} created/updated successfully`);
    
    return site;
  }

  /**
   * Deploys workflows to the Logic App
   * 
   * @private
   * @param config - The deployment configuration
   * @param site - The Logic App site
   * @returns Promise that resolves to array of warnings
   */
  private async deployWorkflows(config: IDeploymentConfig, site: Site): Promise<string[]> {
    const warnings: string[] = [];
    
    this.outputChannel.appendLog(`Deploying ${config.workflows.length} workflows...`);
    
    for (const workflow of config.workflows) {
      try {
        await this.azureClient.deployWorkflow(site, workflow);
        this.outputChannel.appendLog('✅ Workflow deployed successfully');
      } catch (error) {
        const parsedError = parseError(error);
        const warning = `Failed to deploy workflow: ${parsedError.message}`;
        warnings.push(warning);
        this.outputChannel.appendLog(`⚠️ ${warning}`);
      }
    }
    
    return warnings;
  }

  /**
   * Validates the deployment result
   * 
   * @private
   * @param site - The deployed Logic App site
   * @throws {@link DeploymentError} When validation fails
   */
  private async validateDeployment(site: Site): Promise<void> {
    this.outputChannel.appendLog('Validating deployment...');
    
    // Check if site is running
    if (site.state !== 'Running') {
      throw new DeploymentError(`Logic App is not running. Current state: ${site.state || 'Unknown'}`);
    }
    
    // Additional validation logic would go here...
    
    this.outputChannel.appendLog('✅ Deployment validation completed');
  }
}

/**
 * Interface for Azure client operations
 * This would typically be implemented by a separate Azure client service
 */
interface IAzureClient {
  isAuthenticated(): Promise<boolean>;
  getLogicApps(subscriptionId: string, resourceGroup?: string): Promise<Site[]>;
  createOrUpdateLogicApp(config: any): Promise<Site>;
  deployWorkflow(site: Site, workflow: IWorkflowDefinition): Promise<void>;
  deleteLogicApp(subscriptionId: string, resourceGroup: string, name: string): Promise<void>;
}

/**
 * Factory function to create a LogicAppService instance
 * 
 * @param azureClient - The Azure client implementation
 * @param outputChannel - The output channel for logging
 * @returns A new LogicAppService instance
 * 
 * @example
 * ```typescript
 * const logicAppService = createLogicAppService(
 *   new AzureClient(subscriptionProvider),
 *   ext.outputChannel
 * );
 * ```
 */
export function createLogicAppService(azureClient: IAzureClient, outputChannel: IAzExtOutputChannel): LogicAppService {
  return new LogicAppService(azureClient, outputChannel);
}
