import { describe, expect, it } from 'vitest';
import type { ExportData, ITargetDirectory, IValidationData, ManagedConnections, WorkflowsList } from '../run-service';
import { AdvancedOptionsTypes } from '../run-service';
import type { OverviewPropertiesProps } from '@microsoft/designer-ui';
import reducer, {
  initialState,
  initializeWorkflow,
  updateAccessToken,
  updateSelectedWorkFlows,
  updateSelectedSubscripton,
  updateSelectedLocation,
  updateValidationState,
  updateTargetDirectory,
  updatePackageUrl,
  updateManagedConnections,
  addStatus,
  setFinalStatus,
  updateSelectedAdvanceOptions,
  Status,
} from '../WorkflowSlice';
import type { WorkflowState, InitializePayload } from '../WorkflowSlice';

describe('workflow slice reducers', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        baseUrl: '/url',
        apiVersion: '2018-07-01-preview',
        workflowProperties: {
          name: '',
          stateType: '',
        },
        exportData: {
          selectedWorkflows: [],
          selectedSubscription: 'subscriptionId',
          location: '',
          validationState: '',
          targetDirectory: {
            fsPath: '',
            path: '',
          },
          packageUrl: '',
          managedConnections: {
            isManaged: false,
            resourceGroup: undefined,
            resourceGroupLocation: undefined,
          },
          selectedAdvanceOptions: [],
        },
      });
    });
  });

  describe('initializeWorkflow', () => {
    it('should initialize workflow with complete payload', () => {
      const workflowProperties: OverviewPropertiesProps = {
        name: 'TestWorkflow',
        stateType: 'Stateful',
      };

      const reviewContent: IValidationData = {
        isValid: true,
        errors: [],
      } as any;

      const payload: InitializePayload = {
        apiVersion: '2020-05-01-preview',
        baseUrl: 'https://test.com',
        corsNotice: 'CORS notice',
        accessToken: 'token123',
        cloudHost: 'Azure',
        workflowProperties,
        reviewContent,
        hostVersion: '1.0.0',
        isLocal: true,
        isWorkflowRuntimeRunning: true,
      };

      const action = initializeWorkflow(payload);
      const newState = reducer(initialState, action);

      expect(newState.apiVersion).toBe('2020-05-01-preview');
      expect(newState.baseUrl).toBe('https://test.com');
      expect(newState.corsNotice).toBe('CORS notice');
      expect(newState.accessToken).toBe('token123');
      expect(newState.cloudHost).toBe('Azure');
      expect(newState.workflowProperties).toBe(workflowProperties);
      expect(newState.reviewContent).toBe(reviewContent);
      expect(newState.hostVersion).toBe('1.0.0');
      expect(newState.isLocal).toBe(true);
      expect(newState.isWorkflowRuntimeRunning).toBe(true);
      expect(newState.exportData.selectedAdvanceOptions).toEqual([AdvancedOptionsTypes.generateInfrastructureTemplates]);
    });

    it('should initialize workflow with minimal payload', () => {
      const workflowProperties: OverviewPropertiesProps = {
        name: 'MinimalWorkflow',
        stateType: 'Stateless',
      };

      const payload: InitializePayload = {
        apiVersion: '2019-05-01',
        baseUrl: 'https://minimal.com',
        workflowProperties,
      };

      const action = initializeWorkflow(payload);
      const newState = reducer(initialState, action);

      expect(newState.apiVersion).toBe('2019-05-01');
      expect(newState.baseUrl).toBe('https://minimal.com');
      expect(newState.workflowProperties).toBe(workflowProperties);
      expect(newState.corsNotice).toBeUndefined();
      expect(newState.accessToken).toBeUndefined();
      expect(newState.cloudHost).toBeUndefined();
      expect(newState.reviewContent).toBeUndefined();
      expect(newState.hostVersion).toBeUndefined();
      expect(newState.isLocal).toBeUndefined();
      expect(newState.isWorkflowRuntimeRunning).toBeUndefined();
    });

    it('should reset export data on initialization', () => {
      const existingState: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          selectedWorkflows: [{ name: 'existing' } as any],
          selectedSubscription: 'existing-sub',
          selectedIse: 'existing-ise',
          location: 'existing-location',
        },
      };

      const payload: InitializePayload = {
        apiVersion: '2020-05-01',
        baseUrl: 'https://new.com',
        workflowProperties: {
          name: 'NewWorkflow',
          stateType: 'Stateful',
        },
      };

      const action = initializeWorkflow(payload);
      const newState = reducer(existingState, action);

      expect(newState.exportData.selectedWorkflows).toEqual([]);
      expect(newState.exportData.selectedSubscription).toBe('');
      expect(newState.exportData.selectedIse).toBe('');
      expect(newState.exportData.location).toBe('');
      expect(newState.exportData.selectedAdvanceOptions).toEqual([AdvancedOptionsTypes.generateInfrastructureTemplates]);
    });
  });

  describe('updateAccessToken', () => {
    it('should update access token', () => {
      const token = 'new-access-token';
      const action = updateAccessToken(token);
      const newState = reducer(initialState, action);

      expect(newState.accessToken).toBe(token);
    });

    it('should update existing access token', () => {
      const stateWithToken: WorkflowState = {
        ...initialState,
        accessToken: 'old-token',
      };

      const newToken = 'updated-token';
      const action = updateAccessToken(newToken);
      const newState = reducer(stateWithToken, action);

      expect(newState.accessToken).toBe(newToken);
    });

    it('should handle undefined access token', () => {
      const stateWithToken: WorkflowState = {
        ...initialState,
        accessToken: 'existing-token',
      };

      const action = updateAccessToken(undefined);
      const newState = reducer(stateWithToken, action);

      expect(newState.accessToken).toBeUndefined();
    });
  });

  describe('updateSelectedWorkFlows', () => {
    it('should update selected workflows', () => {
      const workflows: WorkflowsList[] = [
        { name: 'Workflow1', resourceGroup: 'RG1' } as any,
        { name: 'Workflow2', resourceGroup: 'RG2' } as any,
      ];

      const action = updateSelectedWorkFlows({ selectedWorkflows: workflows });
      const newState = reducer(initialState, action);

      expect(newState.exportData.selectedWorkflows).toBe(workflows);
      expect(newState.exportData.selectedWorkflows).toHaveLength(2);
    });

    it('should replace existing selected workflows', () => {
      const existingWorkflows: WorkflowsList[] = [{ name: 'OldWorkflow' } as any];

      const stateWithWorkflows: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          selectedWorkflows: existingWorkflows,
        },
      };

      const newWorkflows: WorkflowsList[] = [{ name: 'NewWorkflow1' } as any, { name: 'NewWorkflow2' } as any];

      const action = updateSelectedWorkFlows({ selectedWorkflows: newWorkflows });
      const newState = reducer(stateWithWorkflows, action);

      expect(newState.exportData.selectedWorkflows).toBe(newWorkflows);
      expect(newState.exportData.selectedWorkflows).not.toBe(existingWorkflows);
    });

    it('should handle empty workflows array', () => {
      const action = updateSelectedWorkFlows({ selectedWorkflows: [] });
      const newState = reducer(initialState, action);

      expect(newState.exportData.selectedWorkflows).toEqual([]);
      expect(newState.exportData.selectedWorkflows).toHaveLength(0);
    });
  });

  describe('updateSelectedSubscripton', () => {
    it('should update selected subscription and clear related fields', () => {
      const stateWithData: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          selectedIse: 'existing-ise',
          selectedWorkflows: [{ name: 'existing' } as any],
        },
      };

      const action = updateSelectedSubscripton({ selectedSubscription: 'new-subscription' });
      const newState = reducer(stateWithData, action);

      expect(newState.exportData.selectedSubscription).toBe('new-subscription');
      expect(newState.exportData.selectedIse).toBe('');
      expect(newState.exportData.selectedWorkflows).toEqual([]);
    });

    it('should handle empty subscription', () => {
      const action = updateSelectedSubscripton({ selectedSubscription: '' });
      const newState = reducer(initialState, action);

      expect(newState.exportData.selectedSubscription).toBe('');
      expect(newState.exportData.selectedIse).toBe('');
      expect(newState.exportData.selectedWorkflows).toEqual([]);
    });
  });

  describe('updateSelectedLocation', () => {
    it('should update selected ISE and location and clear workflows', () => {
      const stateWithWorkflows: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          selectedWorkflows: [{ name: 'existing' } as any],
        },
      };

      const action = updateSelectedLocation({ selectedIse: 'new-ise', location: 'new-location' });
      const newState = reducer(stateWithWorkflows, action);

      expect(newState.exportData.selectedIse).toBe('new-ise');
      expect(newState.exportData.location).toBe('new-location');
      expect(newState.exportData.selectedWorkflows).toEqual([]);
    });

    it('should handle empty ISE and location', () => {
      const action = updateSelectedLocation({ selectedIse: '', location: '' });
      const newState = reducer(initialState, action);

      expect(newState.exportData.selectedIse).toBe('');
      expect(newState.exportData.location).toBe('');
      expect(newState.exportData.selectedWorkflows).toEqual([]);
    });
  });

  describe('updateValidationState', () => {
    it('should update validation state', () => {
      const action = updateValidationState({ validationState: 'valid' });
      const newState = reducer(initialState, action);

      expect(newState.exportData.validationState).toBe('valid');
    });

    it('should replace existing validation state', () => {
      const stateWithValidation: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          validationState: 'invalid',
        },
      };

      const action = updateValidationState({ validationState: 'pending' });
      const newState = reducer(stateWithValidation, action);

      expect(newState.exportData.validationState).toBe('pending');
    });

    it('should handle empty validation state', () => {
      const action = updateValidationState({ validationState: '' });
      const newState = reducer(initialState, action);

      expect(newState.exportData.validationState).toBe('');
    });
  });

  describe('updateTargetDirectory', () => {
    it('should update target directory', () => {
      const targetDirectory: ITargetDirectory = {
        fsPath: '/path/to/target',
        path: '/target',
      };

      const action = updateTargetDirectory({ targetDirectory });
      const newState = reducer(initialState, action);

      expect(newState.exportData.targetDirectory).toBe(targetDirectory);
    });

    it('should replace existing target directory', () => {
      const existingDirectory: ITargetDirectory = {
        fsPath: '/old/path',
        path: '/old',
      };

      const stateWithDirectory: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          targetDirectory: existingDirectory,
        },
      };

      const newDirectory: ITargetDirectory = {
        fsPath: '/new/path',
        path: '/new',
      };

      const action = updateTargetDirectory({ targetDirectory: newDirectory });
      const newState = reducer(stateWithDirectory, action);

      expect(newState.exportData.targetDirectory).toBe(newDirectory);
      expect(newState.exportData.targetDirectory).not.toBe(existingDirectory);
    });
  });

  describe('updatePackageUrl', () => {
    it('should update package URL', () => {
      const packageUrl = 'https://example.com/package.zip';
      const action = updatePackageUrl({ packageUrl });
      const newState = reducer(initialState, action);

      expect(newState.exportData.packageUrl).toBe(packageUrl);
    });

    it('should replace existing package URL', () => {
      const stateWithUrl: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          packageUrl: 'https://old.com/package.zip',
        },
      };

      const newUrl = 'https://new.com/package.zip';
      const action = updatePackageUrl({ packageUrl: newUrl });
      const newState = reducer(stateWithUrl, action);

      expect(newState.exportData.packageUrl).toBe(newUrl);
    });

    it('should handle empty package URL', () => {
      const action = updatePackageUrl({ packageUrl: '' });
      const newState = reducer(initialState, action);

      expect(newState.exportData.packageUrl).toBe('');
    });
  });

  describe('updateManagedConnections', () => {
    it('should update managed connections', () => {
      const managedConnections: ManagedConnections = {
        isManaged: true,
        resourceGroup: 'test-rg',
        resourceGroupLocation: 'eastus',
      };

      const action = updateManagedConnections(managedConnections);
      const newState = reducer(initialState, action);

      expect(newState.exportData.managedConnections).toBe(managedConnections);
    });

    it('should replace existing managed connections', () => {
      const existingConnections: ManagedConnections = {
        isManaged: false,
        resourceGroup: undefined,
        resourceGroupLocation: undefined,
      };

      const stateWithConnections: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          managedConnections: existingConnections,
        },
      };

      const newConnections: ManagedConnections = {
        isManaged: true,
        resourceGroup: 'new-rg',
        resourceGroupLocation: 'westus',
      };

      const action = updateManagedConnections(newConnections);
      const newState = reducer(stateWithConnections, action);

      expect(newState.exportData.managedConnections).toBe(newConnections);
      expect(newState.exportData.managedConnections).not.toBe(existingConnections);
    });
  });

  describe('addStatus', () => {
    it('should add status to empty statuses array', () => {
      const action = addStatus({ status: 'Starting export' });
      const newState = reducer(initialState, action);

      expect(newState.statuses).toEqual(['Starting export']);
      expect(newState.statuses).toHaveLength(1);
    });

    it('should append status to existing statuses', () => {
      const stateWithStatuses: WorkflowState = {
        ...initialState,
        statuses: ['Step 1', 'Step 2'],
      };

      const action = addStatus({ status: 'Step 3' });
      const newState = reducer(stateWithStatuses, action);

      expect(newState.statuses).toEqual(['Step 1', 'Step 2', 'Step 3']);
      expect(newState.statuses).toHaveLength(3);
    });

    it('should handle undefined existing statuses', () => {
      const stateWithoutStatuses: WorkflowState = {
        ...initialState,
        statuses: undefined,
      };

      const action = addStatus({ status: 'First status' });
      const newState = reducer(stateWithoutStatuses, action);

      expect(newState.statuses).toEqual(['First status']);
      expect(newState.statuses).toHaveLength(1);
    });

    it('should handle empty status string', () => {
      const action = addStatus({ status: '' });
      const newState = reducer(initialState, action);

      expect(newState.statuses).toEqual(['']);
      expect(newState.statuses).toHaveLength(1);
    });
  });

  describe('setFinalStatus', () => {
    it('should set final status to Succeeded', () => {
      const action = setFinalStatus({ status: Status.Succeeded });
      const newState = reducer(initialState, action);

      expect(newState.finalStatus).toBe(Status.Succeeded);
    });

    it('should set final status to Failed', () => {
      const action = setFinalStatus({ status: Status.Failed });
      const newState = reducer(initialState, action);

      expect(newState.finalStatus).toBe(Status.Failed);
    });

    it('should set final status to InProgress and clear statuses', () => {
      const stateWithStatuses: WorkflowState = {
        ...initialState,
        statuses: ['Step 1', 'Step 2', 'Step 3'],
        finalStatus: Status.Succeeded,
      };

      const action = setFinalStatus({ status: Status.InProgress });
      const newState = reducer(stateWithStatuses, action);

      expect(newState.finalStatus).toBe(Status.InProgress);
      expect(newState.statuses).toEqual([]);
    });

    it('should not clear statuses for non-InProgress status', () => {
      const stateWithStatuses: WorkflowState = {
        ...initialState,
        statuses: ['Step 1', 'Step 2'],
        finalStatus: Status.InProgress,
      };

      const action = setFinalStatus({ status: Status.Succeeded });
      const newState = reducer(stateWithStatuses, action);

      expect(newState.finalStatus).toBe(Status.Succeeded);
      expect(newState.statuses).toEqual(['Step 1', 'Step 2']);
    });
  });

  describe('updateSelectedAdvanceOptions', () => {
    it('should update selected advance options', () => {
      const options = [AdvancedOptionsTypes.generateInfrastructureTemplates];
      const action = updateSelectedAdvanceOptions({ selectedAdvanceOptions: options });
      const newState = reducer(initialState, action);

      expect(newState.exportData.selectedAdvanceOptions).toBe(options);
    });

    it('should replace existing advance options', () => {
      const existingOptions = [AdvancedOptionsTypes.generateInfrastructureTemplates];
      const stateWithOptions: WorkflowState = {
        ...initialState,
        exportData: {
          ...initialState.exportData,
          selectedAdvanceOptions: existingOptions,
        },
      };

      const newOptions: AdvancedOptionsTypes[] = [];
      const action = updateSelectedAdvanceOptions({ selectedAdvanceOptions: newOptions });
      const newState = reducer(stateWithOptions, action);

      expect(newState.exportData.selectedAdvanceOptions).toBe(newOptions);
      expect(newState.exportData.selectedAdvanceOptions).not.toBe(existingOptions);
    });

    it('should handle empty advance options array', () => {
      const action = updateSelectedAdvanceOptions({ selectedAdvanceOptions: [] });
      const newState = reducer(initialState, action);

      expect(newState.exportData.selectedAdvanceOptions).toEqual([]);
      expect(newState.exportData.selectedAdvanceOptions).toHaveLength(0);
    });
  });

  describe('complex state management', () => {
    it('should handle complete workflow setup sequence', () => {
      let state = initialState;

      // Initialize workflow
      const workflowProperties: OverviewPropertiesProps = {
        name: 'ComplexWorkflow',
        stateType: 'Stateful',
      };

      state = reducer(
        state,
        initializeWorkflow({
          apiVersion: '2020-05-01',
          baseUrl: 'https://complex.com',
          accessToken: 'token123',
          workflowProperties,
          isLocal: false,
        })
      );

      // Update subscription and location
      state = reducer(state, updateSelectedSubscripton({ selectedSubscription: 'sub-123' }));
      state = reducer(state, updateSelectedLocation({ selectedIse: 'ise-123', location: 'eastus' }));

      // Add workflows
      const workflows: WorkflowsList[] = [{ name: 'Workflow1' } as any, { name: 'Workflow2' } as any];
      state = reducer(state, updateSelectedWorkFlows({ selectedWorkflows: workflows }));

      // Set target directory and package URL
      const targetDirectory: ITargetDirectory = {
        fsPath: '/export/path',
        path: '/export',
      };
      state = reducer(state, updateTargetDirectory({ targetDirectory }));
      state = reducer(state, updatePackageUrl({ packageUrl: 'https://example.com/package.zip' }));

      // Add status messages
      state = reducer(state, addStatus({ status: 'Starting export' }));
      state = reducer(state, addStatus({ status: 'Validating workflows' }));
      state = reducer(state, addStatus({ status: 'Generating package' }));

      // Set final status
      state = reducer(state, setFinalStatus({ status: Status.Succeeded }));

      expect(state.apiVersion).toBe('2020-05-01');
      expect(state.baseUrl).toBe('https://complex.com');
      expect(state.accessToken).toBe('token123');
      expect(state.workflowProperties).toBe(workflowProperties);
      expect(state.isLocal).toBe(false);
      expect(state.exportData.selectedSubscription).toBe('sub-123');
      expect(state.exportData.selectedIse).toBe('ise-123');
      expect(state.exportData.location).toBe('eastus');
      expect(state.exportData.selectedWorkflows).toBe(workflows);
      expect(state.exportData.targetDirectory).toBe(targetDirectory);
      expect(state.exportData.packageUrl).toBe('https://example.com/package.zip');
      expect(state.statuses).toEqual(['Starting export', 'Validating workflows', 'Generating package']);
      expect(state.finalStatus).toBe(Status.Succeeded);
    });

    it('should maintain immutability across operations', () => {
      const originalState = initialState;
      const action = updateAccessToken('test-token');
      const newState = reducer(originalState, action);

      // Original state should not be modified
      expect(originalState.accessToken).toBeUndefined();
      expect(newState.accessToken).toBe('test-token');
      expect(newState).not.toBe(originalState);
      expect(newState.exportData).not.toBe(originalState.exportData);
    });

    it('should preserve unrelated state when updating specific properties', () => {
      const complexState: WorkflowState = {
        baseUrl: 'https://preserved.com',
        apiVersion: '2020-05-01',
        accessToken: 'preserved-token',
        workflowProperties: { name: 'PreservedWorkflow', stateType: 'Stateful' },
        exportData: {
          selectedWorkflows: [{ name: 'PreservedWorkflow' } as any],
          selectedSubscription: 'preserved-sub',
          location: 'preserved-location',
          validationState: 'preserved-validation',
          targetDirectory: { fsPath: '/preserved', path: '/preserved' },
          packageUrl: 'https://preserved.com/package.zip',
          managedConnections: { isManaged: true, resourceGroup: 'preserved-rg', resourceGroupLocation: 'westus' },
          selectedAdvanceOptions: [AdvancedOptionsTypes.generateInfrastructureTemplates],
        },
        statuses: ['Preserved status'],
        finalStatus: Status.InProgress,
      };

      const action = updateAccessToken('new-token');
      const newState = reducer(complexState, action);

      // Only accessToken should change
      expect(newState.accessToken).toBe('new-token');
      expect(newState.baseUrl).toBe(complexState.baseUrl);
      expect(newState.apiVersion).toBe(complexState.apiVersion);
      expect(newState.workflowProperties).toBe(complexState.workflowProperties);
      expect(newState.exportData.selectedWorkflows).toBe(complexState.exportData.selectedWorkflows);
      expect(newState.exportData.selectedSubscription).toBe(complexState.exportData.selectedSubscription);
      expect(newState.exportData.location).toBe(complexState.exportData.location);
      expect(newState.statuses).toBe(complexState.statuses);
      expect(newState.finalStatus).toBe(complexState.finalStatus);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined state input gracefully', () => {
      const action = updateAccessToken('test-token');
      const newState = reducer(undefined as any, action);

      expect(newState.accessToken).toBe('test-token');
    });

    it('should handle large status arrays', () => {
      let state = initialState;

      // Add many statuses
      for (let i = 0; i < 1000; i++) {
        state = reducer(state, addStatus({ status: `Status ${i}` }));
      }

      expect(state.statuses).toHaveLength(1000);
      expect(state.statuses![0]).toBe('Status 0');
      expect(state.statuses![999]).toBe('Status 999');
    });

    it('should handle special characters in status messages', () => {
      const specialStatus = 'Status with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const action = addStatus({ status: specialStatus });
      const newState = reducer(initialState, action);

      expect(newState.statuses).toEqual([specialStatus]);
    });

    it('should handle workflow property updates correctly', () => {
      const initialProps: OverviewPropertiesProps = {
        name: 'InitialWorkflow',
        stateType: 'Stateless',
      };

      let state = reducer(
        initialState,
        initializeWorkflow({
          apiVersion: '2020-05-01',
          baseUrl: 'https://test.com',
          workflowProperties: initialProps,
        })
      );

      expect(state.workflowProperties).toBe(initialProps);

      const newProps: OverviewPropertiesProps = {
        name: 'UpdatedWorkflow',
        stateType: 'Stateful',
      };

      state = reducer(
        state,
        initializeWorkflow({
          apiVersion: '2020-05-01',
          baseUrl: 'https://test.com',
          workflowProperties: newProps,
        })
      );

      expect(state.workflowProperties).toBe(newProps);
      expect(state.workflowProperties).not.toBe(initialProps);
    });
  });
});
