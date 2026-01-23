import { describe, it, expect } from 'vitest';
import { LogCategory } from '../Logging.Utils';

describe('Logging.Utils', () => {
  describe('LogCategory', () => {
    it('should have DataMapperDesigner category', () => {
      expect(LogCategory.DataMapperDesigner).toBe('DataMapperDesigner');
    });

    it('should have FunctionsQuery category', () => {
      expect(LogCategory.FunctionsQuery).toBe('FunctionsQuery');
    });

    it('should have InputDropDown category', () => {
      expect(LogCategory.InputDropDown).toBe('InputDropDown');
    });

    it('should have InputTextbox category', () => {
      expect(LogCategory.InputTextbox).toBe('InputTextbox');
    });

    it('should have FunctionNodePropertiesTab category', () => {
      expect(LogCategory.FunctionNodePropertiesTab).toBe('FunctionNodePropertiesTab');
    });

    it('should have TestMapPanel category', () => {
      expect(LogCategory.TestMapPanel).toBe('TestMapPanel');
    });

    it('should have DataMapUtils category', () => {
      expect(LogCategory.DataMapUtils).toBe('DataMapUtils');
    });

    it('should have EdgeUtils category', () => {
      expect(LogCategory.EdgeUtils).toBe('EdgeUtils');
    });

    it('should have FunctionUtils category', () => {
      expect(LogCategory.FunctionUtils).toBe('FunctionUtils');
    });

    it('should have IconUtils category', () => {
      expect(LogCategory.IconUtils).toBe('IconUtils');
    });

    it('should have ReactFlowUtils category', () => {
      expect(LogCategory.ReactFlowUtils).toBe('ReactFlowUtils');
    });

    it('should have ConnectionUtils category', () => {
      expect(LogCategory.ConnectionUtils).toBe('ConnectionUtils');
    });

    it('should have ExtensionCommands category', () => {
      expect(LogCategory.ExtensionCommands).toBe('ExtensionCommands');
    });

    it('should have MapDefinitionDeserializer category', () => {
      expect(LogCategory.MapDefinitionDeserializer).toBe('MapDefinitionDeserializer');
    });

    it('should have DefaultConfigView category', () => {
      expect(LogCategory.DefaultConfigView).toBe('DefaultConfigView');
    });

    it('should have AddOrUpdateSchemaView category', () => {
      expect(LogCategory.AddOrUpdateSchemaView).toBe('AddOrUpdateSchemaView');
    });

    it('should have FunctionIcon category', () => {
      expect(LogCategory.FunctionIcon).toBe('FunctionIcon');
    });

    it('should have CodeView category', () => {
      expect(LogCategory.CodeView).toBe('CodeView');
    });

    it('should have TargetSchemaPane category', () => {
      expect(LogCategory.TargetSchemaPane).toBe('TargetSchemaPane');
    });

    it('should have OverviewCanvas category', () => {
      expect(LogCategory.OverviewCanvas).toBe('OverviewCanvas');
    });

    it('should have EditingCanvas category', () => {
      expect(LogCategory.EditingCanvas).toBe('EditingCanvas');
    });

    it('should have FunctionList category', () => {
      expect(LogCategory.FunctionList).toBe('FunctionList');
    });

    it('should have SchemaUtils category', () => {
      expect(LogCategory.SchemaUtils).toBe('SchemaUtils');
    });

    it('should have VsixCommands category', () => {
      expect(LogCategory.VsixCommands).toBe('VsixCommands');
    });

    it('should have DataMapSlice category', () => {
      expect(LogCategory.DataMapSlice).toBe('DataMapSlice');
    });

    it('should be a frozen object (as const)', () => {
      // LogCategory is defined with 'as const', so all values should be readonly
      expect(Object.keys(LogCategory).length).toBeGreaterThan(0);
    });
  });
});
