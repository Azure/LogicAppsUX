import { describe, it, expect } from 'vitest';
import panelReducer, {
  openDefaultConfigPanelView,
  openAddSourceSchemaPanelView,
  openUpdateSourceSchemaPanelView,
  openAddTargetSchemaPanelView,
  openUpdateTargetSchemaPanelView,
  closePanel,
  toggleCodeView,
  toggleTestPanel,
  toggleShowSelection,
  toggleFunctionPanel,
  toggleMapChecker,
  openMapChecker,
  setTestFile,
  updateTestInput,
  updateTestOutput,
  setSelectedMapCheckerTab,
  ConfigPanelView,
  initialState,
  type PanelState,
} from '../PanelSlice';
import { SchemaType } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from '../../../models/Schema';

describe('PanelSlice', () => {
  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialState);
    });

    it('should have AddSchema as default panel view', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.currentPanelView).toBe(ConfigPanelView.AddSchema);
    });

    it('should have codeViewPanel closed by default', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.codeViewPanel.isOpen).toBe(false);
    });

    it('should have testPanel closed by default', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.testPanel.isOpen).toBe(false);
    });

    it('should have functionPanel open by default', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.functionPanel.isOpen).toBe(true);
    });

    it('should have mapCheckerPanel closed by default', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.mapCheckerPanel.isOpen).toBe(false);
    });

    it('should have mapCheckerPanel with error tab selected by default', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.mapCheckerPanel.selectedTab).toBe('error');
    });

    it('should have testPanel showSelection as true by default', () => {
      const result = panelReducer(undefined, { type: 'unknown' });

      expect(result.testPanel.showSelection).toBe(true);
    });
  });

  describe('openDefaultConfigPanelView action', () => {
    it('should set currentPanelView to DefaultConfig', () => {
      const result = panelReducer(initialState, openDefaultConfigPanelView());

      expect(result.currentPanelView).toBe(ConfigPanelView.DefaultConfig);
    });

    it('should clear schemaType', () => {
      const stateWithSchema: PanelState = {
        ...initialState,
        schemaType: SchemaType.Source,
      };

      const result = panelReducer(stateWithSchema, openDefaultConfigPanelView());

      expect(result.schemaType).toBeUndefined();
    });
  });

  describe('schema panel view actions', () => {
    describe('openAddSourceSchemaPanelView', () => {
      it('should set schemaType to Source', () => {
        const result = panelReducer(initialState, openAddSourceSchemaPanelView());

        expect(result.schemaType).toBe(SchemaType.Source);
      });

      it('should set currentPanelView to AddSchema', () => {
        const result = panelReducer(initialState, openAddSourceSchemaPanelView());

        expect(result.currentPanelView).toBe(ConfigPanelView.AddSchema);
      });
    });

    describe('openUpdateSourceSchemaPanelView', () => {
      it('should set schemaType to Source', () => {
        const result = panelReducer(initialState, openUpdateSourceSchemaPanelView());

        expect(result.schemaType).toBe(SchemaType.Source);
      });

      it('should set currentPanelView to UpdateSchema', () => {
        const result = panelReducer(initialState, openUpdateSourceSchemaPanelView());

        expect(result.currentPanelView).toBe(ConfigPanelView.UpdateSchema);
      });
    });

    describe('openAddTargetSchemaPanelView', () => {
      it('should set schemaType to Target', () => {
        const result = panelReducer(initialState, openAddTargetSchemaPanelView());

        expect(result.schemaType).toBe(SchemaType.Target);
      });

      it('should set currentPanelView to AddSchema', () => {
        const result = panelReducer(initialState, openAddTargetSchemaPanelView());

        expect(result.currentPanelView).toBe(ConfigPanelView.AddSchema);
      });
    });

    describe('openUpdateTargetSchemaPanelView', () => {
      it('should set schemaType to Target', () => {
        const result = panelReducer(initialState, openUpdateTargetSchemaPanelView());

        expect(result.schemaType).toBe(SchemaType.Target);
      });

      it('should set currentPanelView to UpdateSchema', () => {
        const result = panelReducer(initialState, openUpdateTargetSchemaPanelView());

        expect(result.currentPanelView).toBe(ConfigPanelView.UpdateSchema);
      });
    });
  });

  describe('closePanel action', () => {
    it('should clear schemaType', () => {
      const stateWithSchema: PanelState = {
        ...initialState,
        schemaType: SchemaType.Source,
      };

      const result = panelReducer(stateWithSchema, closePanel());

      expect(result.schemaType).toBeUndefined();
    });

    it('should clear currentPanelView', () => {
      const result = panelReducer(initialState, closePanel());

      expect(result.currentPanelView).toBeUndefined();
    });
  });

  describe('toggleCodeView action', () => {
    it('should open codeViewPanel when closed', () => {
      const result = panelReducer(initialState, toggleCodeView());

      expect(result.codeViewPanel.isOpen).toBe(true);
    });

    it('should close codeViewPanel when open', () => {
      const openState: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
      };

      const result = panelReducer(openState, toggleCodeView());

      expect(result.codeViewPanel.isOpen).toBe(false);
    });

    it('should close other panels when opening', () => {
      const otherPanelsOpen: PanelState = {
        ...initialState,
        mapCheckerPanel: { isOpen: true, selectedTab: 'error' },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: true },
      };

      const result = panelReducer(otherPanelsOpen, toggleCodeView());

      expect(result.codeViewPanel.isOpen).toBe(true);
      expect(result.mapCheckerPanel.isOpen).toBe(false);
      expect(result.testPanel.isOpen).toBe(false);
      expect(result.functionPanel.isOpen).toBe(false);
    });
  });

  describe('toggleTestPanel action', () => {
    it('should open testPanel when closed', () => {
      const result = panelReducer(initialState, toggleTestPanel());

      expect(result.testPanel.isOpen).toBe(true);
    });

    it('should close testPanel when open', () => {
      const openState: PanelState = {
        ...initialState,
        testPanel: { ...initialState.testPanel, isOpen: true },
      };

      const result = panelReducer(openState, toggleTestPanel());

      expect(result.testPanel.isOpen).toBe(false);
    });

    it('should close other panels when opening', () => {
      const otherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        mapCheckerPanel: { isOpen: true, selectedTab: 'error' },
        functionPanel: { isOpen: true },
      };

      const result = panelReducer(otherPanelsOpen, toggleTestPanel());

      expect(result.testPanel.isOpen).toBe(true);
      expect(result.codeViewPanel.isOpen).toBe(false);
      expect(result.mapCheckerPanel.isOpen).toBe(false);
      expect(result.functionPanel.isOpen).toBe(false);
    });
  });

  describe('toggleFunctionPanel action', () => {
    it('should close functionPanel when open', () => {
      const result = panelReducer(initialState, toggleFunctionPanel());

      expect(result.functionPanel.isOpen).toBe(false);
    });

    it('should open functionPanel when closed', () => {
      const closedState: PanelState = {
        ...initialState,
        functionPanel: { isOpen: false },
      };

      const result = panelReducer(closedState, toggleFunctionPanel());

      expect(result.functionPanel.isOpen).toBe(true);
    });

    it('should close other panels when opening', () => {
      const otherPanelsOpen: PanelState = {
        ...initialState,
        functionPanel: { isOpen: false },
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: true },
        mapCheckerPanel: { isOpen: true, selectedTab: 'error' },
      };

      const result = panelReducer(otherPanelsOpen, toggleFunctionPanel());

      expect(result.functionPanel.isOpen).toBe(true);
      expect(result.codeViewPanel.isOpen).toBe(false);
      expect(result.testPanel.isOpen).toBe(false);
      expect(result.mapCheckerPanel.isOpen).toBe(false);
    });
  });

  describe('toggleMapChecker action', () => {
    it('should open mapCheckerPanel when closed', () => {
      const result = panelReducer(initialState, toggleMapChecker());

      expect(result.mapCheckerPanel.isOpen).toBe(true);
    });

    it('should close mapCheckerPanel when open', () => {
      const openState: PanelState = {
        ...initialState,
        mapCheckerPanel: { isOpen: true, selectedTab: 'error' },
      };

      const result = panelReducer(openState, toggleMapChecker());

      expect(result.mapCheckerPanel.isOpen).toBe(false);
    });

    it('should close other panels when opening', () => {
      const otherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: true },
      };

      const result = panelReducer(otherPanelsOpen, toggleMapChecker());

      expect(result.mapCheckerPanel.isOpen).toBe(true);
      expect(result.codeViewPanel.isOpen).toBe(false);
      expect(result.testPanel.isOpen).toBe(false);
      expect(result.functionPanel.isOpen).toBe(false);
    });
  });

  describe('openMapChecker action', () => {
    it('should open mapCheckerPanel', () => {
      const result = panelReducer(initialState, openMapChecker());

      expect(result.mapCheckerPanel.isOpen).toBe(true);
    });

    it('should close other panels', () => {
      const otherPanelsOpen: PanelState = {
        ...initialState,
        codeViewPanel: { isOpen: true },
        testPanel: { ...initialState.testPanel, isOpen: true },
        functionPanel: { isOpen: true },
      };

      const result = panelReducer(otherPanelsOpen, openMapChecker());

      expect(result.mapCheckerPanel.isOpen).toBe(true);
      expect(result.codeViewPanel.isOpen).toBe(false);
      expect(result.testPanel.isOpen).toBe(false);
      expect(result.functionPanel.isOpen).toBe(false);
    });

    it('should be idempotent when called multiple times', () => {
      let result = panelReducer(initialState, openMapChecker());
      result = panelReducer(result, openMapChecker());

      expect(result.mapCheckerPanel.isOpen).toBe(true);
    });
  });

  describe('setSelectedMapCheckerTab action', () => {
    it('should set selected tab to error', () => {
      const warningTabState: PanelState = {
        ...initialState,
        mapCheckerPanel: { isOpen: true, selectedTab: 'warning' },
      };

      const result = panelReducer(warningTabState, setSelectedMapCheckerTab('error'));

      expect(result.mapCheckerPanel.selectedTab).toBe('error');
    });

    it('should set selected tab to warning', () => {
      const result = panelReducer(initialState, setSelectedMapCheckerTab('warning'));

      expect(result.mapCheckerPanel.selectedTab).toBe('warning');
    });
  });

  describe('toggleShowSelection action', () => {
    it('should toggle showSelection from true to false', () => {
      const result = panelReducer(initialState, toggleShowSelection());

      expect(result.testPanel.showSelection).toBe(false);
    });

    it('should toggle showSelection from false to true', () => {
      const falseState: PanelState = {
        ...initialState,
        testPanel: { ...initialState.testPanel, showSelection: false },
      };

      const result = panelReducer(falseState, toggleShowSelection());

      expect(result.testPanel.showSelection).toBe(true);
    });
  });

  describe('setTestFile action', () => {
    it('should set the selected test file', () => {
      const mockFile: SchemaFile = {
        name: 'test.xml',
        path: '/test/test.xml',
        type: 'xml',
      };

      const result = panelReducer(initialState, setTestFile(mockFile));

      expect(result.testPanel.selectedFile).toEqual(mockFile);
    });

    it('should replace existing selected file', () => {
      const existingFile: SchemaFile = { name: 'old.xml', path: '/old.xml', type: 'xml' };
      const stateWithFile: PanelState = {
        ...initialState,
        testPanel: { ...initialState.testPanel, selectedFile: existingFile },
      };
      const newFile: SchemaFile = { name: 'new.xml', path: '/new.xml', type: 'xml' };

      const result = panelReducer(stateWithFile, setTestFile(newFile));

      expect(result.testPanel.selectedFile?.name).toBe('new.xml');
    });
  });

  describe('updateTestInput action', () => {
    it('should update test input', () => {
      const testInput = '<root><name>Test</name></root>';

      const result = panelReducer(initialState, updateTestInput(testInput));

      expect(result.testPanel.testMapInput).toBe(testInput);
    });

    it('should handle empty string', () => {
      const stateWithInput: PanelState = {
        ...initialState,
        testPanel: { ...initialState.testPanel, testMapInput: 'existing input' },
      };

      const result = panelReducer(stateWithInput, updateTestInput(''));

      expect(result.testPanel.testMapInput).toBe('');
    });
  });

  describe('updateTestOutput action', () => {
    it('should update test output with response', () => {
      const response = { outputInstance: ['<output>result</output>'], statusCode: 200, statusText: 'OK' };

      const result = panelReducer(initialState, updateTestOutput({ response }));

      expect(result.testPanel.testMapOutput).toEqual(response);
      expect(result.testPanel.testMapOutputError).toBeUndefined();
    });

    it('should update test output with error', () => {
      const error = new Error('Test map failed');

      const result = panelReducer(initialState, updateTestOutput({ error }));

      expect(result.testPanel.testMapOutputError).toEqual(error);
      expect(result.testPanel.testMapOutput).toBeUndefined();
    });

    it('should clear previous response when setting error', () => {
      const stateWithResponse: PanelState = {
        ...initialState,
        testPanel: {
          ...initialState.testPanel,
          testMapOutput: { outputInstance: ['<output>old</output>'], statusCode: 200, statusText: 'OK' },
        },
      };
      const error = new Error('New error');

      const result = panelReducer(stateWithResponse, updateTestOutput({ error }));

      expect(result.testPanel.testMapOutput).toBeUndefined();
      expect(result.testPanel.testMapOutputError).toEqual(error);
    });
  });

  describe('workflow scenarios', () => {
    it('should handle complete schema configuration workflow', () => {
      // 1. Start with initial state
      let state = panelReducer(undefined, { type: 'unknown' });
      expect(state.currentPanelView).toBe(ConfigPanelView.AddSchema);

      // 2. Add source schema
      state = panelReducer(state, openAddSourceSchemaPanelView());
      expect(state.schemaType).toBe(SchemaType.Source);
      expect(state.currentPanelView).toBe(ConfigPanelView.AddSchema);

      // 3. Go to default view
      state = panelReducer(state, openDefaultConfigPanelView());
      expect(state.schemaType).toBeUndefined();

      // 4. Add target schema
      state = panelReducer(state, openAddTargetSchemaPanelView());
      expect(state.schemaType).toBe(SchemaType.Target);

      // 5. Close panel
      state = panelReducer(state, closePanel());
      expect(state.currentPanelView).toBeUndefined();
    });

    it('should handle test panel workflow', () => {
      // 1. Open test panel
      let state = panelReducer(initialState, toggleTestPanel());
      expect(state.testPanel.isOpen).toBe(true);

      // 2. Select test file
      const testFile: SchemaFile = { name: 'input.xml', path: '/input.xml', type: 'xml' };
      state = panelReducer(state, setTestFile(testFile));
      expect(state.testPanel.selectedFile).toEqual(testFile);

      // 3. Update test input
      state = panelReducer(state, updateTestInput('<test>data</test>'));
      expect(state.testPanel.testMapInput).toBe('<test>data</test>');

      // 4. Receive test output
      state = panelReducer(state, updateTestOutput({ response: { outputInstance: ['<result/>'], statusCode: 200, statusText: 'OK' } }));
      expect(state.testPanel.testMapOutput).toBeDefined();

      // 5. Close test panel
      state = panelReducer(state, toggleTestPanel());
      expect(state.testPanel.isOpen).toBe(false);
    });
  });
});
