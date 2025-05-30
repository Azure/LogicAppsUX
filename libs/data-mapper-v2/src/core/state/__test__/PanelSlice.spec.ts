import { describe, expect, it } from 'vitest';
import { SchemaType } from '@microsoft/logic-apps-shared';
import reducer, {
  initialState,
  openDefaultConfigPanelView,
  openMapChecker,
  toggleMapChecker,
  toggleCodeView,
  toggleTestPanel,
  toggleFunctionPanel,
  updateTestInput,
  updateTestOutput,
  toggleShowSelection,
  openAddSourceSchemaPanelView,
  openUpdateSourceSchemaPanelView,
  openAddTargetSchemaPanelView,
  openUpdateTargetSchemaPanelView,
  closePanel,
  setTestFile,
  setSelectedMapCheckerTab,
  ConfigPanelView,
} from '../PanelSlice';
import type { PanelState, TestMapOutput } from '../PanelSlice';
import type { SchemaFile } from '../../models/Schema';

describe('panel slice reducers', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        currentPanelView: ConfigPanelView.AddSchema,
        codeViewPanel: {
          isOpen: false,
        },
        testPanel: {
          isOpen: false,
          showSelection: true,
        },
        functionPanel: {
          isOpen: true,
        },
        mapCheckerPanel: {
          isOpen: false,
          selectedTab: 'error',
        },
      });
    });
  });

  describe('openDefaultConfigPanelView', () => {
    it('should open default config panel view and clear schema type', () => {
      const stateWithSchema: PanelState = {
        ...initialState,
        currentPanelView: ConfigPanelView.AddSchema,
        schemaType: SchemaType.Source,
      };

      const action = openDefaultConfigPanelView();
      const newState = reducer(stateWithSchema, action);

      expect(newState.currentPanelView).toBe(ConfigPanelView.DefaultConfig);
      expect(newState.schemaType).toBeUndefined();
    });

    it('should work from initial state', () => {
      const action = openDefaultConfigPanelView();
      const newState = reducer(initialState, action);

      expect(newState.currentPanelView).toBe(ConfigPanelView.DefaultConfig);
      expect(newState.schemaType).toBeUndefined();
    });
  });

  describe('openMapChecker', () => {
    it('should open map checker and close other panels', () => {
      const stateWithPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: true },
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: false },
      };

      const action = openMapChecker();
      const newState = reducer(stateWithPanelsOpen, action);

      expect(newState.mapCheckerPanel.isOpen).toBe(true);
      expect(newState.codeViewPanel.isOpen).toBe(false);
      expect(newState.testPanel.isOpen).toBe(false);
      expect(newState.functionPanel.isOpen).toBe(false);
    });

    it('should open map checker when already open', () => {
      const stateWithMapCheckerOpen: PanelState = {
        ...initialState,
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: true },
      };

      const action = openMapChecker();
      const newState = reducer(stateWithMapCheckerOpen, action);

      expect(newState.mapCheckerPanel.isOpen).toBe(true);
    });
  });

  describe('toggleMapChecker', () => {
    it('should toggle map checker from closed to open and close other panels', () => {
      const stateWithOtherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: true },
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: false },
      };

      const action = toggleMapChecker();
      const newState = reducer(stateWithOtherPanelsOpen, action);

      expect(newState.mapCheckerPanel.isOpen).toBe(true);
      expect(newState.codeViewPanel.isOpen).toBe(false);
      expect(newState.testPanel.isOpen).toBe(false);
      expect(newState.functionPanel.isOpen).toBe(false);
    });

    it('should toggle map checker from open to closed', () => {
      const stateWithMapCheckerOpen: PanelState = {
        ...initialState,
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: true },
      };

      const action = toggleMapChecker();
      const newState = reducer(stateWithMapCheckerOpen, action);

      expect(newState.mapCheckerPanel.isOpen).toBe(false);
    });
  });

  describe('toggleCodeView', () => {
    it('should toggle code view from closed to open and close other panels', () => {
      const stateWithOtherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: false },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: true },
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: true },
      };

      const action = toggleCodeView();
      const newState = reducer(stateWithOtherPanelsOpen, action);

      expect(newState.codeViewPanel.isOpen).toBe(true);
      expect(newState.testPanel.isOpen).toBe(false);
      expect(newState.functionPanel.isOpen).toBe(false);
      expect(newState.mapCheckerPanel.isOpen).toBe(false);
    });

    it('should toggle code view from open to closed', () => {
      const stateWithCodeViewOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
      };

      const action = toggleCodeView();
      const newState = reducer(stateWithCodeViewOpen, action);

      expect(newState.codeViewPanel.isOpen).toBe(false);
    });
  });

  describe('toggleTestPanel', () => {
    it('should toggle test panel from closed to open and close other panels', () => {
      const stateWithOtherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: false },
        functionPanel: { isOpen: true },
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: true },
      };

      const action = toggleTestPanel();
      const newState = reducer(stateWithOtherPanelsOpen, action);

      expect(newState.testPanel.isOpen).toBe(true);
      expect(newState.codeViewPanel.isOpen).toBe(false);
      expect(newState.functionPanel.isOpen).toBe(false);
      expect(newState.mapCheckerPanel.isOpen).toBe(false);
    });

    it('should toggle test panel from open to closed', () => {
      const stateWithTestPanelOpen: PanelState = {
        ...initialState,
        testPanel: { ...initialState.testPanel, isOpen: true },
      };

      const action = toggleTestPanel();
      const newState = reducer(stateWithTestPanelOpen, action);

      expect(newState.testPanel.isOpen).toBe(false);
    });
  });

  describe('toggleFunctionPanel', () => {
    it('should toggle function panel from closed to open and close other panels', () => {
      const stateWithOtherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: false },
        mapCheckerPanel: { ...initialState.mapCheckerPanel, isOpen: true },
      };

      const action = toggleFunctionPanel();
      const newState = reducer(stateWithOtherPanelsOpen, action);

      expect(newState.functionPanel.isOpen).toBe(true);
      expect(newState.codeViewPanel.isOpen).toBe(false);
      expect(newState.testPanel.isOpen).toBe(false);
      expect(newState.mapCheckerPanel.isOpen).toBe(false);
    });

    it('should toggle function panel from open to closed', () => {
      const stateWithFunctionPanelOpen: PanelState = {
        ...initialState,
        functionPanel: { isOpen: true },
      };

      const action = toggleFunctionPanel();
      const newState = reducer(stateWithFunctionPanelOpen, action);

      expect(newState.functionPanel.isOpen).toBe(false);
    });
  });

  describe('updateTestInput', () => {
    it('should update test input', () => {
      const testInput = '{"test": "input"}';
      const action = updateTestInput(testInput);
      const newState = reducer(initialState, action);

      expect(newState.testPanel.testMapInput).toBe(testInput);
    });

    it('should update test input over existing value', () => {
      const stateWithInput: PanelState = {
        ...initialState,
        testPanel: {
          ...initialState.testPanel,
          testMapInput: 'old input',
        },
      };

      const newInput = '{"new": "input"}';
      const action = updateTestInput(newInput);
      const newState = reducer(stateWithInput, action);

      expect(newState.testPanel.testMapInput).toBe(newInput);
    });

    it('should handle empty string input', () => {
      const action = updateTestInput('');
      const newState = reducer(initialState, action);

      expect(newState.testPanel.testMapInput).toBe('');
    });
  });

  describe('updateTestOutput', () => {
    it('should update test output with response', () => {
      const testResponse = { status: 'success', data: 'output' } as any;
      const testOutput: TestMapOutput = { response: testResponse };

      const action = updateTestOutput(testOutput);
      const newState = reducer(initialState, action);

      expect(newState.testPanel.testMapOutput).toBe(testResponse);
      expect(newState.testPanel.testMapOutputError).toBeUndefined();
    });

    it('should update test output with error', () => {
      const testError = new Error('Test error');
      const testOutput: TestMapOutput = { error: testError };

      const action = updateTestOutput(testOutput);
      const newState = reducer(initialState, action);

      expect(newState.testPanel.testMapOutput).toBeUndefined();
      expect(newState.testPanel.testMapOutputError).toBe(testError);
    });

    it('should update test output with both response and error', () => {
      const testResponse = { status: 'error', data: 'failed' } as any;
      const testError = new Error('Test error');
      const testOutput: TestMapOutput = { response: testResponse, error: testError };

      const action = updateTestOutput(testOutput);
      const newState = reducer(initialState, action);

      expect(newState.testPanel.testMapOutput).toBe(testResponse);
      expect(newState.testPanel.testMapOutputError).toBe(testError);
    });

    it('should clear previous values when updating', () => {
      const stateWithOutput: PanelState = {
        ...initialState,
        testPanel: {
          ...initialState.testPanel,
          testMapOutput: { status: 'old' } as any,
          testMapOutputError: new Error('Old error'),
        },
      };

      const testOutput: TestMapOutput = { response: { status: 'new' } as any };
      const action = updateTestOutput(testOutput);
      const newState = reducer(stateWithOutput, action);

      expect(newState.testPanel.testMapOutput).toEqual({ status: 'new' });
      expect(newState.testPanel.testMapOutputError).toBeUndefined();
    });
  });

  describe('toggleShowSelection', () => {
    it('should toggle showSelection from true to false', () => {
      const action = toggleShowSelection();
      const newState = reducer(initialState, action);

      expect(newState.testPanel.showSelection).toBe(false);
    });

    it('should toggle showSelection from false to true', () => {
      const stateWithHiddenSelection: PanelState = {
        ...initialState,
        testPanel: {
          ...initialState.testPanel,
          showSelection: false,
        },
      };

      const action = toggleShowSelection();
      const newState = reducer(stateWithHiddenSelection, action);

      expect(newState.testPanel.showSelection).toBe(true);
    });
  });

  describe('schema panel view actions', () => {
    describe('openAddSourceSchemaPanelView', () => {
      it('should set schema type to Source and panel view to AddSchema', () => {
        const action = openAddSourceSchemaPanelView();
        const newState = reducer(initialState, action);

        expect(newState.schemaType).toBe(SchemaType.Source);
        expect(newState.currentPanelView).toBe(ConfigPanelView.AddSchema);
      });
    });

    describe('openUpdateSourceSchemaPanelView', () => {
      it('should set schema type to Source and panel view to UpdateSchema', () => {
        const action = openUpdateSourceSchemaPanelView();
        const newState = reducer(initialState, action);

        expect(newState.schemaType).toBe(SchemaType.Source);
        expect(newState.currentPanelView).toBe(ConfigPanelView.UpdateSchema);
      });
    });

    describe('openAddTargetSchemaPanelView', () => {
      it('should set schema type to Target and panel view to AddSchema', () => {
        const action = openAddTargetSchemaPanelView();
        const newState = reducer(initialState, action);

        expect(newState.schemaType).toBe(SchemaType.Target);
        expect(newState.currentPanelView).toBe(ConfigPanelView.AddSchema);
      });
    });

    describe('openUpdateTargetSchemaPanelView', () => {
      it('should set schema type to Target and panel view to UpdateSchema', () => {
        const action = openUpdateTargetSchemaPanelView();
        const newState = reducer(initialState, action);

        expect(newState.schemaType).toBe(SchemaType.Target);
        expect(newState.currentPanelView).toBe(ConfigPanelView.UpdateSchema);
      });
    });
  });

  describe('closePanel', () => {
    it('should clear schema type and current panel view', () => {
      const stateWithPanelOpen: PanelState = {
        ...initialState,
        schemaType: SchemaType.Source,
        currentPanelView: ConfigPanelView.AddSchema,
      };

      const action = closePanel();
      const newState = reducer(stateWithPanelOpen, action);

      expect(newState.schemaType).toBeUndefined();
      expect(newState.currentPanelView).toBeUndefined();
    });

    it('should work when panel is already closed', () => {
      const action = closePanel();
      const newState = reducer(initialState, action);

      expect(newState.schemaType).toBeUndefined();
      expect(newState.currentPanelView).toBeUndefined();
    });
  });

  describe('setTestFile', () => {
    it('should set test file', () => {
      const testFile: SchemaFile = {
        name: 'test.xsd',
        path: '/path/to/test.xsd',
        type: SchemaType.Source,
      };

      const action = setTestFile(testFile);
      const newState = reducer(initialState, action);

      expect(newState.testPanel.selectedFile).toBe(testFile);
    });

    it('should replace existing test file', () => {
      const existingFile: SchemaFile = {
        name: 'existing.xsd',
        path: '/path/to/existing.xsd',
        type: SchemaType.Target,
      };

      const stateWithFile: PanelState = {
        ...initialState,
        testPanel: {
          ...initialState.testPanel,
          selectedFile: existingFile,
        },
      };

      const newFile: SchemaFile = {
        name: 'new.xsd',
        path: '/path/to/new.xsd',
        type: SchemaType.Source,
      };

      const action = setTestFile(newFile);
      const newState = reducer(stateWithFile, action);

      expect(newState.testPanel.selectedFile).toBe(newFile);
      expect(newState.testPanel.selectedFile).not.toBe(existingFile);
    });
  });

  describe('setSelectedMapCheckerTab', () => {
    it('should set selected map checker tab to error', () => {
      const action = setSelectedMapCheckerTab('error');
      const newState = reducer(initialState, action);

      expect(newState.mapCheckerPanel.selectedTab).toBe('error');
    });

    it('should set selected map checker tab to warning', () => {
      const action = setSelectedMapCheckerTab('warning');
      const newState = reducer(initialState, action);

      expect(newState.mapCheckerPanel.selectedTab).toBe('warning');
    });

    it('should change from error to warning', () => {
      const stateWithErrorTab: PanelState = {
        ...initialState,
        mapCheckerPanel: {
          ...initialState.mapCheckerPanel,
          selectedTab: 'error',
        },
      };

      const action = setSelectedMapCheckerTab('warning');
      const newState = reducer(stateWithErrorTab, action);

      expect(newState.mapCheckerPanel.selectedTab).toBe('warning');
    });
  });

  describe('complex state transitions', () => {
    it('should handle multiple panel operations in sequence', () => {
      let state = initialState;

      // Open source schema panel
      state = reducer(state, openAddSourceSchemaPanelView());
      expect(state.schemaType).toBe(SchemaType.Source);
      expect(state.currentPanelView).toBe(ConfigPanelView.AddSchema);

      // Open test panel (should close other panels)
      state = reducer(state, toggleTestPanel());
      expect(state.testPanel.isOpen).toBe(true);
      expect(state.functionPanel.isOpen).toBe(false);

      // Set test file
      const testFile: SchemaFile = {
        name: 'test.xsd',
        path: '/path/test.xsd',
        type: SchemaType.Source,
      };
      state = reducer(state, setTestFile(testFile));
      expect(state.testPanel.selectedFile).toBe(testFile);

      // Update test input
      state = reducer(state, updateTestInput('{"input": "data"}'));
      expect(state.testPanel.testMapInput).toBe('{"input": "data"}');

      // Toggle to code view (should close test panel)
      state = reducer(state, toggleCodeView());
      expect(state.codeViewPanel.isOpen).toBe(true);
      expect(state.testPanel.isOpen).toBe(false);

      // Close panel
      state = reducer(state, closePanel());
      expect(state.schemaType).toBeUndefined();
      expect(state.currentPanelView).toBeUndefined();
    });

    it('should maintain state consistency when toggling panels', () => {
      let state = initialState;

      // Enable all panels
      state = reducer(state, toggleCodeView());
      state = reducer(state, toggleTestPanel());
      expect(state.testPanel.isOpen).toBe(true);
      expect(state.codeViewPanel.isOpen).toBe(false); // Should be closed by test panel

      state = reducer(state, toggleFunctionPanel());
      expect(state.functionPanel.isOpen).toBe(true);
      expect(state.testPanel.isOpen).toBe(false); // Should be closed by function panel

      state = reducer(state, toggleMapChecker());
      expect(state.mapCheckerPanel.isOpen).toBe(true);
      expect(state.functionPanel.isOpen).toBe(false); // Should be closed by map checker
    });
  });

  describe('edge cases', () => {
    it('should handle undefined state properties gracefully', () => {
      const partialState = {
        testPanel: {
          isOpen: true,
          showSelection: false,
        },
      } as PanelState;

      const action = toggleShowSelection();
      const newState = reducer(partialState, action);

      expect(newState.testPanel.showSelection).toBe(true);
    });

    it('should preserve unrelated state when updating specific properties', () => {
      const complexState: PanelState = {
        currentPanelView: ConfigPanelView.UpdateSchema,
        schemaType: SchemaType.Target,
        codeViewPanel: { isOpen: true },
        testPanel: {
          isOpen: false,
          showSelection: false,
          selectedFile: {
            name: 'complex.xsd',
            path: '/complex.xsd',
            type: SchemaType.Source,
          },
          testMapInput: 'existing input',
          testMapOutput: { status: 'success' } as any,
          testMapOutputError: new Error('existing error'),
        },
        functionPanel: { isOpen: false },
        mapCheckerPanel: {
          isOpen: true,
          selectedTab: 'warning',
        },
      };

      const action = updateTestInput('new input');
      const newState = reducer(complexState, action);

      // Only testMapInput should change
      expect(newState.testPanel.testMapInput).toBe('new input');
      expect(newState.testPanel.selectedFile).toBe(complexState.testPanel.selectedFile);
      expect(newState.testPanel.testMapOutput).toBe(complexState.testPanel.testMapOutput);
      expect(newState.currentPanelView).toBe(complexState.currentPanelView);
      expect(newState.schemaType).toBe(complexState.schemaType);
      expect(newState.codeViewPanel).toBe(complexState.codeViewPanel);
      expect(newState.mapCheckerPanel).toBe(complexState.mapCheckerPanel);
    });
  });
});
